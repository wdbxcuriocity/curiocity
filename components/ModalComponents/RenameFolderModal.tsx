import React from 'react';

interface RenameFolderModalProps {
  currentFolderName: string;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  onCancel: () => void;
  onRename: () => void;
}

const RenameFolderModal = ({
  currentFolderName,
  newFolderName,
  setNewFolderName,
  onCancel,
  onRename,
}: RenameFolderModalProps) => {
  return (
    <div className='fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='w-1/3 rounded-lg bg-gray-800 p-6 text-white shadow-lg'>
        <h3 className='text-lg font-semibold'>Rename Folder</h3>
        <p className='mb-2 text-sm text-gray-400'>
          Renaming folder: {currentFolderName}
        </p>
        <input
          type='text'
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          className='mb-4 w-full rounded-md bg-gray-700 px-2 py-1 text-white'
        />
        <div className='flex justify-end gap-2'>
          <button
            onClick={onCancel}
            className='rounded-md bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-500'
          >
            Cancel
          </button>
          <button
            onClick={onRename}
            className='rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500'
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenameFolderModal;
