export type UserRole = 'admin' | 'user';
export type SubscriptionStatus = 'trial' | 'active' | 'expired';

export interface Profile {
  id: string;
  display_name: string | null;
  role: UserRole;
  subscription_status: SubscriptionStatus;
  subscription_tier: string;
  trial_ends_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserWithProfile {
  id: string;
  email: string;
  profile: Profile | null;
}
