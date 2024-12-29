import dotenv from 'dotenv';
import { PostHog } from 'posthog-node';
import { getCurrentTime } from '../user/route';
import { client, getObject, tableName } from '../db/route';

dotenv.config();

// Initialize the PostHog client
const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY || '', {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST, // Ensure this points to your PostHog host
});

export async function POST(request: Request) {
  const data = await request.json();

  if (data && data.id && data.event && data.properties) {
    data.properties.timeStamp = getCurrentTime();
    data.properties.id = data.id;
    console.log('call analytics: ', data.id, data.event, data.properties);

    posthog.capture({
      distinctId: data.id, // Unique identifier for the user
      event: data.event, // Event name
      properties: data.properties,
    });
  }

  await getObject(client, data.id, tableName);

  return Response.json({});
}
