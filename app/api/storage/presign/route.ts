import AWS from 'aws-sdk';
import { getR2PresignedUrl } from '../cloudflare';

const s3 = new AWS.S3();
const bucketName = process.env.S3_UPLOAD_BUCKET || '';

/**
 * Generates a presigned URL for S3 operations
 */
async function getS3PresignedUrl(
  key: string,
  operation: 'getObject' | 'putObject',
  expiresIn: number = 3600,
): Promise<string> {
  const params = {
    Bucket: bucketName,
    Key: key,
    Expires: expiresIn,
  };

  return s3.getSignedUrlPromise(operation, params);
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { key, operation } = data;
    const ctx = (request as any).context;
    const expiresIn = data.expiresIn || 3600; // Default 1 hour

    if (!key || !operation) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 },
      );
    }

    if (operation !== 'get' && operation !== 'put') {
      return new Response(JSON.stringify({ error: 'Invalid operation' }), {
        status: 400,
      });
    }

    // Track success of presigned URL generation
    let s3Success = true;
    let r2Success = true;
    let url = '';

    // Get S3 presigned URL
    try {
      url = await getS3PresignedUrl(
        key,
        operation === 'get' ? 'getObject' : 'putObject',
        expiresIn,
      );
    } catch (error) {
      console.error('Failed to generate S3 presigned URL:', error);
      s3Success = false;
    }

    // Get R2 presigned URL if enabled
    if (process.env.ENABLE_CLOUDFLARE_STORAGE === 'true' && ctx?.env?.BUCKET) {
      try {
        const r2Result = await getR2PresignedUrl(
          ctx.env.BUCKET,
          key,
          operation,
          expiresIn,
        );
        if (!r2Result.success) {
          console.error('Failed to generate R2 presigned URL:', r2Result.error);
          r2Success = false;
        } else if (!url && r2Result.url) {
          // If S3 failed but R2 succeeded, use R2 URL
          url = r2Result.url;
        }
      } catch (error) {
        console.error('Failed to generate R2 presigned URL:', error);
        r2Success = false;
      }
    }

    // If both generations failed, return error
    if (!s3Success && !r2Success) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate presigned URL' }),
        { status: 500 },
      );
    }

    return new Response(
      JSON.stringify({
        url,
        s3Success,
        r2Success,
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error('Error in presign request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}
