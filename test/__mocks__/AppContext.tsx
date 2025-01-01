import React from 'react';

export const mockContextValue = {
  documents: [],
  setDocuments: jest.fn(),
  currentDocument: null,
  setCurrentDocument: jest.fn(),
  resources: [],
  setResources: jest.fn(),
  currentResource: null,
  setCurrentResource: jest.fn(),
  fetchDocuments: jest.fn(),
  fetchDocument: jest.fn(),
  uploadResource: jest.fn(),
  fetchResourceMeta: jest.fn(),
};

export const CurrentDocumentProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <>{children}</>;
};

export const CurrentResourceProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <>{children}</>;
};
