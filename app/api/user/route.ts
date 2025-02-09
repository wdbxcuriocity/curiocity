import dotenv from 'dotenv';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { PostHog } from 'posthog-node';
import { log, redact } from '@/lib/logging';

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
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});

export const getCurrentTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
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
    log({
      level: 'ERROR',
      service: 'user',
      message: 'Failed to put user in database',
      error,
      metadata: redact({
        userId: inputData.id,
        email: inputData.email,
      }),
    });
    throw new Error('Could not put the user item');
  }
};

// GET user object from DynamoDB by id
export const getUser = async (id: string) => {
  if (typeof id !== 'string') {
    log({
      level: 'ERROR',
      service: 'user',
      message: 'Invalid user ID type',
      metadata: redact({
        idType: typeof id,
      }),
    });
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
    log({
      level: 'ERROR',
      service: 'user',
      message: 'Failed to get user from database',
      error,
      metadata: redact({
        userId: id,
      }),
    });
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
      distinctId: id,
      event: 'User Delete Successful',
      properties: {
        id: id,
        timeStamp: getCurrentTime(),
      },
    });
    log({
      level: 'INFO',
      service: 'user',
      message: 'User successfully deleted',
      metadata: redact({
        userId: id,
      }),
    });
  } catch (error) {
    posthog.capture({
      distinctId: id,
      event: 'User Delete Failed',
      properties: {
        timeStamp: getCurrentTime(),
      },
    });
    log({
      level: 'ERROR',
      service: 'user',
      message: 'Failed to delete user',
      error,
      metadata: redact({
        userId: id,
      }),
    });
    throw new Error('Could not delete the user');
  }
};

// API Endpoints

// GET endpoint to retrieve a user by id
export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  log({
    level: 'INFO',
    service: 'user',
    message: 'User retrieval initiated',
    correlationId,
    metadata: redact({
      userId: id,
    }),
  });

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
    log({
      level: 'ERROR',
      service: 'user',
      message: 'Failed to retrieve user',
      correlationId,
      error,
      metadata: redact({
        userId: id,
      }),
    });
    return new Response('Internal Server Error', { status: 500 });
  }
}

// POST endpoint to create a new user
export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  const data = await request.json();

  log({
    level: 'INFO',
    service: 'user',
    message: 'User creation initiated',
    correlationId,
    metadata: redact({
      email: data?.email,
    }),
  });

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
    posthog.capture({
      distinctId: id,
      event: 'User Created',
      properties: {
        email: email,
        name: name,
        timeStamp: getCurrentTime(),
      },
    });

    log({
      level: 'INFO',
      service: 'user',
      message: 'User created successfully',
      correlationId,
      userId: id,
      metadata: redact({
        email,
      }),
    });

    return new Response(JSON.stringify(newUser), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    posthog.capture({
      distinctId: id,
      event: 'User Creation Failed',
      properties: {
        email: email,
        name: name,
        timeStamp: getCurrentTime(),
      },
    });
    log({
      level: 'ERROR',
      service: 'user',
      message: 'Failed to create user',
      correlationId,
      error,
      metadata: redact({
        email,
      }),
    });
    return new Response('Internal Server Error', { status: 500 });
  }
}

// PUT endpoint to update an existing user
export async function PUT(request: Request) {
  const correlationId = crypto.randomUUID();
  let data;
  try {
    data = await request.json();
    log({
      level: 'INFO',
      service: 'user',
      message: 'User profile update initiated',
      correlationId,
      userId: data.id,
      metadata: redact({
        fieldsUpdated: Object.keys(data),
      }),
    });

    const existingUser = await getUser(data.id);
    if (!existingUser) {
      return new Response('User not found', { status: 404 });
    }

    const updatedUser: User = {
      ...existingUser,
      ...data,
      lastLoggedIn: new Date().toISOString(),
    };

    await putUser(updatedUser);
    posthog.capture({
      distinctId: data.id,
      event: 'User Update Successful',
      properties: {
        id: data.id,
        timeStamp: getCurrentTime(),
      },
    });

    log({
      level: 'INFO',
      service: 'user',
      message: 'User profile updated successfully',
      correlationId,
      userId: data.id,
      metadata: redact({
        fieldsUpdated: Object.keys(data),
      }),
    });

    return new Response(JSON.stringify(updatedUser), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    log({
      level: 'ERROR',
      service: 'user',
      message: 'User profile update failed',
      correlationId,
      error,
      metadata: redact({
        userId: data?.id,
      }),
    });
    return new Response('Internal Server Error', { status: 500 });
  }
}

// DELETE endpoint to remove a user
export async function DELETE(request: Request) {
  const correlationId = crypto.randomUUID();
  let data;
  try {
    data = await request.json();

    log({
      level: 'INFO',
      service: 'user',
      message: 'User deletion initiated',
      correlationId,
      metadata: redact({
        userId: data.id,
      }),
    });

    await deleteUser(data.id);

    log({
      level: 'INFO',
      service: 'user',
      message: 'User deleted successfully',
      correlationId,
      metadata: redact({
        userId: data.id,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    log({
      level: 'ERROR',
      service: 'user',
      message: 'Failed to delete user',
      correlationId,
      error,
      metadata: redact({
        userId: data?.id,
      }),
    });
    return new Response('Internal Server Error', { status: 500 });
  }
}
