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
import { putD1Object, getD1Object, deleteD1Object } from './cloudflare';

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
  const id = url.searchParams.get('id');
  const ctx = (request as any).context;

  if (!id) {
    return Response.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  // Try D1 first if enabled
  if (process.env.ENABLE_CLOUDFLARE_DATABASE === 'true' && ctx?.env?.DB) {
    try {
      const d1Result = await getD1Object(ctx.env.DB, id, 'Documents');
      if (d1Result) {
        return Response.json(d1Result);
      }
    } catch (error) {
      console.error('Error reading from D1:', error);
      // Fall through to DynamoDB
    }
  }

  // Fallback to DynamoDB
  const item = await getObject(client, id, tableName);
  return Response.json(item.Item);
}

export async function PUT(request: Request) {
  console.log('call put dynamodb');
  const data = await request.json();
  const ctx = (request as any).context;

  // if had id (exiting object), pull from aws and update
  if (data.id) {
    try {
      // First get the existing item from DynamoDB
      const dynamoItem = await getObject(client, data.id, tableName);

      if (!dynamoItem?.Item) {
        return Response.json({ error: 'Item not found' }, { status: 404 });
      }

      const updatedObj = AWS.DynamoDB.Converter.unmarshall(dynamoItem.Item);
      for (const key in data) {
        if (key !== 'resources') {
          // don't overwrite resources
          updatedObj[key] = data[key];
        }
      }

      // Write to DynamoDB
      try {
        await putObject(
          client,
          AWS.DynamoDB.Converter.marshall(updatedObj),
          tableName,
        );
      } catch (e) {
        console.error('Failed to write to DynamoDB:', e);
        // Log analytics for failure
        posthog.capture({
          distinctId: data.ownerID,
          event: 'Document Update Failed',
          properties: {
            id: data.id,
            timeStamp: getCurrentTime(),
            error: String(e),
            stage: 'DynamoDB Write',
          },
        });
        return Response.json(
          { error: 'Failed to update document' },
          { status: 500 },
        );
      }

      // If Cloudflare storage is enabled and we have D1 access
      if (process.env.ENABLE_CLOUDFLARE_DATABASE === 'true' && ctx?.env?.DB) {
        try {
          const d1Result = await putD1Object(
            ctx.env.DB,
            updatedObj,
            'Documents',
          );
          if (!d1Result.success) {
            // If D1 fails, rollback DynamoDB and track error
            await putObject(
              client,
              AWS.DynamoDB.Converter.marshall(dynamoItem.Item),
              tableName,
            );
            posthog.capture({
              distinctId: data.ownerID,
              event: 'Document Update Failed',
              properties: {
                id: data.id,
                timeStamp: getCurrentTime(),
                error: d1Result.error,
                stage: 'D1 Write',
              },
            });
            return Response.json(
              { error: 'Failed to update document' },
              { status: 500 },
            );
          }
        } catch (error) {
          // If D1 fails with exception, rollback DynamoDB and track error
          await putObject(
            client,
            AWS.DynamoDB.Converter.marshall(dynamoItem.Item),
            tableName,
          );
          posthog.capture({
            distinctId: data.ownerID,
            event: 'Document Update Failed',
            properties: {
              id: data.id,
              timeStamp: getCurrentTime(),
              error: String(error),
              stage: 'D1 Write Exception',
            },
          });
          return Response.json(
            { error: 'Failed to update document' },
            { status: 500 },
          );
        }
      }

      // Log analytics for success
      posthog.capture({
        distinctId: data.ownerID,
        event: 'Document Update Successful',
        properties: {
          id: data.id,
          timeStamp: getCurrentTime(),
        },
      });

      return Response.json(updatedObj);
    } catch (error) {
      console.error('Error updating document:', error);
      posthog.capture({
        distinctId: data.ownerID,
        event: 'Document Update Failed',
        properties: {
          id: data.id,
          timeStamp: getCurrentTime(),
          error: String(error),
        },
      });
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  return Response.json({ error: 'No id provided' }, { status: 400 });
}

export async function POST(request: Request) {
  console.log('Call create DynamoDB');
  const data = await request.json();
  const ctx = (request as any).context;

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
    // Write to DynamoDB
    await putObject(client, inputData, tableName);

    // If Cloudflare storage is enabled and we have D1 access, also write to D1
    if (process.env.ENABLE_CLOUDFLARE_DATABASE === 'true' && ctx?.env?.DB) {
      const d1Result = await putD1Object(ctx.env.DB, Item, 'Documents');
      if (!d1Result.success) {
        console.error('Failed to write to D1:', d1Result.error);
      }
    }

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
  const ctx = (request as any).context;
  console.log('call delete dynamodb: ', data.id);

  // Get object for PostHog events
  const obj = await getObject(client, data.id, tableName);
  const updatedObj = AWS.DynamoDB.Converter.unmarshall(obj.Item);

  try {
    // Delete from DynamoDB
    await deleteObject(client, data.id, tableName);

    // If enabled, also delete from D1
    if (process.env.ENABLE_CLOUDFLARE_DATABASE === 'true' && ctx?.env?.DB) {
      const d1Result = await deleteD1Object(ctx.env.DB, data.id, 'Documents');
      if (!d1Result.success) {
        console.error('Failed to delete from D1:', d1Result.error);
      }
    }

    posthog.capture({
      distinctId: updatedObj.ownerID,
      event: 'Document Deleted',
      properties: {
        documentId: data.id,
        name: updatedObj.name,
        timeStamp: getCurrentTime(),
      },
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    posthog.capture({
      distinctId: updatedObj.ownerID,
      event: 'Document Delete Failed',
      properties: {
        documentId: data.id,
        name: updatedObj.name,
        timeStamp: getCurrentTime(),
      },
    });
  }

  return Response.json({ msg: 'success' });
}
