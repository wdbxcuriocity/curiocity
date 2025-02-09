import dotenv from 'dotenv';
import { PostHog } from 'posthog-node';
import { getCurrentTime } from '../user/route';
import { client, getObject, tableName } from '../db/route';
import { log, redact } from '@/lib/logging';

dotenv.config();

// Initialize the PostHog client
const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY || '', {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST, // Ensure this points to your PostHog host
});

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const data = await request.json();
    log({
      level: 'INFO',
      service: 'analytics',
      message: 'Analytics event received',
      correlationId,
      userId: data.id,
      metadata: redact({
        event: data.event,
        properties: data.properties,
      }),
    });

    if (data && data.id && data.event && data.properties) {
      data.properties.timeStamp = getCurrentTime();
      data.properties.id = data.id;
      log({
        level: 'INFO',
        service: 'analytics',
        message: 'Calling analytics service',
        correlationId,
        userId: data.id,
        metadata: redact({
          event: data.event,
          properties: data.properties,
        }),
      });

      posthog.capture({
        distinctId: data.id, // Unique identifier for the user
        event: data.event, // Event name
        properties: data.properties,
      });
    }

    await getObject(client, data.id, tableName);

    return Response.json({});
  } catch (error) {
    const data = await request.json().catch(() => ({})); // Safely parse request
    log({
      level: 'ERROR',
      service: 'analytics',
      message: 'Analytics event failed',
      correlationId,
      error,
      metadata: redact({
        event: data?.event,
      }),
    });
    return Response.json({ error: 'An error occurred' }, { status: 500 });
  }
}
