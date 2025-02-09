import { getObject, putObject } from '../../route';
import { debug, error } from '@/lib/logging';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Document, ResourceMeta } from '@/types/types';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'us-west-1' });
const resourceMetaTable = process.env.RESOURCEMETA_TABLE || '';
const documentTable = process.env.DOCUMENT_TABLE || '';

export async function PUT(request: Request) {
  try {
    const { resourceId, name } = await request.json();
    debug('PUT request received', { resourceId, name });

    // Validate input
    if (!resourceId || !name) {
      error('Missing required fields', null, { resourceId, name });
      return new Response(
        JSON.stringify({
          err: 'Missing required fields: resourceId or name',
        }),
        { status: 400 },
      );
    }

    // Retrieve the existing resourceMeta
    const resourceMeta = await getObject(client, resourceId, resourceMetaTable);
    if (!resourceMeta.Item) {
      error('ResourceMeta not found', null, { resourceId });
      return new Response(JSON.stringify({ err: 'ResourceMeta not found' }), {
        status: 404,
      });
    }

    const existingResourceMeta = unmarshall(resourceMeta.Item) as ResourceMeta;

    // Update resourceMeta name
    const updatedResourceMeta = {
      ...existingResourceMeta,
      name,
      updatedAt: new Date().toISOString(),
    };

    // Marshall the data before calling putObject
    const inputResourceMeta = marshall(updatedResourceMeta);

    // Update the resourceMeta in DynamoDB
    await putObject(client, inputResourceMeta, resourceMetaTable);
    debug('Updated resourceMeta in DynamoDB', { resourceId, name });

    // Retrieve the associated document
    const document = await getObject(
      client,
      existingResourceMeta.documentId,
      documentTable,
    );
    if (!document.Item) {
      error('Document not found', null, {
        documentId: existingResourceMeta.documentId,
      });
      return new Response(JSON.stringify({ err: 'Document not found' }), {
        status: 404,
      });
    }

    const existingDocument = unmarshall(document.Item) as Document;

    // Update the resource name in the document's data structure
    const updatedFolders = { ...existingDocument.folders };
    let resourceFound = false;

    for (const folderName in updatedFolders) {
      const folder = updatedFolders[folderName];
      const updatedResources = folder.resources.map((resource) => {
        if (resource.id === resourceId) {
          resourceFound = true;
          return { ...resource, name };
        }
        return resource;
      });
      updatedFolders[folderName] = { ...folder, resources: updatedResources };
    }

    if (!resourceFound) {
      debug('ResourceMeta not found in any document folder', {
        resourceId,
        documentId: existingResourceMeta.documentId,
      });
    } else {
      // Save updated document back to DynamoDB
      const updatedDocument = {
        ...existingDocument,
        folders: updatedFolders,
        updatedAt: new Date().toISOString(),
      };

      // Marshall the data before calling putObject
      const inputDocument = marshall(updatedDocument);
      await putObject(client, inputDocument, documentTable);
      debug('Updated document in DynamoDB', {
        documentId: existingResourceMeta.documentId,
        resourceId,
      });
    }

    debug('Resource name updated successfully');
    return new Response(
      JSON.stringify({ msg: 'Resource name updated successfully' }),
      {
        status: 200,
      },
    );
  } catch (e: unknown) {
    error('Error updating resource name', e);
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}
