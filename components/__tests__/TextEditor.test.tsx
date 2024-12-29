// src/components/__tests__/TextEditor.test.tsx

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import TextEditor from '../DocumentComponents/TextEditor';
import '@testing-library/jest-dom';

// Mock the Button component to prevent testing it
jest.mock('../Button', () => {
  const MockButton = (props: any) => (
    <button onClick={props.onClick}>{props.label}</button>
  );
  MockButton.displayName = 'MockButton'; // Assign displayName
  return MockButton;
});

// Mock ReactQuill component to simplify testing
jest.mock('react-quill', () => {
  const MockReactQuill = (props: any) => (
    <textarea
      data-testid='react-quill'
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
  MockReactQuill.displayName = 'MockReactQuill'; // Assign displayName
  return MockReactQuill;
});

describe('TextEditor Component', () => {
  const mockSwapState = jest.fn();

  beforeEach(() => {
    // Mock the global fetch API
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ message: 'Success' }),
      }),
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <TextEditor swapState={mockSwapState} />,
    );

    expect(getByPlaceholderText('Enter document title')).toBeInTheDocument();
    expect(getByTestId('react-quill')).toBeInTheDocument();
  });

  it('renders correctly with a provided document', () => {
    const mockDocument = {
      id: '1',
      name: 'Sample Document',
      text: 'Sample content',
      files: [],
    };

    const { getByDisplayValue, getByTestId } = render(
      <TextEditor document={mockDocument} swapState={mockSwapState} />,
    );

    expect(getByDisplayValue('Sample Document')).toBeInTheDocument();
    expect(getByTestId('react-quill')).toHaveValue('Sample content');
  });

  it('updates title state on input change', () => {
    const { getByPlaceholderText } = render(
      <TextEditor swapState={mockSwapState} />,
    );

    const titleInput = getByPlaceholderText(
      'Enter document title',
    ) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'New Title' } });

    expect(titleInput.value).toBe('New Title');
  });

  it('updates content state on editor change', () => {
    const { getByTestId } = render(<TextEditor swapState={mockSwapState} />);

    const quillEditor = getByTestId('react-quill') as HTMLTextAreaElement;
    fireEvent.change(quillEditor, { target: { value: 'New Content' } });

    expect(quillEditor.value).toBe('New Content');
  });

  it('calls handleUpload on "New Save" button click', async () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <TextEditor swapState={mockSwapState} />,
    );

    const titleInput = getByPlaceholderText(
      'Enter document title',
    ) as HTMLInputElement;
    const quillEditor = getByTestId('react-quill') as HTMLTextAreaElement;
    const newSaveButton = getByText('New Save');

    fireEvent.change(titleInput, { target: { value: 'Title' } });
    fireEvent.change(quillEditor, { target: { value: 'Content' } });
    fireEvent.click(newSaveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/db', expect.any(Object));
    });

    const fetchCallArgs = (global.fetch as jest.Mock).mock.calls[0];
    const fetchOptions = fetchCallArgs[1];
    const body = JSON.parse(fetchOptions.body);

    expect(fetchOptions.method).toBe('POST');
    expect(body.name).toBe('Title');
    expect(body.text).toBe('Content');
    expect(body.files).toEqual([]);
  });

  it('calls handleUpdate on "Update Save" button click', async () => {
    const mockDocument = {
      id: '1',
      name: 'Existing Title',
      text: 'Existing Content',
      files: [],
    };

    const { getByText, getByDisplayValue, getByTestId } = render(
      <TextEditor document={mockDocument} swapState={mockSwapState} />,
    );

    const titleInput = getByDisplayValue('Existing Title') as HTMLInputElement;
    const quillEditor = getByTestId('react-quill') as HTMLTextAreaElement;
    const updateSaveButton = getByText('Update Save');

    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
    fireEvent.change(quillEditor, { target: { value: 'Updated Content' } });
    fireEvent.click(updateSaveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/db', expect.any(Object));
    });

    const fetchCallArgs = (global.fetch as jest.Mock).mock.calls[0];
    const fetchOptions = fetchCallArgs[1];
    const body = JSON.parse(fetchOptions.body);

    expect(fetchOptions.method).toBe('PUT');
    expect(body.id).toBe('1');
    expect(body.name).toBe('Updated Title');
    expect(body.text).toBe('Updated Content');
    expect(body.files).toEqual([]);
    expect(mockSwapState).toHaveBeenCalled();
  });

  it('does not call API if title or content is missing on upload', async () => {
    const { getByText } = render(<TextEditor swapState={mockSwapState} />);

    const newSaveButton = getByText('New Save');
    fireEvent.click(newSaveButton);

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('does not call API if title or content is missing on update', async () => {
    const mockDocument = {
      id: '1',
      name: '',
      text: '',
      files: [],
    };

    const { getByText } = render(
      <TextEditor document={mockDocument} swapState={mockSwapState} />,
    );

    const updateSaveButton = getByText('Update Save');
    fireEvent.click(updateSaveButton);

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('shows error if document ID is missing on update', async () => {
    console.error = jest.fn();

    const mockDocument = {
      name: 'Title',
      text: 'Content',
      files: [],
    };

    const { getByText } = render(
      <TextEditor document={mockDocument} swapState={mockSwapState} />,
    );

    const updateSaveButton = getByText('Update Save');
    fireEvent.click(updateSaveButton);

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Document ID is missing.');
    });
  });
});
