import { R2Bucket } from '@cloudflare/workers-types';
import { AwsClient } from 'aws4fetch';
import { debug } from '@/lib/logging';

interface TemporaryCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

/**
 * Gets temporary credentials for R2 access.
 * Currently not in use but maintained for:
 * - Potential future security improvements using short-lived credentials
 * - Alternative authentication method if needed
 * - Different deployment environment configurations
 */
async function getTemporaryCredentials(
  accountId: string,
  bucket: string,
  prefix?: string,
): Promise<TemporaryCredentials> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/temp-access-credentials`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      },
      body: JSON.stringify({
        bucket,
        prefix,
        lifetime: 3600, // 1 hour
      }),
    },
  );

  if (!response.ok) {
    throw new Error('Failed to get temporary credentials');
  }

  const data = await response.json();
  return data.result;
}

// Function to generate presigned URLs for R2 operations
export async function getPresignedUrl(
  bucket: R2Bucket,
  key: string,
  operation: 'get' | 'put' | 'delete',
  expiresIn = 3600,
): Promise<string> {
  try {
    const credentials = await getTemporaryCredentials(
      process.env.R2_ACCOUNT_ID || '',
      bucket.toString(),
      key.split('/')[0], // Use first part of key as prefix
    );

    const client = new AwsClient({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    });

    const signedUrl = await client.sign(
      `https://${bucket}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`,
      {
        method:
          operation === 'get' ? 'GET' : operation === 'put' ? 'PUT' : 'DELETE',
        aws: { signQuery: true },
        headers: {
          'X-Amz-Expires': expiresIn.toString(),
        },
      },
    );

    return signedUrl.toString();
  } catch (e: unknown) {
    debug('Failed to generate R2 presigned URL', {
      error: e,
      operation,
      key,
      expiresIn,
    });
    throw e;
  }
}

/**
 * Uploads an object to R2
 */
export async function putR2Object(
  bucket: R2Bucket,
  key: string,
  data: ArrayBuffer,
  contentType?: string,
) {
  try {
    await bucket.put(key, data, {
      httpMetadata: contentType ? { contentType } : undefined,
    });

    const url = await getPresignedUrl(bucket, key, 'get');
    return { success: true, url };
  } catch (e: unknown) {
    debug('Failed to upload to R2', {
      error: e,
      key,
      contentType,
    });
    return { success: false, error: e };
  }
}

/**
 * Gets an object from R2
 */
export async function getR2Object(bucket: R2Bucket, key: string) {
  try {
    const object = await bucket.get(key);
    if (!object) return { success: false, error: 'Object not found' };

    const data = await object.arrayBuffer();
    return { success: true, data };
  } catch (e: unknown) {
    debug('Failed to get object from R2', {
      error: e,
      key,
    });
    return { success: false, error: e };
  }
}

/**
 * Deletes an object from R2
 */
export async function deleteR2Object(bucket: R2Bucket, key: string) {
  try {
    await bucket.delete(key);
    return { success: true };
  } catch (e: unknown) {
    debug('Failed to delete from R2', {
      error: e,
      key,
    });
    return { success: false, error: e };
  }
}
