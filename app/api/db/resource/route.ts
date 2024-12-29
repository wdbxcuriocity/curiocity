import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import AWS from 'aws-sdk';
import { Resource, getObject } from '../route';

dotenv.config();

const client = new DynamoDBClient({ region: 'us-west-1' });
const resourceTable = process.env.RESOURCE_TABLE || '';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get('hash');

    if (!hash) {
      console.error('Error: Missing hash in GET request');
      return new Response(JSON.stringify({ err: 'Missing hash' }), {
        status: 400,
      });
    }

    // Retrieve the resource from resourceTable
    const resource = await getObject(client, hash, resourceTable);

    if (!resource.Item) {
      console.error('Error: Resource not found with hash:', hash);
      return new Response(JSON.stringify({ err: 'Resource not found' }), {
        status: 404,
      });
    }

    // Convert DynamoDB item to JSON format
    const resourceData = AWS.DynamoDB.Converter.unmarshall(
      resource.Item,
    ) as Resource;

    return new Response(JSON.stringify(resourceData), { status: 200 });
  } catch (error) {
    console.error('Error in GET request for resource:', error);
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}
