import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import AWS from 'aws-sdk';
import { NextResponse } from 'next/server';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: 'us-west-1' });
const tableName = process.env.USER_TABLE_NAME || '';

// Function to get all entries with all attributes
const getAllEntries = async () => {
  try {
    const params = {
      TableName: tableName,
    };

    const command = new ScanCommand(params);
    const data = await client.send(command);

    // Unmarshall the data
    const items =
      data.Items?.map((item: any) => AWS.DynamoDB.Converter.unmarshall(item)) ||
      [];

    return items;
  } catch (error) {
    console.error('Error retrieving all entries:', error);
    throw new Error('Could not retrieve entries');
  }
};

// GET request handler
export async function GET() {
  try {
    const items = await getAllEntries();
    return NextResponse.json(items);
  } catch (error) {
    console.log(error);
    return NextResponse.error();
  }
}
