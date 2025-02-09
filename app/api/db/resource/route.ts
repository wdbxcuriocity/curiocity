import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource, getObject } from '../route';
import { debug, error } from '@/lib/logging';
import { unmarshall } from '@aws-sdk/util-dynamodb';

dotenv.config();

export const dynamic = 'force-dynamic'; // Ensure this API route is dynamic

const client = new DynamoDBClient({ region: 'us-west-1' });
const resourceTable = process.env.RESOURCE_TABLE || '';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    debug('Fetching resource content', { hash: searchParams.get('hash') });
    const hash = searchParams.get('hash');

    if (!hash) {
      error('Missing hash in GET request');
      return new Response(JSON.stringify({ err: 'Missing hash' }), {
        status: 400,
      });
    }

    // Retrieve the resource from resourceTable
    const resource = await getObject(client, hash, resourceTable);

    if (!resource.Item) {
      error('Resource not found', null, { hash });
      return new Response(JSON.stringify({ err: 'Resource not found' }), {
        status: 404,
      });
    }

    // Convert DynamoDB item to JSON format
    const resourceData = unmarshall(resource.Item) as Resource;

    return new Response(JSON.stringify(resourceData), { status: 200 });
  } catch (e: unknown) {
    const { searchParams } = new URL(request.url);
    error('Error in GET request for resource', e, {
      hash: searchParams.get('hash'),
    });
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}
