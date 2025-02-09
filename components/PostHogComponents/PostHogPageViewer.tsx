'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { usePostHog } from 'posthog-js/react';
import { useSession } from 'next-auth/react';
import { error } from '@/lib/logging';

function PostHogTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const { data: session } = useSession();

  useEffect(() => {
    // Ensure this runs on the client-side
    if (typeof window !== 'undefined' && pathname && posthog) {
      let url = `${window.location.origin}${pathname}`;
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }

      const correlationId = crypto.randomUUID();
      const userId = session?.user?.id;

      posthog.capture('$pageview', {
        $current_url: url,
        correlation_id: correlationId,
        user_id: userId,
      });

      error('PostHog pageview captured', {
        url,
        correlationId,
        userId,
        pathname,
      });
    }
  }, [pathname, searchParams, posthog, session]);

  return null; // This component has no visual output
}

export default function PostHogPageView() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PostHogTracker />
    </Suspense>
  );
}
