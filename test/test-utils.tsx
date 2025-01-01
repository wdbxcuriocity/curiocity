import React from 'react';
import { render } from '@testing-library/react';
import {
  CurrentDocumentProvider,
  CurrentResourceProvider,
} from '@/context/AppContext';

const mockFetchDocuments = jest.fn().mockResolvedValue([]);
const mockFetchDocument = jest.fn().mockResolvedValue({});
const mockUploadResource = jest.fn().mockResolvedValue({});
const mockFetchResourceMeta = jest.fn().mockResolvedValue({});

export const mockContextValue = {
  allDocuments: [],
  currentDocument: null,
  setCurrentDocument: jest.fn(),
  fetchDocuments: mockFetchDocuments,
  fetchDocument: mockFetchDocument,
  createDocument: jest.fn(),
  viewingDocument: false,
  setViewingDocument: jest.fn(),
};

export const mockResourceContextValue = {
  currentResource: null,
  setCurrentResource: jest.fn(),
  currentResourceMeta: null,
  setCurrentResourceMeta: jest.fn(),
  uploadResource: mockUploadResource,
  fetchResourceMeta: mockFetchResourceMeta,
  fetchResourceAndMeta: jest.fn(),
  extractText: jest.fn(),
  moveResource: jest.fn(),
};

export const TestWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <CurrentDocumentProvider>
      <CurrentResourceProvider>{children}</CurrentResourceProvider>
    </CurrentDocumentProvider>
  );
};

export const customRender = (ui: React.ReactElement) => {
  return render(ui, { wrapper: TestWrapper });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
