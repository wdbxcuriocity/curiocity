import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

const AUTH_PAGE = '/login';
const AUTHORIZED_PAGE = '/report-home';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    // Redirect to the login page if the user is not authenticated
    return NextResponse.redirect(new URL(AUTH_PAGE, req.url));
  }

  // Redirect to the authorized page if the user is authenticated
  return NextResponse.redirect(new URL(AUTHORIZED_PAGE, req.url));
}

export const config = {
  matcher: '/', // Apply middleware to the root path or adjust as needed
};
