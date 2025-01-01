'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCurrentResource } from '@/context/AppContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import NotesEditor from '@/components/ResourceComponents/NotesEditor';
import { Switch } from '../ui/switch';
import Divider from '@/components/GeneralComponents/Divider';
import { FaSpinner } from 'react-icons/fa';
import dynamic from 'next/dynamic';

const PDFViewer = dynamic<{ url: string }>(
  () => import('./PDFViewer').then((mod) => mod.default),
  {
    ssr: false,
  },
);

interface Resource {
  url: string;
  markdown: string;
  fileType?: string;
}

export default function ResourceViewer() {
  const { currentResourceMeta } = useCurrentResource();
  const [viewMode, setViewMode] = useState<'URL' | 'Text'>('URL');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [resource, setResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchResource = useCallback(async () => {
    if (!currentResourceMeta?.hash) {
      console.error('Resource hash is missing. Cannot fetch resource.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/db/resource?hash=${currentResourceMeta.hash}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch resource: ${response.statusText}`);
      }

      const resourceData = await response.json();
      setResource(resourceData);
    } catch (error) {
      console.error('Could not fetch resource', error);
      setResource(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentResourceMeta?.hash]);

  useEffect(() => {
    fetchResource();
  }, [fetchResource]);

  useEffect(() => {
    if (resource?.url && currentResourceMeta?.fileType === 'csv') {
      fetch(resource.url)
        .then((response) => response.text())
        .then((text) => {
          const rows = text.trim().split('\n');
          setCsvData(rows.map((row) => row.split(',')));
        })
        .catch((error) => {
          console.error('Error loading CSV file:', error);
          setCsvData([]);
        });
    } else {
      setCsvData([]);
    }
  }, [resource?.url, currentResourceMeta?.fileType]);

  if (isLoading) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <FaSpinner className='animate-spin text-4xl text-white' />
      </div>
    );
  }

  if (!resource || !currentResourceMeta) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <p className='text-white'>Resource not found.</p>
      </div>
    );
  }

  const renderCsvData = (data: string[][]) => {
    return (
      <div data-testid='csv-viewer' className='h-full overflow-auto'>
        <table className='w-full border-collapse'>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}-${row.join('-')}`}>
                {row.map((cell, colIndex) => (
                  <td
                    key={`cell-${rowIndex}-${colIndex}-${cell}`}
                    className='border border-gray-600 p-2 text-white'
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderContent = () => {
    if (viewMode === 'Text' && resource.markdown) {
      return (
        <div className='prose prose-invert h-full max-w-none overflow-y-auto p-4'>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {resource.markdown}
          </ReactMarkdown>
        </div>
      );
    }

    if (currentResourceMeta.fileType === 'csv' && csvData.length > 0) {
      return renderCsvData(csvData);
    }

    if (currentResourceMeta.fileType === 'pdf') {
      return <PDFViewer url={resource.url} />;
    }

    return <div>Unsupported file type</div>;
  };

  return (
    <div className='flex h-full w-full flex-col overflow-hidden p-2'>
      <div className='flex items-center justify-between'>
        <div className='flex w-full items-center'>
          <div className='flex h-full w-full flex-col px-2 py-2'>
            <div className='mb-2 text-lg font-bold text-white'>
              {currentResourceMeta.name
                ? currentResourceMeta.name.length > 20
                  ? `${currentResourceMeta.name.slice(0, 20)}...`
                  : currentResourceMeta.name
                : ''}
            </div>
            <div className='flex items-center space-x-2'>
              <Switch
                checked={viewMode === 'Text'}
                onCheckedChange={(checked) =>
                  setViewMode(checked ? 'Text' : 'URL')
                }
              />
              <span className='text-sm text-white'>Show extracted text</span>
            </div>
          </div>
        </div>
      </div>
      <Divider />
      <div className='flex-1 overflow-hidden'>{renderContent()}</div>
      <Divider />
      <div className='mt-2'>
        <textarea
          data-testid='resource-notes'
          className='w-full rounded bg-gray-800 p-2 text-white'
          placeholder='Add notes...'
          value={currentResourceMeta.notes || ''}
          onChange={() => setShowEditor(true)}
        />
      </div>
      {showEditor && (
        <NotesEditor
          resourceMeta={currentResourceMeta}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
