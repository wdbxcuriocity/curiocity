import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { putR2Object } from '../cloudflare';
import { log } from '@/lib/logging';

const s3Client = new S3Client({ region: 'us-west-1' });

// Function to put the object into S3
async function putS3Object(
  fileBuffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_UPLOAD_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    }),
  );

  return `https://${process.env.S3_UPLOAD_BUCKET}.s3.us-west-1.amazonaws.com/${key}`;
}

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentId = formData.get('documentId') as string;
    const folderName = formData.get('folderName') as string;

    if (!file || !documentId || !folderName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 },
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const key = `resources/${documentId}/${folderName}/${file.name}`;

    // Track success of uploads
    let s3Success = true;
    let r2Success = true;
    let url = '';

    // Upload to S3
    try {
      url = await putS3Object(Buffer.from(fileBuffer), key, file.type);
    } catch (error) {
      log({
        level: 'ERROR',
        service: 'storage',
        message: 'Failed to upload to S3',
        correlationId,
        error,
        metadata: {
          documentId,
          fileName: file.name,
        },
      });
      s3Success = false;
    }

    // Upload to R2 if enabled
    if (
      process.env.ENABLE_CLOUDFLARE_STORAGE === 'true' &&
      (request as any)?.env?.BUCKET
    ) {
      try {
        const r2Result = await putR2Object(
          (request as any).env.BUCKET,
          key,
          fileBuffer,
          file.type,
        );
        if (!r2Result.success) {
          log({
            level: 'ERROR',
            service: 'storage',
            message: 'Failed to upload to R2',
            correlationId,
            error: r2Result.error,
            metadata: {
              documentId,
              fileName: file.name,
            },
          });
          r2Success = false;
        } else if (!url && r2Result.url) {
          url = r2Result.url;
        }
      } catch (error) {
        log({
          level: 'ERROR',
          service: 'storage',
          message: 'Failed to upload to R2',
          correlationId,
          error,
          metadata: {
            documentId,
            fileName: file.name,
          },
        });
        r2Success = false;
      }
    }

    // If both uploads failed, return error
    if (!s3Success && !r2Success) {
      return new Response(
        JSON.stringify({ error: 'Failed to upload file to storage' }),
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
    log({
      level: 'ERROR',
      service: 'storage',
      message: 'Error in storage upload',
      correlationId,
      error,
    });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}
