'use client';

import React from 'react';
import TextEditor from '@/components/DocumentComponents/TextEditor';
import { Document } from '@/types/types';

interface DocumentEditorProps {
  document: Document | undefined | null;
  handleBack: () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document,
  handleBack,
}) => {
  if (!document) {
    return (
      <div className='flex h-full items-center justify-center text-white'>
        <p>No document selected.</p>
      </div>
    );
  }

  return (
    <div className='flex h-full max-w-full flex-col rounded-xl text-white'>
      <TextEditor mode='full' source={document} generalCallback={handleBack} />
    </div>
  );
};

export default DocumentEditor;
