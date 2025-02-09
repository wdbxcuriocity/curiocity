'use client';

import {
  ResourceMeta,
  Resource,
  Document,
  FolderData,
  ResourceCompressed,
} from '@/types/types';
import { useSession } from 'next-auth/react';
import React, { createContext, useContext, useState, ReactNode } from 'react';
import crypto from 'crypto';
import { debounce } from 'lodash';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { debug, error } from '@/lib/logging';

interface CurrentResourceContextValue {
  currentResource: Resource | null;
  setCurrentResource: (resource: Resource | null) => void;
  currentResourceMeta: ResourceMeta | null;
  setCurrentResourceMeta: (meta: ResourceMeta | null) => void;
  fetchResourceMeta: (resourceMetaId: string) => Promise<ResourceMeta>;
  fetchResourceAndMeta: (
    resourceMetaId: string,
    folderName: string,
  ) => Promise<void>;
  uploadResource: (
    file: File,
    folderName: string,
    documentId: string,
  ) => Promise<void>;
  extractText: (file: File) => Promise<string | null>;
  moveResource: (
    resourceId: string,
    sourceFolderName: string,
    targetFolderName: string,
    documentId: string,
  ) => Promise<void>;
}

const CurrentResourceContext = createContext<
  CurrentResourceContextValue | undefined
>(undefined);

