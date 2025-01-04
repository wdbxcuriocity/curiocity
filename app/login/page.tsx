'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

interface FormData {
  email: string;
  password: string;
}

interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
}

export default function Login() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id) {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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
        <div className='flex flex-col items-center space-y-2'>
          <h1 className='text-4xl font-bold text-textPrimary'>APEX</h1>
          <p className='text-sm text-textSecondary'>Version 1.0.0</p>
        </div>

        <form onSubmit={handleSubmit} className='w-full space-y-4'>
          <InputField
            id='email'
            label='Email'
            type='email'
            placeholder='name@company.com'
            value={formData.email}
            onChange={handleChange}
            autoComplete='email'
          />
          <InputField
            id='password'
            label='Password'
            type='password'
            placeholder='••••••••'
            value={formData.password}
            onChange={handleChange}
            autoComplete='current-password'
          />

          {error && (
            <div className='text-sm text-red-500' role='alert'>
              {error}
            </div>
          )}

          <button
            type='submit'
            disabled={loading}
            className='mt-2 w-full rounded-lg bg-accentPrimary px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className='flex w-full flex-col space-y-4'>
          <div className='flex items-center justify-center space-x-1'>
            <span className='text-sm text-textSecondary'>New to Apex?</span>
            <Link
              href='/signup'
              className='text-sm text-accentPrimary hover:underline'
            >
              Create an account
            </Link>
          </div>
          <div className='flex items-center justify-center space-x-1'>
            <span className='text-sm text-textSecondary'>
              Forgot your password?
            </span>
            <Link
              href='/reset-password'
              className='text-sm text-accentPrimary hover:underline'
            >
              Reset it here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const InputField = ({
  id,
  label,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
}: InputFieldProps) => (
  <div className='space-y-2'>
    <label htmlFor={id} className='block text-sm font-medium text-textPrimary'>
      {label}
    </label>
    <div className='relative rounded-lg border border-zinc-700 bg-bgSecondary px-4 py-2'>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className='h-full w-full bg-transparent text-textPrimary placeholder-textSecondary focus:outline-none'
      />
    </div>
  </div>
);
