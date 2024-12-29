import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import AWS from 'aws-sdk';
import crypto from 'crypto';
import { putObject, getObject } from '../route';
import {
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

import {
  Resource,
  Document,
  ResourceMeta,
  ResourceCompressed,
} from '@/types/types';

dotenv.config();

const client = new DynamoDBClient({ region: 'us-west-1' });
export const documentTable = process.env.DOCUMENT_TABLE || '';
export const resourceMetaTable = process.env.RESOURCEMETA_TABLE || '';
export const resourceTable = process.env.RESOURCE_TABLE || '';

const generateFileHash = (fileBuffer: Buffer): string => {
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
};

function inferFileType(nameOrUrl: string): string {
  const lower = nameOrUrl.toLowerCase();

  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'Word';
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return 'Excel';
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return 'PowerPoint';
  if (lower.endsWith('.csv')) return 'CSV';
  if (lower.endsWith('.htm') || lower.endsWith('.html')) return 'HTML';
  if (lower.endsWith('.png')) return 'PNG';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'JPG';
  if (lower.endsWith('.gif')) return 'GIF';
  if (lower.startsWith('http')) return 'Link';

  return 'Other';
}

const MAX_MARKDOWN_SIZE = 350 * 1024; // 350 KB to stay safely within the 400 KB limit

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const requiredFields = [
      'documentId',
      'name',
      'folderName',
      'file',
      'url',
      'dateAdded',
    ];
    for (const field of requiredFields) {
      if (!data[field]) {
        console.error(`Missing field: ${field}`);
        return new Response(
          JSON.stringify({ err: `Missing field: ${field}` }),
          { status: 400 },
        );
      }
    }

    const fileBuffer = Buffer.from(data.file, 'base64');
    const fileHash = generateFileHash(fileBuffer);

    const determinedFileType =
      data.fileType || inferFileType(data.name || data.url);

    const resourceMetaId = uuidv4();
    const resourceMetaItem: ResourceMeta = {
      id: resourceMetaId,
      hash: fileHash,
      name: data.name,
      lastOpened: data.lastOpened,
      dateAdded: data.dateAdded,
      notes: data.notes || '',
      summary: data.summary || '',
      tags: data.tags || [],
      documentId: data.documentId,
      fileType: determinedFileType,
    };
    const resourceMetaCompressed: ResourceCompressed = {
      id: resourceMetaId,
      name: data.name,
      lastOpened: data.lastOpened,
      dateAdded: data.dateAdded,
      fileType: determinedFileType,
    };

    if (data.markdown.length > MAX_MARKDOWN_SIZE) {
      console.warn('Markdown content truncated to fit within size limit.');
    }

    const resource: Resource = {
      id: fileHash,
      markdown:
        data.markdown && data.markdown.length > MAX_MARKDOWN_SIZE
          ? data.markdown.slice(0, MAX_MARKDOWN_SIZE) + '...'
          : data.markdown || '',
      url: data.url,
    };

    const document = await getObject(client, data.documentId, documentTable);
    if (!document.Item) {
      return new Response(JSON.stringify({ err: 'Document not found' }), {
        status: 404,
      });
    }

    const newDocument = AWS.DynamoDB.Converter.unmarshall(
      document.Item,
    ) as Document;

    if (!newDocument.folders[data.folderName]) {
      newDocument.folders[data.folderName] = {
        name: data.folderName,
        resources: [],
      };
    }

    newDocument.folders[data.folderName].resources.push(resourceMetaCompressed);

    const inputResourceMetaData =
      AWS.DynamoDB.Converter.marshall(resourceMetaItem);
    const inputResourceData = AWS.DynamoDB.Converter.marshall(resource);
    const inputDocumentData = AWS.DynamoDB.Converter.marshall(newDocument);

    const existingResource = await getObject(client, fileHash, resourceTable);

    if (!existingResource.Item) {
      await putObject(client, inputResourceData, resourceTable);
    }

    await putObject(client, inputResourceMetaData, resourceMetaTable);
    await putObject(client, inputDocumentData, documentTable);

    console.log('Successfully updated DynamoDB');
    return new Response(JSON.stringify(newDocument), { status: 200 });
  } catch (error) {
    console.error('Error in POST request:', error);
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('resourceId');

    if (!id) {
      return new Response(JSON.stringify({ err: 'Missing resourceId' }), {
        status: 400,
      });
    }

    const resourceMeta = await getObject(client, id, resourceMetaTable);
    if (!resourceMeta.Item) {
      return new Response(JSON.stringify({ err: 'ResourceMeta not found' }), {
        status: 404,
      });
    }

    const resourceMetaData = AWS.DynamoDB.Converter.unmarshall(
      resourceMeta.Item,
    ) as ResourceMeta;

    return new Response(JSON.stringify(resourceMetaData), { status: 200 });
  } catch (error) {
    console.error('Error in GET request:', error);
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, name, notes, summary, tags } = data;

    if (!id) {
      return new Response(JSON.stringify({ err: 'Missing resourceMeta ID' }), {
        status: 400,
      });
    }

    const resourceMeta = await getObject(client, id, resourceMetaTable);
    if (!resourceMeta.Item) {
      return new Response(JSON.stringify({ err: 'ResourceMeta not found' }), {
        status: 404,
      });
    }

    const existingResourceMeta = AWS.DynamoDB.Converter.unmarshall(
      resourceMeta.Item,
    ) as ResourceMeta;

    const updatedResourceMeta = {
      ...existingResourceMeta,
      name: name || existingResourceMeta.name,
      notes: notes || existingResourceMeta.notes,
      summary: summary || existingResourceMeta.summary,
      tags: tags || existingResourceMeta.tags,
      updatedAt: new Date().toISOString(),
    };

    const input = AWS.DynamoDB.Converter.marshall(updatedResourceMeta);
    await putObject(client, input, resourceMetaTable);

    return new Response(JSON.stringify(updatedResourceMeta), { status: 200 });
  } catch (error) {
    console.error('Error in PUT request:', error);
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}
