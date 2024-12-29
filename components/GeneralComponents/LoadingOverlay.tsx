import React from 'react';
import { FaSpinner } from 'react-icons/fa';

interface LoadingOverlayProps {
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Loading...',
}) => {
  return (
    <div className='absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70'>
      <div className='text-center text-white'>
        <FaSpinner className='mx-auto mb-4 animate-spin text-6xl' />
        <p>{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
