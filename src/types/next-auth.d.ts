import { DefaultSession } from 'next-auth';
import { Subscription, UsageStats } from '@prisma/client';

type UserSubscriptionStatus = 'active' | 'canceled' | 'past_due';
type UserPlanId = 'pro' | 'turbo' | 'business';

interface UserSubscription {
  status: UserSubscriptionStatus;
  planId: UserPlanId;
}

interface UserUsageStats {
  aiRequestsUsed: number;
  codebasesIndexed: number;
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      subscription?: Pick<Subscription, 'status' | 'planId'> | null;
      usageStats?: Pick<UsageStats, 'aiRequestsUsed' | 'codebasesIndexed'> | null;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }
}
