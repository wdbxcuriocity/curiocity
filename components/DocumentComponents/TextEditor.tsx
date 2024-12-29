'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { Document, ResourceMeta } from '@/types/types';
import TagSection from '@/components/DocumentComponents/TagSection';
import Divider from '../GeneralComponents/Divider';
import { FaSpinner } from 'react-icons/fa';

// Dynamically import ReactQuill with SSR disabled
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface TextEditorProps {
  mode: 'mini' | 'full';
  source: Document | ResourceMeta | undefined;
  generalCallback: () => void;
}

const TextEditor: React.FC<TextEditorProps> = ({
  mode,
  source,
  generalCallback,
}) => {
  if (mode === 'full') {
    return <FullTextEditor source={source} generalCallback={generalCallback} />;
  }

  if (mode === 'mini') {
    return <MiniTextEditor source={source} generalCallback={generalCallback} />;
  }

  return null;
};

const FullTextEditor: React.FC<TextEditorProps> = ({
  source,
  generalCallback,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [id, setID] = useState<string | undefined>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  useEffect(() => {
    if (!source) return;

    const document = source as Document;
    setTitle(document.name || '');
    setContent(document.text || '');
    setID(document.id || '');
  }, [source]);

  const handleSave = async () => {
    if (!source) {
      console.error('No source provided for saving.');
      return;
    }

    setIsUploading(true);

    try {
      const document = source as Document;
      const updatedDocument: Document = {
        ...document,
        name: title,
        text: content,
      };

      await fetch('/api/db', {
        method: document.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDocument),
      });

      setUploadComplete(true);
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Failed to save content.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className='flex h-full max-w-full flex-col rounded-xl p-4 text-white'>
      <input
        type='text'
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder='Enter document title'
        className='text-gray-200outline-none mb-2 w-full rounded-t-xl bg-bgSecondary text-lg font-bold'
      />
      {id && <TagSection />}
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
              stroke: #fff;
            }
            .ql-toolbar .ql-fill {
              fill: #fff;
            }
            .ql-toolbar .ql-picker,
            .ql-toolbar .ql-picker-label,
            .ql-toolbar .ql-picker-options {
              color: #fff;
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
          value={content}
          onChange={setContent}
          placeholder='Write something amazing...'
        />
      </div>
      <Divider />
      <div className='flex items-center justify-end space-x-4 rounded-b-xl p-4'>
        {isUploading ? (
          <div className='flex items-center justify-center'>
            <FaSpinner className='mr-3 animate-spin text-lg' />
            <span className='text-gray-400'>Uploading...</span>
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
};

const MiniTextEditor: React.FC<TextEditorProps> = ({
  source,
  generalCallback,
}) => {
  const [content, setContent] = useState('');
  const [id, setID] = useState<string | undefined>('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!source) return;

    const resourceMeta = source as ResourceMeta;
    setContent(resourceMeta.notes || '');
    setID(resourceMeta.id || '');
  }, [source]);

  const handleSave = async () => {
    if (!source) {
      console.error('No source provided for saving.');
      return;
    }

    setIsUploading(true);

    try {
      const resourceMeta = source as ResourceMeta;

      await fetch(`/api/db/ResourceMetaNotes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resourceMeta.id, notes: content }),
      });
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className='flex h-full max-w-full flex-col rounded-xl bg-gray-900 text-white'>
      <ReactQuill
        className='scrollbar-hide h-full max-w-full overflow-y-auto bg-transparent px-2 py-1 text-white'
        modules={{
          toolbar: false, // Disable the toolbar
        }}
        value={content}
        onChange={setContent}
        style={{
          maxHeight: '5rem', // Approx 3 lines of text (adjust as needed)
          overflowY: 'auto',
        }}
      />

      <div className='flex items-center justify-end space-x-4 rounded-b-xl p-4'>
        {isUploading ? (
          <div className='flex items-center justify-center'>
            <FaSpinner className='mr-3 animate-spin text-lg' />
            <span className='text-gray-400'>Uploading...</span>
          </div>
        ) : (
          <>
            <button
              onClick={handleSave}
              className='w-full whitespace-nowrap rounded-md border border-zinc-700 bg-gray-800 px-2 py-1 text-xs text-white transition ease-in-out hover:bg-gray-700'
            >
              Save
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TextEditor;
