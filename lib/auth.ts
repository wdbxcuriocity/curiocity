import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { fromEnv } from '@aws-sdk/credential-providers';
import bcrypt from 'bcrypt';
import { log, redact } from '@/lib/logging';
import { NextApiRequest } from 'next';
import { unmarshall } from '@aws-sdk/util-dynamodb';

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

// Extend Profile type
declare module 'next-auth' {
  interface Profile {
    provider?: string;
    sub?: string;
  }
}

export const authOptions: NextAuthOptions = {
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
        const correlationId = crypto.randomUUID();
        const { email, password } = credentials || {};

        if (!email || !password) {
          log({
            level: 'WARN',
            service: 'auth',
            message: 'Missing credentials',
            correlationId,
            metadata: redact({
              email: email || 'missing',
              hasPassword: !!password,
            }),
          });
          throw new Error('Email and password are required.');
        }

        try {
          log({
            level: 'INFO',
            service: 'auth',
            message: 'Attempting credentials login',
            correlationId,
            metadata: redact({
              email,
            }),
          });

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
            log({
              level: 'WARN',
              service: 'auth',
              message: 'Invalid credentials',
              correlationId,
              metadata: redact({
                email,
                userFound: !!loginRecord,
              }),
            });
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
            log({
              level: 'ERROR',
              service: 'auth',
              message: 'User record not found',
              correlationId,
              metadata: redact({
                email,
                userId: loginRecord.userId,
              }),
            });
            throw new Error('User details not found.');
          }

          log({
            level: 'INFO',
            service: 'auth',
            message: 'Credentials login successful',
            correlationId,
            metadata: redact({
              userId: userRecord.id,
              email: userRecord.email,
            }),
          });

          return {
            id: userRecord.id,
            name: userRecord.name,
            email: userRecord.email,
            image: userRecord.image || null,
            accountCreated: userRecord.accountCreated,
            lastLoggedIn: new Date().toISOString(),
          };
        } catch (error) {
          log({
            level: 'ERROR',
            service: 'auth',
            message: 'Login failed',
            correlationId,
            error,
            metadata: redact({
              email,
              errorCode:
                error instanceof Error ? error.message : 'Unknown error',
            }),
          });
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      const correlationId = crypto.randomUUID();
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
          log({
            level: 'INFO',
            service: 'auth',
            message: 'OAuth sign in attempt',
            correlationId,
            metadata: redact({
              userId,
              provider: profile.provider,
            }),
          });

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

            log({
              level: 'INFO',
              service: 'auth',
              message: 'Existing user login updated',
              correlationId,
              metadata: redact({
                userId,
                provider: profile.provider,
              }),
            });
          } else if (existingUserResponse.status === 404) {
            // Create a new user
            await fetch(`${process.env.NEXTAUTH_URL}/api/user`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(userData),
            });

            log({
              level: 'INFO',
              service: 'auth',
              message: 'New user created',
              correlationId,
              metadata: redact({
                userId,
                provider: profile.provider,
              }),
            });
          }
        } catch (error) {
          log({
            level: 'ERROR',
            service: 'auth',
            message: 'OAuth sign in failed',
            correlationId,
            error,
            metadata: redact({
              userId,
              provider: profile.provider,
              errorCode:
                error instanceof Error ? error.message : 'Unknown error',
            }),
          });
          return false;
        }
      }
      log({
        level: 'INFO',
        service: 'auth',
        message: 'Auth callback',
        metadata: { user },
      });
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
      } else if (process.env.ENABLE_CLOUDFLARE_KV !== 'true') {
        // Only fetch from DynamoDB if KV is not enabled
        const userResponse = await ddbDocClient.send(
          new GetCommand({
            TableName: USERS_TABLE,
            Key: { id: token.id },
          }),
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

      const correlationId = crypto.randomUUID();
      log({
        level: 'INFO',
        service: 'auth',
        message: 'Session callback',
        correlationId,
        metadata: {
          userId: token.id,
          email: token.email,
        },
      });

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

const sessionCache = new Map();
const client = new DynamoDBClient({ region: 'us-west-1' });
const sessionsTable = process.env.SESSIONS_TABLE || '';

async function getSessionFromDB(req: NextApiRequest) {
  const sessionToken = req.cookies['next-auth.session-token'];
  if (!sessionToken) return null;

  try {
    const result = await client.send(
      new GetItemCommand({
        TableName: sessionsTable,
        Key: { sessionToken: { S: sessionToken } },
      }),
    );

    return result.Item ? unmarshall(result.Item) : null;
  } catch (error) {
    log({
      level: 'ERROR',
      service: 'auth',
      message: 'Error fetching session',
      correlationId: crypto.randomUUID(),
      error,
      metadata: redact({
        errorCode: error instanceof Error ? error.message : 'Unknown error',
      }),
    });
    return null;
  }
}

export async function getSession(req: NextApiRequest) {
  const cacheKey =
    req.headers['authorization'] || req.cookies['next-auth.session-token'];
  if (sessionCache.has(cacheKey)) {
    return sessionCache.get(cacheKey);
  }

  const session = await getSessionFromDB(req);
  if (session) {
    sessionCache.set(cacheKey, session);
    setTimeout(() => sessionCache.delete(cacheKey), 300000);
  }
  return session;
}
