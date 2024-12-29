import { NextResponse } from 'next/server';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'us-west-1' });
const resourceTable = process.env.RESOURCE_TABLE || '';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hash = searchParams.get('hash');

  if (!hash) {
    return NextResponse.json(
      { error: 'Missing hash parameter' },
      { status: 400 },
    );
  }

  try {
    // Check resource existence using the hash as the primary key
    const response = await client.send(
      new GetItemCommand({
        TableName: resourceTable,
        Key: {
          id: { S: hash }, // Use the correct key schema; "S" for String
        },
      }),
    );

    const exists = !!response.Item;
    return NextResponse.json({ exists });
  } catch (error) {
    console.error('Error checking resource existence:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
