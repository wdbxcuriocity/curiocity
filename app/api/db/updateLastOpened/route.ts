import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { PostHog } from 'posthog-node';
import { getCurrentTime } from '../../user/route';
import { getObject } from '../route';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { debug, error } from '@/lib/logging';

const client = new DynamoDBClient({ region: 'us-west-1' });
const tableName = process.env.DOCUMENT_TABLE || '';

// Initialize the PostHog client
const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY || '', {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST, // Ensure this points to your PostHog host
});

export async function POST(request: NextRequest) {
  const { id } = await request.json();
  const lastOpened = new Date().toISOString();

  if (!id) {
    return NextResponse.json(
      { error: 'Document ID is required' },
      { status: 400 },
    );
  }

  const response = await getObject(client, id, tableName);
  if (!response.Item) {
    error('Document not found', null, { documentId: id });
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const obj = unmarshall(response.Item);

  try {
    const command = new UpdateItemCommand({
      TableName: tableName,
      Key: { id: { S: id } },
      UpdateExpression: 'SET lastOpened = :lastOpened',
      ExpressionAttributeValues: {
        ':lastOpened': { S: lastOpened },
      },
    });

    posthog.capture({
      distinctId: obj.ownerID, // Unique identifier for the obj
      event: 'Document Last Opened', // Event name
      properties: {
        id: id,
        timeStamp: getCurrentTime(),
      },
    });

    await client.send(command);
    debug('Document lastOpened updated successfully', { documentId: id });
    return NextResponse.json({
      message: 'lastOpened field updated successfully',
    });
  } catch (e: unknown) {
    error('Error updating lastOpened field', e, { documentId: id });
    posthog.capture({
      distinctId: obj.ownerID, // Unique identifier for the obj
      event: 'Document Last Opened Failed', // Event name
      properties: {
        id: id,
        timeStamp: getCurrentTime(),
      },
    });

    return NextResponse.json(
      { error: 'Could not update lastOpened field' },
      { status: 500 },
    );
  }
}
