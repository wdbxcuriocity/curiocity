import React, { useState } from 'react';
import { useCurrentDocument } from '@/context/AppContext';
import { useSession } from 'next-auth/react';

interface NewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewDocumentModal = ({ isOpen, onClose }: NewDocumentModalProps) => {
  const [documentName, setDocumentName] = useState('');
  const { data: session } = useSession();
  const { createDocument } = useCurrentDocument();

  const handleCreate = async () => {
    if (!documentName.trim()) {
      alert('Please enter a valid document name.');
      return;
    }
    if (session?.user?.id) {
      await createDocument(documentName.trim(), session.user.id);
      setDocumentName('');
      onClose();
    } else {
      console.error('User ID not found. Please log in.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='w-1/3 rounded-lg bg-gray-800 p-6 text-white shadow-lg'>
        <h3 className='text-lg font-semibold'>Create New Document</h3>
        <p className='mb-2 text-sm text-gray-400'>
          Enter a name for your new document:
        </p>
        <input
          type='text'
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          placeholder='Document name'
          className='mb-4 w-full rounded-md bg-gray-700 px-2 py-1 text-white'
        />
        <div className='flex justify-end gap-2'>
          <button
            onClick={onClose}
            className='rounded-md bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-500'
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className='rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500'
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewDocumentModal;
