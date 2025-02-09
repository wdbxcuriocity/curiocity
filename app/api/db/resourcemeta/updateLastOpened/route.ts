import {
  DynamoDBClient,
  UpdateItemCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { ResourceCompressed } from '@/types/types'; // Correct type name
import { debug, error } from '@/lib/logging';

const client = new DynamoDBClient({ region: 'us-west-1' });
const resourceMetaTable = process.env.RESOURCEMETA_TABLE || '';
const documentTable = process.env.DOCUMENT_TABLE || '';

export async function POST(request: Request) {
  try {
    const { resourceMetaId, folderName } = await request.json();
    const currentTimestamp = new Date().toISOString();

    debug('Updating last opened timestamp', { resourceMetaId, folderName });

    // Start both operations in parallel
    const [, getResourceMeta] = await Promise.all([
      client.send(
        new UpdateItemCommand({
          TableName: resourceMetaTable,
          Key: { id: { S: resourceMetaId } },
          UpdateExpression: 'SET lastOpened = :lastOpened',
          ExpressionAttributeValues: { ':lastOpened': { S: currentTimestamp } },
        }),
      ),
      client.send(
        new GetItemCommand({
          TableName: resourceMetaTable,
          Key: { id: { S: resourceMetaId } },
          ProjectionExpression: 'documentId',
        }),
      ),
    ]);

    if (!getResourceMeta.Item) {
      error('ResourceMeta not found', null, { resourceMetaId });
      return new Response(JSON.stringify({ error: 'ResourceMeta not found' }), {
        status: 404,
      });
    }

    const resourceMeta = unmarshall(getResourceMeta.Item);
    const { documentId } = resourceMeta;

    // Get document and update folder in one operation
    const getDocumentCommand = new GetItemCommand({
      TableName: documentTable,
      Key: { id: { S: documentId } },
      ProjectionExpression: 'id, folders',
    });

    const documentData = await client.send(getDocumentCommand);
    if (!documentData.Item) {
      error('Document not found', null, { documentId, resourceMetaId });
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
      });
    }

    const folders = unmarshall(documentData.Item).folders;
    if (!folders[folderName]) {
      error('Folder not found', null, {
        folderName,
        documentId,
        resourceMetaId,
      });
      return new Response(
        JSON.stringify({ error: `Folder "${folderName}" not found` }),
        { status: 404 },
      );
    }

    // Update specific resource in folder
    const updatedFolders = {
      ...folders,
      [folderName]: {
        ...folders[folderName],
        resources: folders[folderName].resources.map(
          (resource: ResourceCompressed) =>
            resource.id === resourceMetaId
              ? { ...resource, lastOpened: currentTimestamp }
              : resource,
        ),
      },
    };

    await client.send(
      new UpdateItemCommand({
        TableName: documentTable,
        Key: { id: { S: documentId } },
        UpdateExpression: 'SET folders = :folders',
        ExpressionAttributeValues: {
          ':folders': { M: marshall(updatedFolders) },
        },
      }),
    );

    debug('Successfully updated last opened timestamp', {
      resourceMetaId,
      documentId,
      folderName,
    });

    return new Response(
      JSON.stringify({
        message: 'Last opened updated successfully for resource and document',
      }),
      { status: 200 },
    );
  } catch (e: unknown) {
    error('Error updating lastOpened', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}
