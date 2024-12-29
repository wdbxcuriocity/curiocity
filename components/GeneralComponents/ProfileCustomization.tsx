'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useSession } from 'next-auth/react';
import { AvatarIcon, Cross2Icon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { useForm, SubmitHandler, FieldValues } from 'react-hook-form';
import ResetPasswordButton from './ResetPasswordButton';

// Define the form values type
interface ChangeUserFormValues extends FieldValues {
  username: string;
  email: string;
}

export default function ProfileCustomization({
  onProfileUpdate,
}: {
  onProfileUpdate: () => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: session, update: updateSession } = useSession();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const formMethods = useForm<ChangeUserFormValues>({
    defaultValues: {
      username: session?.user?.name || '',
      email: session?.user?.email || '',
    },
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    formMethods.reset({
      username: session?.user?.name || '',
      email: session?.user?.email || '',
    });
    setPreviewImage(session?.user?.image || null);
    setSelectedFile(null);
    setIsModalOpen(false);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const onSubmit: SubmitHandler<ChangeUserFormValues> = async (data) => {
    try {
      let imageUrl = previewImage;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('userId', session?.user?.id || '');

        const response = await fetch('/api/user/upload-photo', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload photo');
        }

        const result = await response.json();
        imageUrl = result.imageUrl;
      }

      const profileResponse = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: session?.user.id,
          name: data.username,
          image: imageUrl,
        }),
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to update profile');
      }

      console.log('Profile updated successfully');
      // Update the session to reflect new profile info
      await updateSession();

      await updateSession(); // Refresh session to reflect updates
      onProfileUpdate(); // Notify parent of the profile update
      handleCloseModal(); // Close modal after successful update
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  useEffect(() => {
    if (session?.user) {
      formMethods.reset({
        username: session.user.name || '',
        email: session.user.email || '',
      });
      setPreviewImage(session.user.image || null);
    }
  }, [session, formMethods]);

  return (
    <div className='grid h-10 w-10 place-items-center rounded-lg border-2 border-fileBlue transition-colors duration-200 hover:bg-gray-700'>
      <div
        onClick={handleOpenModal}
        className='grid h-full w-full cursor-pointer place-items-center'
      >
        {session && session.user && (
          <div className='flex items-center space-x-2'>
            {session.user.image && (
              <div className='relative h-6 w-6'>
                <Image
                  src={session.user.image}
                  alt='User Avatar'
                  layout='fill'
                  className='rounded-full'
                />
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75'>
          <div className='flex h-[48rem] w-[32rem] flex-col rounded-xl border-[1px] border-zinc-700 bg-bgSecondary p-6'>
            <div className='w-fill mb-6 flex justify-between'>
              <h1 className='text-3xl font-bold text-textPrimary'>
                Profile Settings
              </h1>
              <div
                onClick={handleCloseModal}
                className='grid cursor-pointer place-items-center'
              >
                <Cross2Icon className='h-6 w-6 rounded-lg text-textPrimary transition-colors duration-200 hover:bg-gray-700' />
              </div>
            </div>

            <h5 className='text-textPrimary'>Profile Picture</h5>
            <div className='my-4 grid w-full place-items-center'>
              {previewImage ? (
                <Image
                  src={previewImage}
                  alt={`${session?.user?.name}'s profile picture`}
                  width={128}
                  height={128}
                  className='h-32 w-32 rounded-full text-center text-textPrimary'
                />
              ) : (
                <p className='text-textPrimary'>No user image available</p>
              )}
            </div>

            <input
              type='file'
              accept='image/*'
              style={{ display: 'none' }}
              id='photo-upload'
              onChange={handleFileChange}
            />
            <Button
              onClick={() => document.getElementById('photo-upload')?.click()}
              className='bg-gray-800 transition-colors duration-200 hover:bg-gray-700'
            >
              Change Photo
            </Button>

            <Form
              {...formMethods}
              key={session ? session.user.email : 'default'}
            >
              <form
                onSubmit={formMethods.handleSubmit(onSubmit)}
                className='mt-6 space-y-6'
              >
                <FormField
                  name='username'
                  control={formMethods.control}
                  rules={{ required: 'Username is required' }}
                  render={({ field }) => (
                    <FormItem className='space-y-2'>
                      <FormLabel className='text-textPrimary'>
                        Username
                      </FormLabel>
                      <FormControl>
                        <input
                          {...field}
                          type='text'
                          placeholder='Enter new username'
                          className='w-full rounded-md border border-textPrimary bg-bgSecondary px-4 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500'
                        />
                      </FormControl>
                      <FormMessage className='text-sm font-medium text-red-500' />
                    </FormItem>
                  )}
                />

                <FormField
                  name='email'
                  control={formMethods.control}
                  rules={{
                    required: 'Email is required',
                    pattern: {
                      value: /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/,
                      message: 'Enter a valid email address',
                    },
                  }}
                  render={({}) => (
                    <FormItem className='space-y-2'>
                      <FormLabel className='text-textPrimary'>Email</FormLabel>
                      <FormControl>
                        <input
                          type='email'
                          placeholder='Feature Coming Soon'
                          disabled
                          className='w-full rounded-md border border-red-500 bg-bgSecondary px-4 py-2 text-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500'
                        />
                      </FormControl>
                      <FormMessage className='text-sm font-medium text-red-500' />
                    </FormItem>
                  )}
                />

                <button
                  type='submit'
                  className='w-full rounded-md bg-gray-800 py-2 font-semibold text-white duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                >
                  Update Profile
                </button>
              </form>
            </Form>

            <div className='mt-8'>
              <ResetPasswordButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
