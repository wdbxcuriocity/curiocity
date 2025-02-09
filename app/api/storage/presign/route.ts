import { getPresignedUrl } from '../cloudflare';
import { NextResponse } from 'next/server';
import { log } from '@/lib/logging';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
});

/**
 * Generates a presigned URL for S3 operations
 */
export async function getS3PresignedUrl(
  key: string,
  operation: 'getObject' | 'putObject',
  expiresIn: number = 3600,
): Promise<string> {
  const command =
    operation === 'getObject'
      ? new GetObjectCommand({ Bucket: process.env.S3_UPLOAD_BUCKET, Key: key })
      : new PutObjectCommand({
          Bucket: process.env.S3_UPLOAD_BUCKET,
          Key: key,
        });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function GET(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const operation = searchParams.get('operation') as 'read' | 'write';

    log({
      level: 'INFO',
      service: 'storage',
      message: 'Generating presigned URL',
      metadata: { key, operation },
    });

    if (!key || !operation) {
      log({
        level: 'WARN',
        service: 'storage',
        message: 'Missing required parameters',
        metadata: { key, operation },
      });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 },
      );
    }

    // Get R2 bucket instance
    const bucket = (request as any).r2;
    if (!bucket) {
      log({
        level: 'ERROR',
        service: 'storage',
        message: 'R2 bucket not initialized',
        metadata: { key, operation },
      });
      return NextResponse.json(
        { error: 'Storage not configured' },
        { status: 500 },
      );
    }

    // Generate presigned URL
    const url = await getPresignedUrl(
      bucket,
      key,
      operation === 'read' ? 'get' : 'put',
    );
    if (!url) {
      log({
        level: 'ERROR',
        service: 'storage',
        message: 'Failed to generate R2 presigned URL',
        metadata: { key, operation },
      });
      return NextResponse.json(
        { error: 'Failed to generate presigned URL' },
        { status: 500 },
      );
    }

    log({
      level: 'INFO',
      service: 'storage',
      message: 'Successfully generated presigned URL',
      metadata: { key, operation },
    });
    return NextResponse.json({ url });
  } catch (error) {
    log({
      level: 'ERROR',
      service: 'presign',
      message: 'Failed to generate presigned URL',
      correlationId,
      error,
    });
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 },
    );
  }
}
