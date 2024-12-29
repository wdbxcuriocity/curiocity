import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import AWS from 'aws-sdk';

const client = new DynamoDBClient({ region: 'us-west-1' });
export const documentTable = process.env.DOCUMENT_TABLE || '';
export const resourceMetaTable = process.env.RESOURCEMETA_TABLE || '';

export async function DELETE(request: Request) {
  try {
    // Parse request body
    const { documentId, folderName } = await request.json();

    // Validate input
    if (!documentId || !folderName) {
      throw new Error('Document ID and folder name are required.');
    }

    // Fetch the document
    const document = await client.send(
      new GetCommand({ TableName: documentTable, Key: { id: documentId } }),
    );

    if (!document.Item) {
      throw new Error('Document not found.');
    }

    // Unmarshal the document
    const existingDocument = document.Item;

    // Check if the folder exists
    if (!existingDocument.folders || !existingDocument.folders[folderName]) {
      throw new Error('Folder not found in the document.');
    }

    // Get all resources in the folder
    const resourcesToDelete =
      existingDocument.folders[folderName]?.resources || [];

    // Delete each resource from the resourcemeta table
    for (const resource of resourcesToDelete) {
      const resourceId = resource.id;
      await client.send(
        new DeleteCommand({
          TableName: resourceMetaTable,
          Key: { id: resourceId },
        }),
      );
    }

    // Remove the folder
    delete existingDocument.folders[folderName];

    // Update the document in the database
    await client.send(
      new UpdateCommand({
        TableName: documentTable,
        Key: { id: documentId },
        UpdateExpression: 'SET folders = :folders',
        ExpressionAttributeValues: {
          ':folders': existingDocument.folders,
        },
      }),
    );

    return new Response(
      JSON.stringify({
        msg: 'Folder and associated resources deleted successfully',
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in DELETE request:', error);
    return new Response(
      JSON.stringify({ err: error.message || 'Internal server error' }),
      {
        status: 500,
      },
    );
  }
}
