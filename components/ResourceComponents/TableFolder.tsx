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
      fetchDocument(currentDocument.id); // Refresh the document
    } catch (error) {
      console.error('Error renaming folder:', error);
    }
  };

  return (
    <div className='relative rounded-md px-2'>
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
            className='block w-full px-4 py-2 text-left hover:bg-gray-600'
            onClick={async () => {
              setIsDeleting(true);

              try {
                const response = await fetch('/api/db/documents/deleteFolder', {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    folderName: folderData.name,
                    documentId: currentDocument.id,
                  }),
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to delete folder');
                }
                await fetchDocument(currentDocument.id);
              } catch (error) {
                console.error('Error deleting folder:', error);
              } finally {
                setIsDeleting(false);
              }
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete Folder'}
          </button>
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

      {isExpanded && (
        <div className='mb-2 space-y-2'>
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
    </div>
  );
};

export default Folder;
