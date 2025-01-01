'use client';

import React, { useState, useEffect } from 'react';
import TextEditor from '@/components/DocumentComponents/TextEditor';
import { ResourceMeta } from '@/types/types';

interface NotesEditorProps {
  resourceMeta: ResourceMeta | null;
  onClose: () => void;
}

const NotesEditor: React.FC<NotesEditorProps> = ({ resourceMeta, onClose }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resourceMeta) {
      setError('No resource selected.');
      setIsLoading(false);
      return;
    }
    setIsLoading(false);
  }, [resourceMeta]);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center'>
        <p className='text-gray-500'>Loading notes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center'>
        <p className='text-red-500'>{error}</p>
      </div>
    );
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-bold text-white'>Notes</h2>
        <button
          onClick={onClose}
          className='rounded-md bg-gray-800 px-2 py-1 text-sm text-white hover:bg-gray-700'
        >
          Close
        </button>
      </div>
      <div className='mt-4 flex-1'>
        <TextEditor
          mode='mini'
          source={resourceMeta || undefined}
          generalCallback={onClose}
        />
      </div>
    </div>
  );
};

export default NotesEditor;
