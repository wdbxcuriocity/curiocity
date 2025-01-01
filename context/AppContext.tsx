'use client';

import {
  ResourceMeta,
  Resource,
  Document,
  ResourceCompressed,
} from '@/types/types';
import { useSession } from 'next-auth/react';
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { useS3Upload } from 'next-s3-upload';

interface CurrentResourceContextValue {
  currentResource: Resource | null;
  setCurrentResource: (resource: Resource | null) => void;
  currentResourceMeta: ResourceMeta | null;
  setCurrentResourceMeta: (meta: ResourceMeta | null) => void;
  fetchResourceMeta: (resourceMetaId: string) => Promise<ResourceMeta>;
  fetchResourceAndMeta: (resourceId: string) => Promise<void>;
  uploadResource: (
    file: File,
    documentId: string,
    folderName: string,
    extractedText?: string,
  ) => Promise<ResourceCompressed | null>;
  extractText: (file: File) => Promise<string>;
  moveResource: (
    resourceId: string,
    sourceFolderName: string,
    targetFolderName: string,
    documentId: string,
  ) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

const CurrentResourceContext = createContext<
  CurrentResourceContextValue | undefined
>(undefined);

export function CurrentResourceProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { uploadToS3 } = useS3Upload();
  const [currentResource, setCurrentResource] = useState<Resource | null>(null);
  const [currentResourceMeta, setCurrentResourceMeta] =
    useState<ResourceMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const fetchResourceMeta = useCallback(async (resourceMetaId: string) => {
    try {
      const response = await fetch(`/api/db/resourcemeta/${resourceMetaId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

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
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error fetching ResourceMeta:', error.message);
      } else {
        console.error('Unknown error fetching ResourceMeta:', error);
      }
      throw error;
    }
  }, []);

  const fetchResourceAndMeta = useCallback(
    async (resourceId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/db/resources/${resourceId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch resource: ${response.statusText}`);
        }

        const resource = await response.json();
        setCurrentResource(resource);

        const resourceMeta = await fetchResourceMeta(resourceId);
        setCurrentResourceMeta(resourceMeta);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Error fetching resource and meta:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [
      fetchResourceMeta,
      setCurrentResource,
      setCurrentResourceMeta,
      setError,
      setIsLoading,
    ],
  );

  const extractText = useCallback(async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to extract text: ${response.statusText}`);
      }

      const data = await response.json();
      return data.text;
    } catch (error: unknown) {
      console.error(
        'Error extracting text:',
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }, []);

  const uploadResource = useCallback(
    async (
      file: File,
      documentId: string,
      folderName: string,
      extractedText?: string,
    ): Promise<ResourceCompressed | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const { url } = await uploadToS3(file);

        const resourceData = {
          name: file.name,
          fileType: file.type,
          url,
          documentId,
          folderName,
          extractedText,
        };

        const response = await fetch('/api/db/resources', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(resourceData),
        });

        if (!response.ok) {
          throw new Error(`Failed to create resource: ${response.statusText}`);
        }

        const newResource = await response.json();
        return newResource;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Error uploading resource:', errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [uploadToS3, setError, setIsLoading],
  );

  const moveResource = useCallback(
    async (
      resourceId: string,
      sourceFolderName: string,
      targetFolderName: string,
      documentId: string,
    ): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!currentResourceMeta) {
          throw new Error('No resource meta data available');
        }

        const sourceFolder = currentResourceMeta.folders[sourceFolderName];
        const targetFolder = currentResourceMeta.folders[targetFolderName];

        if (!sourceFolder || !targetFolder) {
          throw new Error('Source or target folder not found');
        }

        const resourceIndex = sourceFolder.resources.findIndex(
          (resource: ResourceCompressed) => resource.id === resourceId,
        );

        if (resourceIndex === -1) {
          throw new Error(
            `Resource with ID "${resourceId}" not found in source folder.`,
          );
        }

        const [resourceToMove] = sourceFolder.resources.splice(
          resourceIndex,
          1,
        );
        targetFolder.resources.push(resourceToMove);

        const response = await fetch('/api/db/resourcemeta/folders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resourceId,
            sourceFolderName,
            targetFolderName,
            documentId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update resource folder');
        }

        return true;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Unknown error occurred during move';
        setError(errorMessage);
        console.error('Error moving resource:', errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [currentResourceMeta, setError, setIsLoading],
  );

  // Return only the used functions and state
  return (
    <CurrentResourceContext.Provider
      value={{
        currentResource,
        setCurrentResource,
        currentResourceMeta,
        setCurrentResourceMeta,
        fetchResourceMeta,
        fetchResourceAndMeta,
        uploadResource,
        extractText,
        moveResource,
        isLoading,
        error,
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
}: Readonly<{ children: React.ReactNode }>) => {
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [viewingDocument, setViewingDocument] = useState(false);

  const { data: session } = useSession();

  const fetchDocuments = useCallback(async () => {
    if (!session?.user?.id) {
      console.error('User ID not found. Please log in.');
      return;
    }

    try {
      const response = await fetch(
        `/api/db/getAll?ownerID=${session.user.id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      const data = await response.json();
      setAllDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, [session?.user?.id]);

  const fetchDocument = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/db/documents/${id}`);
      const data = await response.json();
      setCurrentDocument(data);
    } catch (error: unknown) {
      console.error(
        'Error fetching document:',
        error instanceof Error ? error.message : error,
      );
    }
  }, []);

  const createDocument = useCallback(async (name: string, userId: string) => {
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
      setAllDocuments((prevDocs) => [...prevDocs, createdDoc]);
    } catch (error) {
      console.error('Error creating document:', error);
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      allDocuments,
      currentDocument,
      setCurrentDocument,
      fetchDocuments,
      fetchDocument,
      createDocument,
      viewingDocument,
      setViewingDocument,
    }),
    [
      allDocuments,
      currentDocument,
      fetchDocuments,
      fetchDocument,
      createDocument,
      viewingDocument,
    ],
  );

  return (
    <CurrentDocumentContext.Provider value={contextValue}>
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
