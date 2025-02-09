import dotenv from 'dotenv';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { log, redact } from '@/lib/logging';
import { PostHog } from 'posthog-node';

dotenv.config();

const client = new DynamoDBClient({ region: 'us-west-1' });
const documentTable = process.env.DOCUMENT_TABLE || '';

// Initialize the PostHog client
const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY || '', {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});

const getCurrentTime = () => {
  const now = new Date();
  return now.toISOString();
};

export async function PUT(request: Request) {
  const correlationId = crypto.randomUUID();
  let data;
  try {
    data = await request.json();

    if (!data.tag || !data.documentId) {
      return Response.json(
        { error: 'Tag and documentId are required.' },
        { status: 400 },
      );
    }

    const { tag, documentId } = data;

    // Fetch the document by ID
    const getCommand = new GetItemCommand({
      TableName: documentTable,
      Key: marshall({ id: documentId }),
    });

    const document = await client.send(getCommand);

    if (!document.Item) {
      return Response.json({ error: 'Document not found.' }, { status: 404 });
    }

    // Unmarshall the DynamoDB response
    const unmarshalledDoc = unmarshall(document.Item);

    // Check for duplicates
    unmarshalledDoc.tags = unmarshalledDoc.tags || [];
    if (unmarshalledDoc.tags.includes(tag)) {
      return Response.json(
        { error: 'Duplicate tag not allowed.' },
        { status: 409 },
      );
    }

    // Add the new tag
    unmarshalledDoc.tags.push(tag);

    // Update the document with the new tag
    const putCommand = new PutItemCommand({
      TableName: documentTable,
      Item: marshall(unmarshalledDoc),
    });

    await client.send(putCommand);

    posthog.capture({
      distinctId: unmarshalledDoc.ownerID,
      event: 'Tags Updated',
      properties: {
        id: documentId,
        timeStamp: getCurrentTime(),
      },
    });

    return Response.json({ message: 'Tag added successfully.' });
  } catch (error) {
    log({
      level: 'ERROR',
      service: 'document-tags',
      message: 'Failed to add tag',
      correlationId,
      error,
      metadata: redact({
        documentId: data?.documentId,
        tag: data?.tag,
      }),
    });
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
