import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import AWS from 'aws-sdk';
import { ResourceMeta, putObject, getObject } from '../../route';

dotenv.config();

const client = new DynamoDBClient({ region: 'us-west-1' });
export const resourceMetaTable = process.env.RESOURCEMETA_TABLE || '';

// **GET API: Fetch notes for a given resourceMeta ID**
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ err: 'Missing resourceMeta ID' }), {
        status: 400,
      });
    }

    // Retrieve the resourceMeta by ID
    const resourceMeta = await getObject(client, id, resourceMetaTable);

    if (!resourceMeta.Item) {
      return new Response(JSON.stringify({ err: 'ResourceMeta not found' }), {
        status: 404,
      });
    }

    const resourceMetaData = AWS.DynamoDB.Converter.unmarshall(
      resourceMeta.Item,
    ) as ResourceMeta;

    return new Response(
      JSON.stringify({ notes: resourceMetaData.notes || '' }),
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in GET Notes API:', error);
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}

// **PUT API: Update notes for a given resourceMeta ID**
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, notes } = data;

    if (!id || typeof notes !== 'string') {
      return new Response(
        JSON.stringify({ err: 'Missing or invalid parameters' }),
        { status: 400 },
      );
    }

    // Retrieve the existing resourceMeta
    const resourceMeta = await getObject(client, id, resourceMetaTable);

    if (!resourceMeta.Item) {
      return new Response(JSON.stringify({ err: 'ResourceMeta not found' }), {
        status: 404,
      });
    }

    const existingResourceMeta = AWS.DynamoDB.Converter.unmarshall(
      resourceMeta.Item,
    ) as ResourceMeta;

    // Update the notes
    const updatedResourceMeta = {
      ...existingResourceMeta,
      notes,
      updatedAt: new Date().toISOString(),
    };

    const input = AWS.DynamoDB.Converter.marshall(updatedResourceMeta);
    await putObject(client, input, resourceMetaTable);

    return new Response(JSON.stringify({ msg: 'Notes updated successfully' }), {
      status: 200,
    });
  } catch (error) {
    console.error('Error in PUT Notes API:', error);
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}

// **DELETE API: Clear notes for a given resourceMeta ID**
export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    const { id } = data;

    if (!id) {
      return new Response(JSON.stringify({ err: 'Missing resourceMeta ID' }), {
        status: 400,
      });
    }

    // Retrieve the existing resourceMeta
    const resourceMeta = await getObject(client, id, resourceMetaTable);

    if (!resourceMeta.Item) {
      return new Response(JSON.stringify({ err: 'ResourceMeta not found' }), {
        status: 404,
      });
    }

    const existingResourceMeta = AWS.DynamoDB.Converter.unmarshall(
      resourceMeta.Item,
    ) as ResourceMeta;

    // Clear the notes
    const updatedResourceMeta = {
      ...existingResourceMeta,
      notes: '',
      updatedAt: new Date().toISOString(),
    };

    const input = AWS.DynamoDB.Converter.marshall(updatedResourceMeta);
    await putObject(client, input, resourceMetaTable);

    return new Response(JSON.stringify({ msg: 'Notes cleared successfully' }), {
      status: 200,
    });
  } catch (error) {
    console.error('Error in DELETE Notes API:', error);
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}
