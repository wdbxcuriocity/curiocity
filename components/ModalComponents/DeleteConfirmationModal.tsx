'use client';

import React, { useState } from 'react';
import LoadingOverlay from '../GeneralComponents/LoadingOverlay';
import { useCurrentDocument } from '@/context/AppContext';

type DeleteProps = {
  documentId: string;
  refreshState: () => void;
  isOpen: boolean;
  onClose: () => void;
};

const DeleteConfirmationModal: React.FC<DeleteProps> = ({
  documentId,
  isOpen,
  onClose,
}) => {
  const { fetchDocuments } = useCurrentDocument();
  const [isDeleting, setIsDeleting] = useState(false); // Track deletion state

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents event propagation to parent
    setIsDeleting(true); // Show loading overlay
    try {
      const response = await fetch('/api/db', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: documentId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete document.');
      }

      const result = await response.json();
      console.log(result, documentId);

      fetchDocuments();
      onClose(); // Close modal
    } catch (error) {
      console.error('Error deleting file:', error);
    } finally {
      setIsDeleting(false); // Hide loading overlay
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents event propagation to parent
    onClose(); // Close modal
  };

  if (!isOpen) return null;

  return (
    <>
      {isDeleting && <LoadingOverlay message='Deleting document...' />}
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
        <div className='w-full max-w-lg rounded-lg bg-gray-800 p-6 text-white shadow-lg'>
          <h1 className='mb-4 text-xl font-bold'>Are you sure?</h1>
          <p className='mb-6 text-sm text-gray-400'>
            Are you sure you want to delete this file? This action cannot be
            undone.
          </p>
          <div className='flex justify-end gap-4'>
            <button
              onClick={handleCancel}
              className='rounded-md border border-gray-500 px-4 py-2 text-sm text-gray-300 duration-200 hover:bg-gray-700'
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className='rounded-md bg-red-600 px-4 py-2 text-sm text-white duration-200 hover:bg-red-700'
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteConfirmationModal;
