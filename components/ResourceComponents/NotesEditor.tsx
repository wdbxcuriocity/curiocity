'use client';

import React, { useState, useEffect } from 'react';
import TextEditor from '@/components/DocumentComponents/TextEditor';
import { useCurrentResource } from '@/context/AppContext';

const NotesEditor: React.FC<{ handleBack: () => void }> = ({ handleBack }) => {
  const { currentResourceMeta } = useCurrentResource();
  const [notes, setNotes] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentResourceMeta) {
      setError('No resource selected.');
      setIsLoading(false);
      return;
    }

    const fetchNotes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/db/resourcemeta/notes?id=${currentResourceMeta.id}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch notes: ${response.statusText}`);
        }
        const data = await response.json();
        setNotes(data.notes || '');
      } catch (err) {
        console.error(err);
        setError('Failed to load notes. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [currentResourceMeta]);

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

  if (!currentResourceMeta) {
    return (
      <div className='flex items-center justify-center'>
        <p className='text-gray-500'>No resource selected.</p>
      </div>
    );
  }

  return (
    <div className='flex flex-col text-white'>
      <TextEditor
        mode='mini'
        source={{ ...currentResourceMeta, notes }}
        generalCallback={handleBack}
      />
    </div>
  );
};

export default NotesEditor;
