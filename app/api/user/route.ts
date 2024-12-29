import dotenv from 'dotenv';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { PostHog } from 'posthog-node';

dotenv.config();

const client = new DynamoDBClient({ region: 'us-west-1' });
const tableName = process.env.USER_TABLE_NAME || '';

// Define the User Type
export type User = {
  id: string;
  name: string;
  email: string;
  image: string;
  accountCreated: string;
  lastLoggedIn: string;
};

// Initialize the PostHog client
const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY || '', {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST, // Ensure this points to your PostHog host
});

export const getCurrentTime = () => {
  const now = new Date();

  // Format components of the date
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  // Combine components into the desired format
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

// PUT user object into DynamoDB
export const putUser = async (inputData: User) => {
  const marshalledData = marshall(inputData);

  try {
    await client.send(
      new PutItemCommand({
        TableName: tableName,
        Item: marshalledData,
      }),
    );

    return inputData;
  } catch (error) {
    console.error('Error putting user:', error);
    throw new Error('Could not put the user item');
  }
};

// GET user object from DynamoDB by id
export const getUser = async (id: string) => {
  if (typeof id !== 'string') {
    console.error('Invalid data type for id:', typeof id);
    throw new Error('ID must be a string');
  }

  try {
    const data = await client.send(
      new GetItemCommand({
        TableName: tableName,
        Key: {
          id: { S: id },
        },
      }),
    );

    return data.Item ? (unmarshall(data.Item) as User) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    console.log(error);
    throw new Error('Could not retrieve the user');
  }
};

// DELETE user object from DynamoDB by ID
export const deleteUser = async (id: string) => {
  try {
    await client.send(
      new DeleteItemCommand({
        TableName: tableName,
        Key: { id: { S: id } },
      }),
    );
    posthog.capture({
      distinctId: id, // Unique identifier for the user
      event: 'User Delete Successful', // Event name
      properties: {
        id: id,
        timeStamp: getCurrentTime(),
      },
    });
    console.log('User successfully deleted');
  } catch (error) {
    posthog.capture({
      distinctId: id, // Unique identifier for the user
      event: 'User Delete Failed', // Event name
      properties: {
        timeStamp: getCurrentTime(),
      },
    });
    console.error('Error deleting user:', error);
    throw new Error('Could not delete the user');
  }
};

// API Endpoints

// GET endpoint to retrieve a user by id
export async function GET(request: Request) {
  console.log('Retrieving user from DynamoDB');
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response('User ID is required', { status: 400 });
  }

  try {
    const user = await getUser(id);
    if (!user) {
      return new Response('User not found', { status: 404 });
    }

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error retrieving user:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// POST endpoint to create a new user db/
export async function POST(request: Request) {
  console.log('Creating new user in DynamoDB');
  const data = await request.json();

  const { id, name, email, image, lastLoggedIn } = data || {};
  if (!id || !email) {
    return new Response('User ID and email are required', { status: 400 });
  }

  const newUser: User = {
    id,
    name: name || 'Anonymous',
    email,
    image: image || '',
    accountCreated: new Date().toISOString(),
    lastLoggedIn: lastLoggedIn || new Date().toISOString(),
  };

  try {
    await putUser(newUser);
    // create posthog event for user created
    posthog.capture({
      distinctId: id, // Unique identifier for the user
      event: 'User Created', // Event name
      properties: {
        email: email,
        name: name,
        timeStamp: getCurrentTime(),
      },
    });

    return new Response(JSON.stringify(newUser), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    posthog.capture({
      distinctId: id, // Unique identifier for the user
      event: 'User Creation Failed', // Event name
      properties: {
        email: email,
        name: name,
        timeStamp: getCurrentTime(),
      },
    });
    console.error('Error creating user:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// PUT endpoint to update an existing user
export async function PUT(request: Request) {
  console.log('Updating user in DynamoDB');
  const data = await request.json();

  if (!data.id) {
    return new Response('User ID is required', { status: 400 });
  }

  console.log('Retrieving user with ID:', data.id);
  const existingUser = await getUser(data.id);

  if (!existingUser) {
    return new Response('User not found', { status: 404 });
  }

  const updatedUser: User = {
    ...existingUser,
    ...data,
    lastLoggedIn: new Date().toISOString(),
  };

  try {
    await putUser(updatedUser);
    posthog.capture({
      distinctId: data.id, // Unique identifier for the user
      event: 'User Update Successful', // Event name
      properties: {
        id: data.id,
        timeStamp: getCurrentTime(),
      },
    });
    return new Response(JSON.stringify(updatedUser), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    posthog.capture({
      distinctId: data.id, // Unique identifier for the user
      event: 'User Update Failed', // Event name
      properties: {
        id: data.id,
        timeStamp: getCurrentTime(),
      },
    });
    console.error('Error updating user:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// DELETE endpoint to remove a user by ID
export async function DELETE(request: Request) {
  console.log('Deleting user from DynamoDB');
  const data = await request.json();

  const { id } = data;
  if (!id) {
    return new Response('User ID is required', { status: 400 });
  }

  try {
    await deleteUser(id);
    return new Response(
      JSON.stringify({ message: 'User successfully deleted' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error deleting user:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
