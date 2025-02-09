import { D1Database } from '@cloudflare/workers-types';
import { log, redact } from '@/lib/logging';
import { z } from 'zod';

interface ValidationResult {
  success: boolean;
  error?: unknown;
}

// Types from DynamoDB operations
export type Resource = {
  id: string;
  markdown: string;
  url: string;
};

export type ResourceMetaCompressed = {
  id: string;
  name: string;
};

export type ResourceMeta = {
  id: string;
  hash: string;
  name: string;
  dateAdded: string;
  lastOpened: string;
  notes: string;
  summary: string;
  tags: Array<string>;
};

export type Document = {
  id: string;
  ownerID: string;
  name: string;
  folders: Record<string, Folder>;
  text: string;
  dateAdded: string;
  lastOpened: string;
  tags: Array<string>;
};

export type Folder = {
  name: string;
  resources: Array<ResourceMetaCompressed>;
};

// Core D1 Database operations that mirror our DynamoDB operations
export const putD1Object = async (db: D1Database, data: any, table: string) => {
  const correlationId = crypto.randomUUID();
  try {
    // Validate data before writing
    const validation = validateData(table, data);
    if (!validation.success) {
      log({
        level: 'ERROR',
        service: 'database',
        message: `Validation failed for ${table}`,
        correlationId,
        error: validation.error,
        metadata: redact({
          table,
          data,
        }),
      });
      return { success: false, error: validation.error };
    }

    // Convert any JSON fields to strings for SQLite storage
    const sqlData = { ...data };
    if (sqlData.folders) sqlData.folders = JSON.stringify(sqlData.folders);
    if (sqlData.tags) sqlData.tags = JSON.stringify(sqlData.tags);

    const columns = Object.keys(sqlData);
    const values = Object.values(sqlData);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const query = `
      INSERT OR REPLACE INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
    `;

    await db
      .prepare(query)
      .bind(...values)
      .run();

    return { success: true };
  } catch (error: any) {
    log({
      level: 'ERROR',
      service: 'database',
      message: 'Failed to put item in D1',
      correlationId,
      error,
      metadata: redact({
        table,
        id: data?.id,
      }),
    });
    return { success: false, error };
  }
};

export const getD1Object = async (
  db: D1Database,
  id: string,
  table: string,
) => {
  const correlationId = crypto.randomUUID();
  try {
    const query = `SELECT * FROM ${table} WHERE id = ?`;
    const result = await db.prepare(query).bind(id).first();

    // Parse JSON fields if they exist
    if (result) {
      if (result.folders) result.folders = JSON.parse(result.folders as string);
      if (result.tags) result.tags = JSON.parse(result.tags as string);

      // Validate data after parsing
      const validation = validateData(table, result);
      if (!validation.success) {
        log({
          level: 'ERROR',
          service: 'database',
          message: 'Retrieved invalid data from D1',
          correlationId,
          error: validation.error,
          metadata: redact({
            table,
            id,
          }),
        });
        return null;
      }
    }

    return result;
  } catch (error: any) {
    log({
      level: 'ERROR',
      service: 'database',
      message: 'Failed to get item from D1',
      correlationId,
      error,
      metadata: redact({
        table,
        id,
      }),
    });
    return null;
  }
};

export const deleteD1Object = async (
  db: D1Database,
  id: string,
  table: string,
) => {
  const correlationId = crypto.randomUUID();
  try {
    const query = `DELETE FROM ${table} WHERE id = ?`;
    await db.prepare(query).bind(id).run();
    return { success: true };
  } catch (error: any) {
    log({
      level: 'ERROR',
      service: 'database',
      message: 'Failed to delete item from D1',
      correlationId,
      error,
      metadata: redact({
        table,
        id,
      }),
    });
    return { success: false, error };
  }
};

// Helper function to convert DynamoDB-style data to SQL-friendly format
export const convertToSQLData = (data: any): any => {
  // Handle JSON fields
  if (data.folders) {
    data.folders = JSON.stringify(data.folders);
  }
  if (data.tags) {
    data.tags = JSON.stringify(data.tags);
  }
  return data;
};

// Helper function to convert SQL data back to application format
export const convertFromSQLData = (data: any): any => {
  // Parse JSON fields
  if (data.folders) {
    data.folders = JSON.parse(data.folders);
  }
  if (data.tags) {
    data.tags = JSON.parse(data.tags);
  }
  return data;
};

function validateData(table: string, data: any): ValidationResult {
  // Define schemas for different tables
  const schemas: { [key: string]: z.ZodSchema } = {
    documents: z.object({
      id: z.string(),
      // Add other required fields
    }),
    resourcemeta: z.object({
      id: z.string(),
      // Add other required fields
    }),
  };

  const schema = schemas[table];
  if (!schema) {
    return { success: true }; // Skip validation if no schema defined
  }

  try {
    schema.parse(data);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}
