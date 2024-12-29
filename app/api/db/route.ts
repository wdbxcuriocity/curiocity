import dotenv from 'dotenv';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
} from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import AWS from 'aws-sdk';
import { resourceMetaTable } from './resourcemeta/route';
import { PostHog } from 'posthog-node';

dotenv.config();

export const client = new DynamoDBClient({ region: 'us-west-1' });
export const tableName = process.env.DOCUMENT_TABLE || '';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Initialize the PostHog client
const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY || '', {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST, // Ensure this points to your PostHog host
});

const getCurrentTime = () => {
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

export type Resource = {
  id: string;
  markdown: string;
  url: string;
};

export type ResourceMetaCompressed = {
  id: string;
  name: string;
};

export type ResourceMeta = {
  id: string;
  hash: string;
  name: string;
  dateAdded: string;
  lastOpened: string;
  notes: string;
  summary: string;
  tags: Array<string>;
};

export type Document = {
  id: string;
  ownerID: string;
  name: string;
  folders: Record<string, Folder>;
  text: string;
  dateAdded: string;
  lastOpened: string;
  tags: Array<string>;
};

export type Folder = {
  name: string;
  resources: Array<ResourceMetaCompressed>;
};

// send json object to dynamodb
export const putObject = async (client: any, inputData: any, table: string) => {
  try {
    const res = await client.send(
      new PutItemCommand({
        TableName: table,
        Item: inputData as any,
      }),
    );
    return res;
  } catch (error: any) {
    console.error('Failed to put the item in the table.', {
      tableName: table,
      inputData,
      errorMessage: error.message,
      errorStack: error.stack,
    });
    throw new Error(`Could not put the item into table: ${table}`);
  }
};

// get json object from dynamodb
export const getObject = async (client: any, id: any, table: string) => {
  const res = await client
    .send(
      new GetItemCommand({
        TableName: table,
        Key: {
          id: { S: id },
        },
      }),
    )
    .then((data: any) => data)
    .catch((error: any) => {
      console.log(error);
      throw new Error('Could not retrieve the item');
    });

  return res;
};

export const deleteObject = async (client: any, id: any, table: string) => {
  // Define the parameters for the DeleteItemCommand
  const params = {
    TableName: table, // The name of the DynamoDB table
    Key: {
      id: { S: id }, // The key of the item (id in this case is a string, so we use {S: value})
    },
  };

  try {
    // if is document obj, recursively delete all resource metadata as well
    if (table === tableName) {
      const obj = await getObject(client, id, table);
      const updatedObj = AWS.DynamoDB.Converter.unmarshall(obj.Item);

      for (const folder in updatedObj.folders) {
        for (const resource in updatedObj.folders[folder].resources) {
          await deleteObject(client, resource, resourceMetaTable);
        }
      }
    }

    // Send the DeleteItemCommand to DynamoDB
    const command = new DeleteItemCommand(params);
    const data = await client.send(command);

    console.log('Item successfully deleted');
    return data; // Return the delete operation's response data
  } catch (error) {
    console.error('Error deleting item:', error);
    throw new Error('Could not delete the item');
  }
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id'); // Retrieves the 'id' query parameter

  const item = await getObject(client, id, tableName);
  return Response.json(item.Item);
}

export async function PUT(request: Request) {
  console.log('call put dynamodb');
  const data = await request.json();

  // if had id (exiting object), pull from aws and update
  if (data.id) {
    const dynamoItem = await getObject(client, data.id, tableName);

    if (!dynamoItem?.Item) {
      console.log('here');
      throw new Error('Could not retrieve the item');
    }

    const updatedObj = AWS.DynamoDB.Converter.unmarshall(dynamoItem.Item);
    for (const key in data) {
      if (key !== 'resources') {
        // don't overwrite resources
        updatedObj[key] = data[key];
      }
    }

    console.log('updatedObj', updatedObj);

    // put the updated object to the db
    const res = await putObject(
      client,
      AWS.DynamoDB.Converter.marshall(updatedObj),
      tableName,
    );

    posthog.capture({
      distinctId: data.ownerID, // Unique identifier for the obj
      event: 'Document Update Successful', // Event name
      properties: {
        id: data.id,
        timeStamp: getCurrentTime(),
      },
    });

    console.log('Updated object: ', res);
  }

  return Response.json({});
}

export async function POST(request: Request) {
  console.log('Call create DynamoDB');
  const data = await request.json();

  const defaultFolder = { name: 'General', resources: [] };
  const Item: Document = {
    id: uuidv4(),
    name: data.name,
    folders: { General: defaultFolder },
    text: data?.text || '',
    dateAdded: data.dateAdded,
    ownerID: data?.ownerID || 'jason',
    lastOpened: data?.lastOpened || 'now',
    tags: [],
  };

  const inputData = AWS.DynamoDB.Converter.marshall(Item);

  try {
    await putObject(client, inputData, tableName);

    posthog.capture({
      distinctId: data.ownerID,
      event: 'Document Created',
      properties: {
        documentId: Item.id,
        name: Item.name,
        createdAt: getCurrentTime(),
      },
    });
    console.log('PostHog event captured for document creation');
  } catch (error) {
    console.error('Error creating document:', error);
    posthog.capture({
      distinctId: data.ownerID,
      event: 'Document Creation Failed',
      properties: {
        documentId: Item.id,
        name: Item.name,
        timeStamp: getCurrentTime(),
      },
    });
  }

  await posthog.flush(); // Ensure events are flushed
  return Response.json(Item);
}

export async function DELETE(request: Request) {
  const data = await request.json();
  console.log('call delete dynamodb: ', data.id);

  // create posthog event for doc deleted
  const obj = await getObject(client, data.id, tableName);
  const updatedObj = AWS.DynamoDB.Converter.unmarshall(obj.Item);

  console.log('posthog delete: ', updatedObj);

  await deleteObject(client, data.id, tableName).catch(() => {
    posthog.capture({
      distinctId: updatedObj.ownerID, // Unique identifier for the user
      event: 'Document Delete Failed', // Event name
      properties: {
        documentId: data.id,
        name: updatedObj.name,
        timeStamp: getCurrentTime(),
      },
    });
  });

  posthog.capture({
    distinctId: updatedObj.ownerID, // Unique identifier for the user
    event: 'Document Deleted', // Event name
    properties: {
      documentId: data.id,
      name: updatedObj.name,
      timeStamp: getCurrentTime(),
    },
  });

  return Response.json({ msg: 'success' });
}
