import {
  DynamoDBClient,
  UpdateItemCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import AWS from 'aws-sdk';

const client = new DynamoDBClient({ region: 'us-west-1' });
const resourceMetaTable = process.env.RESOURCEMETA_TABLE || '';
const documentTable = process.env.DOCUMENT_TABLE || '';

export async function POST(request: Request) {
  try {
    const { resourceMetaId, folderName } = await request.json();

    if (!resourceMetaId) {
      return new Response(
        JSON.stringify({ error: 'resourceMetaId is required' }),
        { status: 400 },
      );
    }

    const currentTimestamp = new Date().toISOString();

    const updateResourceParams = {
      TableName: resourceMetaTable,
      Key: AWS.DynamoDB.Converter.marshall({ id: resourceMetaId }),
      UpdateExpression: 'SET lastOpened = :lastOpened',
      ExpressionAttributeValues: {
        ':lastOpened': AWS.DynamoDB.Converter.input(currentTimestamp),
      },
      ReturnValues: 'UPDATED_NEW',
    };

    const updateResourceCommand = new UpdateItemCommand(updateResourceParams);
    await client.send(updateResourceCommand);

    const getResourceMetaParams = {
      TableName: resourceMetaTable,
      Key: AWS.DynamoDB.Converter.marshall({ id: resourceMetaId }),
    };

    const getResourceMetaCommand = new GetItemCommand(getResourceMetaParams);
    const resourceMetaData = await client.send(getResourceMetaCommand);

    if (!resourceMetaData.Item) {
      console.error('ResourceMeta not found for ID:', resourceMetaId);
      return new Response(JSON.stringify({ error: 'ResourceMeta not found' }), {
        status: 404,
      });
    }

    const resourceMeta = AWS.DynamoDB.Converter.unmarshall(
      resourceMetaData.Item,
    );
    const { documentId } = resourceMeta;

    // Fetch the document to locate the resource within the folder
    const getDocumentParams = {
      TableName: documentTable,
      Key: AWS.DynamoDB.Converter.marshall({ id: documentId }),
    };

    const getDocumentCommand = new GetItemCommand(getDocumentParams);
    const documentData = await client.send(getDocumentCommand);

    if (!documentData.Item) {
      console.error('Document not found for ID:', documentId);
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
      });
    }

    const document = AWS.DynamoDB.Converter.unmarshall(documentData.Item);

    // Update the specific resource in the folder
    let resourceUpdated = false;
    if (document.folders[folderName]) {
      document.folders[folderName].resources = document.folders[
        folderName
      ].resources.map((resource: any) => {
        if (resource.id === resourceMetaId) {
          resource.lastOpened = currentTimestamp;
          resourceUpdated = true;
        }
        return resource;
      });
    } else {
      console.error('Folder not found:', folderName);
      return new Response(
        JSON.stringify({ error: `Folder "${folderName}" not found` }),
        { status: 404 },
      );
    }

    if (!resourceUpdated) {
      console.error(
        'Resource not found in folder:',
        resourceMetaId,
        folderName,
      );
      return new Response(
        JSON.stringify({ error: 'Resource not found in folder' }),
        { status: 404 },
      );
    }

    // Update the Document table with the modified folders
    const updateDocumentParams = {
      TableName: documentTable,
      Key: AWS.DynamoDB.Converter.marshall({ id: documentId }),
      UpdateExpression: 'SET folders = :folders',
      ExpressionAttributeValues: {
        ':folders': AWS.DynamoDB.Converter.input(document.folders),
      },
      ReturnValues: 'UPDATED_NEW',
    };

    const updateDocumentCommand = new UpdateItemCommand(updateDocumentParams);
    await client.send(updateDocumentCommand);

    return new Response(
      JSON.stringify({
        message: 'Last opened updated successfully for resource and document',
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error('Error updating lastOpened:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}
