import { R2Bucket } from '@cloudflare/workers-types';
import AWS from 'aws-sdk';

interface TemporaryCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

/**
 * Gets temporary credentials for R2 access
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

/**
 * Generates a presigned URL for R2 operations
 */
export async function getR2PresignedUrl(
  bucket: R2Bucket,
  key: string,
  operation: 'get' | 'put',
  expiresIn: number = 3600,
): Promise<{ success: boolean; error?: any; url?: string }> {
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!accountId || !bucketName) {
      throw new Error('Missing required environment variables');
    }

    // Get temporary credentials
    const credentials = await getTemporaryCredentials(
      accountId,
      bucketName,
      key,
    );

    // Use AWS SDK to generate presigned URL with R2 credentials
    const s3 = new AWS.S3({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      signatureVersion: 'v4',
      region: 'auto',
    });

    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: expiresIn,
    };

    const url = await s3.getSignedUrlPromise(
      operation === 'get' ? 'getObject' : 'putObject',
      params,
    );

    return { success: true, url };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return { success: false, error };
  }
}

/**
 * Uploads a file to R2 storage
 */
export async function putR2Object(
  bucket: R2Bucket,
  key: string,
  data: ArrayBuffer | Buffer,
  contentType?: string,
): Promise<{ success: boolean; error?: any; url?: string }> {
  try {
    await bucket.put(key, data, {
      httpMetadata: contentType ? { contentType } : undefined,
    });

    const customDomain = process.env.R2_CUSTOM_DOMAIN;
    if (!customDomain) {
      throw new Error('R2_CUSTOM_DOMAIN environment variable not set');
    }

    const url = `https://${customDomain}/${key}`;
    return { success: true, url };
  } catch (error) {
    console.error('Error uploading to R2:', error);
    return { success: false, error };
  }
}

/**
 * Gets a file from R2 storage
 */
export async function getR2Object(
  bucket: R2Bucket,
  key: string,
): Promise<{ success: boolean; error?: any; data?: ArrayBuffer }> {
  try {
    const obj = await bucket.get(key);
    if (!obj) {
      return { success: false, error: 'Object not found' };
    }
    const data = await obj.arrayBuffer();
    return { success: true, data };
  } catch (error) {
    console.error('Error getting from R2:', error);
    return { success: false, error };
  }
}

/**
 * Deletes a file from R2 storage
 */
export async function deleteR2Object(
  bucket: R2Bucket,
  key: string,
): Promise<{ success: boolean; error?: any }> {
  try {
    await bucket.delete(key);
    return { success: true };
  } catch (error) {
    console.error('Error deleting from R2:', error);
    return { success: false, error };
  }
}
