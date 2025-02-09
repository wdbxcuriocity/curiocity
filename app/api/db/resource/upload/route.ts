import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { putObject, getObject } from '../../route';
import { Resource } from '@/types/types';
import { log, redact } from '@/lib/logging';

dotenv.config();

const client = new DynamoDBClient({ region: 'us-west-1' });
export const resourceTable = process.env.RESOURCE_TABLE || '';

const MAX_MARKDOWN_SIZE = 350 * 1024; // 350 KB to stay safely within the 400 KB limit

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const data = await request.json();
    log({
      level: 'INFO',
      service: 'resource',
      message: 'Resource upload started',
      correlationId,
      metadata: redact({
        documentId: data.documentId,
        fileSize: data.markdown?.length,
      }),
    });
    const requiredFields = ['documentId', 'hash', 'url', 'markdown'];
    for (const field of requiredFields) {
      if (!data[field]) {
        log({
          level: 'ERROR',
          service: 'resource',
          message: `Missing required field for resource upload`,
          correlationId,
          metadata: redact({
            field,
            documentId: data.documentId,
          }),
        });
        return new Response(
          JSON.stringify({ err: `Missing field: ${field}` }),
          { status: 400 },
        );
      }
    }

    if (data.markdown.length > MAX_MARKDOWN_SIZE) {
      log({
        level: 'WARN',
        service: 'resource',
        message: 'Markdown content truncated to fit within size limit',
        correlationId,
        metadata: redact({
          documentId: data.documentId,
          originalSize: data.markdown.length,
          truncatedSize: MAX_MARKDOWN_SIZE,
        }),
      });
    }

    const resource: Resource = {
      id: data.hash,
      markdown:
        data.markdown && data.markdown.length > MAX_MARKDOWN_SIZE
          ? data.markdown.slice(0, MAX_MARKDOWN_SIZE) + '...'
          : data.markdown || '',
      url: data.url,
    };

    const existingResource = await getObject(client, data.hash, resourceTable);
    if (!existingResource.Item) {
      const inputResourceData = marshall(resource);
      await putObject(client, inputResourceData, resourceTable);
    }

    return new Response(JSON.stringify({ hash: data.hash }), { status: 200 });
  } catch (error) {
    const data = await request.json().catch(() => ({})); // Safely parse request
    log({
      level: 'ERROR',
      service: 'resource',
      message: 'Resource upload failed',
      correlationId,
      error,
      metadata: redact({
        documentId: data?.documentId,
      }),
    });
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}
