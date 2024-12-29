import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  type = 'button',
  disabled = false,
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className='whitespace-nowrap rounded-md border border-zinc-700 bg-transparent px-2 py-1 text-sm text-white duration-200 hover:bg-gray-700'
    >
      {label}
    </button>
  );
};

export default Button;
