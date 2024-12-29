'use client';

import React, { useState, useEffect } from 'react';
import TextEditor from '@/components/DocumentComponents/TextEditor';
import { useCurrentResource } from '@/context/AppContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import NotesEditor from '@/components/ResourceComponents/NotesEditor';
import Image from 'next/image';
import NameEditor from './NameEditor';
import { Switch } from '../ui/switch';
import Divider from '../GeneralComponents/Divider';
import { FaSpinner } from 'react-icons/fa';

const ResourceViewer: React.FC = () => {
  const { currentResourceMeta, setCurrentResourceMeta } = useCurrentResource();
  const [viewMode, setViewMode] = useState<'URL' | 'Text'>('URL');
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [showEditor, setShowEditor] = useState(false); // Initialize as false
  const [resource, setResource] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the resource data
  const fetchResource = async () => {
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResource();
  }, [currentResourceMeta]);

  // Handle CSV loading
  useEffect(() => {
    if (resource && resource.url.toLowerCase().endsWith('.csv')) {
      fetch(resource.url)
        .then((response) => response.text())
        .then((text) => {
          const rows = text.trim().split('\n');
          setCsvData(rows.map((row) => row.split(',')));
        })
        .catch((error) => console.error('Error loading CSV file:', error));
    } else {
      setCsvData(null);
    }
  }, [resource]);

  if (isLoading) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <FaSpinner className='animate-spin text-4xl text-white' />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className='flex h-full w-full items-center justify-center'>
        <p className='text-white'>Resource not found.</p>
      </div>
    );
  }

  return (
    <div className='flex h-full w-full flex-col overflow-hidden p-2'>
      <div className='flex items-center justify-between'>
        <div className='flex w-full items-center'>
          <div className='flex h-full w-full flex-col px-2 py-2'>
            <div className='mb-2 text-lg font-bold text-white'>
              {currentResourceMeta?.name
                ? currentResourceMeta.name.length > 20
                  ? `${currentResourceMeta.name.slice(0, 20)}...`
                  : currentResourceMeta.name
                : ''}
            </div>
            <div className='w-1/2'>
              <button
                onClick={() => setShowEditor((prev) => !prev)}
                className='whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-sm text-white hover:bg-gray-400'
              >
                {showEditor ? 'Close Notes Editor' : 'Open Notes Editor'}
              </button>
            </div>
          </div>

          <div className='flex h-full items-center justify-center px-2'>
            <label className='mr-2 text-sm font-semibold text-white'>
              {viewMode}
            </label>
            <Switch
              checked={viewMode === 'Text'}
              onCheckedChange={(checked) =>
                setViewMode(checked ? 'Text' : 'URL')
              }
            />
          </div>
        </div>
      </div>

      {showEditor && (
        <div className='mb-4'>
          {' '}
          <NotesEditor handleBack={() => setShowEditor(false)} />{' '}
        </div>
      )}

      <Divider></Divider>

      <div className='h-[85%] overflow-hidden'>
        {viewMode === 'Text' ? (
          <div className='h-full overflow-scroll'>
            <ReactMarkdown
              className='prose text-white'
              remarkPlugins={[remarkGfm]}
            >
              {resource?.markdown || ''}
            </ReactMarkdown>
          </div>
        ) : resource.url.toLowerCase().endsWith('.pdf') ? (
          <iframe src={resource.url} className='h-full w-full border-none' />
        ) : /\.(jpeg|jpg|png|gif)$/i.test(resource.url) ? (
          <div className='relative flex h-full w-full'>
            {resource.url ? (
              <Image
                src={resource.url}
                alt='Resource image'
                fill
                className='object-contain object-top'
              />
            ) : (
              <p className='text-white'>No image available</p>
            )}
          </div>
        ) : resource.url.toLowerCase().endsWith('.html') ? (
          <iframe
            src={resource.url}
            className='h-full w-full border-none bg-white'
            sandbox='allow-same-origin allow-scripts allow-popups allow-forms'
          />
        ) : csvData ? (
          <table className='w-full text-white'>
            <thead>
              <tr>
                {csvData[0].map((header, index) => (
                  <th key={index} className='border p-2'>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csvData.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className='border p-2'>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className='text-white'>Unsupported file type</p>
        )}
      </div>
    </div>
  );
};

export default ResourceViewer;
