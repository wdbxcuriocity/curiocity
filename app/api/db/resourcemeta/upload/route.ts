import dotenv from 'dotenv';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import AWS from 'aws-sdk';
import { putObject, getObject } from '../../route';

import { Document, ResourceMeta, ResourceCompressed } from '@/types/types';

dotenv.config();

const client = new DynamoDBClient({ region: 'us-west-1' });
export const documentTable = process.env.DOCUMENT_TABLE || '';
export const resourceMetaTable = process.env.RESOURCEMETA_TABLE || '';

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

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const requiredFields = [
      'documentId',
      'name',
      'folderName',
      'fileHash',
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

    const determinedFileType =
      data.fileType || inferFileType(data.name || data.url);

    const resourceMetaId = uuidv4();
    const resourceMetaItem: ResourceMeta = {
      id: resourceMetaId,
      hash: data.fileHash,
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
    const inputDocumentData = AWS.DynamoDB.Converter.marshall(newDocument);

    await putObject(client, inputResourceMetaData, resourceMetaTable);
    await putObject(client, inputDocumentData, documentTable);
    return new Response(JSON.stringify(newDocument), { status: 200 });
  } catch (error) {
    console.error('Error in POST request:', error);
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}
