import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import AWS from 'aws-sdk';
import { getObject, putObject, Document, ResourceMeta } from '../../route';

dotenv.config();

const client = new DynamoDBClient({ region: 'us-west-1' });
const documentTable = process.env.DOCUMENT_TABLE || '';
const resourceMetaTable = process.env.RESOURCEMETA_TABLE || '';

export async function PUT(request: Request) {
  try {
    console.log('PUT request received');

    const data = await request.json();
    const { id, name, documentId } = data;

    // Validate input
    if (!id || !name || !documentId) {
      console.error('Missing required fields: id, name, or documentId');
      return new Response(
        JSON.stringify({
          err: 'Missing required fields: id, name, or documentId',
        }),
        { status: 400 },
      );
    }

    // Retrieve the existing resourceMeta
    const resourceMeta = await getObject(client, id, resourceMetaTable);
    if (!resourceMeta.Item) {
      console.error('ResourceMeta not found with ID:', id);
      return new Response(JSON.stringify({ err: 'ResourceMeta not found' }), {
        status: 404,
      });
    }

    const existingResourceMeta = AWS.DynamoDB.Converter.unmarshall(
      resourceMeta.Item,
    ) as ResourceMeta;

    // Update resourceMeta name
    const updatedResourceMeta = {
      ...existingResourceMeta,
      name,
      updatedAt: new Date().toISOString(),
    };

    const inputResourceMeta =
      AWS.DynamoDB.Converter.marshall(updatedResourceMeta);

    // Update the resourceMeta in DynamoDB
    await putObject(client, inputResourceMeta, resourceMetaTable);
    console.log('Updated resourceMeta in DynamoDB:', updatedResourceMeta);

    // Retrieve the associated document
    const document = await getObject(client, documentId, documentTable);
    if (!document.Item) {
      console.error('Document not found with ID:', documentId);
      return new Response(JSON.stringify({ err: 'Document not found' }), {
        status: 404,
      });
    }

    const existingDocument = AWS.DynamoDB.Converter.unmarshall(
      document.Item,
    ) as Document;

    // Update the resource name in the document's data structure
    const updatedFolders = { ...existingDocument.folders };
    let resourceFound = false;

    for (const folderName in updatedFolders) {
      const folder = updatedFolders[folderName];
      const updatedResources = folder.resources.map((resource) => {
        if (resource.id === id) {
          resourceFound = true;
          return { ...resource, name };
        }
        return resource;
      });
      updatedFolders[folderName] = { ...folder, resources: updatedResources };
    }

    if (!resourceFound) {
      console.warn('ResourceMeta not found in any document folder.');
    } else {
      // Save updated document back to DynamoDB
      const updatedDocument = {
        ...existingDocument,
        folders: updatedFolders,
        updatedAt: new Date().toISOString(),
      };

      const inputDocument = AWS.DynamoDB.Converter.marshall(updatedDocument);
      await putObject(client, inputDocument, documentTable);
      console.log('Updated document in DynamoDB:', updatedDocument);
    }

    return new Response(JSON.stringify(updatedResourceMeta), { status: 200 });
  } catch (error) {
    console.error('Error in PUT request:', error);
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}
