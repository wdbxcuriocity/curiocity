import { D1Database } from '@cloudflare/workers-types';
import { validateData } from './validation';

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
  try {
    // Validate data before writing
    const validation = validateData(data, table);
    if (!validation.valid) {
      console.error(`Validation failed for ${table}:`, validation.error);
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
    console.error('Failed to put item in D1:', error);
    return { success: false, error };
  }
};

export const getD1Object = async (
  db: D1Database,
  id: string,
  table: string,
) => {
  try {
    const query = `SELECT * FROM ${table} WHERE id = ?`;
    const result = await db.prepare(query).bind(id).first();

    // Parse JSON fields if they exist
    if (result) {
      if (result.folders) result.folders = JSON.parse(result.folders as string);
      if (result.tags) result.tags = JSON.parse(result.tags as string);

      // Validate data after parsing
      const validation = validateData(result, table);
      if (!validation.valid) {
        console.error(
          `Retrieved invalid data from ${table}:`,
          validation.error,
        );
        return null;
      }
    }

    return result;
  } catch (error: any) {
    console.error('Error getting object from D1:', error);
    return null;
  }
};

export const deleteD1Object = async (
  db: D1Database,
  id: string,
  table: string,
) => {
  try {
    const query = `DELETE FROM ${table} WHERE id = ?`;
    await db.prepare(query).bind(id).run();
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting object from D1:', error);
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
