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
    const { documentId, oldFolderName, newFolderName } = await request.json();

    if (!documentId || !oldFolderName || !newFolderName) {
      return new Response(
        JSON.stringify({
          error: 'documentId, oldFolderName, and newFolderName are required',
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

    // Check if the old folder exists
    if (!document.folders || !document.folders[oldFolderName]) {
      return new Response(
        JSON.stringify({ error: 'Old folder name does not exist' }),
        { status: 400 },
      );
    }

    // Check if the new folder name already exists
    if (document.folders[newFolderName]) {
      return new Response(
        JSON.stringify({ error: 'New folder name already exists' }),
        { status: 400 },
      );
    }

    // Rename the folder
    const updatedFolders = { ...document.folders };
    const folderData = updatedFolders[oldFolderName];
    delete updatedFolders[oldFolderName];
    folderData.name = newFolderName; // Update the name field
    updatedFolders[newFolderName] = folderData;

    // Update the document in the database
    const updateParams = {
      TableName: documentTable,
      Key: {
        id: { S: documentId },
      },
      UpdateExpression: 'SET folders = :folders',
      ExpressionAttributeValues: {
        ':folders': { M: AWS.DynamoDB.Converter.marshall(updatedFolders) },
      },
    };

    const updateCommand = new UpdateItemCommand(updateParams);
    await client.send(updateCommand);

    return new Response(
      JSON.stringify({
        message: 'Folder renamed successfully',
        updatedFolders,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error('Error renaming folder:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}
