import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import {
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

dotenv.config();

const client = new DynamoDBClient({ region: 'us-west-1' });
export const documentTable = process.env.DOCUMENT_TABLE || '';
export const resourceMetaTable = process.env.RESOURCEMETA_TABLE || '';
export const resourceTable = process.env.RESOURCE_TABLE || '';

export async function DELETE(request: Request) {
  try {
    const { id: resourceId } = await request.json();

    const resourceMeta = await client.send(
      new GetCommand({ TableName: resourceMetaTable, Key: { id: resourceId } }),
    );
    if (!resourceMeta.Item) {
      throw new Error('Resource not found.');
    }

    const { documentId } = resourceMeta.Item;

    const document = await client.send(
      new GetCommand({ TableName: documentTable, Key: { id: documentId } }),
    );

    if (!document.Item) {
      throw new Error('Document not found.');
    }

    const existingDocument = document.Item;

    if (
      !existingDocument.folders ||
      typeof existingDocument.folders !== 'object'
    ) {
      throw new Error('Folders data is missing or invalid.');
    }

    let folderUpdated = false;
    for (const { resources } of Object.values(existingDocument.folders)) {
      const originalLength = resources?.length || 0;
      folder.resources = (resources || []).filter(
        (resource: any) => resource.id !== resourceId,
      );
      if (resources.length < originalLength) {
        folderUpdated = true;
      }
    }

    if (!folderUpdated) {
      throw new Error('Resource not found in document folders.');
    }

    await client.send(
      new UpdateCommand({
        TableName: documentTable,
        Key: { id: documentId },
        UpdateExpression: 'SET folders = :folders',
        ExpressionAttributeValues: { ':folders': existingDocument.folders },
      }),
    );

    await client.send(
      new DeleteCommand({
        TableName: resourceMetaTable,
        Key: { id: resourceId },
      }),
    );

    return new Response(
      JSON.stringify({ msg: 'Resource deleted successfully' }),
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
