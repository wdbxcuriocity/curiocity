import React, { useState } from 'react';
import TableRow from './TableRow';
import { useCurrentDocument } from '@/context/AppContext';
import { FolderData, ResourceCompressed } from '@/types/types';
import RenameFolderModal from '../ModalComponents/RenameFolderModal';

interface FolderProps {
  folderData: FolderData;
  isExpanded: boolean;
  onToggle: () => void;
}

const Folder = ({ folderData, isExpanded, onToggle }: FolderProps) => {
  const { currentDocument, fetchDocument } = useCurrentDocument();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newFolderName, setNewFolderName] = useState(folderData.name);
  if (!currentDocument) {
    console.error('No current document found.');
    return null;
  }

  const { folders } = currentDocument;
  const folder = folders[folderData.name];

  if (!folder) {
    console.error(`Folder "${folderData.name}" not found.`);
    return null;
  }

  const resources: ResourceCompressed[] = folderData.resources || [];

  const handleRenameFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Folder name cannot be empty.');
      return;
    }

    try {
      const response = await fetch('/api/db/documents/renameFolder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: currentDocument.id,
          oldFolderName: folderData.name,
          newFolderName: newFolderName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to rename folder:', errorData.error);
        return;
      }

      console.log('Folder renamed successfully.');
      setIsRenaming(false);
      fetchDocument(currentDocument.id);
    } catch (error) {
      console.error('Error renaming folder:', error);
    }
  };

  const handleDeleteFolder = async () => {
    if (!currentDocument) return;

    try {
      const response = await fetch('/api/db/documents/deleteFolder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: currentDocument.id,
          folderName: folderData.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to delete folder:', errorData.error);
        return;
      }

      console.log('Folder deleted successfully.');
      setIsDeleting(false);
      fetchDocument(currentDocument.id);
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  return (
    <div
      className='relative rounded-md px-2'
      data-testid={`folder-${folderData.name}`}
    >
      <div
        className='mb-2 flex cursor-pointer items-center justify-between border-b-[1px] border-gray-700 py-1 text-white hover:border-gray-400 hover:text-gray-400'
        onClick={onToggle}
      >
        <h2 className='text-md font-semibold'>
          {folderData.name} ({folderData.resources?.length || 0})
        </h2>
        <div className='flex items-center'>
          <span className='pr-1 text-xs'>{isExpanded ? '▼' : '►'}</span>
          {folderData.name !== 'General' && (
            <button
              className='ml-2 text-sm'
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen((prev) => !prev);
              }}
            >
              ...
            </button>
          )}
        </div>
      </div>

      {isDropdownOpen && (
        <div className='absolute right-0 z-10 w-40 rounded-md bg-gray-700 text-white shadow-lg'>
          <button
            className='block w-full px-4 py-2 text-left hover:bg-gray-600'
            onClick={() => {
              setIsRenaming(true);
              setIsDropdownOpen(false);
            }}
          >
            Rename Folder
          </button>
          <button
            className='block w-full px-4 py-2 text-left text-red-400 hover:bg-gray-600'
            onClick={() => {
              setIsDeleting(true);
              setIsDropdownOpen(false);
            }}
          >
            Delete Folder
          </button>
        </div>
      )}

      {isExpanded && (
        <div className='mt-2' data-testid={`folder-content-${folderData.name}`}>
          {resources.map((resource) => (
            <TableRow
              key={resource.id}
              resourceCompressed={resource}
              folderName={folderData.name}
              availableFolders={Object.keys(folders)}
            />
          ))}
        </div>
      )}

      {isRenaming && (
        <RenameFolderModal
          currentFolderName={folderData.name}
          newFolderName={newFolderName}
          setNewFolderName={setNewFolderName}
          onCancel={() => setIsRenaming(false)}
          onRename={handleRenameFolder}
        />
      )}

      {isDeleting && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
          <div className='w-full max-w-lg rounded-lg bg-gray-800 p-6 text-white shadow-lg'>
            <h1 className='mb-4 text-xl font-bold'>Delete Folder</h1>
            <p className='mb-6 text-sm text-gray-400'>
              Are you sure you want to delete the folder &quot;{folderData.name}
              &quot;? This action cannot be undone.
            </p>
            <div className='flex justify-end gap-4'>
              <button
                onClick={() => setIsDeleting(false)}
                className='rounded-md border border-gray-500 px-4 py-2 text-sm text-gray-300 duration-200 hover:bg-gray-700'
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFolder}
                className='rounded-md bg-red-600 px-4 py-2 text-sm text-white duration-200 hover:bg-red-700'
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Folder;
