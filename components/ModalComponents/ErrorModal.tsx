import React from 'react';

interface ErrorModalProps {
  message: string; // The error message to display
  onClose: () => void; // Function to close the modal
}

export default function ErrorModal({ message, onClose }: ErrorModalProps) {
  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'
      onClick={onClose} // Close modal on background click
    >
      <div
        className='rounded-lg bg-white p-6 shadow-lg'
        onClick={(e) => e.stopPropagation()} // Prevent click inside modal from closing
      >
        <h2 className='mb-4 text-lg font-bold text-red-500'>Error</h2>
        <p className='mb-4 text-gray-700'>{message}</p>
        <button
          onClick={onClose}
          className='rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600'
        >
          Close
        </button>
      </div>
    </div>
  );
}
