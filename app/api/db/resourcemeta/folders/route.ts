import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { getObject, putObject, Document } from '../../route';
import { log, redact } from '@/lib/logging';

dotenv.config();

const client = new DynamoDBClient({ region: 'us-west-1' });
const documentTable = process.env.DOCUMENT_TABLE || '';

export async function PUT(request: Request) {
  const correlationId = crypto.randomUUID();
  let data;
  try {
    data = await request.json();
    const { documentId, resourceId, sourceFolderName, targetFolderName } = data;

    log({
      level: 'INFO',
      service: 'resource-folders',
      message: 'Resource move initiated',
      correlationId,
      metadata: redact({
        documentId,
        resourceId,
        sourceFolderName,
        targetFolderName,
      }),
    });

    // Validate input
    if (!documentId || !resourceId || !sourceFolderName || !targetFolderName) {
      log({
        level: 'ERROR',
        service: 'resource-folders',
        message: 'Missing required fields for resource move',
        correlationId,
        metadata: redact({
          documentId,
          resourceId,
          sourceFolderName,
          targetFolderName,
        }),
      });
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
      log({
        level: 'ERROR',
        service: 'resource-folders',
        message: 'Document not found',
        correlationId,
        metadata: redact({
          documentId,
        }),
      });
      return new Response(JSON.stringify({ err: 'Document not found' }), {
        status: 404,
      });
    }

    const existingDocument = unmarshall(document.Item) as Document;

    // Validate folders and find the resource
    const sourceFolder = existingDocument.folders[sourceFolderName];
    if (!sourceFolder) {
      log({
        level: 'ERROR',
        service: 'resource-folders',
        message: 'Source folder not found',
        correlationId,
        metadata: redact({
          documentId,
          sourceFolderName,
        }),
      });
      return new Response(JSON.stringify({ err: 'Source folder not found' }), {
        status: 404,
      });
    }

    const resourceIndex = sourceFolder.resources.findIndex(
      (resource) => resource.id === resourceId,
    );
    if (resourceIndex === -1) {
      log({
        level: 'ERROR',
        service: 'resource-folders',
        message: 'Resource not found in source folder',
        correlationId,
        metadata: redact({
          documentId,
          resourceId,
          sourceFolderName,
        }),
      });
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

    // Marshall the data before calling putObject
    const inputDocument = marshall(updatedDocument);
    await putObject(client, inputDocument, documentTable);

    log({
      level: 'INFO',
      service: 'resource-folders',
      message: 'Resource moved successfully',
      correlationId,
      metadata: redact({
        documentId,
        resourceId,
        sourceFolderName,
        targetFolderName,
      }),
    });

    return new Response(
      JSON.stringify({ msg: 'Resource moved successfully' }),
      {
        status: 200,
      },
    );
  } catch (error) {
    log({
      level: 'ERROR',
      service: 'resource-folders',
      message: 'Failed to move resource',
      correlationId,
      error,
      metadata: redact({
        documentId: data?.documentId,
        resourceId: data?.resourceId,
      }),
    });
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}
