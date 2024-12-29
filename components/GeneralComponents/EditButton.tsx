import React from 'react';
import { Pencil1Icon } from '@radix-ui/react-icons';

interface EditButtonProps {
  onClick: () => void;
  tooltip?: string;
  size?: number; // The size in Tailwind units (e.g., `4`, `6`, etc.)
}

const EditButton: React.FC<EditButtonProps> = ({
  onClick,
  tooltip = 'Edit',
  size = 4,
}) => {
  const sizeClass = `h-${size} w-${size}`; // Dynamic class construction

  return (
    <button
      onClick={onClick}
      className='flex text-blue-500 hover:text-blue-600 focus:outline-none'
      aria-label={tooltip}
    >
      <Pencil1Icon className={sizeClass} />
    </button>
  );
};

export default EditButton;
