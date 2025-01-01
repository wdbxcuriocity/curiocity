'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { Document, ResourceMeta } from '@/types/types';
import TagSection from '@/components/DocumentComponents/TagSection';
import Divider from '../GeneralComponents/Divider';
import { FaSpinner } from 'react-icons/fa';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface TextEditorProps {
  readonly mode?: 'mini' | 'full';
  readonly source?: Document | ResourceMeta;
  readonly generalCallback?: () => void;
}

interface EditorState {
  content: string;
  title: string;
  isUploading: boolean;
}

export default function TextEditor({
  mode = 'full',
  source,
  generalCallback,
}: TextEditorProps) {
  const [state, setState] = useState<EditorState>({
    content: '',
    title: '',
    isUploading: false,
  });

  useEffect(() => {
    if (!source) return;

    if ('text' in source) {
      // Document type
      setState((prev) => ({
        ...prev,
        content: source.text || '',
        title: source.name || '',
      }));
    } else {
      // ResourceMeta type
      setState((prev) => ({
        ...prev,
        content: source.notes || '',
      }));
    }
  }, [source]);

  const handleSave = async () => {
    if (!source) {
      console.error('No source provided for saving.');
      return;
    }

    setState((prev) => ({ ...prev, isUploading: true }));

    try {
      if ('text' in source) {
        // Document type
        const updatedDoc: Document = {
          ...source,
          name: state.title,
          text: state.content,
        };

        const response = await fetch('/api/db', {
          method: source.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedDoc),
        });

        if (!response.ok) {
          throw new Error('Failed to save document');
        }
      } else {
        // ResourceMeta type
        const response = await fetch('/api/db/resourcemeta/notes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: source.id, notes: state.content }),
        });

        if (!response.ok) {
          throw new Error('Failed to save notes');
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
      throw error;
    } finally {
      setState((prev) => ({ ...prev, isUploading: false }));
    }
  };

  const handleContentChange = (newContent: string) => {
    setState((prev) => ({ ...prev, content: newContent }));
  };

  const handleTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setState((prev) => ({ ...prev, title: newTitle }));

    if (!source || !('text' in source)) return;

    try {
      const updatedDoc: Document = {
        ...source,
        name: newTitle,
        text: state.content,
      };

      const response = await fetch('/api/db', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDoc),
      });

      if (!response.ok) {
        throw new Error('Failed to update title');
      }
    } catch (error) {
      console.error('Error updating title:', error);
    }
  };

  if (mode === 'mini') {
    return (
      <div className='flex h-full max-w-full flex-col rounded-xl bg-gray-900 text-white'>
        <ReactQuill
          className='scrollbar-hide h-full max-w-full overflow-y-auto bg-transparent px-2 py-1 text-white'
          modules={{ toolbar: false }}
          value={state.content}
          onChange={handleContentChange}
          style={{ maxHeight: '5rem', overflowY: 'auto' }}
          data-testid='react-quill'
        />
        <div className='flex items-center justify-end space-x-4 rounded-b-xl p-4'>
          {state.isUploading ? (
            <div className='flex items-center justify-center'>
              <FaSpinner className='mr-3 animate-spin text-lg' />
              <span className='text-gray-400'>Saving...</span>
            </div>
          ) : (
            <button
              onClick={handleSave}
              className='w-full whitespace-nowrap rounded-md border border-zinc-700 bg-gray-800 px-2 py-1 text-xs text-white transition ease-in-out hover:bg-gray-700'
            >
              Save
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className='flex h-full max-w-full flex-col rounded-xl p-4 text-white'>
      <input
        type='text'
        value={state.title}
        onChange={handleTitleChange}
        onBlur={handleTitleChange}
        placeholder='Enter document title'
        className='text-gray-200outline-none mb-2 w-full rounded-t-xl bg-bgSecondary text-lg font-bold'
      />
      {'text' in (source || {}) && <TagSection />}
      <Divider />
      <div className='h-full'>
        <style>
          {`
            .ql-toolbar {
              position: sticky;
              top: 0;
              z-index: 10;
              background-color: #130E16;
              border: none !important;
              border-bottom: 1px solid #333333 !important; 
            }
            .ql-toolbar .ql-stroke {
              stroke: white;
            }
            .ql-toolbar .ql-fill {
              fill: white;
            }
            .ql-toolbar .ql-picker,
            .ql-toolbar .ql-picker-label,
            .ql-toolbar {
              color: white;
            }
            .ql-picker-options {
              color: black;
            }
            .ql-container {
              border: none !important;
            }
            .ql-editor {
              border: none !important;
            }
          `}
        </style>
        <ReactQuill
          className='scrollbar-hide h-full max-w-full overflow-y-auto bg-transparent text-white'
          modules={{
            toolbar: [
              [{ header: '1' }, { header: '2' }, { font: [] }],
              [{ size: [] }],
              ['bold', 'italic', 'underline', 'strike', 'blockquote'],
              [
                { list: 'ordered' },
                { list: 'bullet' },
                { indent: '-1' },
                { indent: '+1' },
              ],
              ['link', 'image', 'video'],
              ['clean'],
            ],
            clipboard: { matchVisual: false },
          }}
          value={state.content}
          onChange={handleContentChange}
          placeholder='Write something amazing...'
        />
      </div>
      <Divider />
      <div className='flex items-center justify-end space-x-4 rounded-b-xl p-4'>
        {state.isUploading ? (
          <div className='flex items-center justify-center'>
            <FaSpinner className='mr-3 animate-spin text-lg' />
            <span className='text-gray-400'>Saving...</span>
          </div>
        ) : (
          <>
            <button
              onClick={generalCallback}
              className='w-1/2 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-sm text-white transition ease-in-out hover:bg-gray-700'
            >
              Back
            </button>
            <button
              onClick={handleSave}
              className='w-1/2 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-sm text-white transition ease-in-out hover:bg-gray-700'
            >
              Save
            </button>
          </>
        )}
      </div>
    </div>
  );
}
