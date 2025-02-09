import dotenv from 'dotenv';
import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { getObject } from '../route';
import { log, redact } from '@/lib/logging';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

import { ResourceMeta } from '@/types/types';

dotenv.config();

const client = new DynamoDBClient({ region: 'us-west-1' });
export const documentTable = process.env.DOCUMENT_TABLE || '';
export const resourceMetaTable = process.env.RESOURCEMETA_TABLE || '';
export const resourceTable = process.env.RESOURCE_TABLE || '';

export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('resourceId');

    if (!id) {
      return new Response(JSON.stringify({ err: 'Missing resourceId' }), {
        status: 400,
      });
    }

    const command = new GetItemCommand({
      TableName: resourceMetaTable,
      Key: marshall({ id }),
    });
    const resourceMeta = await client.send(command);
    if (!resourceMeta.Item) {
      return new Response(JSON.stringify({ err: 'ResourceMeta not found' }), {
        status: 404,
      });
    }

    const resourceMetaData = unmarshall(resourceMeta.Item) as ResourceMeta;

    return new Response(JSON.stringify(resourceMetaData), { status: 200 });
  } catch (error) {
    const url = new URL(request.url);
    log({
      level: 'ERROR',
      service: 'resource-meta',
      message: 'Error in GET request',
      correlationId,
      error,
      metadata: redact({
        resourceId: url.searchParams.get('resourceId'),
      }),
    });
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}

export async function PUT(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const data = await request.json();
    log({
      level: 'INFO',
      service: 'resource-meta',
      message: 'Resource metadata update',
      correlationId,
      userId: data.ownerID,
      metadata: redact({
        resourceId: data.id,
        userId: data.ownerID,
        operation: 'UPDATE',
      }),
    });
    const { id, name, notes, summary, tags } = data;

    if (!id) {
      return new Response(JSON.stringify({ err: 'Missing resourceMeta ID' }), {
        status: 400,
      });
    }

    const resourceMeta = await getObject(client, id, resourceMetaTable);
    if (!resourceMeta.Item) {
      return new Response(JSON.stringify({ err: 'ResourceMeta not found' }), {
        status: 404,
      });
    }

    const existingResourceMeta = unmarshall(resourceMeta.Item) as ResourceMeta;

    const command = new UpdateItemCommand({
      TableName: resourceMetaTable,
      Key: marshall({ id }),
      UpdateExpression:
        'SET #name = :name, notes = :notes, summary = :summary, tags = :tags, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#name': 'name',
      },
      ExpressionAttributeValues: marshall({
        ':name': name || existingResourceMeta.name,
        ':notes': notes || existingResourceMeta.notes,
        ':summary': summary || existingResourceMeta.summary,
        ':tags': tags || existingResourceMeta.tags,
        ':updatedAt': new Date().toISOString(),
      }),
    });
    await client.send(command);

    return new Response(JSON.stringify(existingResourceMeta), { status: 200 });
  } catch (error) {
    const data = await request.json().catch(() => null);
    log({
      level: 'ERROR',
      service: 'resource-meta',
      message: 'Resource metadata update failed',
      correlationId,
      error,
      metadata: redact({
        resourceId: data?.id,
      }),
    });
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}
