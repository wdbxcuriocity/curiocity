import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import AWS from 'aws-sdk';
import { putObject, getObject } from '../../route';
import { Resource } from '@/types/types';

dotenv.config();

const client = new DynamoDBClient({ region: 'us-west-1' });
export const resourceTable = process.env.RESOURCE_TABLE || '';

const MAX_MARKDOWN_SIZE = 350 * 1024; // 350 KB to stay safely within the 400 KB limit

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const requiredFields = ['documentId', 'hash', 'url', 'markdown'];
    for (const field of requiredFields) {
      if (!data[field]) {
        console.error(`Missing field: ${field}`);
        return new Response(
          JSON.stringify({ err: `Missing field: ${field}` }),
          { status: 400 },
        );
      }
    }

    if (data.markdown.length > MAX_MARKDOWN_SIZE) {
      console.warn('Markdown content truncated to fit within size limit.');
    }

    const resource: Resource = {
      id: data.hash,
      markdown:
        data.markdown && data.markdown.length > MAX_MARKDOWN_SIZE
          ? data.markdown.slice(0, MAX_MARKDOWN_SIZE) + '...'
          : data.markdown || '',
      url: data.url,
    };

    const existingResource = await getObject(client, data.hash, resourceTable);
    if (!existingResource.Item) {
      const inputResourceData = AWS.DynamoDB.Converter.marshall(resource);
      await putObject(client, inputResourceData, resourceTable);
    }

    return new Response(JSON.stringify({ hash: data.hash }), { status: 200 });
  } catch (error) {
    console.error('Error in POST request:', error);
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}
