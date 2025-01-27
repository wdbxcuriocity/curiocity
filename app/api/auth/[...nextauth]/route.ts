import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { fromEnv } from '@aws-sdk/credential-providers';
import bcrypt from 'bcrypt';
import { KVAdapter } from '../kv-adapter';

const GOOGLE_ID = process.env.GOOGLE_ID || '';
const GOOGLE_SECRET = process.env.GOOGLE_SECRET || '';
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || '';

const LOGIN_USERS_TABLE = 'curiocity-local-login-users';
const USERS_TABLE = 'curiocity-users';

// Initialize DynamoDB clients
const dynamoDbClient = new DynamoDBClient({
  region: process.env.S3_UPLOAD_REGION,
  credentials: fromEnv(),
});
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDbClient);

if (!GOOGLE_ID || !GOOGLE_SECRET) {
  throw new Error(
    'Missing GOOGLE_ID or GOOGLE_SECRET in environment variables.',
  );
}

if (!NEXTAUTH_SECRET) {
  throw new Error('Missing NEXTAUTH_SECRET in environment variables.');
}

// Extend JWT type
declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    accountCreated?: string;
    lastLoggedIn?: string;
  }
}

// Extend Session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      accountCreated?: string;
      lastLoggedIn?: string;
    };
  }
}

function createOptions(req: Request): NextAuthOptions {
  const ctx = (req as any).context;
  const kvNamespace = ctx?.env?.curiocity_kv;
  const enableCloudflare =
    process.env.ENABLE_CLOUDFLARE_KV === 'true' && kvNamespace;

  return {
    providers: [
      GoogleProvider({
        clientId: GOOGLE_ID,
        clientSecret: GOOGLE_SECRET,
      }),
      CredentialsProvider({
        name: 'Credentials',
        credentials: {
          email: { label: 'Email', type: 'text' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          const { email, password } = credentials || {};

          if (!email || !password) {
            throw new Error('Email and password are required.');
          }

          try {
            // Fetch user credentials from DynamoDB
            const loginParams = {
              TableName: LOGIN_USERS_TABLE,
              Key: { email },
            };
            const loginResponse = await ddbDocClient.send(
              new GetCommand(loginParams),
            );
            const loginRecord = loginResponse.Item;

            if (
              !loginRecord ||
              !(await bcrypt.compare(password, loginRecord.password))
            ) {
              throw new Error('Invalid email or password.');
            }

            // Fetch user details
            const userParams = {
              TableName: USERS_TABLE,
              Key: { id: loginRecord.userId },
            };
            const userResponse = await ddbDocClient.send(
              new GetCommand(userParams),
            );
            const userRecord = userResponse.Item;

            if (!userRecord) {
              throw new Error('User details not found.');
            }

            return {
              id: userRecord.id,
              name: userRecord.name,
              email: userRecord.email,
              image: userRecord.image || null,
              accountCreated: userRecord.accountCreated,
              lastLoggedIn: new Date().toISOString(),
            };
          } catch (error) {
            console.error('Error during manual login:', error);
            throw new Error('Failed to log in.');
          }
        },
      }),
    ],
    ...(enableCloudflare
      ? {
          adapter: KVAdapter(kvNamespace),
        }
      : {}),
    callbacks: {
      async signIn({ user, profile }) {
        if (profile) {
          const userId = profile.sub;
          const userData = {
            id: userId,
            name: profile.name,
            email: profile.email,
            image: user.image || null,
            lastLoggedIn: new Date().toISOString(),
          };

          try {
            console.log(`${process.env.NEXTAUTH_URL}/api/user?id=${userId}`);
            const existingUserResponse = await fetch(
              `${process.env.NEXTAUTH_URL}/api/user?id=${userId}`,
              {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
              },
            );

            if (existingUserResponse.ok) {
              // Update user last login timestamp
              await fetch(`${process.env.NEXTAUTH_URL}/api/user`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: userData.id,
                  lastLoggedIn: userData.lastLoggedIn,
                }),
              });
            } else if (existingUserResponse.status === 404) {
              // Create a new user
              await fetch(`${process.env.NEXTAUTH_URL}/api/user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
              });
            }
          } catch (error) {
            console.error('Error syncing Google user data:', error);
            return false;
          }
        }
        return true;
      },
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.name = user.name;
          token.email = user.email;
          token.image = user.image;
        } else if (!enableCloudflare) {
          // Only fetch from DynamoDB if KV is not enabled
          const userResponse = await dynamoDbClient.send(
            new GetCommand({ TableName: USERS_TABLE, Key: { id: token.id } }),
          );
          const userRecord = userResponse.Item;

          if (userRecord) {
            token.name = userRecord.name;
            token.email = userRecord.email;
            token.image = userRecord.image;
          }
        }
        return token;
      },
      async session({ session, token }) {
        if (!token.id) throw new Error('Missing user ID in token');

        session.user = {
          id: token.id,
          name: token.name || null,
          email: token.email || null,
          image: token.image || null,
          accountCreated: token.accountCreated,
          lastLoggedIn: token.lastLoggedIn,
        };
        return session;
      },
    },
    secret: NEXTAUTH_SECRET,
    pages: {
      signIn: '/login',
      signOut: '/logout',
    },
  };
}

export async function GET(req: Request) {
  return NextAuth(createOptions(req))(req);
}

export async function POST(req: Request) {
  return NextAuth(createOptions(req))(req);
}
