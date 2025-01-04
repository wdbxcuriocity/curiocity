import type { Metadata } from 'next';
import './globals.css';
import { SwitchContextProvider } from '@/context/SwitchContext';
import { AuthProvider } from '@/context/AuthContext';
import { CurrentDocumentProvider } from '@/context/AppContext';
import { CurrentResourceProvider } from '@/context/AppContext';
import { inter } from './fonts';

export const metadata: Metadata = {
  title: 'Apex',
  description: 'Document Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' suppressHydrationWarning className={inter.variable}>
      <body
        suppressHydrationWarning
        className='bg-background font-sans text-foreground'
      >
        <AuthProvider>
          <CurrentDocumentProvider>
            <CurrentResourceProvider>
              <SwitchContextProvider>{children}</SwitchContextProvider>
            </CurrentResourceProvider>
          </CurrentDocumentProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
