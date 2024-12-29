import { useState } from 'react';

interface TagComponentProps {
  label?: string; // The string to display in the tag
  newTag?: boolean; // Determines if this tag is a "new" tag
  onAdd?: (tag: string) => Promise<boolean>; // Async callback for adding a new tag
  onDelete?: () => void; // Callback for deleting a tag
}

export default function TagComponent({
  label,
  newTag = false,
  onAdd,
  onDelete,
}: TagComponentProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');

  const handleAddNewTag = async () => {
    if (!newTagValue.trim()) {
      return; // Validation for empty tag
    }
    if (onAdd) {
      const success = await onAdd(newTagValue.trim());
      if (success) {
        setIsAdding(false);
        setNewTagValue('');
      }
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setNewTagValue('');
  };

  return newTag ? (
    isAdding ? (
      <div className='flex items-center space-x-2'>
        <input
          type='text'
          placeholder='Enter new tag...'
          value={newTagValue}
          onChange={(e) => setNewTagValue(e.target.value)}
          className='focus:ring-none rounded-lg border border-zinc-700 bg-transparent px-2 py-1 text-sm focus:outline-none'
        />
        <button
          onClick={handleAddNewTag}
          className='flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 focus:outline-none'
          aria-label='Add new tag'
        >
          ✓
        </button>
        <button
          onClick={handleCancel}
          className='flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 focus:outline-none'
          aria-label='Cancel adding tag'
        >
          ✕
        </button>
      </div>
    ) : (
      <div
        className='flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-[1px] border-zinc-700 text-sm text-white hover:bg-blue-600'
        onClick={() => setIsAdding(true)}
        aria-label='Add new tag'
      >
        +
      </div>
    )
  ) : (
    <div className='flex items-center justify-center space-x-2 rounded-full border-[1px] border-zinc-700 py-1 pl-2 pr-3 text-sm font-medium text-gray-200'>
      <button
        onClick={onDelete}
        className='flex h-4 w-4 items-center justify-center rounded-full text-xs text-zinc-300 hover:bg-red-600 focus:outline-none'
        aria-label={`Delete ${label}`}
      >
        ✕
      </button>
      <span>{label}</span>
    </div>
  );
}
