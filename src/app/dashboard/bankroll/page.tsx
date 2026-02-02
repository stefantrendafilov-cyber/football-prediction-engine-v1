import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BankrollDashboard from '@/components/BankrollDashboard';

export default async function BankrollPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <BankrollDashboard />
    </div>
  );
}
