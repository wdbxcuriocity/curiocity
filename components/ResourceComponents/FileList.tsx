'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import TableFolder from '@/components/ResourceComponents/TableFolder';
import TextInput from '../GeneralComponents/TextInput';
import Divider from '../GeneralComponents/Divider';
import { FaCheck } from 'react-icons/fa';
import { useCurrentDocument } from '@/context/AppContext';

const filterResources = (
  folders,
  fileTypes,
  dateRange,
  sortOrder,
  searchQuery,
) => {
  return Object.entries(folders || {}).reduce(
    (acc, [folderName, folderData]) => {
      let resources = folderData.resources;

      // Apply file type filter
      if (fileTypes.length > 0) {
        resources = resources.filter((resource) =>
          fileTypes.includes(resource.fileType),
        );
      }

      // Apply date range filter
      if (dateRange.from || dateRange.to) {
        const fromDate = dateRange.from
          ? new Date(dateRange.from + 'T00:00:00Z')
          : null;
        const toDate = dateRange.to
          ? new Date(dateRange.to + 'T23:59:59Z')
          : null;

        resources = resources.filter((resource) => {
          const resourceDate = new Date(resource.dateAdded);
          if (fromDate && resourceDate < fromDate) return false;
          if (toDate && resourceDate > toDate) return false;
          return true;
        });
      }

      // Apply sorting
      resources = resources.sort((a, b) => {
        switch (sortOrder) {
          case 'a-z':
            return a.name.localeCompare(b.name);
          case 'z-a':
            return b.name.localeCompare(a.name);
          case 'dateAdded':
            return new Date(a.dateAdded) - new Date(b.dateAdded);
          case 'lastOpened':
            return new Date(b.lastOpened) - new Date(a.lastOpened);
          default:
            return 0;
        }
      });

      // Apply search query filter
      if (searchQuery.trim()) {
        resources = resources.filter((resource) =>
          resource.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      }

      if (resources.length > 0 || !searchQuery.trim()) {
        acc[folderName] = { ...folderData, resources };
      }

      return acc;
    },
    {},
  );
};

const AddFileModal = ({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (folderName: string) => void;
}) => {
  const [folderName, setFolderName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (folderName.trim()) {
      onSubmit(folderName);
      setFolderName('');
      onClose();
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='w-1/3 rounded-lg bg-gray-700 p-6 text-white'>
        <h3 className='mb-4 text-lg font-semibold'>Add New Folder</h3>
        <input
          type='text'
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder='Enter folder name'
          className='mb-4 w-full rounded-md bg-gray-800 px-2 py-1 text-white outline-none'
        />
        <div className='flex justify-end gap-2'>
          <button
            onClick={handleSubmit}
            className='rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500'
          >
            Submit
          </button>
          <button
            onClick={onClose}
            className='rounded-md bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-600'
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const FilterModal = ({
  isOpen,
  onClose,
  selectedSortOrder,
  setSelectedSortOrder,
  selectedFileTypes,
  setSelectedFileTypes,
  selectedDateRange,
  setSelectedDateRange,
  availableFileTypes,
}) => {
  if (!isOpen) return null;

  const handleClearFilters = () => {
    setSelectedSortOrder('a-z');
    setSelectedFileTypes([]);
    setSelectedDateRange({ from: '', to: '' });
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='w-1/3 rounded-lg bg-gray-800 p-6 text-white'>
        <h3 className='mb-4 text-lg font-semibold'>Filter Options</h3>
        <Divider />
        <div className='mb-4'>
          <label className='mb-2 block text-sm'>Sort Order</label>
          <select
            className='w-full rounded-md bg-gray-700 px-2 py-1'
            value={selectedSortOrder}
            onChange={(e) => setSelectedSortOrder(e.target.value)}
          >
            <option value='a-z'>A to Z</option>
            <option value='z-a'>Z to A</option>
            <option value='dateAdded'>Date Added</option>
            <option value='lastOpened'>Last Opened</option>
          </select>
        </div>
        <Divider />
        <div className='mb-4'>
          <label className='mb-2 block text-sm'>File Types</label>
          <div className='flex flex-wrap gap-2'>
            {availableFileTypes.map((fileType) => (
              <label
                key={fileType}
                className='flex cursor-pointer items-center gap-2'
              >
                <div className='relative'>
                  <input
                    type='checkbox'
                    value={fileType}
                    checked={selectedFileTypes.includes(fileType)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFileTypes([...selectedFileTypes, fileType]);
                      } else {
                        setSelectedFileTypes(
                          selectedFileTypes.filter((type) => type !== fileType),
                        );
                      }
                    }}
                    className='absolute h-0 w-0 opacity-0'
                  />
                  <div
                    className={`h-5 w-5 rounded-md border-2 ${
                      selectedFileTypes.includes(fileType)
                        ? 'border-gray-500 bg-gray-500'
                        : 'border-[1px] border-gray-500 bg-gray-700'
                    } flex items-center justify-center`}
                  >
                    {selectedFileTypes.includes(fileType) && (
                      <FaCheck className='text-sm text-white' />
                    )}
                  </div>
                </div>
                <span className='text-sm text-white'>{fileType}</span>
              </label>
            ))}
          </div>
        </div>
        <Divider />
        <div className='mb-4'>
          <label className='mb-2 block text-sm'>Date Range</label>
          <div className='flex gap-2'>
            <input
              type='date'
              className='w-full rounded-md bg-gray-700 px-2 py-1'
              onChange={(e) =>
                setSelectedDateRange((prev) => ({
                  ...prev,
                  from: e.target.value,
                }))
              }
            />
            <input
              type='date'
              className='w-full rounded-md bg-gray-700 px-2 py-1'
              onChange={(e) =>
                setSelectedDateRange((prev) => ({
                  ...prev,
                  to: e.target.value,
                }))
              }
            />
          </div>
        </div>
        <Divider />
        <div className=''>
          <button
            onClick={handleClearFilters}
            className='rounded-md bg-gray-700 px-2 py-1 text-sm text-white hover:bg-gray-400'
          >
            Reset Filters
          </button>
        </div>
        <Divider />
        <div className='flex w-full justify-end'>
          <button
            onClick={onClose}
            className='rounded-md bg-gray-700 px-2 py-1 text-sm text-white hover:bg-gray-400'
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default function FileList() {
  const sensors = useSensors(useSensor(PointerSensor));
  const { currentDocument, fetchDocument } = useCurrentDocument();

  const [expandedFolders, setExpandedFolders] = useState<{
    [key: string]: boolean;
  }>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSortOrder, setSelectedSortOrder] = useState<string>('a-z');
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<{
    from: string;
    to: string;
  }>({ from: '', to: '' });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isAddFileModalOpen, setIsAddFileModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const availableFileTypes = [
    'PDF',
    'Word',
    'Excel',
    'PowerPoint',
    'CSV',
    'HTML',
    'PNG',
    'JPG',
    'GIF',
    'Link',
    'Other',
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (currentDocument) {
        setLoading(true);
        await fetchDocument(currentDocument.id);
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredFolders = useMemo(
    () =>
      filterResources(
        currentDocument?.folders || {},
        selectedFileTypes,
        selectedDateRange,
        selectedSortOrder,
        searchQuery,
      ),
    [
      currentDocument?.folders,
      selectedFileTypes,
      selectedDateRange,
      selectedSortOrder,
      searchQuery,
    ],
  );

  const handleAddFolder = async (folderName: string) => {
    if (!folderName.trim() || !currentDocument?.id) {
      console.error('Folder name and document ID are required.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`api/db/documents/addFolder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: currentDocument.id,
          folderName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Error adding folder:', error.message);
        alert(error.message || 'Failed to add folder.');
        return;
      }

      await fetchDocument(currentDocument.id);
      setIsAddFileModalOpen(false);
    } catch (error) {
      console.error('Error adding folder:', error);
      alert('An error occurred while adding the folder.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-center'>
          <p className='text-gray-400'>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors}>
      <div className='flex h-full w-full flex-col overflow-auto'>
        <TextInput
          placeholder='Search Resources'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          className='my-2 rounded-md bg-gray-800 px-2 py-1 text-sm text-white hover:bg-gray-700'
          onClick={() => setIsFilterModalOpen(true)}
        >
          Open Filters
        </button>

        <Divider />

        <div className='h-full overflow-scroll'>
          {Object.entries(filteredFolders).map(([key, folder]) => (
            <TableFolder
              key={key}
              folderData={folder}
              isExpanded={!!expandedFolders[key]}
              onToggle={() =>
                setExpandedFolders((prev) => ({
                  ...prev,
                  [key]: !prev[key],
                }))
              }
            />
          ))}
        </div>

        <Divider />

        <div className='flex justify-center'>
          <button
            onClick={() => setIsAddFileModalOpen(true)}
            className='w-full rounded-md bg-gray-800 px-2 py-1 text-sm text-white hover:bg-gray-700'
          >
            Add File
          </button>
        </div>

        <AddFileModal
          isOpen={isAddFileModalOpen}
          onClose={() => setIsAddFileModalOpen(false)}
          onSubmit={handleAddFolder}
        />

        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          selectedSortOrder={selectedSortOrder}
          setSelectedSortOrder={setSelectedSortOrder}
          selectedFileTypes={selectedFileTypes}
          setSelectedFileTypes={setSelectedFileTypes}
          selectedDateRange={selectedDateRange}
          setSelectedDateRange={setSelectedDateRange}
          availableFileTypes={availableFileTypes}
        />
      </div>
    </DndContext>
  );
}
