import dotenv from 'dotenv';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { putR2Object } from '../../storage/cloudflare';
import { log, redact, debug, error } from '@/lib/logging';

dotenv.config();

const s3Client = new S3Client({ region: 'us-west-1' });
const client = new DynamoDBClient({ region: 'us-west-1' });
const userTable = process.env.USER_TABLE_NAME || '';
const bucketName = process.env.S3_UPLOAD_BUCKET || '';

// Helper function to generate MD5 hash
// const generateFileHash = (fileBuffer: Buffer) => {
//   const hash = crypto.createHash("md5");
//   hash.update(fileBuffer);
//   return hash.digest("hex");
// };

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
  await s3Client.send(new PutObjectCommand(s3Params));
  return `https://${bucketName}.s3.us-west-1.amazonaws.com/${key}`;
}

// The main handler function
export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    const formData = await request.formData();
    log({
      level: 'INFO',
      service: 'upload',
      message: 'File upload started',
      correlationId,
      metadata: redact({
        fileSize: (formData.get('file') as File)?.size,
        fileType: (formData.get('file') as File)?.type,
      }),
    });
    debug('Starting photo upload process');

    const userId = formData.get('userId') as string;
    const file = formData.get('file') as File;
    const ctx = (request as any).context;

    if (!userId || !file) {
      error('Missing userId or file in request');
      return new Response(
        JSON.stringify({ err: 'User ID and file are required' }),
        { status: 400 },
      );
    }

    // Read the file buffer for processing
    const fileBuffer = await file.arrayBuffer();

    // Generate a unique filename and upload to S3
    const fileName = `profile-pictures/${userId}/${uuidv4()}_${file.name}`;

    // Track success of uploads
    let s3Success = true;
    let r2Success = true;
    let imageUrl = '';

    // Upload to S3
    try {
      imageUrl = await putS3Object(
        Buffer.from(fileBuffer),
        fileName,
        file.type,
      );
      debug('Successfully uploaded file to S3');
    } catch (e: unknown) {
      error('Failed to upload to S3', e);
      s3Success = false;
    }

    // Upload to R2 if enabled
    if (process.env.ENABLE_CLOUDFLARE_STORAGE === 'true' && ctx?.env?.BUCKET) {
      try {
        const r2Result = await putR2Object(
          ctx.env.BUCKET,
          fileName,
          fileBuffer,
          file.type,
        );
        if (!r2Result.success) {
          error('Failed to upload to R2', new Error(String(r2Result.error)));
          r2Success = false;
        } else if (!imageUrl && r2Result.url) {
          // If S3 failed but R2 succeeded, use R2 URL
          imageUrl = r2Result.url;
          debug('Using R2 URL as fallback', { url: r2Result.url });
        }
      } catch (e: unknown) {
        error('Failed to upload to R2', e);
        r2Success = false;
      }
    }

    // If both uploads failed, return error
    if (!s3Success && !r2Success) {
      return new Response(
        JSON.stringify({ err: 'Failed to upload image to storage' }),
        { status: 500 },
      );
    }

    // DynamoDB: Update user's image field
    const updateParams = {
      TableName: userTable,
      Key: {
        id: { S: userId },
      },
      UpdateExpression: 'SET #image = :image',
      ExpressionAttributeNames: {
        '#image': 'image',
      },
      ExpressionAttributeValues: {
        ':image': { S: imageUrl },
      },
    };

    debug('Updating user image in DynamoDB', { userId });
    await client.send(new UpdateItemCommand(updateParams));
    debug('Successfully updated user image in DynamoDB');

    return new Response(
      JSON.stringify({
        imageUrl,
        s3Success,
        r2Success,
      }),
      { status: 200 },
    );
  } catch (e: unknown) {
    error('Error in photo upload process', e);
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}
