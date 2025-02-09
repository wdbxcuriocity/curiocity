import { NextResponse } from 'next/server';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { debug, error } from '@/lib/logging';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';

const dynamoDB = new DynamoDBClient({ region: 'us-west-1' });

const documentTable = process.env.DOCUMENT_TABLE || '';

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (!body.tag || !body.documentId) {
      return NextResponse.json(
        { error: 'Tag and documentId are required.' },
        { status: 400 },
      );
    }

    const { tag, documentId } = body;

    // Fetch the document by ID
    const getParams = {
      TableName: documentTable,
      Key: {
        id: { S: documentId },
      },
    };

    const document = await dynamoDB.send(new GetItemCommand(getParams));

    if (!document.Item) {
      return NextResponse.json(
        { error: 'Document not found.' },
        { status: 404 },
      );
    }

    // Unmarshall the DynamoDB response
    const unmarshalledDoc = unmarshall(document.Item);

    // Remove the tag if it exists
    unmarshalledDoc.tags = unmarshalledDoc.tags || [];
    if (!unmarshalledDoc.tags.includes(tag)) {
      return NextResponse.json(
        { error: 'Tag not found in document.' },
        { status: 404 },
      );
    }

    unmarshalledDoc.tags = unmarshalledDoc.tags.filter(
      (t: string) => t !== tag,
    );

    // Update the document with the modified tags
    const updateParams = {
      TableName: documentTable,
      Item: marshall(unmarshalledDoc),
    };

    await dynamoDB.send(new PutItemCommand(updateParams));

    debug('Tag deleted successfully', { tagId: tag });

    return NextResponse.json({ message: 'Tag removed successfully.' });
  } catch (e: unknown) {
    error('Error deleting tag', e);
    return NextResponse.json(
      { error: 'Failed to delete tag from document.' },
      { status: 500 },
    );
  }
}
