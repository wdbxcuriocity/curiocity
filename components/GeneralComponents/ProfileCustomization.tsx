'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useForm, SubmitHandler, FieldValues } from 'react-hook-form';
import Image from 'next/image';

interface ChangeUserFormValues extends FieldValues {
  username: string;
  email: string;
}

interface ProfileCustomizationProps {
  readonly onProfileUpdate: () => Promise<void>;
}

export default function ProfileCustomization({
  onProfileUpdate,
}: ProfileCustomizationProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: session, update: updateSession } = useSession();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const formMethods = useForm<ChangeUserFormValues>({
    defaultValues: {
      username: session?.user?.name ?? '',
      email: session?.user?.email ?? '',
    },
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    formMethods.reset({
      username: session?.user?.name ?? '',
      email: session?.user?.email ?? '',
    });
    setPreviewImage(session?.user?.image ?? null);
    setSelectedFile(null);
    setIsModalOpen(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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
        formData.append('userId', session?.user?.id ?? '');

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
          id: session?.user?.id,
          name: data.username,
          image: imageUrl,
        }),
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to update profile');
      }

      await updateSession();
      await onProfileUpdate();
      handleCloseModal();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  useEffect(() => {
    if (session?.user) {
      formMethods.reset({
        username: session.user.name ?? '',
        email: session.user.email ?? '',
      });
      setPreviewImage(session.user.image ?? null);
    }
  }, [session, formMethods]);

  return (
    <>
      <button
        className='focus:ring-primary grid h-10 w-10 place-items-center rounded-lg border-2 border-fileBlue transition-colors duration-200 hover:bg-gray-700 focus:outline-none focus:ring-2'
        onClick={handleOpenModal}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleOpenModal();
          }
        }}
        aria-label='Open profile customization'
      >
        {session?.user ? (
          <Image
            src={session.user.image ?? '/default-avatar.png'}
            alt='Profile'
            width={24}
            height={24}
            className='rounded-full'
          />
        ) : null}
      </button>

      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
          <div className='w-96 rounded-lg bg-white p-6 shadow-lg'>
            <form
              onSubmit={formMethods.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              <div>
                <label
                  htmlFor='profileImage'
                  className='block text-sm font-medium text-gray-700'
                >
                  Profile Image
                </label>
                <input
                  type='file'
                  id='profileImage'
                  accept='image/*'
                  onChange={handleFileChange}
                  className='focus:border-primary focus:ring-primary mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-1'
                />
                {previewImage && (
                  <Image
                    src={previewImage}
                    alt='Preview'
                    width={80}
                    height={80}
                    className='mt-2 rounded-full object-cover'
                  />
                )}
              </div>
              <div className='flex justify-end space-x-2'>
                <button
                  type='button'
                  onClick={handleCloseModal}
                  className='rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='bg-primary hover:bg-primary-dark rounded-md px-4 py-2 text-sm font-medium text-white'
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
