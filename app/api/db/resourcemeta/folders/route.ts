import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import AWS from 'aws-sdk';
import { getObject, putObject, Document } from '../../route';

dotenv.config();

const client = new DynamoDBClient({ region: 'us-west-1' });
const documentTable = process.env.DOCUMENT_TABLE || '';

export async function PUT(request: Request) {
  try {
    console.log('PUT request to move resource between folders received');

    const data = await request.json();
    const { documentId, resourceId, sourceFolderName, targetFolderName } = data;

    // Validate input
    if (!documentId || !resourceId || !sourceFolderName || !targetFolderName) {
      console.error(
        'Missing required fields: documentId, resourceId, sourceFolderName, targetFolderName',
      );
      return new Response(
        JSON.stringify({
          err: 'Missing required fields: documentId, resourceId, sourceFolderName, targetFolderName',
        }),
        { status: 400 },
      );
    }

    // Retrieve the document
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

    // Validate folders and find the resource
    const sourceFolder = existingDocument.folders[sourceFolderName];
    if (!sourceFolder) {
      console.error('Source folder not found:', sourceFolderName);
      return new Response(JSON.stringify({ err: 'Source folder not found' }), {
        status: 404,
      });
    }

    const resourceIndex = sourceFolder.resources.findIndex(
      (resource) => resource.id === resourceId,
    );
    if (resourceIndex === -1) {
      console.error(
        `Resource with ID: ${resourceId} not found in source folder: ${sourceFolderName}`,
      );
      return new Response(
        JSON.stringify({ err: 'Resource not found in source folder' }),
        { status: 404 },
      );
    }

    const [movedResource] = sourceFolder.resources.splice(resourceIndex, 1);

    // Add the resource to the target folder
    if (!existingDocument.folders[targetFolderName]) {
      existingDocument.folders[targetFolderName] = {
        name: targetFolderName,
        resources: [],
      };
    }

    existingDocument.folders[targetFolderName].resources.push(movedResource);

    // Save updated document back to DynamoDB
    const updatedDocument = {
      ...existingDocument,
      updatedAt: new Date().toISOString(),
    };
    const inputDocument = AWS.DynamoDB.Converter.marshall(updatedDocument);
    await putObject(client, inputDocument, documentTable);

    console.log('Document updated successfully');
    return new Response(
      JSON.stringify({ msg: 'Resource moved successfully' }),
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in PUT request to move resource:', error);
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}
