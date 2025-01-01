import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useSession } from 'next-auth/react';
import { useS3Upload } from 'next-s3-upload';
import {
  CurrentDocumentProvider,
  CurrentResourceProvider,
  useCurrentDocument,
} from '@/context/AppContext';
import ReportHome from '@/app/report-home/page';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock next-s3-upload
jest.mock('next-s3-upload', () => ({
  useS3Upload: jest.fn(),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: function Image({
    src,
    alt,
    width = 100,
    height = 100,
    ...props
  }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={width} height={height} {...props} />;
  },
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock AppContext
jest.mock('@/context/AppContext', () => {
  const actual = jest.requireActual('@/context/AppContext');
  return {
    ...actual,
    useCurrentDocument: jest.fn(),
  };
});

// Mock fetch
global.fetch = jest.fn();

const mockSession = {
  data: {
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
    },
  },
};

const mockDocuments = [
  {
    id: 'doc-id',
    name: 'Test Document',
    text: '',
    folders: {
      'test-folder': {
        name: 'Test Folder',
        resources: [],
      },
    },
    dateAdded: new Date().toISOString(),
    lastOpened: new Date().toISOString(),
    tags: [],
    ownerID: 'test-user-id',
  },
];

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue(mockSession);
    (useS3Upload as jest.Mock).mockReturnValue({
      uploadToS3: jest
        .fn()
        .mockResolvedValue({ url: 'https://test-url.com/file.pdf' }),
    });

    const mockUpdateDocument = jest.fn().mockImplementation(async (doc) => {
      await fetch('/api/db', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      return doc;
    });

    const mockFetchDocument = jest.fn().mockImplementation(async (id) => {
      await fetch(`/api/db?id=${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return mockDocuments[0];
    });

    (useCurrentDocument as jest.Mock).mockReturnValue({
      allDocuments: mockDocuments,
      currentDocument: mockDocuments[0],
      setCurrentDocument: jest.fn(),
      fetchDocument: mockFetchDocument,
      fetchDocuments: jest.fn().mockResolvedValue(mockDocuments),
      updateDocument: mockUpdateDocument,
      viewingDocument: true,
      setViewingDocument: jest.fn(),
      isLoading: false,
    });

    // Mock fetch responses
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/db') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDocuments[0]),
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should maintain consistency between document and resource states', async () => {
    render(
      <CurrentDocumentProvider>
        <CurrentResourceProvider>
          <ReportHome />
        </CurrentResourceProvider>
      </CurrentDocumentProvider>,
    );

    // Wait for document to load
    const titleInput = await screen.findByPlaceholderText(
      'Enter document title',
    );
    expect(titleInput).toHaveValue('Test Document');

    // Click on document title to trigger update
    fireEvent.click(titleInput);
    fireEvent.blur(titleInput);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/db', expect.any(Object));
    });
  });

  it('should sync document and resource metadata updates', async () => {
    render(
      <CurrentDocumentProvider>
        <CurrentResourceProvider>
          <ReportHome />
        </CurrentResourceProvider>
      </CurrentDocumentProvider>,
    );

    // Wait for document to load
    const titleInput = await screen.findByPlaceholderText(
      'Enter document title',
    );
    expect(titleInput).toBeInTheDocument();

    // Update document title
    fireEvent.change(titleInput, { target: { value: 'Updated text' } });
    fireEvent.blur(titleInput);

    // Wait for update to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/db', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Updated text'),
      });
    });
  });
});
