'use client';

import React, { useState, useRef } from 'react';
import { FaCheckCircle, FaTrash, FaArrowLeft, FaSpinner } from 'react-icons/fa';
import FolderDropdown from '@/components/ResourceComponents/FolderSelectionDropdown';
import { useCurrentResource } from '@/context/AppContext';
import { useCurrentDocument } from '@/context/AppContext';
import Divider from '../GeneralComponents/Divider';

interface S3ButtonProps {
  onBack: () => void; // Callback function for "Cancel" button
}

const S3Button = ({ onBack }: S3ButtonProps) => {
  // need to create new use Context called for global states such as loading, showS3,etc
  const { uploadResource } = useCurrentResource();
  const { currentDocument, fetchDocument, setCurrentDocument } =
    useCurrentDocument();

  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [isNewFolder, setIsNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [fileQueue, setFileQueue] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, boolean>>(
    {},
  );
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFileQueue((prevQueue) => [
        ...prevQueue,
        ...Array.from(e.target.files),
      ]);
    }
  };

  const handleUploadAll = async () => {
    if (fileQueue.length === 0) {
      alert('No files selected for upload.');
      return;
    }

    setIsUploading(true);

    const folderToSave = isNewFolder ? newFolderName : selectedFolder;

    try {
      for (const file of fileQueue) {
        try {
          await uploadResource(file, folderToSave, currentDocument.id);
          setUploadedFiles((prev) => ({ ...prev, [file.name]: true }));
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetchDocument(currentDocument.id);
      setFileQueue([]);
    } catch (error) {
      console.error('Error handling uploads:', error);
    } finally {
      setIsUploading(false);
      onBack();
    }
  };

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center space-x-2 p-2'>
        <p className='whitespace-nowrap text-sm text-white'>Select Folder:</p>
        {!isNewFolder ? (
          <FolderDropdown
            possibleFolders={Object.keys(currentDocument.folders)}
            selectedFolder={selectedFolder}
            onFolderChange={(folderName) => {
              setSelectedFolder(folderName);
              setIsNewFolder(folderName === 'Enter New Folder Name');
            }}
          />
        ) : (
          <>
            <button
              onClick={() => setIsNewFolder(false)}
              className='bg:gray-800 rounded-md p-1 text-white hover:bg-gray-400'
            >
              <FaArrowLeft />
            </button>
            <input
              type='text'
              placeholder='Enter Name'
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className='w-full rounded-lg bg-gray-800 px-2 py-1 text-sm text-white outline-none focus:border-white'
            />
          </>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className='whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-sm text-white duration-200 hover:bg-gray-400'
        >
          Select Files
        </button>
      </div>
      <Divider></Divider>
      <input
        type='file'
        multiple
        onChange={handleFileChange}
        className='hidden'
        ref={fileInputRef}
      />

      <div className='h-[40%] flex-grow py-2'>
        <div className='flex h-full overflow-y-auto p-2'>
          {fileQueue.length === 0 ? (
            <div className='flex h-full w-full items-center justify-center'>
              <p className='text-gray-400'>No files selected</p>
            </div>
          ) : (
            <ul className='w-full list-disc space-y-2 text-white'>
              {fileQueue.map((file, index) => (
                <div
                  key={index}
                  className='flex w-full rounded-lg border-[1px] border-zinc-700'
                >
                  <p className='flex-1 truncate whitespace-nowrap px-2 py-1 text-sm'>
                    {file.name}
                  </p>
                  {isUploading ? (
                    uploadedFiles[file.name] ? (
                      <FaCheckCircle className='mx-2 my-2 text-green-500' />
                    ) : (
                      <div className='ml-2 h-4 w-4' />
                    )
                  ) : (
                    <button
                      className='mx-2 text-red-500 hover:text-red-400'
                      onClick={() =>
                        setFileQueue((prevQueue) =>
                          prevQueue.filter((f) => f.name !== file.name),
                        )
                      }
                      aria-label={`Delete ${file.name}`}
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Divider></Divider>

      {isUploading ? (
        <div className='flex items-center justify-center'>
          <FaSpinner className='mr-3 animate-spin text-lg text-white' />
          <span className='text-gray-400'>Uploading...</span>
        </div>
      ) : (
        <div className='flex space-x-4 py-2'>
          <button
            onClick={onBack}
            className='w-full rounded-md bg-gray-800 px-2 py-1 text-sm text-white hover:bg-gray-400'
          >
            Cancel
          </button>
          <button
            onClick={handleUploadAll}
            className='w-full rounded-md bg-gray-800 px-2 py-1 text-sm text-white hover:bg-gray-400'
          >
            Upload All Files
          </button>
        </div>
      )}
    </div>
  );
};

export default S3Button;
