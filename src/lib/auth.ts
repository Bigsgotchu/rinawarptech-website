import { PrismaAdapter } from '@auth/prisma-adapter';
import { NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { db } from './db';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user && user?.id) {
        session.user.id = user.id;
        
        // Get subscription status
        const subscription = await db.subscription.findUnique({
          where: { userId: user.id },
          select: {
            status: true,
            planId: true,
          },
        });

        // Get usage stats
        const usageStats = await db.usageStats.findUnique({
          where: { userId: user.id },
          select: {
            aiRequestsUsed: true,
            codebasesIndexed: true,
          },
        });

        session.user.subscription = subscription;
        session.user.usageStats = usageStats;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    verifyRequest: '/verify',
    error: '/error',
  },
  events: {
    async createUser({ user }) {
      // Create initial usage stats
      await db.usageStats.create({
        data: {
          userId: user.id,
          lastResetDate: new Date(),
        },
      });
    },
  },
};
