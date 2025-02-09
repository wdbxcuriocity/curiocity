'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

import { useCurrentDocument, useCurrentResource } from '@/context/AppContext';
import { error } from '@/lib/logging';

import FileViewer from '@/components/ResourceComponents/FilesViewer';
import NavBar from '@/components/GeneralComponents/NavBar';
import DocumentEditor from '@/components/DocumentComponents/DocumentEditor';
import AllDocumentsGrid from '@/components/DocumentComponents/AllDocumentsGrid';
import LoadingOverlay from '@/components/GeneralComponents/LoadingOverlay';

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

export default function ReportHome() {
  const { data: session } = useSession();

  const {
    currentDocument,
    setCurrentDocument,
    fetchDocuments,
    viewingDocument,
    setViewingDocument,
    fetchDocument,
  } = useCurrentDocument();

  const { setCurrentResource, setCurrentResourceMeta } = useCurrentResource();

  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedDocuments, setHasLoadedDocuments] = useState(false);

  useEffect(() => {
    if (session?.user?.id && !hasLoadedDocuments) {
      fetchDocuments();
      setHasLoadedDocuments(true);
    }
  }, [session?.user?.id, fetchDocuments, hasLoadedDocuments]);

  const handleBack = () => {
    setViewingDocument(false);
    setCurrentDocument(null);
    setCurrentResourceMeta(null);
    setCurrentResource(null);
  };

  const handleDocumentClick = async (documentId: string) => {
    setIsLoading(true);
    try {
      await fetchDocument(documentId);
      setViewingDocument(true);
    } catch (e: unknown) {
      error('Error fetching document', e, { documentId });
    } finally {
      setIsLoading(false);
    }
  };

  if (!session?.user) {
    return (
      <div className='flex h-screen w-screen items-center justify-center bg-black'>
        <LoadingOverlay message='Authenticating...' />
      </div>
    );
  }

  return (
    <section className='h-screen overscroll-contain bg-bgPrimary'>
      {isLoading && <LoadingOverlay message='Loading document...' />}
      <div className='flex h-full w-full flex-col items-start justify-start overflow-hidden'>
        {!currentDocument && <NavBar onLogoClick={handleBack} />}
        <ResizablePanelGroup
          direction='horizontal'
          className='flex-grow px-8 py-4'
        >
          <ResizablePanel>
            <div className='h-full w-full max-w-full gap-4 overflow-hidden bg-bgPrimary p-4'>
              <div className='max-w-1/2 h-full shrink grow basis-1/2 flex-col gap-4 overflow-hidden rounded-xl border-[1px] border-zinc-700'>
                <div className='h-full max-w-full grow flex-col overflow-hidden rounded-lg bg-bgSecondary'>
                  {viewingDocument ? (
                    <DocumentEditor
                      document={currentDocument}
                      handleBack={handleBack}
                    />
                  ) : (
                    <AllDocumentsGrid onDocumentClick={handleDocumentClick} />
                  )}
                </div>
              </div>
            </div>
          </ResizablePanel>

          {currentDocument && (
            <>
              <ResizableHandle
                withHandle={true}
                className='mx-2 my-4 bg-gray-400'
              />
              <ResizablePanel>
                <div className='h-full w-full p-4'>
                  <div className='flex h-full flex-col rounded-xl border-[1px] border-zinc-700 bg-bgSecondary'>
                    <FileViewer />
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </section>
  );
}
