import React, { useState, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';

interface FolderDropdownProps {
  possibleFolders: Array<string>;
  selectedFolder?: string; // Optional prop for flexibility
  onFolderChange: (folderName: string) => void;
}

const FolderDropdown: React.FC<FolderDropdownProps> = ({
  possibleFolders,
  selectedFolder = 'General Folder', // Default to "General Folder" if undefined
  onFolderChange,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);

  const handleFolderSelection = (folderName: string) => {
    onFolderChange(folderName);
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    // Ensure a default folder is always selected
    if (!selectedFolder) {
      onFolderChange('General');
    }
  }, [selectedFolder, onFolderChange]);

  return (
    <div className='relative w-full'>
      <button
        onClick={toggleDropdown}
        className='flex w-full items-center justify-between whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-sm text-white duration-200 hover:bg-gray-400 focus:bg-gray-500'
      >
        {selectedFolder}
        <FaChevronDown className='ml-2 text-white' />
      </button>
      {isDropdownOpen && (
        <div className='absolute z-10 mt-1 w-full rounded-md border-[1px] border-gray-600 bg-gray-800 shadow-lg'>
          {possibleFolders.map((folder) => (
            <div
              key={folder}
              className='cursor-pointer border-b-[1px] border-gray-600 bg-gray-800 px-2 py-1 text-white hover:bg-gray-400'
              onClick={() => handleFolderSelection(folder)}
            >
              {folder}
            </div>
          ))}
          <div
            className='cursor-pointer px-2 py-1 text-white hover:bg-purple-500'
            onClick={() => handleFolderSelection('Enter New Folder Name')}
          >
            + New Folder
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderDropdown;
