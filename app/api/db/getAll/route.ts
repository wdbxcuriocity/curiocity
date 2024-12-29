import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import AWS from 'aws-sdk';
import { NextResponse } from 'next/server';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: 'us-west-1' });
const tableName = process.env.DOCUMENT_TABLE || '';

// Function to get entries owned by a specific user
const getUserDocuments = async (ownerID: string) => {
  if (!tableName)
    throw new Error('DOCUMENT_TABLE environment variable not set');

  try {
    const params = {
      TableName: tableName,
      FilterExpression: '#ownerID = :ownerID',
      ProjectionExpression:
        'id, #name, #text, #folders, #dateAdded, #lastOpened, #ownerID', // Retrieve specific attributes
      ExpressionAttributeNames: {
        '#name': 'name', // Handle reserved word `name`
        '#text': 'text',
        '#folders': 'folders',
        '#dateAdded': 'dateAdded',
        '#lastOpened': 'lastOpened',
        '#ownerID': 'ownerID',
      },
      ExpressionAttributeValues: {
        ':ownerID': { S: ownerID },
      },
    };

    const command = new ScanCommand(params);
    const data = await client.send(command);

    const items =
      data.Items?.map((item: any) => AWS.DynamoDB.Converter.unmarshall(item)) ||
      [];
    return items;
  } catch (error) {
    console.error('Error retrieving user documents:', error);
    throw new Error('Could not retrieve user documents');
  }
};

// GET request handler with user-specific filtering
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ownerID = url.searchParams.get('ownerID');

  if (!ownerID) {
    return new Response('Owner ID is required', { status: 400 });
  }

  try {
    const items = await getUserDocuments(ownerID);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error retrieving documents:', error);
    return NextResponse.error();
  }
}
