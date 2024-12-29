import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

import DeleteConfirmationModal from '../ModalComponents/DeleteConfirmationModal';

interface MoreOptionsDropdownProps {
  documentId?: string;
}

const MoreOptionsDropdown: React.FC<MoreOptionsDropdownProps> = ({
  documentId,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteModalOpen(true);
  };

  const handleModalClose = () => {
    setIsDeleteModalOpen(false);
  };

  const handleDeleteComplete = () => {
    setIsDeleteModalOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='h-8 w-8 p-0 text-white'
            onClick={(e) => e.stopPropagation()}
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
