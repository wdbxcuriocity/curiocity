'use client';

import React, { useState } from 'react';
import { useCurrentDocument, useCurrentResource } from '@/context/AppContext';

import ResourceViewer from '@/components/ResourceComponents/ResourceViewer';
import S3Button from '@/components/ResourceComponents/S3Button';
import FileList from '@/components/ResourceComponents/FileList';

const FileViewer: React.FC = () => {
  const { currentDocument } = useCurrentDocument();
  const { currentResourceMeta } = useCurrentResource();

  const [showUploadForm, setShowUploadForm] = useState(false);

  if (!currentDocument) {
    return (
      <div className='flex h-full w-full items-center justify-center text-gray-500'>
        <p>No document selected</p>
      </div>
    );
  }

  return (
    <div className='flex h-full w-full'>
      <div className='h-full w-2/3 p-4'>
        {!showUploadForm && (
          <button
            onClick={() => setShowUploadForm(true)}
            className='mb-4 w-full rounded-md bg-gray-800 px-2 py-1 text-sm text-white transition ease-in-out hover:bg-gray-700'
          >
            Open Upload Form
          </button>
        )}

        {!showUploadForm && !currentResourceMeta ? (
          <div className='flex h-full w-full items-center justify-center text-gray-500'>
            <p>No resources selected</p>
          </div>
        ) : !showUploadForm && currentResourceMeta ? (
          <ResourceViewer />
        ) : (
          <S3Button
            onBack={() => {
              setShowUploadForm(false);
            }}
          />
        )}
      </div>

      {/* Right Panel */}
      <div className='w-1/3 border-l border-gray-700 p-4'>
        <FileList />
      </div>
    </div>
  );
};

export default FileViewer;
