export interface Resource {
  id: string;
  markdown: string;
  url: string;
}

export interface ResourceCompressed {
  name: string;
  id: string;
  dateAdded: string;
  lastOpened: string;
  fileType: string;
}

export interface FolderData {
  name: string;
  resources: Array<ResourceCompressed>;
}

export interface Document {
  id: string;
  name: string;
  text: string;
  folders: Record<string, FolderData>;
  dateAdded: string;
  lastOpened: string;
  tags: Array<string>;
  ownerID: string;
}

export interface ResourceMeta {
  id: string;
  hash: string;
  name: string;
  dateAdded: string;
  lastOpened: string;
  notes: string;
  summary: string;
  tags: Array<string>;
  documentId: string;
  fileType: string;
}
