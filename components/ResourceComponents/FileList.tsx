'use client';

import React, { useState, useEffect } from 'react';
import { DndContext } from '@dnd-kit/core';
import TableFolder from '@/components/ResourceComponents/TableFolder';
import TextInput from '../GeneralComponents/TextInput';
import Divider from '../GeneralComponents/Divider';
import { FaFilter } from 'react-icons/fa';
import { useCurrentDocument } from '@/context/AppContext';
import { FolderData } from '@/types/types';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSortOrder: string;
  setSelectedSortOrder: (value: string) => void;
  selectedFileTypes: string[];
  setSelectedFileTypes: (value: string[]) => void;
  setSelectedDateRange: (value: { from: string; to: string }) => void;
  availableFileTypes: string[];
  selectedDateRange: { from: string; to: string };
}

const filterResources = (
  folders: Record<string, FolderData>,
  fileTypes: string[],
  dateRange: { from: string; to: string },
  sortOrder: string,
  searchQuery: string,
): Record<string, FolderData> => {
  return Object.entries(folders || {}).reduce(
    (acc: Record<string, FolderData>, [folderName, folderData]) => {
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
            return (
              new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime()
            );
          case 'lastOpened':
            return (
              new Date(b.lastOpened).getTime() -
              new Date(a.lastOpened).getTime()
            );
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

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  selectedSortOrder,
  setSelectedSortOrder,
  selectedFileTypes,
  setSelectedFileTypes,
  setSelectedDateRange,
  availableFileTypes,
  selectedDateRange,
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
          <label htmlFor='sort-order' className='mb-2 block text-sm'>
            Sort Order
          </label>
          <select
            id='sort-order'
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
          <fieldset>
            <legend className='mb-2 block text-sm'>File Types</legend>
            <div className='flex flex-wrap gap-2'>
              {availableFileTypes.map((fileType) => (
                <div key={fileType} className='flex items-center'>
                  <input
                    type='checkbox'
                    id={`filetype-${fileType}`}
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
                    className='mr-2'
                  />
                  <label htmlFor={`filetype-${fileType}`} className='text-sm'>
                    {fileType}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        </div>
        <Divider />
        <div className='mb-4'>
          <fieldset>
            <legend className='mb-2 block text-sm'>Date Range</legend>
            <div className='flex gap-2'>
              <div className='flex-1'>
                <label htmlFor='date-from' className='mb-1 block text-xs'>
                  From
                </label>
                <input
                  id='date-from'
                  type='date'
                  className='w-full rounded-md bg-gray-700 px-2 py-1'
                  value={selectedDateRange.from}
                  onChange={(e) =>
                    setSelectedDateRange({
                      ...selectedDateRange,
                      from: e.target.value,
                    })
                  }
                />
              </div>
              <div className='flex-1'>
                <label htmlFor='date-to' className='mb-1 block text-xs'>
                  To
                </label>
                <input
                  id='date-to'
                  type='date'
                  className='w-full rounded-md bg-gray-700 px-2 py-1'
                  value={selectedDateRange.to}
                  onChange={(e) =>
                    setSelectedDateRange({
                      ...selectedDateRange,
                      to: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </fieldset>
        </div>
        <Divider />
        <div className='flex justify-between'>
          <button
            onClick={handleClearFilters}
            className='rounded-md bg-gray-700 px-2 py-1 text-sm text-white hover:bg-gray-600'
          >
            Reset Filters
          </button>
          <button
            onClick={onClose}
            className='rounded-md bg-gray-700 px-2 py-1 text-sm text-white hover:bg-gray-600'
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default function FileList() {
  const { currentDocument } = useCurrentDocument();
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >({});
  const [selectedSortOrder, setSelectedSortOrder] = useState('a-z');
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<{
    from: string;
    to: string;
  }>({
    from: '',
    to: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  useEffect(() => {
    if (currentDocument?.folders) {
      // Initialize expanded state for all folders
      const initialExpandedState = Object.keys(currentDocument.folders).reduce(
        (acc, folderName) => ({
          ...acc,
          [folderName]: true, // Set to true to expand all folders by default
        }),
        {},
      );
      setExpandedFolders(initialExpandedState);
    }
  }, [currentDocument?.folders]);

  if (!currentDocument) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-center'>
          <p className='text-gray-400'>Loading...</p>
        </div>
      </div>
    );
  }

  const filteredFolders = filterResources(
    currentDocument.folders,
    selectedFileTypes,
    selectedDateRange,
    selectedSortOrder,
    searchQuery,
  );

  return (
    <div className='h-full w-full'>
      <div className='mb-4 flex items-center justify-between'>
        <div className='flex-1'>
          <TextInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search resources...'
          />
        </div>
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className='ml-2 rounded-md bg-gray-800 px-3 py-1 text-white hover:bg-gray-700'
        >
          <FaFilter />
        </button>
      </div>
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        selectedSortOrder={selectedSortOrder}
        setSelectedSortOrder={setSelectedSortOrder}
        selectedFileTypes={selectedFileTypes}
        setSelectedFileTypes={setSelectedFileTypes}
        setSelectedDateRange={setSelectedDateRange}
        availableFileTypes={['pdf', 'doc', 'docx', 'txt']}
        selectedDateRange={selectedDateRange}
      />
      <DndContext>
        {Object.entries(filteredFolders).map(([folderName, folderData]) => (
          <TableFolder
            key={folderName}
            folderData={{ ...folderData, name: folderName }}
            isExpanded={expandedFolders[folderName] || false}
            onToggle={() =>
              setExpandedFolders((prev) => ({
                ...prev,
                [folderName]: !prev[folderName],
              }))
            }
          />
        ))}
      </DndContext>
    </div>
  );
}
