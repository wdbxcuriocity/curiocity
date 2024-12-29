'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link'; // Ensure you import Link from next/link

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (!result?.ok) {
        setError(result?.error || 'Invalid credentials. Please try again.');
        return;
      }

      router.push('/report-home');
    } catch (err) {
      console.error('Error during login:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen justify-center bg-bgPrimary'>
      <div
        className='flex w-full max-w-[452px] flex-col items-center space-y-5 p-10'
        style={{ paddingTop: '7vh' }}
      >
        {/* APEX Text and Version */}
        <div className='flex items-baseline space-x-1.5'>
          <h1 className='text-[48px] font-extrabold italic text-textPrimary'>
            APEX
          </h1>
          <span className='text-[24px] text-[#64516E]'>v 0.1</span>
        </div>

        {/* Header Section */}
        <div className='space-y-3 text-center'>
          <h1 className='text-[38px] font-extrabold text-textPrimary'>
            Log In
          </h1>
          <p className='text-[14px] text-textSecondary'>Welcome Back!</p>
        </div>

        {/* Login Form */}
        <form className='w-full space-y-5' onSubmit={handleSubmit}>
          {/* Email Input */}
          <InputField
            id='email'
            label='Email'
            type='email'
            placeholder='johndoe@gmail.com'
            value={formData.email}
            onChange={handleChange}
          />

          {/* Password Input */}
          <InputField
            id='password'
            label='Password'
            type='password'
            placeholder='••••••••'
            value={formData.password}
            onChange={handleChange}
          />

          {/* Error Message */}
          {error && <p className='text-center text-red-600'>{error}</p>}

          {/* Login Button */}
          <div className='space-y-3'>
            <div className='flex justify-center'>
              <button
                type='submit'
                className={`h-[40px] w-[320px] rounded-lg bg-[rgba(100,81,110,0.6)] py-2.5 text-white transition-colors duration-200 hover:bg-[rgba(100,81,110,0.8)] ${
                  loading ? 'cursor-not-allowed opacity-50' : ''
                }`}
                disabled={loading}
              >
                {loading ? 'Logging In...' : 'Log In'}
              </button>
            </div>

            {/* Google Login Button */}
            <div className='flex justify-center'>
              <div
                onClick={() =>
                  signIn('google', { callbackUrl: '/report-home' })
                }
                className='grid h-[40px] w-[320px] cursor-pointer place-items-center rounded-lg bg-[rgba(100,81,110,0.6)] py-2.5 text-white transition-colors duration-200 hover:bg-[rgba(100,81,110,0.8)]'
              >
                Log In with Google
              </div>
            </div>

            {/* Links Section */}
            <LinksSection />
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
      className='block text-[14px] font-medium text-textPrimary'
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

const LinksSection = () => (
  <div className='space-y-3 text-center'>
    <LinkItem text='Don’t have an account?' linkText='Sign-Up' href='/signup' />
    <LinkItem text='Forgot Password?' linkText='Reset Password' href='#' />
  </div>
);

const LinkItem = ({ text, linkText, href }) => (
  <p className='pt-1.5 text-[14px] text-textPrimary'>
    <span className='underline decoration-textPrimary underline-offset-2'>
      {text}
    </span>{' '}
    <Link
      href={href}
      className='text-textSecondary underline decoration-textSecondary underline-offset-2'
    >
      {linkText}
    </Link>
  </p>
);
