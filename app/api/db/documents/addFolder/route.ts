import dotenv from 'dotenv';
import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { log, redact } from '@/lib/logging';

dotenv.config();

const client = new DynamoDBClient({ region: 'us-west-1' });
const documentTable = process.env.DOCUMENT_TABLE || '';

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  let requestData;
  try {
    requestData = await request.json();
    const { documentId, folderName } = requestData;

    if (!documentId || !folderName) {
      log({
        level: 'ERROR',
        service: 'document-folders',
        message: 'Missing required fields',
        correlationId,
        metadata: redact({
          documentId,
          folderName,
        }),
      });
      return new Response(
        JSON.stringify({
          error: 'documentId and folderName are required',
        }),
        { status: 400 },
      );
    }

    // Fetch the current document
    const getDocumentParams = {
      TableName: documentTable,
      Key: marshall({ id: documentId }),
    };

    const getCommand = new GetItemCommand(getDocumentParams);
    const documentData = await client.send(getCommand);

    if (!documentData.Item) {
      log({
        level: 'ERROR',
        service: 'document-folders',
        message: 'Document not found',
        correlationId,
        metadata: redact({
          documentId,
        }),
      });
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
      });
    }

    const document = unmarshall(documentData.Item);

    // Check if the folder already exists
    if (document.folders && document.folders[folderName]) {
      log({
        level: 'ERROR',
        service: 'document-folders',
        message: 'Folder already exists',
        correlationId,
        metadata: redact({
          documentId,
          folderName,
        }),
      });
      return new Response(JSON.stringify({ error: 'Folder already exists' }), {
        status: 400,
      });
    }

    // Add the new folder
    document.folders = document.folders || {};
    document.folders[folderName] = {
      name: folderName,
      resources: [],
    };

    // Update the document in the database
    const updateParams = {
      TableName: documentTable,
      Key: marshall({ id: documentId }),
      UpdateExpression: 'SET folders = :folders',
      ExpressionAttributeValues: marshall({
        ':folders': document.folders,
      }),
    };

    const updateCommand = new UpdateItemCommand(updateParams);
    await client.send(updateCommand);

    log({
      level: 'INFO',
      service: 'document-folders',
      message: 'Folder added successfully',
      correlationId,
      metadata: redact({
        documentId,
        folderName,
      }),
    });

    return new Response(
      JSON.stringify({ message: 'Folder added successfully' }),
      {
        status: 200,
      },
    );
  } catch (error) {
    log({
      level: 'ERROR',
      service: 'document-folders',
      message: 'Failed to add folder',
      correlationId,
      error,
      metadata: redact({
        documentId: requestData?.documentId,
        folderName: requestData?.folderName,
      }),
    });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}
