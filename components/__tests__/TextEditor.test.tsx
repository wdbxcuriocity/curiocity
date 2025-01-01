// src/components/__tests__/TextEditor.test.tsx

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import TextEditor from '../DocumentComponents/TextEditor';
import '@testing-library/jest-dom';
import { Document, ResourceMeta } from '@/types/types';

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

// Mock the useCurrentDocument hook
jest.mock('@/context/AppContext', () => ({
  ...jest.requireActual('@/context/AppContext'),
  useCurrentDocument: () => ({
    allDocuments: [],
    currentDocument: null,
    setCurrentDocument: jest.fn(),
    fetchDocuments: jest.fn(),
    fetchDocument: jest.fn(),
    createDocument: jest.fn(),
    viewingDocument: false,
    setViewingDocument: jest.fn(),
  }),
}));

describe('TextEditor Component', () => {
  const mockCallback = jest.fn();

  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Success' }),
      });
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly in full mode', async () => {
    const mockDocument: Document = {
      id: '1',
      name: 'Test Document',
      text: 'Test content',
      folders: {},
      dateAdded: new Date().toISOString(),
      lastOpened: new Date().toISOString(),
      tags: [],
      ownerID: 'test-owner',
    };

    render(
      <TextEditor
        mode='full'
        source={mockDocument}
        generalCallback={mockCallback}
      />,
    );

    // Wait for dynamic imports to resolve
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Enter document title'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('react-quill')).toBeInTheDocument();
    });
  });

  it('renders correctly in mini mode', async () => {
    const mockResourceMeta: ResourceMeta = {
      id: '1',
      hash: 'test-hash',
      name: 'Test Resource',
      dateAdded: new Date().toISOString(),
      lastOpened: new Date().toISOString(),
      notes: 'Test notes',
      summary: 'Test summary',
      tags: [],
      documentId: 'test-doc',
      fileType: 'pdf',
    };

    render(<TextEditor mode='mini' source={mockResourceMeta} />);

    await waitFor(() => {
      expect(screen.getByTestId('react-quill')).toBeInTheDocument();
      expect(screen.getByTestId('react-quill')).toHaveValue('Test notes');
    });
  });

  it('updates content in full mode', async () => {
    const mockDocument: Document = {
      id: '1',
      name: 'Test Document',
      text: 'Initial content',
      folders: {},
      dateAdded: new Date().toISOString(),
      lastOpened: new Date().toISOString(),
      tags: [],
      ownerID: 'test-owner',
    };

    render(
      <TextEditor
        mode='full'
        source={mockDocument}
        generalCallback={mockCallback}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('react-quill')).toBeInTheDocument();
    });

    const quillEditor = screen.getByTestId(
      'react-quill',
    ) as HTMLTextAreaElement;
    fireEvent.change(quillEditor, { target: { value: 'Updated content' } });

    expect(quillEditor.value).toBe('Updated content');
  });

  it('calls save API in full mode', async () => {
    const mockDocument: Document = {
      id: '1',
      name: 'Test Document',
      text: 'Test content',
      folders: {},
      dateAdded: new Date().toISOString(),
      lastOpened: new Date().toISOString(),
      tags: [],
      ownerID: 'test-owner',
    };

    render(
      <TextEditor
        mode='full'
        source={mockDocument}
        generalCallback={mockCallback}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/db', expect.any(Object));
    });
  });

  it('calls save API in mini mode', async () => {
    const mockResourceMeta: ResourceMeta = {
      id: '1',
      hash: 'test-hash',
      name: 'Test Resource',
      dateAdded: new Date().toISOString(),
      lastOpened: new Date().toISOString(),
      notes: 'Test notes',
      summary: 'Test summary',
      tags: [],
      documentId: 'test-doc',
      fileType: 'pdf',
    };

    render(<TextEditor mode='mini' source={mockResourceMeta} />);

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/db/resourcemeta/notes',
        expect.any(Object),
      );
    });
  });
});
