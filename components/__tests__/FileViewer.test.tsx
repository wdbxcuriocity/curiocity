import React, { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileViewer from '../ResourceComponents/FilesViewer';
import {
  CurrentResourceProvider,
  CurrentDocumentProvider,
  useCurrentResource,
  useCurrentDocument,
} from '../../context/AppContext';
import { Resource, ResourceMeta, Document } from '../../types/types';

// Mock resource data
const mockResource: Resource = {
  id: '1',
  markdown: '',
  url: 'https://example.com/test.pdf',
};

const mockResourceMeta: ResourceMeta = {
  id: '1',
  hash: 'test-hash',
  name: 'test.pdf',
  dateAdded: new Date().toISOString(),
  lastOpened: new Date().toISOString(),
  notes: 'Test notes',
  summary: '',
  tags: [],
  documentId: 'test-doc',
  fileType: 'pdf',
};

const mockDocument: Document = {
  id: 'test-doc',
  name: 'Test Document',
  text: '',
  folders: {
    'test-folder': {
      name: 'Test Folder',
      resources: [
        {
          id: '1',
          name: 'test.pdf',
          dateAdded: new Date().toISOString(),
          lastOpened: new Date().toISOString(),
          fileType: 'pdf',
        },
      ],
    },
  },
  dateAdded: new Date().toISOString(),
  lastOpened: new Date().toISOString(),
  tags: [],
  ownerID: 'test-user',
};

// Mock the context hooks
jest.mock('../../context/AppContext', () => ({
  ...jest.requireActual('../../context/AppContext'),
  useCurrentResource: jest.fn(),
  useCurrentDocument: jest.fn(),
}));

// Mock next/dynamic to return the mock component directly
jest.mock('next/dynamic', () => () => {
  const MockReactQuill = (props: any) => (
    <div data-testid='react-quill-wrapper'>
      <textarea
        data-testid='react-quill'
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
  MockReactQuill.displayName = 'MockReactQuill';
  return MockReactQuill;
});

interface TestWrapperProps {
  children: ReactNode;
}

const TestWrapper: React.FC<TestWrapperProps> = ({ children }) => (
  <CurrentDocumentProvider>
    <CurrentResourceProvider>{children}</CurrentResourceProvider>
  </CurrentDocumentProvider>
);

describe('FileViewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCurrentResource as jest.Mock).mockReturnValue({
      currentResource: mockResource,
      currentResourceMeta: mockResourceMeta,
      setCurrentResource: jest.fn(),
      setCurrentResourceMeta: jest.fn(),
      fetchResource: jest.fn().mockResolvedValue(mockResource),
      fetchResourceMeta: jest.fn(),
      fetchResourceAndMeta: jest.fn(),
      uploadResource: jest.fn(),
      extractText: jest.fn(),
      moveResource: jest.fn(),
      isLoading: false,
    });

    const mockFetchDocument = jest.fn().mockResolvedValue(mockDocument);
    const mockFetchDocuments = jest.fn().mockResolvedValue([mockDocument]);

    (useCurrentDocument as jest.Mock).mockReturnValue({
      currentDocument: mockDocument,
      setCurrentDocument: jest.fn(),
      fetchDocument: mockFetchDocument,
      fetchDocuments: mockFetchDocuments,
      createDocument: jest.fn(),
      updateDocument: jest.fn(),
      deleteDocument: jest.fn(),
      viewingDocument: true,
      setViewingDocument: jest.fn(),
      isLoading: false,
    });

    // Mock fetch to return resource data immediately
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/db/resource')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResource),
        });
      }
      if (url.includes('/api/db/documents')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDocument),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render different file types appropriately', async () => {
    render(<FileViewer />, { wrapper: TestWrapper });

    // Wait for loading state to finish and PDF viewer to appear
    const pdfViewer = await screen.findByTestId('pdf-viewer');
    expect(pdfViewer).toBeInTheDocument();
    expect(pdfViewer).toHaveAttribute('src', mockResource.url);
  });

  it('should handle resource metadata updates', async () => {
    const updatedNotes = 'Updated notes';
    const mockFetchResourceMeta = jest
      .fn()
      .mockResolvedValue({ success: true });
    const mockSetCurrentResourceMeta = jest.fn();

    (useCurrentResource as jest.Mock).mockReturnValue({
      currentResource: mockResource,
      currentResourceMeta: mockResourceMeta,
      setCurrentResource: jest.fn(),
      setCurrentResourceMeta: mockSetCurrentResourceMeta,
      fetchResourceMeta: mockFetchResourceMeta,
      fetchResourceAndMeta: jest.fn(),
      uploadResource: jest.fn(),
      extractText: jest.fn(),
      moveResource: jest.fn(),
      isLoading: false,
    });

    // Mock fetch for notes update
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/db/resourcemeta/notes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ notes: 'Test notes' }),
        });
      }
      if (url.includes('/api/db/ResourceMetaNotes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResource),
      });
    });

    render(<FileViewer />, { wrapper: TestWrapper });

    // Find and click the notes textarea to open editor
    const notesInput = await screen.findByTestId('resource-notes');
    expect(notesInput).toBeInTheDocument();
    fireEvent.change(notesInput, { target: { value: updatedNotes } });

    // Wait for NotesEditor to appear
    const editor = await screen.findByTestId('react-quill');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveValue('Test notes');

    // Find and click save button
    const saveButton = await screen.findByText('Save');

    // Mock the fetch response for the notes update
    (global.fetch as jest.Mock).mockImplementationOnce((url) => {
      if (url.includes('/api/db/resourcemeta/notes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ notes: updatedNotes }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });

    // Update the notes in the editor
    const quillEditor = await screen.findByTestId('react-quill');
    fireEvent.change(quillEditor, { target: { value: updatedNotes } });

    // Click save button
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/db/resourcemeta/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining(updatedNotes),
      });
    });
  });

  it('should display file list correctly', async () => {
    render(<FileViewer />, { wrapper: TestWrapper });

    // Wait for folder structure to appear
    const folder = await screen.findByTestId('folder-test-folder');
    expect(folder).toBeInTheDocument();
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
  });

  it('should handle resource loading errors', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const mockError = new Error('Failed to fetch');

    // Mock fetch to reject
    (global.fetch as jest.Mock).mockRejectedValueOnce(mockError);

    render(<FileViewer />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Could not fetch resource',
        mockError,
      );
    });

    consoleError.mockRestore();
  });
});
