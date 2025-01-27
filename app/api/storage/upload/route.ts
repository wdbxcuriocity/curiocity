import AWS from 'aws-sdk';
import { putR2Object } from '../cloudflare';

const s3 = new AWS.S3();
const bucketName = process.env.S3_UPLOAD_BUCKET || '';

// Function to put the object into S3
async function putS3Object(
  fileBuffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  const s3Params = {
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  };
  const s3Response = await s3.upload(s3Params).promise();
  return s3Response.Location;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentId = formData.get('documentId') as string;
    const folderName = formData.get('folderName') as string;
    const ctx = (request as any).context;

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
      console.error('Failed to upload to S3:', error);
      s3Success = false;
    }

    // Upload to R2 if enabled
    if (process.env.ENABLE_CLOUDFLARE_STORAGE === 'true' && ctx?.env?.BUCKET) {
      try {
        const r2Result = await putR2Object(
          ctx.env.BUCKET,
          key,
          fileBuffer,
          file.type,
        );
        if (!r2Result.success) {
          console.error('Failed to upload to R2:', r2Result.error);
          r2Success = false;
        } else if (!url && r2Result.url) {
          // If S3 failed but R2 succeeded, use R2 URL
          url = r2Result.url;
        }
      } catch (error) {
        console.error('Failed to upload to R2:', error);
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
    console.error('Error in storage upload:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}
