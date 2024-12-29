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
import { useS3Upload } from 'next-s3-upload';
import AWS from 'aws-sdk';
import crypto from 'crypto';

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
  const { uploadToS3 } = useS3Upload();
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
    } catch (error) {
      console.error('Error fetching ResourceMeta:', error.message);
      throw error;
    }
  };

  const fetchResourceAndMeta = async (
    resourceMetaId: string,
    folderName: string,
  ) => {
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
    } catch (error) {
      console.error('Error fetching resource and metadata:', error);
    }
  };

  const extractText = async (file: File): Promise<string> => {
    const nonParsingFileTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/zip',
      'application/x-rar-compressed',
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
      return markdown;
    } catch (error) {
      console.error(`Error extracting text from ${file.name}:`, error);
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

      const { url } = await uploadToS3(file);

      let parsedText = 'Disabled Processing';
      if (!exists) {
        if (process.env.DISABLE_PARSING?.toUpperCase() === 'FALSE') {
          parsedText = await extractText(file);
          if (!parsedText) {
            console.error(`Failed to parse text for file ${file.name}`);
            return;
          }
        }
      }

      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);

      fileReader.onload = async () => {
        const fileBase64 = fileReader.result?.toString().split(',')[1];
        if (!fileBase64) {
          console.error('Failed to convert file to Base64');
          return;
        }

        await fetch('/api/db/resourcemeta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: fileBase64,
            documentId,
            name: file.name,
            folderName,
            url,
            hash: fileHash,
            markdown: parsedText,
            dateAdded: new Date().toISOString(),
            lastOpened: new Date().toISOString(),
          }),
        });
      };
    } catch (error) {
      console.error(`Error uploading resource ${file.name}:`, error);
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
      const document = AWS.DynamoDB.Converter.unmarshall(dynamoResponse);

      const { folders } = document;

      const sourceFolder = folders[sourceFolderName];
      const targetFolder = folders[targetFolderName];

      if (!sourceFolder || !targetFolder) {
        throw new Error(
          `Source folder "${sourceFolderName}" or target folder "${targetFolderName}" does not exist.`,
        );
      }

      const resourceIndex = sourceFolder.resources.findIndex(
        (resource) => resource.id === resourceId,
      );

      if (resourceIndex === -1) {
        throw new Error(
          `Resource with ID "${resourceId}" not found in source folder.`,
        );
      }

      const [resourceToMove] = sourceFolder.resources.splice(resourceIndex, 1);
      targetFolder.resources.push(resourceToMove);

      const updatedDocument = {
        ...document,
        folders: {
          ...folders,
          [sourceFolderName]: { ...sourceFolder },
          [targetFolderName]: { ...targetFolder },
        },
      };

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
    } catch (error) {
      console.error('Error moving resource:', error);
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
  fetchDocument: (id: string) => Promise<void>;
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
  const [isSortedByLastOpened, setIsSortedByLastOpened] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(false);

  const { data: session } = useSession();

  const fetchDocuments = async () => {
    if (!session?.user?.id) {
      console.error('User ID not found. Please log in.');
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
      .catch((error) => console.error('Error fetching documents:', error));
  };

  const fetchDocument = async (id: string) => {
    if (!id) return;

    try {
      const updateResponse = await fetch('/api/db/updateLastOpened', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update lastOpened field');
      }

      const fetchResponse = await fetch(`/api/db?id=${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!fetchResponse.ok) {
        throw new Error('Failed to fetch document');
      }

      const dynamoResponse = await fetchResponse.json();
      const document: Document = mapDynamoDBItemToDocument(dynamoResponse);

      setCurrentDocument(document); // Update context
      setViewingDocument(true); // Set viewing state to true
      return document;
    } catch (error) {
      console.error('Error fetching or updating document:', error);
    }
  };

  const createDocument = async (name: string, userId: string) => {
    if (!userId) {
      console.error('User ID not provided. Cannot create document.');
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

      // setCurrentDocument(createdDoc);
      setAllDocuments((prevDocs) => [...prevDocs, createdDoc]);
    } catch (error) {
      console.error('Error creating document:', error);
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
