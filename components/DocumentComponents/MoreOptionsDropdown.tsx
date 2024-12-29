import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

import DeleteConfirmationModal from '../ModalComponents/DeleteConfirmationModal';
import { useCurrentDocument } from '@/context/AppContext';

interface MoreOptionsDropdownProps {
  documentId?: string;
}

const MoreOptionsDropdown: React.FC<MoreOptionsDropdownProps> = ({
  documentId,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents event bubbling
    setIsDeleteModalOpen(true); // Open the delete confirmation modal
  };

  const handleModalClose = () => {
    setIsDeleteModalOpen(false); // Close the modal
  };

  const handleDeleteComplete = () => {
    setIsDeleteModalOpen(false); // Close the modal after deletion
  };

  return (
    <>
      {/* Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='h-8 w-8 p-0 text-white'
            onClick={(e) => e.stopPropagation()} // Prevent opening document when menu is clicked
          >
            <span className='sr-only'>Open menu</span>
            ...
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-48'>
          <DropdownMenuItem onClick={handleDeleteClick}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <DeleteConfirmationModal
          documentId={documentId || ''}
          refreshState={handleDeleteComplete}
          isOpen={isDeleteModalOpen}
          onClose={handleModalClose}
        />
      )}
    </>
  );
};

export default MoreOptionsDropdown;
