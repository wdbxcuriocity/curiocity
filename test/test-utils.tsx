import React from 'react';
import { render } from '@testing-library/react';
import { CurrentDocumentProvider } from '@/context/AppContext';
import { ResourceProvider } from '@/context/ResourceContext';

const mockFetchDocuments = jest.fn().mockResolvedValue([]);
const mockFetchDocument = jest.fn().mockResolvedValue({});
const mockUploadResource = jest.fn().mockResolvedValue({});
const mockFetchResourceMeta = jest.fn().mockResolvedValue({});

export const mockContextValue = {
  documents: [],
  currentDocument: null,
  setCurrentDocument: jest.fn(),
  fetchDocuments: mockFetchDocuments,
  fetchDocument: mockFetchDocument,
  createDocument: jest.fn(),
  updateDocument: jest.fn(),
  deleteDocument: jest.fn(),
};

export const mockResourceContextValue = {
  resources: [],
  currentResource: null,
  setCurrentResource: jest.fn(),
  uploadResource: mockUploadResource,
  fetchResourceMeta: mockFetchResourceMeta,
  deleteResource: jest.fn(),
};

export const TestWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <CurrentDocumentProvider value={mockContextValue}>
      <ResourceProvider value={mockResourceContextValue}>
        {children}
      </ResourceProvider>
    </CurrentDocumentProvider>
  );
};

export const customRender = (ui: React.ReactElement) => {
  return render(ui, { wrapper: TestWrapper });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
