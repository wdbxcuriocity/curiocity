import { Document, Resource, ResourceMeta } from './cloudflare';

// Validate Document structure
export function validateDocument(doc: Document): {
  success: boolean;
  error?: string;
} {
  if (!doc.id) return { success: false, error: 'Missing id' };
  if (!doc.ownerID) return { success: false, error: 'Missing ownerID' };
  if (!doc.name) return { success: false, error: 'Missing name' };
  if (!doc.folders) return { success: false, error: 'Missing folders' };
  if (!doc.dateAdded) return { success: false, error: 'Missing dateAdded' };
  if (!doc.lastOpened) return { success: false, error: 'Missing lastOpened' };
  if (!Array.isArray(doc.tags))
    return { success: false, error: 'Tags must be an array' };
  return { success: true };
}

// Validate Resource structure
export function validateResource(res: Resource): {
  success: boolean;
  error?: string;
} {
  if (!res.id) return { success: false, error: 'Missing id' };
  if (!res.markdown) return { success: false, error: 'Missing markdown' };
  if (!res.url) return { success: false, error: 'Missing url' };
  return { success: true };
}

// Validate ResourceMeta structure
export function validateResourceMeta(meta: ResourceMeta): {
  success: boolean;
  error?: string;
} {
  if (!meta.id) return { success: false, error: 'Missing id' };
  if (!meta.hash) return { success: false, error: 'Missing hash' };
  if (!meta.name) return { success: false, error: 'Missing name' };
  if (!meta.dateAdded) return { success: false, error: 'Missing dateAdded' };
  if (!meta.lastOpened) return { success: false, error: 'Missing lastOpened' };
  if (!Array.isArray(meta.tags))
    return { success: false, error: 'Tags must be an array' };
  return { success: true };
}

// Validate data based on table name
export function validateData(
  data: any,
  table: string,
): { success: boolean; error?: string } {
  switch (table) {
    case 'Documents':
      return validateDocument(data as Document);
    case 'Resources':
      return validateResource(data as Resource);
    case 'ResourceMeta':
      return validateResourceMeta(data as ResourceMeta);
    default:
      return { success: false, error: `Unknown table: ${table}` };
  }
}
