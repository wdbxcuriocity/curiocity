import type {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from 'next-auth/adapters';
import type { Account } from 'next-auth';

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export function KVAdapter(kv: KVNamespace): Adapter {
  // Helper function to get user data
  async function getUser(id: string): Promise<AdapterUser | null> {
    const key = `users/${id}`;
    const data = await kv.get(key);
    if (!data) return null;
    const user = JSON.parse(data);
    return {
      ...user,
      emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
    };
  }

  const adapter: Adapter = {
    async createSession(data: AdapterSession) {
      const key = `sessions/${data.sessionToken}`;
      await kv.put(
        key,
        JSON.stringify({
          userId: data.userId,
          expires: data.expires.toISOString(),
          sessionToken: data.sessionToken,
        }),
      );
      return data;
    },

    async getSessionAndUser(sessionToken: string) {
      const key = `sessions/${sessionToken}`;
      const data = await kv.get(key);
      if (!data) return null;

      const session = JSON.parse(data);
      if (new Date(session.expires) < new Date()) {
        await kv.delete(key);
        return null;
      }

      // Get user data
      const userKey = `users/${session.userId}`;
      const userData = await kv.get(userKey);
      if (!userData) return null;

      const user = JSON.parse(userData);

      return {
        session: {
          sessionToken,
          userId: session.userId,
          expires: new Date(session.expires),
        },
        user: {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified
            ? new Date(user.emailVerified)
            : null,
          name: user.name,
          image: user.image,
        },
      };
    },

    async updateSession(
      session: Partial<AdapterSession> & Pick<AdapterSession, 'sessionToken'>,
    ): Promise<AdapterSession | null> {
      const key = `sessions/${session.sessionToken}`;
      const existingData = await kv.get(key);
      if (!existingData) return null;

      const existingSession = JSON.parse(existingData);
      const updatedSession = {
        ...existingSession,
        ...session,
        expires: session.expires?.toISOString() || existingSession.expires,
      };

      await kv.put(key, JSON.stringify(updatedSession));
      return {
        sessionToken: updatedSession.sessionToken,
        userId: updatedSession.userId,
        expires: new Date(updatedSession.expires),
      };
    },

    async deleteSession(sessionToken: string) {
      const key = `sessions/${sessionToken}`;
      await kv.delete(key);
    },

    async createUser(data: Omit<AdapterUser, 'id'>) {
      const id = crypto.randomUUID();
      const user = { id, ...data };
      const key = `users/${id}`;
      await kv.put(key, JSON.stringify(user));

      // Create email index
      if (user.email) {
        const emailKey = `emails/${user.email}`;
        await kv.put(emailKey, id);
      }

      return user;
    },

    getUser,

    async getUserByEmail(email: string) {
      const emailKey = `emails/${email}`;
      const userId = await kv.get(emailKey);
      if (!userId) return null;
      return getUser(userId);
    },

    async getUserByAccount({
      providerAccountId,
      provider,
    }: {
      providerAccountId: string;
      provider: string;
    }) {
      const key = `accounts/${provider}/${providerAccountId}`;
      const userId = await kv.get(key);
      if (!userId) return null;
      return getUser(userId);
    },

    async updateUser(data: Partial<AdapterUser> & Pick<AdapterUser, 'id'>) {
      const key = `users/${data.id}`;
      const existingData = await kv.get(key);
      if (!existingData) return null;

      const existingUser = JSON.parse(existingData);
      const updatedUser = { ...existingUser, ...data };

      await kv.put(key, JSON.stringify(updatedUser));

      // Update email index if email changed
      if (data.email && data.email !== existingUser.email) {
        // Remove old email index
        if (existingUser.email) {
          await kv.delete(`emails/${existingUser.email}`);
        }
        // Add new email index
        await kv.put(`emails/${data.email}`, data.id);
      }

      return {
        ...updatedUser,
        emailVerified: updatedUser.emailVerified
          ? new Date(updatedUser.emailVerified)
          : null,
      };
    },

    async deleteUser(userId: string) {
      // Get user data first to clean up email index
      const key = `users/${userId}`;
      const data = await kv.get(key);
      if (data) {
        const user = JSON.parse(data);
        if (user.email) {
          await kv.delete(`emails/${user.email}`);
        }
      }
      await kv.delete(key);
    },

    async linkAccount(data: Account) {
      if (!data.provider || !data.providerAccountId || !data.userId)
        return data;
      const key = `accounts/${data.provider}/${data.providerAccountId}`;
      await kv.put(key, data.userId);
      return data;
    },

    async unlinkAccount({
      providerAccountId,
      provider,
    }: {
      providerAccountId: string;
      provider: string;
    }) {
      const key = `accounts/${provider}/${providerAccountId}`;
      await kv.delete(key);
    },

    async createVerificationToken(data: VerificationToken) {
      const key = `verification-tokens/${data.identifier}/${data.token}`;
      await kv.put(key, JSON.stringify(data));
      return data;
    },

    async useVerificationToken({
      identifier,
      token,
    }: {
      identifier: string;
      token: string;
    }) {
      const key = `verification-tokens/${identifier}/${token}`;
      const data = await kv.get(key);
      if (!data) return null;

      await kv.delete(key);
      return JSON.parse(data);
    },
  };

  return adapter;
}
