import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import AWS from 'aws-sdk';
import { putObject, getObject } from '../route';

import { ResourceMeta } from '@/types/types';

dotenv.config();

const client = new DynamoDBClient({ region: 'us-west-1' });
export const documentTable = process.env.DOCUMENT_TABLE || '';
export const resourceMetaTable = process.env.RESOURCEMETA_TABLE || '';
export const resourceTable = process.env.RESOURCE_TABLE || '';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('resourceId');

    if (!id) {
      return new Response(JSON.stringify({ err: 'Missing resourceId' }), {
        status: 400,
      });
    }

    const resourceMeta = await getObject(client, id, resourceMetaTable);
    if (!resourceMeta.Item) {
      return new Response(JSON.stringify({ err: 'ResourceMeta not found' }), {
        status: 404,
      });
    }

    const resourceMetaData = AWS.DynamoDB.Converter.unmarshall(
      resourceMeta.Item,
    ) as ResourceMeta;

    return new Response(JSON.stringify(resourceMetaData), { status: 200 });
  } catch (error) {
    console.error('Error in GET request:', error);
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
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

    const existingResourceMeta = AWS.DynamoDB.Converter.unmarshall(
      resourceMeta.Item,
    ) as ResourceMeta;

    const updatedResourceMeta = {
      ...existingResourceMeta,
      name: name || existingResourceMeta.name,
      notes: notes || existingResourceMeta.notes,
      summary: summary || existingResourceMeta.summary,
      tags: tags || existingResourceMeta.tags,
      updatedAt: new Date().toISOString(),
    };

    const input = AWS.DynamoDB.Converter.marshall(updatedResourceMeta);
    await putObject(client, input, resourceMetaTable);

    return new Response(JSON.stringify(updatedResourceMeta), { status: 200 });
  } catch (error) {
    console.error('Error in PUT request:', error);
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}