export function CurrentResourceProvider({ children }: { children: ReactNode }) {
  const [currentResource, setCurrentResource] = useState<Resource | null>(null);
  const [currentResourceMeta, setCurrentResourceMeta] =
    useState<ResourceMeta | null>(null);

  const fetchResourceMeta = async (
    resourceMetaId: string,
  ): Promise<ResourceMeta> => {
    try {
      const response = await fetch(
        `/api/db/resourcemeta?resourceId=${resourceMetaId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to fetch ResourceMeta (ID: ${resourceMetaId}): ${
            errorData.error || response.statusText
          }`,
        );
      }

      const resourceMeta = await response.json();
      return resourceMeta;
    } catch (e: unknown) {
      error('Error fetching ResourceMeta', e);
      throw e;
    }
  };

  const debouncedFetchResourceAndMeta = debounce(
    async (resourceMetaId: string, folderName: string) => {
      try {
        const resourceMeta = await fetchResourceMeta(resourceMetaId);
        setCurrentResourceMeta(resourceMeta);

        const resourceRes = await fetch(
          `/api/db/resource?hash=${resourceMeta.hash}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          },
        );

        if (!resourceRes.ok) {
          throw new Error('Failed to fetch Resource');
        }

        const resource: Resource = await resourceRes.json();
        setCurrentResource(resource);

        await fetch('/api/db/resourcemeta/updateLastOpened', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceMetaId, folderName }),
        });
      } catch (e: unknown) {
        error('Error fetching resource and metadata', e);
      }
    },
    1000,
  );

  const fetchResourceAndMeta = async (
    resourceMetaId: string,
    folderName: string,
  ) => {
    return debouncedFetchResourceAndMeta(resourceMetaId, folderName);
  };

  const extractText = async (file: File): Promise<string> => {
    const nonParsingFileTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    const fileType = file.type.toLowerCase();

    if (nonParsingFileTypes.includes(fileType)) {
      return 'No Text for this type of File';
    }

    const formData = new FormData();
    formData.append('myFile', file);

    try {
      const response = await fetch('/api/resource_parsing', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Server error: ${response.statusText} - ${JSON.stringify(errorData)}`,
        );
      }

      const { markdown } = await response.json();
      debug('Extracted text from file', { fileName: file.name });
      return markdown;
    } catch (e: unknown) {
      error(`Error extracting text from ${file.name}`, e);
      return '';
    }
  };

  const uploadResource = async (
    file: File,
    folderName: string,
    documentId: string,
  ) => {
    try {
      const fileBuffer = await file.arrayBuffer();
      const fileHash = crypto
        .createHash('md5')
        .update(Buffer.from(fileBuffer))
        .digest('hex');

      const resourceExistsResponse = await fetch(
        `/api/db/resource/check?hash=${fileHash}`,
        { method: 'GET' },
      );

      if (!resourceExistsResponse.ok) {
        throw new Error(
          `Failed to check resource existence: ${resourceExistsResponse.statusText}`,
        );
      }

      const { exists } = await resourceExistsResponse.json();
      debug('Resource existence check', { exists, fileHash });

      // Upload to both S3 and R2
      const uploadResponse = await fetch('/api/storage/upload', {
        method: 'POST',
        body: (() => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('documentId', documentId);
          formData.append('folderName', folderName);
          return formData;
        })(),
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
      }

      const { url, s3Success, r2Success } = await uploadResponse.json();

      if (!s3Success && !r2Success) {
        throw new Error('Failed to upload file to storage');
      }

      if (!exists) {
        let parsedText = 'Disabled Processing';

        const isParsingDisabled =
          process.env.DISABLE_PARSING === 'true' || false;
        if (!isParsingDisabled) {
          if (!exists) {
            parsedText = await extractText(file);
            if (!parsedText) {
              error(`Failed to parse text for file ${file.name}`);
              return;
            }
          }
        }

        // Upload the resource content if it doesn't exist
        await fetch('/api/db/resource/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId,
            hash: fileHash,
            url,
            markdown: parsedText,
          }),
        });
      }

      // Create or update the resource metadata
      await fetch('/api/db/resourcemeta/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          name: file.name,
          folderName,
          fileHash,
          url,
          dateAdded: new Date().toISOString(),
          lastOpened: new Date().toISOString(),
        }),
      });
    } catch (e: unknown) {
      error(`Error uploading resource ${file.name}`, e);
    }
  };

  const moveResource = async (
    resourceId: string,
    sourceFolderName: string,
    targetFolderName: string,
    documentId: string,
  ) => {
    try {
      const documentResponse = await fetch(`/api/db?id=${documentId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!documentResponse.ok) {
        throw new Error(`Failed to fetch document with ID: ${documentId}`);
      }

      const dynamoResponse = await documentResponse.json();
      const document = unmarshall(dynamoResponse);

      const { folders } = document;

      const sourceFolder = folders[sourceFolderName];
      const targetFolder = folders[targetFolderName];

      if (!sourceFolder || !targetFolder) {
        throw new Error(
          `Source folder "${sourceFolderName}" or target folder "${targetFolderName}" does not exist.`,
        );
      }

      const resourceIndex = sourceFolder.resources.findIndex(
        (resource: ResourceCompressed) => resource.id === resourceId,
      );

      if (resourceIndex === -1) {
        throw new Error(
          `Resource with ID "${resourceId}" not found in source folder.`,
        );
      }

      const [resourceToMove] = sourceFolder.resources.splice(resourceIndex, 1);
      targetFolder.resources.push(resourceToMove);

      await fetch('/api/db/resourcemeta/folders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          resourceId,
          sourceFolderName,
          targetFolderName,
        }),
      });
    } catch (e: unknown) {
      error('Error moving resource', e);
    }
  };

  return (
    <CurrentResourceContext.Provider
      value={{
        currentResource,
        currentResourceMeta,
        setCurrentResource,
        setCurrentResourceMeta,
        fetchResourceAndMeta,
        fetchResourceMeta,
        uploadResource,
        extractText,
        moveResource,
      }}
    >
      {children}
    </CurrentResourceContext.Provider>
  );
}

export function useCurrentResource() {
  const context = useContext(CurrentResourceContext);
  if (!context) {
    throw new Error(
      'useCurrentResource must be used within a CurrentResourceProvider',
    );
  }
  return context;
}

// ---------- DOCUMENT ------------

interface CurrentDocumentContextProps {
  allDocuments: Document[];
  currentDocument: Document | null;
  setCurrentDocument: (doc: Document | null) => void;
  fetchDocuments: () => Promise<void>;
  fetchDocument: (id: string) => Promise<Document | undefined>;
  createDocument: (name: string, userId: string) => Promise<void>;
  viewingDocument: boolean;
  setViewingDocument: (isViewing: boolean) => void;
}

const CurrentDocumentContext = createContext<
  CurrentDocumentContextProps | undefined
>(undefined);

export const CurrentDocumentProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [viewingDocument, setViewingDocument] = useState(false);

  const { data: session } = useSession();

  const fetchDocuments = async () => {
    if (!session?.user?.id) {
      error('User ID not found. Please log in.');
      return;
    }

    const endpoint = `/api/db/getAll?ownerID=${session.user.id}`;

    fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch documents: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        setAllDocuments(data);
      })
      .catch((e: unknown) => error('Error fetching documents', e));
  };

  // Debounced version of the fetch operation
  const debouncedFetchDocument = debounce(async (id: string) => {
    try {
      const fetchResponse = await fetch(
        `/api/db?id=${id}&updateLastOpened=true`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!fetchResponse.ok) {
        throw new Error('Failed to fetch document');
      }

      const dynamoResponse = await fetchResponse.json();
      const document: Document = mapDynamoDBItemToDocument(dynamoResponse);

      setCurrentDocument(document);
      setViewingDocument(true);
      debug('Document fetched successfully', { documentId: id });
      return document;
    } catch (e: unknown) {
      error('Error fetching document', e);
    }
  }, 1000); // 1 second debounce

  const fetchDocument = async (id: string): Promise<Document | undefined> => {
    if (!id) return;
    return debouncedFetchDocument(id);
  };

  const createDocument = async (name: string, userId: string) => {
    if (!userId) {
      error('User ID not provided. Cannot create document.');
      return;
    }

    const newDoc: Document = {
      id: '',
      name,
      text: '',
      folders: {},
      dateAdded: new Date().toISOString(),
      lastOpened: new Date().toISOString(),
      tags: [],
      ownerID: userId,
    };

    try {
      const response = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc),
      });

      if (!response.ok) throw new Error('Failed to create document');

      const data = await response.json();
      const createdDoc = { ...newDoc, id: data.id };
      debug('Document created successfully', { documentId: data.id });

      setAllDocuments((prevDocs) => [...prevDocs, createdDoc]);
    } catch (e: unknown) {
      error('Error creating document', e);
    }
  };

  return (
    <CurrentDocumentContext.Provider
      value={{
        allDocuments,
        currentDocument,
        setCurrentDocument,
        fetchDocuments,
        fetchDocument,
        createDocument,
        viewingDocument,
        setViewingDocument,
      }}
    >
      {children}
    </CurrentDocumentContext.Provider>
  );
};

export const useCurrentDocument = () => {
  const context = useContext(CurrentDocumentContext);
  if (!context) {
    throw new Error(
      'useCurrentDocument must be used within a CurrentDocumentProvider',
    );
  }
  return context;
};

function mapDynamoDBItemToDocument(item: { [key: string]: any }): Document {
  return {
    id: item.id?.S || '',
    name: item.name?.S || '',
    text: item.text?.S || '',
    folders: parseDynamoDBFolders(item.folders?.M || {}), // Parse folders
    dateAdded: item.dateAdded?.S || '',
    lastOpened: item.lastOpened?.S || '',
    tags: item.tags?.L ? item.tags.L.map((tag: { S: string }) => tag.S) : [], // Flatten tags
    ownerID: item.ownerID?.S || '',
  };
}

function parseDynamoDBFolders(folders: {
  [key: string]: any;
}): Record<string, FolderData> {
  const parsedFolders: Record<string, FolderData> = {};

  for (const [key, value] of Object.entries(folders)) {
    parsedFolders[key] = {
      name: value.M?.name?.S || '',
      resources:
        value.M?.resources?.L.map(parseDynamoDBResourceCompressed) || [],
    };
  }

  return parsedFolders;
}

function parseDynamoDBResourceCompressed(resource: {
  [key: string]: any;
}): ResourceCompressed {
  return {
    id: resource.M?.id?.S || '',
    name: resource.M?.name?.S || '',
    fileType: resource.M?.fileType?.S || '',
    dateAdded: resource.M?.dateAdded?.S || '',
    lastOpened: resource.M?.lastOpened?.S || '',
  };
}
