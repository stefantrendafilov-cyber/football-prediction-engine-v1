import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BettingService } from '@/lib/betting/service';
import ProfileSettings from '@/components/ProfileSettings';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const bankroll = await BettingService.getOrCreateBankroll();

    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-zinc-500 text-sm">Manage your profile, bankroll and subscription</p>
          </div>

          <ProfileSettings 
            user={user} 
            profile={profile} 
            initialBankroll={bankroll} 
          />
        </div>
      </div>
    );
}
