import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { NextResponse } from 'next/server';
import { debug, error } from '@/lib/logging';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: 'us-west-1' });
const tableName = process.env.USER_TABLE_NAME || '';

// Function to get all entries with all attributes
const getAllEntries = async () => {
  try {
    const params = {
      TableName: tableName,
    };

    debug('Fetching all users from DynamoDB');
    const command = new ScanCommand(params);
    const data = await client.send(command);

    // Unmarshall the data
    const items = data.Items?.map((item: any) => unmarshall(item)) || [];

    debug('Successfully fetched users', { count: items.length });
    return items;
  } catch (e: unknown) {
    error('Error retrieving all entries', e);
    throw new Error('Could not retrieve entries');
  }
};

// GET request handler
export async function GET() {
  try {
    const items = await getAllEntries();
    return NextResponse.json(items);
  } catch (e: unknown) {
    error('Error in GET request', e);
    return NextResponse.error();
  }
}
