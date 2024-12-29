// components/ConfirmCancelModal.tsx

import React from 'react';

interface ConfirmCancelModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  message: string;
}

export default function ConfirmCancelModal({
  onConfirm,
  onCancel,
  message,
}: ConfirmCancelModalProps) {
  return (
    <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50'>
      <div className='rounded-md bg-white p-4 shadow-lg'>
        <p className='mb-4'>{message}</p>
        <div className='flex justify-end gap-2'>
          <button onClick={onCancel} className='rounded bg-gray-300 px-3 py-1'>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className='rounded bg-blue-500 px-3 py-1 text-white'
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
