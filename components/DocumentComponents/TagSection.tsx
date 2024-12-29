'use client';

import React, { useEffect, useState } from 'react';
import { useCurrentDocument } from '@/context/AppContext';
import TagComponent from './TagComponent';
import ErrorModal from '@/components/ModalComponents/ErrorModal';

export default function TagSection() {
  const { currentDocument, setCurrentDocument } = useCurrentDocument(); // Access current document
  const [tags, setTags] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentDocument) {
      setTags(currentDocument.tags || []); // Set initial tags from the current document
    }
  }, [currentDocument]);

  const handleDelete = async (tag: string) => {
    if (!currentDocument) return;

    try {
      const res = await fetch(`/api/db/deleteTag`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: currentDocument.id, tag }),
      });

      if (res.ok) {
        setTags((prevTags) => prevTags.filter((t) => t !== tag));
        // Update the tags in the current document
        setCurrentDocument({
          ...currentDocument,
          tags: currentDocument.tags.filter((t) => t !== tag),
        });
      } else {
        setErrorMessage('Failed to delete the tag.');
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      setErrorMessage('An error occurred while deleting the tag.');
    }
  };

  const handleAddTag = async (newTag: string): Promise<boolean> => {
    if (!currentDocument) return false;

    if (tags.includes(newTag)) {
      setErrorMessage('Duplicate tag not allowed.');
      return false;
    }

    try {
      const res = await fetch(`/api/db/newTag`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: currentDocument.id, tag: newTag }),
      });

      if (res.ok) {
        setTags((prevTags) => [...prevTags, newTag]);
        // Update the tags in the current document
        setCurrentDocument({
          ...currentDocument,
          tags: [...(currentDocument.tags || []), newTag],
        });
        return true;
      } else {
        setErrorMessage('Failed to add new tag.');
        return false;
      }
    } catch (error) {
      console.error('Error adding new tag:', error);
      setErrorMessage('An error occurred while adding the tag.');
      return false;
    }
  };

  return (
    <div className='w-full'>
      {errorMessage && (
        <ErrorModal
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}
      <div className='flex h-full w-full flex-row items-center text-sm'>
        <span className='mr-2 text-white'>Tags:</span>
        <div className='flex h-full w-full flex-row items-center space-x-2 overflow-x-scroll'>
          <TagComponent newTag onAdd={handleAddTag} />
          {tags.map((tag, index) => (
            <TagComponent
              key={index}
              label={tag}
              onDelete={() => handleDelete(tag)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
