'use client';

import React, { useState } from 'react';

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior
    setError('');
    setMessage('');

    try {
      console.log('Submitted Form Data:', formData);
      const response = await fetch('/api/manual-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Something went wrong');
        return;
      }

      const data = await response.json();
      setMessage(data.message);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Failed to submit. Please try again.');
    }
  };

  return (
    <div className='flex min-h-screen justify-center bg-bgPrimary'>
      <div
        className='flex w-full max-w-[452px] flex-col items-center space-y-5 p-5 sm:p-10'
        style={{ paddingTop: '7vh' }} // Adjusting content alignment from top
      >
        {/* APEX Text and Version */}
        <div className='flex items-baseline space-x-1.5'>
          <h1 className='text-[48px] font-extrabold italic text-textPrimary'>
            APEX
          </h1>
          <span className='text-[24px] text-[#64516E]'>v 0.1</span>
        </div>

        {/* Header Section */}
        <div className='space-y-2 text-center'>
          <h1 className='text-[36px] font-extrabold text-textPrimary sm:text-[38px]'>
            Sign Up
          </h1>
          <p className='text-[14px] text-textSecondary'>
            Write, organize, and deliver your insights seamlessly.
          </p>
        </div>

        {/* Sign Up Form */}
        <form className='w-full space-y-5' onSubmit={handleSubmit}>
          <InputField
            id='name'
            label='Name'
            type='text'
            placeholder='John Doe'
            value={formData.name}
            onChange={handleChange}
          />
          <InputField
            id='email'
            label='Email'
            type='email'
            placeholder='johndoe@gmail.com'
            value={formData.email}
            onChange={handleChange}
          />
          <InputField
            id='password'
            label='Password'
            type='password'
            placeholder='••••••••'
            value={formData.password}
            onChange={handleChange}
          />
          <InputField
            id='passwordConfirmation'
            label='Password Confirmation'
            type='password'
            placeholder='••••••••'
            value={formData.passwordConfirmation}
            onChange={handleChange}
          />

          {/* Success/Error Messages */}
          {message && <p className='text-green-600'>{message}</p>}
          {error && <p className='text-red-600'>{error}</p>}

          {/* Buttons */}
          <div className='mt-3 flex flex-col items-center space-y-3'>
            <button
              type='submit'
              className='h-[40px] w-full max-w-[320px] rounded-lg bg-[#64516E99] py-2.5 text-textPrimary transition-colors duration-200 hover:bg-[#64516Ecc]'
            >
              Sign Up
            </button>

            <button
              type='button'
              className='flex h-[40px] w-full max-w-[320px] items-center justify-center space-x-2 rounded-lg bg-[#64516E99] py-2.5 text-textPrimary transition-colors duration-200 hover:bg-[#64516Ecc]'
            >
              <span className='text-base'>G</span>
              <span>Sign Up with Google</span>
            </button>
          </div>

          {/* Links Section */}
          <div className='text-center'>
            <p className='pt-1.5 text-[13px] text-textPrimary sm:text-[14px]'>
              <span className='decoration-textPrimary underline-offset-2'>
                Already have an account?
              </span>{' '}
              <a
                href='/login'
                className='text-textSecondary underline decoration-textSecondary underline-offset-2'
              >
                Log In
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

const InputField = ({ id, label, type, placeholder, value, onChange }) => (
  <div className='space-y-1.5'>
    <label
      htmlFor={id}
      className='block text-[13px] font-medium text-textPrimary'
    >
      {label}
    </label>
    <div className='flex h-10 w-full items-center rounded-lg bg-[#64516E]/20 px-3 py-1.5'>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className='h-full w-full bg-transparent text-textPrimary placeholder-textSecondary focus:outline-none'
      />
    </div>
  </div>
);
