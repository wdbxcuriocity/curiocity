import { Document, Resource, ResourceMeta } from './cloudflare';

// Validate Document structure
export function validateDocument(doc: Document): {
  valid: boolean;
  error?: string;
} {
  if (!doc.id) return { valid: false, error: 'Missing id' };
  if (!doc.ownerID) return { valid: false, error: 'Missing ownerID' };
  if (!doc.name) return { valid: false, error: 'Missing name' };
  if (!doc.folders) return { valid: false, error: 'Missing folders' };
  if (!doc.dateAdded) return { valid: false, error: 'Missing dateAdded' };
  if (!doc.lastOpened) return { valid: false, error: 'Missing lastOpened' };
  if (!Array.isArray(doc.tags))
    return { valid: false, error: 'Tags must be an array' };
  return { valid: true };
}

// Validate Resource structure
export function validateResource(res: Resource): {
  valid: boolean;
  error?: string;
} {
  if (!res.id) return { valid: false, error: 'Missing id' };
  if (!res.markdown) return { valid: false, error: 'Missing markdown' };
  if (!res.url) return { valid: false, error: 'Missing url' };
  return { valid: true };
}

// Validate ResourceMeta structure
export function validateResourceMeta(meta: ResourceMeta): {
  valid: boolean;
  error?: string;
} {
  if (!meta.id) return { valid: false, error: 'Missing id' };
  if (!meta.hash) return { valid: false, error: 'Missing hash' };
  if (!meta.name) return { valid: false, error: 'Missing name' };
  if (!meta.dateAdded) return { valid: false, error: 'Missing dateAdded' };
  if (!meta.lastOpened) return { valid: false, error: 'Missing lastOpened' };
  if (!Array.isArray(meta.tags))
    return { valid: false, error: 'Tags must be an array' };
  return { valid: true };
}

// Validate data based on table name
export function validateData(
  data: any,
  table: string,
): { valid: boolean; error?: string } {
  switch (table) {
    case 'Documents':
      return validateDocument(data as Document);
    case 'Resources':
      return validateResource(data as Resource);
    case 'ResourceMeta':
      return validateResourceMeta(data as ResourceMeta);
    default:
      return { valid: false, error: `Unknown table: ${table}` };
  }
}
