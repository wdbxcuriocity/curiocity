import dotenv from 'dotenv';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb'; // Add UpdateItemCommand here
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
// import crypto from "crypto";

dotenv.config();

const s3 = new AWS.S3();
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
) {
  const s3Params = {
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  };
  const s3Response = await s3.upload(s3Params).promise();
  return s3Response.Location; // Returns the file URL
}

// The main handler function
export async function POST(request: Request) {
  try {
    console.log('upload-photo POST request received');

    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const file = formData.get('file') as File;

    if (!userId || !file) {
      console.error('Missing userId or file in the request');
      return new Response(
        JSON.stringify({ err: 'User ID and file are required' }),
        { status: 400 },
      );
    }

    // Read the file buffer for processing
    const fileBuffer = await file.arrayBuffer();
    // const fileHash = generateFileHash(Buffer.from(fileBuffer));

    // Generate a unique filename and upload to S3
    const fileName = `profile-pictures/${userId}/${uuidv4()}_${file.name}`;
    const imageUrl = await putS3Object(
      Buffer.from(fileBuffer),
      fileName,
      file.type,
    );

    console.log('Image successfully uploaded to S3:', imageUrl);

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

    console.log(updateParams);

    await client.send(new UpdateItemCommand(updateParams));
    console.log('DynamoDB user image URL updated');

    return new Response(JSON.stringify({ imageUrl }), { status: 200 });
  } catch (error) {
    console.error('Error in upload-photo POST request:', error);
    return new Response(JSON.stringify({ err: 'Internal server error' }), {
      status: 500,
    });
  }
}
