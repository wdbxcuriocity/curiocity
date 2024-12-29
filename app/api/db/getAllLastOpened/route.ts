import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import AWS from 'aws-sdk';

const client = new DynamoDBClient({ region: 'us-west-1' });
const tableName = process.env.DOCUMENT_TABLE || '';

// Function to get entries owned by a specific user and sort by lastOpened
const getUserDocumentsOrderedByLastOpened = async (ownerID: string) => {
  if (!tableName) {
    throw new Error('DOCUMENT_TABLE environment variable not set');
  }

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

    // Unmarshall the data
    const items =
      data.Items?.map((item) => AWS.DynamoDB.Converter.unmarshall(item)) || [];

    // Sort items by lastOpened in descending order (most recent to least recent)
    const sortedItems = items.sort((a, b) => {
      const dateA = a.lastOpened ? new Date(a.lastOpened).getTime() : -Infinity;
      const dateB = b.lastOpened ? new Date(b.lastOpened).getTime() : -Infinity;
      return dateB - dateA;
    });

    return sortedItems;
  } catch (error) {
    console.error('Error retrieving user documents:', error);
    throw new Error('Could not retrieve user documents');
  }
};

// GET request handler with user-specific filtering and ordering by lastOpened
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const ownerID = url.searchParams.get('ownerID');

  if (!ownerID) {
    return new Response('Owner ID is required', { status: 400 });
  }

  try {
    const items = await getUserDocumentsOrderedByLastOpened(ownerID);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error retrieving documents:', error);
    return NextResponse.json(
      { error: 'Could not retrieve user documents' },
      { status: 500 },
    );
  }
}
