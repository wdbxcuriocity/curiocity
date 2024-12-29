'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { usePostHog } from 'posthog-js/react';

function PostHogTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    // Ensure this runs on the client-side
    if (typeof window !== 'undefined' && pathname && posthog) {
      console.log('>>> posthog >>>');
      let url = `${window.location.origin}${pathname}`;
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }

      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams, posthog]);

  return null; // This component has no visual output
}

export default function PostHogPageView() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PostHogTracker />
    </Suspense>
  );
}
