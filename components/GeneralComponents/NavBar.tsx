'use client';
import Image from 'next/image';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import logoIconSmall from '@/assets/logo.png';
import { GearIcon } from '@radix-ui/react-icons';
import ProfileCustomization from './ProfileCustomization';

interface NavBarProps {
  onLogoClick?: () => void;
}

export default function NavBar({ onLogoClick }: NavBarProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false })
      .then(() => {
        console.log(session, 'logout attempt');
        // posthog
        if (session && session.user) {
          fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'Sign Out Successful',
              id: session?.user.id,
              properties: {},
            }),
          });
        }
      })
      .catch(() => {
        // posthog
        if (session && session.user) {
          fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'Sign Out Failed',
              id: session?.user.id,
              properties: {},
            }),
          });
        }
      });

    router.push('/login');
  };

  return (
    <div className='h-18 w-full px-8'>
      <div className='flex h-full items-center justify-between py-2'>
        <div className='flex h-full items-center'>
          <div className='relative h-14 w-14 p-2' onClick={onLogoClick}>
            <Image src={logoIconSmall} alt='Logo' />
          </div>
          <p className='text-4xl font-extrabold italic text-textPrimary'>
            APEX
          </p>
          <p className='ml-2 mt-3 text-sm text-textSecondary'>v 0.1</p>
        </div>

        <div className='flex h-full items-center gap-4'>
          <ProfileCustomization
            onProfileUpdate={async () => {
              await router.refresh(); // Reload to reflect the updated session
            }}
          />
          <div className='grid h-10 w-10 place-items-center rounded-lg border-2 border-fileBlue transition-colors duration-200 hover:bg-gray-700'>
            <GearIcon className='h-6 w-6 text-fileBlue' />
          </div>
          <button
            onClick={handleSignOut}
            className='grid h-10 w-10 place-items-center rounded-lg border-2 border-fileRed transition-colors duration-200 hover:bg-gray-700'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='16'
              height='16'
              fill='currentColor'
              className='bi bi-box-arrow-in-right h-6 w-6 text-fileRed'
              viewBox='0 0 16 16'
            >
              <path
                fillRule='evenodd'
                d='M6 3.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 0-1 0v2A1.5 1.5 0 0 0 6.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-8A1.5 1.5 0 0 0 5 3.5v2a.5.5 0 0 0 1 0z'
              />
              <path
                fillRule='evenodd'
                d='M11.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H1.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z'
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
