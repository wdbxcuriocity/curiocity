import React from 'react';

export interface PDFViewerProps {
  url: string;
}

export default function PDFViewer({ url }: PDFViewerProps) {
  return (
    <iframe
      data-testid='pdf-viewer'
      src={url}
      className='h-full w-full'
      title='PDF Viewer'
    />
  );
}
