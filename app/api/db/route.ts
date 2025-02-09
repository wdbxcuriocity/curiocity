import dotenv from 'dotenv';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
  ScanCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { resourceMetaTable } from './resourcemeta/route';
import { PostHog } from 'posthog-node';
import { putD1Object, deleteD1Object } from './cloudflare';
import { log, redact } from '@/lib/logging';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

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
export const putObject = async (
  client: DynamoDBClient,
  item: any,
  tableName: string,
) => {
  const command = new PutItemCommand({
    TableName: tableName,
    Item: item,
  });
  return client.send(command);
};

// get json object from dynamodb
export const getObject = async (
  client: DynamoDBClient,
  id: string,
  tableName: string,
) => {
  const command = new GetItemCommand({
    TableName: tableName,
    Key: marshall({ id }),
  });
  return client.send(command);
};

export const deleteObject = async (
  client: DynamoDBClient,
  id: string,
  tableName: string,
) => {
  const params = {
    TableName: tableName,
    Key: {
      id: { S: id },
    },
  };

  try {
    // if is document obj, recursively delete all resource metadata as well
    if (tableName === tableName) {
      const obj = await getObject(client, id, tableName);
      if (!obj.Item) throw new Error('Item not found');
      const updatedObj = unmarshall(obj.Item);

      for (const folder in updatedObj.folders) {
        for (const resource in updatedObj.folders[folder].resources) {
          await deleteObject(client, resource, resourceMetaTable);
        }
      }
    }

    // Send the DeleteItemCommand to DynamoDB
    const command = new DeleteItemCommand(params);
    const data = await client.send(command);

    log({
      level: 'INFO',
      service: 'database',
      message: 'Item successfully deleted',
      metadata: redact({
        tableName: tableName,
        itemId: id,
      }),
    });
    return data;
  } catch (error) {
    log({
      level: 'ERROR',
      service: 'database',
      message: 'Failed to delete item from table',
      error,
      metadata: redact({
        tableName: tableName,
        itemId: id,
      }),
    });
    throw new Error('Could not delete the item');
  }
};

