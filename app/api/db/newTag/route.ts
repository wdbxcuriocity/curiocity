import { NextResponse } from 'next/server';
import AWS from 'aws-sdk';
import { PostHog } from 'posthog-node';
import { getCurrentTime } from '../../user/route';

// Initialize the PostHog client
const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY || '', {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST, // Ensure this points to your PostHog host
});

const dynamoDB = new AWS.DynamoDB({
  region: 'us-west-1', // Replace with your region
});

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

    const document = await dynamoDB.getItem(getParams).promise();

    if (!document.Item) {
      return NextResponse.json(
        { error: 'Document not found.' },
        { status: 404 },
      );
    }

    // Unmarshall the DynamoDB response
    const unmarshalledDoc = AWS.DynamoDB.Converter.unmarshall(document.Item);

    // Check for duplicates
    unmarshalledDoc.tags = unmarshalledDoc.tags || [];
    if (unmarshalledDoc.tags.includes(tag)) {
      return NextResponse.json(
        { error: 'Duplicate tag not allowed.' },
        { status: 409 },
      );
    }

    // Add the new tag
    unmarshalledDoc.tags.push(tag);

    // Update the document with the new tag
    const updateParams = {
      TableName: documentTable,
      Item: AWS.DynamoDB.Converter.marshall(unmarshalledDoc),
    };

    await dynamoDB.putItem(updateParams).promise();

    posthog.capture({
      distinctId: unmarshalledDoc.ownerID, // Unique identifier for the obj
      event: 'Tags Updated', // Event name
      properties: {
        id: documentId,
        timeStamp: getCurrentTime(),
      },
    });

    return NextResponse.json({ message: 'Tag added successfully.' });
  } catch (error) {
    console.error('Error adding tag:', error);

    return NextResponse.json(
      { error: 'Failed to add tag to document.' },
      { status: 500 },
    );
  }
}
