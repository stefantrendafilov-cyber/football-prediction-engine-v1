import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BetsTable from '@/components/BetsTable';

export default async function BetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight mb-2 uppercase">My Bets</h1>
        <p className="text-zinc-500 uppercase tracking-widest text-xs font-bold">Comprehensive betting history</p>
      </div>

      <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden">
        <BetsTable />
      </div>
    </div>
  )
}
