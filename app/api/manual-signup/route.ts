import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { fromEnv } from '@aws-sdk/credential-providers';
import bcrypt from 'bcrypt';

const API_BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

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

// Define the User type outside the function
export type User = {
  id: string;
  name: string;
  email: string;
  image: string;
  accountCreated: string;
  lastLoggedIn: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, passwordConfirmation } = body;
    console.log('Received Body:', body);

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 },
      );
    }

    if (!passwordConfirmation) {
      return NextResponse.json(
        { error: 'Password confirmation is required' },
        { status: 400 },
      );
    }

    if (password !== passwordConfirmation) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 },
      );
    }

    if (!isPasswordValid(password)) {
      return NextResponse.json(
        {
          error:
            'Password must be at least 8 characters long, include one uppercase letter, one lowercase letter, one number, and one special character.',
        },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    const userRecord = {
      email,
      password: hashedPassword,
      userId,
    };

    const params = {
      TableName: USERS_TABLE,
      Item: userRecord,
    };

    const putCommand = new PutCommand(params);
    await ddbDocClient.send(putCommand);

    // Send additional user data to another API endpoint if necessary
    try {
      const response = await fetch(`${API_BASE_URL}/api/user`, {
        method: 'POST', // Fixed typo in method
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          name,
          email,
          accountCreated: new Date().toISOString(),
          lastLoggedIn: null,
        }),
      });

      if (!response.ok) {
        console.error('Error sending user data:', response.statusText);
      } else {
        console.log('User data sent successfully to API');
      }
    } catch (error) {
      console.error('Error sending user data:', error);
    }

    return NextResponse.json(
      {
        message: 'User registered successfully',
        user: { email, username: name },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error saving user:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
