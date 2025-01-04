'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useCurrentDocument, useCurrentResource } from '@/context/AppContext';
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
  const { data: session, status } = useSession();
  const {
    currentDocument,
    setCurrentDocument,
    fetchDocuments,
    viewingDocument,
    setViewingDocument,
    fetchDocument,
  } = useCurrentDocument();

  const { setCurrentResource, setCurrentResourceMeta } = useCurrentResource();

  useEffect(() => {
    if (session?.user?.id) {
      fetchDocuments();
    }
  }, [session?.user?.id, fetchDocuments]);

  const handleBack = () => {
    fetchDocuments();
    setViewingDocument(false);
    setCurrentDocument(null);
    setCurrentResourceMeta(null);
    setCurrentResource(null);
  };

  const handleDocumentClick = async (documentId: string) => {
    try {
      await fetchDocument(documentId);
      setViewingDocument(true);
    } catch (error) {
      console.error('Error fetching document:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className='flex h-screen w-screen items-center justify-center bg-black'>
        <LoadingOverlay message='Authenticating...' />
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className='flex h-screen w-screen items-center justify-center bg-black'>
        <LoadingOverlay message='Please sign in to continue' />
      </div>
    );
  }

  return (
    <section className='h-screen overscroll-contain bg-bgPrimary'>
      <NavBar onLogoClick={viewingDocument ? handleBack : undefined} />
      <div className='flex h-full w-full flex-col items-start justify-start overflow-hidden'>
        <ResizablePanelGroup
          direction='horizontal'
          className='flex-grow px-8 py-4'
        >
          <ResizablePanel>
            <div className='h-full w-full max-w-full gap-4 overflow-hidden bg-bgPrimary p-4'>
              <div className='max-w-1/2 h-full shrink grow basis-1/2 flex-col gap-4 overflow-hidden rounded-xl border-[1px] border-zinc-700'>
                <div className='h-full max-w-full grow flex-col overflow-hidden rounded-lg bg-bgSecondary'>
                  {viewingDocument && currentDocument ? (
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

          {viewingDocument && currentDocument && (
            <>
              <ResizableHandle withHandle className='mx-2 my-4 bg-gray-400' />
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
