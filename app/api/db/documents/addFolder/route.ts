import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import AWS from 'aws-sdk';

const client = new DynamoDBClient({ region: 'us-west-1' });
const documentTable = process.env.DOCUMENT_TABLE || '';

export async function POST(request: Request) {
  try {
    const { documentId, folderName } = await request.json();

    if (!documentId || !folderName) {
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
      Key: {
        id: { S: documentId },
      },
    };

    const getCommand = new GetItemCommand(getDocumentParams);
    const documentData = await client.send(getCommand);

    if (!documentData.Item) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
      });
    }

    const document = AWS.DynamoDB.Converter.unmarshall(documentData.Item);

    // Check if the folder already exists
    if (document.folders && document.folders[folderName]) {
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
      Key: {
        id: { S: documentId },
      },
      UpdateExpression: 'SET folders = :folders',
      ExpressionAttributeValues: {
        ':folders': { M: AWS.DynamoDB.Converter.marshall(document.folders) },
      },
    };

    const updateCommand = new UpdateItemCommand(updateParams);
    await client.send(updateCommand);

    return new Response(
      JSON.stringify({
        message: 'Folder added successfully',
        updatedFolders: document.folders,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error('Error adding folder:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}
