import { NextRequest, NextResponse } from 'next/server';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { fromEnv } from '@aws-sdk/credential-providers';
import bcrypt from 'bcrypt';

const dynamoDbClient = new DynamoDBClient({
  region: process.env.S3_UPLOAD_REGION,
  credentials: fromEnv(),
});

const ddbDocClient = DynamoDBDocumentClient.from(dynamoDbClient);

const USERS_TABLE = 'curiocity-local-login-users';

const isPasswordValid = (password: string) => {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;
  return passwordRegex.test(password);
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { newPassword, passwordConfirmation } = body;

    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 },
      );
    }

    if (!passwordConfirmation) {
      return NextResponse.json(
        { error: 'Password confirmation is required' },
        { status: 400 },
      );
    }

    if (newPassword !== passwordConfirmation) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 },
      );
    }

    if (!isPasswordValid(newPassword)) {
      return NextResponse.json(
        {
          error:
            'Password must be at least 8 characters long, include one uppercase letter, one lowercase letter, one number, and one special character.',
        },
        { status: 400 },
      );
    }

    const email = req.cookies.get('email')?.value;

    if (!email) {
      return NextResponse.json(
        { error: 'Email not found in session' },
        { status: 401 },
      );
    }

    const params = {
      TableName: USERS_TABLE,
      Key: {
        email: email,
      },
    };

    const getCommand = new GetCommand(params);
    const response = await ddbDocClient.send(getCommand);
    const userRecord = response.Item;

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    userRecord.password = hashedPassword;

    const updateParams = {
      TableName: USERS_TABLE,
      Item: userRecord,
    };

    await ddbDocClient.send(new PutCommand(updateParams));

    return NextResponse.json(
      { message: 'Password reset successfully' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
