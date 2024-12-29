'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { useForm, SubmitHandler, FieldValues } from 'react-hook-form';
import { Cross2Icon } from '@radix-ui/react-icons';

interface ResetPasswordFormValues extends FieldValues {
  newPassword: string;
  confirmPassword: string;
}

export default function ResetPasswordButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formMethods = useForm<ResetPasswordFormValues>({
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleOpenModal = () => {
    console.log('Opening reset password modal...');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    console.log('Closing reset password modal...');
    formMethods.reset();
    setIsModalOpen(false);
  };

  const onSubmit: SubmitHandler<ResetPasswordFormValues> = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: data.newPassword,
          passwordConfirmation: data.confirmPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }

      handleCloseModal();
    } catch {
      alert('Error resetting password. Please try again.');
    }
  };

  return (
    <div>
      <Button
        onClick={handleOpenModal}
        className='bg-red-500 duration-200 hover:bg-red-600'
      >
        Reset Password
      </Button>

      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75'>
          <div className='flex w-[24rem] flex-col rounded-xl border-[1px] border-zinc-700 bg-bgSecondary p-6'>
            <div className='w-fill mb-6 flex justify-between'>
              <h1 className='text-2xl font-bold text-textPrimary'>
                Reset Password
              </h1>
              <div
                onClick={handleCloseModal}
                className='grid cursor-pointer place-items-center'
              >
                <Cross2Icon className='h-6 w-6 rounded-lg text-textPrimary duration-200 hover:bg-gray-700' />
              </div>
            </div>

            <Form {...formMethods}>
              <form
                onSubmit={formMethods.handleSubmit(onSubmit)}
                className='space-y-4'
              >
                <FormField
                  name='newPassword'
                  control={formMethods.control}
                  rules={{
                    required: 'New password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters long',
                    },
                  }}
                  render={({ field }) => (
                    <FormItem className='space-y-2'>
                      <FormLabel className='text-textPrimary'>
                        New Password
                      </FormLabel>
                      <FormControl>
                        <input
                          {...field}
                          type='password'
                          placeholder='Enter new password'
                          className='w-full rounded-md border border-textPrimary bg-bgSecondary px-4 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500'
                        />
                      </FormControl>
                      <FormMessage className='text-sm font-medium text-red-500' />
                    </FormItem>
                  )}
                />

                <FormField
                  name='confirmPassword'
                  control={formMethods.control}
                  rules={{
                    required: 'Please confirm your password',
                  }}
                  render={({ field }) => (
                    <FormItem className='space-y-2'>
                      <FormLabel className='text-textPrimary'>
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <input
                          {...field}
                          type='password'
                          placeholder='Confirm new password'
                          className='w-full rounded-md border border-textPrimary bg-bgSecondary px-4 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500'
                        />
                      </FormControl>
                      <FormMessage className='text-sm font-medium text-red-500' />
                    </FormItem>
                  )}
                />

                <button
                  type='submit'
                  className='w-full rounded-md bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                >
                  Reset Password
                </button>
              </form>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
