import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { getObject, putObject } from '../../route';
import { debug, error } from '@/lib/logging';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { ResourceMeta } from '@/types/types';
import { log, redact } from '@/lib/logging';

dotenv.config();

const client = new DynamoDBClient({ region: 'us-west-1' });
const resourceMetaTable = process.env.RESOURCEMETA_TABLE || '';

// **GET API: Fetch notes for a given resourceMeta ID**
export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();
  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get('id');

  try {
    if (!resourceId) {
      log({
        level: 'ERROR',
        service: 'resourcemeta-notes',
        message: 'Missing resourceId parameter',
        correlationId,
        metadata: redact({
          resourceId,
        }),
      });
      return new Response(JSON.stringify({ err: 'Missing resourceId' }), {
        status: 400,
      });
    }

    debug('Fetching resource notes', { resourceId, correlationId });
    const resourceMeta = await getObject(client, resourceId, resourceMetaTable);

    if (!resourceMeta.Item) {
      error('ResourceMeta not found', null, { resourceId, correlationId });
      return new Response(JSON.stringify({ err: 'ResourceMeta not found' }), {
        status: 404,
      });
    }

    const resourceMetaData = unmarshall(resourceMeta.Item) as ResourceMeta;
    log({
      level: 'INFO',
      service: 'resourcemeta-notes',
      message: 'Successfully fetched resource notes',
      correlationId,
      metadata: redact({
        resourceId,
        noteLength: resourceMetaData.notes?.length || 0,
      }),
    });

    return new Response(
      JSON.stringify({ notes: resourceMetaData.notes || '' }),
      { status: 200 },
    );
  } catch (e: unknown) {
    log({
      level: 'ERROR',
      service: 'resourcemeta-notes',
      message: 'Failed to fetch resource notes',
      correlationId,
      error: e,
      metadata: redact({
        resourceId,
      }),
    });
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}

// **PUT API: Update notes for a given resourceMeta ID**
export async function PUT(request: Request) {
  const correlationId = crypto.randomUUID();
  let resourceId: string | undefined;

  try {
    const data = await request.json();
    resourceId = data.id;

    log({
      level: 'INFO',
      service: 'resourcemeta-notes',
      message: 'Notes update initiated',
      correlationId,
      metadata: redact({
        resourceId,
        operation: 'UPDATE',
      }),
    });

    const { notes } = data;
    debug('PUT request received', { resourceId });

    if (!data.id || typeof notes !== 'string') {
      error('Missing or invalid parameters', null, {
        resourceId,
        hasNotes: !!notes,
      });
      return new Response(
        JSON.stringify({ err: 'Missing or invalid parameters' }),
        { status: 400 },
      );
    }

    // Retrieve the existing resourceMeta
    const resourceMeta = await getObject(client, data.id, resourceMetaTable);

    if (!resourceMeta.Item) {
      error('ResourceMeta not found', null, { resourceId });
      return new Response(JSON.stringify({ err: 'ResourceMeta not found' }), {
        status: 404,
      });
    }

    const existingResourceMeta = unmarshall(resourceMeta.Item) as ResourceMeta;

    // Update the notes
    const updatedResourceMeta = {
      ...existingResourceMeta,
      notes,
      updatedAt: new Date().toISOString(),
    };

    const input = marshall(updatedResourceMeta);
    await putObject(client, input, resourceMetaTable);
    debug('Notes updated successfully', { resourceId });

    return new Response(JSON.stringify({ msg: 'Notes updated successfully' }), {
      status: 200,
    });
  } catch (e: unknown) {
    log({
      level: 'ERROR',
      service: 'resourcemeta-notes',
      message: 'Failed to update notes',
      correlationId,
      error: e,
      metadata: redact({
        resourceId,
      }),
    });
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}

// **DELETE API: Delete notes for a given resourceMeta ID**
export async function DELETE(request: Request) {
  const correlationId = crypto.randomUUID();
  const { searchParams } = new URL(request.url);
  const resourceId = searchParams.get('id');

  try {
    debug('Deleting resource notes', { resourceId });
    if (!resourceId) {
      error('Missing resourceMeta ID');
      return new Response(JSON.stringify({ err: 'Missing resourceMeta ID' }), {
        status: 400,
      });
    }

    const resourceMeta = await getObject(client, resourceId, resourceMetaTable);

    if (!resourceMeta.Item) {
      error('ResourceMeta not found', null, { resourceId });
      return new Response(JSON.stringify({ err: 'ResourceMeta not found' }), {
        status: 404,
      });
    }

    const resourceMetaData = unmarshall(resourceMeta.Item) as ResourceMeta;
    resourceMetaData.notes = '';

    await putObject(client, resourceMetaData, resourceMetaTable);
    debug('Notes deleted successfully', { resourceId });

    return new Response(
      JSON.stringify({ message: 'Notes deleted successfully' }),
      {
        status: 200,
      },
    );
  } catch (e: unknown) {
    error('Error deleting resource notes', e, {
      resourceId,
      correlationId,
    });
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}
