'use client';

import { ResourceMeta, Resource, Document } from '@/types/types';
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
  ) => Promise<boolean>;
  extractText: (file: File) => Promise<string>;
  moveResource: (
    resourceId: string,
    sourceFolderName: string,
    targetFolderName: string,
    documentId: string,
  ) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const CurrentResourceContext = createContext<
  CurrentResourceContextValue | undefined
>(undefined);

interface CurrentDocumentContextValue {
  allDocuments: Document[];
  currentDocument: Document | null;
  setCurrentDocument: (document: Document | null) => void;
  fetchDocuments: () => Promise<void>;
  fetchDocument: (id: string) => Promise<void>;
  createDocument: (name: string, userId: string) => Promise<void>;
  viewingDocument: boolean;
  setViewingDocument: (viewing: boolean) => void;
  error: string | null;
}

const CurrentDocumentContext = createContext<
  CurrentDocumentContextValue | undefined
>(undefined);

export function useCurrentResource() {
  const context = useContext(CurrentResourceContext);
  if (!context) {
    throw new Error(
      'useCurrentResource must be used within a CurrentResourceProvider',
    );
  }
  return context;
}

export function useCurrentDocument() {
  const context = useContext(CurrentDocumentContext);
  if (!context) {
    throw new Error(
      'useCurrentDocument must be used within a CurrentDocumentProvider',
    );
  }
  return context;
}

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
    if (!resourceMetaId) {
      throw new Error('Resource Meta ID is required');
    }

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
      if (!resourceId) {
        setError('Resource ID is required');
        return;
      }

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
        if (!resource) {
          throw new Error('Resource not found');
        }

        setCurrentResource(resource);

        const resourceMeta = await fetchResourceMeta(resourceId);
        if (!resourceMeta) {
          throw new Error('Resource metadata not found');
        }

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
    [fetchResourceMeta],
  );

  const extractText = useCallback(async (file: File): Promise<string> => {
    if (!file) {
      throw new Error('File is required');
    }

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
      return data.text || '';
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
    ): Promise<boolean> => {
      if (!file || !documentId || !folderName) {
        setError('File, document ID, and folder name are required');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { url } = await uploadToS3(file);
        if (!url) {
          throw new Error('Failed to upload file to S3');
        }

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
        return !!newResource;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Error uploading resource:', errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [uploadToS3],
  );

  const moveResource = useCallback(
    async (
      resourceId: string,
      sourceFolderName: string,
      targetFolderName: string,
      documentId: string,
    ): Promise<boolean> => {
      if (
        !resourceId ||
        !sourceFolderName ||
        !targetFolderName ||
        !documentId
      ) {
        setError(
          'Resource ID, source folder, target folder, and document ID are required',
        );
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/db/resources/move', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resourceId,
            sourceFolderName,
            targetFolderName,
            documentId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to move resource: ${response.statusText}`);
        }

        return true;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Error moving resource:', errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      currentResource,
      setCurrentResource,
      currentResourceMeta,
      setCurrentResourceMeta,
      isLoading,
      error,
      clearError,
      fetchResourceMeta,
      fetchResourceAndMeta,
      extractText,
      uploadResource,
      moveResource,
    }),
    [
      currentResource,
      currentResourceMeta,
      isLoading,
      error,
      clearError,
      fetchResourceMeta,
      fetchResourceAndMeta,
      extractText,
      uploadResource,
      moveResource,
    ],
  );

  return (
    <CurrentResourceContext.Provider value={value}>
      {children}
    </CurrentResourceContext.Provider>
  );
}

export function CurrentDocumentProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [viewingDocument, setViewingDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: session } = useSession();

  const fetchDocuments = useCallback(async () => {
    if (!session?.user?.id) {
      setError('User ID not found. Please log in.');
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
      setAllDocuments(data || []);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching documents:', errorMessage);
    }
  }, [session?.user?.id]);

  const fetchDocument = useCallback(async (id: string): Promise<void> => {
    if (!id) {
      setError('Document ID is required');
      return;
    }

    try {
      const response = await fetch(`/api/db/documents/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data) {
        throw new Error('Document not found');
      }

      setCurrentDocument(data);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching document:', errorMessage);
    }
  }, []);

  const createDocument = useCallback(async (name: string, userId: string) => {
    if (!name || !userId) {
      setError('Document name and user ID are required');
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

      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      const data = await response.json();
      if (!data?.id) {
        throw new Error('Failed to get document ID');
      }

      const createdDoc = { ...newDoc, id: data.id };
      setAllDocuments((prevDocs) => [...prevDocs, createdDoc]);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error creating document:', errorMessage);
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
      error,
    }),
    [
      allDocuments,
      currentDocument,
      fetchDocuments,
      fetchDocument,
      createDocument,
      viewingDocument,
      error,
    ],
  );

  return (
    <CurrentDocumentContext.Provider value={contextValue}>
      {children}
    </CurrentDocumentContext.Provider>
  );
}