export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const updateLastOpened = searchParams.get('updateLastOpened') === 'true';
  const ownerID = searchParams.get('ownerID');

  try {
    if (!id) {
      if (!ownerID) {
        return Response.json(
          { error: 'Missing ownerID parameter' },
          { status: 400 },
        );
      }

      const scanCommand = {
        TableName: tableName,
        FilterExpression: 'ownerID = :ownerID',
        ExpressionAttributeValues: {
          ':ownerID': { S: ownerID },
        },
      };

      const documents = await client.send(new ScanCommand(scanCommand));
      return Response.json(documents.Items);
    } else {
      const document = await getObject(client, id, tableName);

      if (updateLastOpened && document.Item) {
        const updateCommand = new UpdateItemCommand({
          TableName: tableName,
          Key: { id: { S: id } },
          UpdateExpression: 'SET lastOpened = :lastOpened',
          ExpressionAttributeValues: {
            ':lastOpened': { S: new Date().toISOString() },
          },
          ReturnValues: 'NONE',
        });

        await client.send(updateCommand);
        return Response.json(document.Item);
      }

      return Response.json(document.Item);
    }
  } catch (error) {
    log({
      level: 'ERROR',
      service: 'document-api',
      message: 'Failed to fetch document',
      correlationId,
      error,
      metadata: redact({
        documentId: id,
        ownerID,
        updateLastOpened,
      }),
    });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const correlationId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const data = await request.json();

    log({
      level: 'INFO',
      service: 'document-api',
      message: 'Document update initiated',
      correlationId,
      userId: data.ownerID,
      metadata: redact({
        documentId: data.id,
        operationType: 'UPDATE',
      }),
    });

    const ctx = (request as any).context;

    // if had id (exiting object), pull from aws and update
    if (data.id) {
      try {
        // First get the existing item from DynamoDB
        const dynamoItem = await getObject(client, data.id, tableName);

        if (!dynamoItem?.Item) {
          return Response.json({ error: 'Item not found' }, { status: 404 });
        }

        const updatedObj = unmarshall(dynamoItem.Item);
        for (const key in data) {
          if (key !== 'resources') {
            // don't overwrite resources
            updatedObj[key] = data[key];
          }
        }

        // Write to DynamoDB
        try {
          await putObject(client, updatedObj, tableName);
        } catch (e) {
          log({
            level: 'ERROR',
            service: 'document-api',
            message: 'Failed to write to DynamoDB',
            correlationId,
            error: e,
            metadata: redact({
              documentId: data.id,
            }),
          });
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
              await putObject(client, marshall(dynamoItem.Item), tableName);
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
            await putObject(client, marshall(dynamoItem.Item), tableName);
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

        log({
          level: 'INFO',
          service: 'document-api',
          message: 'Document update completed',
          correlationId,
          userId: data.ownerID,
          metadata: {
            documentId: data.id,
            durationMs: Date.now() - startTime,
          },
        });

        return Response.json(updatedObj);
      } catch (error) {
        log({
          level: 'ERROR',
          service: 'document-api',
          message: 'Error updating document',
          correlationId,
          error,
          metadata: redact({
            documentId: data.id,
          }),
        });
        posthog.capture({
          distinctId: data.ownerID,
          event: 'Document Update Failed',
          properties: {
            id: data.id,
            timeStamp: getCurrentTime(),
            error: String(error),
          },
        });
        return Response.json(
          { error: 'Internal server error' },
          { status: 500 },
        );
      }
    }

    return Response.json({ error: 'No id provided' }, { status: 400 });
  } catch (error) {
    const data = await request.json();
    log({
      level: 'ERROR',
      service: 'document-api',
      message: 'Document update failed',
      correlationId,
      userId: data?.ownerID,
      error,
      metadata: redact({
        documentId: data?.id,
        errorCode: error instanceof Error ? error.message : 'Unknown error',
      }),
    });
    posthog.capture({
      distinctId: data?.ownerID,
      event: 'Document Update Failed',
      properties: {
        documentId: data?.id,
        timeStamp: getCurrentTime(),
        error: String(error),
      },
    });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const data = await request.json();
    const ctx = (request as any).context;

    log({
      level: 'INFO',
      service: 'document-api',
      message: 'Document creation initiated',
      correlationId,
      userId: data?.ownerID,
      metadata: {
        operation: 'CREATE',
      },
    });

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

    const inputData = marshall(Item);

    try {
      // Write to DynamoDB
      await putObject(client, inputData, tableName);

      // If Cloudflare storage is enabled and we have D1 access, also write to D1
      if (process.env.ENABLE_CLOUDFLARE_DATABASE === 'true' && ctx?.env?.DB) {
        const d1Result = await putD1Object(ctx.env.DB, Item, 'Documents');
        if (!d1Result.success) {
          log({
            level: 'ERROR',
            service: 'document-api',
            message: 'Failed to write to D1',
            correlationId,
            error: d1Result.error,
            metadata: redact({
              documentId: Item.id,
            }),
          });
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

      log({
        level: 'INFO',
        service: 'document-api',
        message: 'Document created successfully',
        correlationId,
        userId: data?.ownerID,
        metadata: {
          documentId: Item.id,
          durationMs: Date.now() - startTime,
        },
      });
    } catch (error) {
      log({
        level: 'ERROR',
        service: 'document-api',
        message: 'Error creating document',
        correlationId,
        error,
        metadata: redact({
          documentId: Item.id,
        }),
      });
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

    await posthog.flush();
    return Response.json(Item);
  } catch (error) {
    log({
      level: 'ERROR',
      service: 'document-api',
      message: 'Document creation failed',
      correlationId,
      error,
    });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const data = await request.json();
    const ctx = (request as any).context;

    log({
      level: 'INFO',
      service: 'document-api',
      message: 'Document deletion initiated',
      correlationId,
      metadata: redact({
        documentId: data.id,
      }),
    });

    // Get object for PostHog events
    const obj = await getObject(client, data.id, tableName);
    if (!obj.Item) throw new Error('Item not found');
    const updatedObj = unmarshall(obj.Item);

    try {
      // Delete from DynamoDB
      await deleteObject(client, data.id, tableName);

      // If enabled, also delete from D1
      if (process.env.ENABLE_CLOUDFLARE_DATABASE === 'true' && ctx?.env?.DB) {
        const d1Result = await deleteD1Object(ctx.env.DB, data.id, 'Documents');
        if (!d1Result.success) {
          log({
            level: 'ERROR',
            service: 'document-api',
            message: 'Failed to delete from D1',
            correlationId,
            error: d1Result.error,
            metadata: redact({
              documentId: data.id,
            }),
          });
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

      log({
        level: 'INFO',
        service: 'document-api',
        message: 'Document deleted successfully',
        correlationId,
        userId: updatedObj.ownerID,
        metadata: redact({
          documentId: data.id,
        }),
      });
    } catch (error) {
      log({
        level: 'ERROR',
        service: 'document-api',
        message: 'Error deleting document',
        correlationId,
        error,
        metadata: redact({
          documentId: data.id,
        }),
      });
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
  } catch (error) {
    log({
      level: 'ERROR',
      service: 'document-api',
      message: 'Document deletion failed',
      correlationId,
      error,
    });
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
