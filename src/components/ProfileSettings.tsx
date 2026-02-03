'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Wallet, User as UserIcon, CreditCard, LogOut, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Bankroll } from '@/lib/betting/types';

interface ProfileSettingsProps {
  user: any;
  profile: any;
  initialBankroll: Bankroll;
}

export default function ProfileSettings({ user, profile, initialBankroll }: ProfileSettingsProps) {
  const [bankrollAmount, setBankrollAmount] = useState(initialBankroll.initialBankroll.toString());
  const [updatingBankroll, setUpdatingBankroll] = useState(false);

  const handleUpdateBankroll = async () => {
    const amount = parseFloat(bankrollAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setUpdatingBankroll(true);
    try {
      const res = await fetch('/api/bankroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });

      if (res.ok) {
        toast.success('Bankroll updated successfully! All tracking has been reset.');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update bankroll');
      }
    } catch (err) {
      toast.error('Network error updating bankroll');
    } finally {
      setUpdatingBankroll(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
      {/* Account Info */}
      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden">
        <CardHeader className="border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-2 text-zinc-400 mb-1">
            <UserIcon size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Account</span>
          </div>
          <CardTitle className="text-xl font-bold">Your Information</CardTitle>
          <CardDescription className="text-zinc-500">Your account details and access</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Email Address</Label>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 font-mono text-sm">
              {user.email}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Account Password</Label>
            <Button variant="outline" className="w-full border-zinc-800 text-zinc-400 hover:bg-zinc-900 justify-start" disabled>
              •••••••••••• (Reset Password - Placeholder)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bankroll Management */}
      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden">
        <CardHeader className="border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-2 text-blue-500 mb-1">
            <Wallet size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Finance</span>
          </div>
          <CardTitle className="text-xl font-bold uppercase">Bankroll Settings</CardTitle>
          <CardDescription className="text-zinc-500">Set your starting capital for stake calculations.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bankroll" className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Starting Bankroll (€)</Label>
            <div className="flex gap-2">
              <Input
                id="bankroll"
                type="number"
                value={bankrollAmount}
                onChange={(e) => setBankrollAmount(e.target.value)}
                className="bg-zinc-900 border-zinc-800 font-mono font-bold text-blue-400"
              />
              <Button 
                onClick={handleUpdateBankroll} 
                disabled={updatingBankroll}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6"
              >
                {updatingBankroll ? <Loader2 size={16} className="animate-spin" /> : 'UPDATE'}
              </Button>
            </div>
            <p className="text-[10px] text-zinc-500 italic mt-2">
              Note: Updating your bankroll will reset your current balance and streaks.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Plan */}
      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden">
        <CardHeader className="border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <CreditCard size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Subscription</span>
          </div>
          <CardTitle className="text-xl font-bold uppercase">Payment Plan</CardTitle>
          <CardDescription className="text-zinc-500">Manage your subscription and billing.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg flex justify-between items-center">
            <div>
              <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Current Tier</p>
              <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                {profile?.role === 'admin' ? 'PROPHET ADMIN' : (profile?.role === 'paid' ? 'PROPHET PRO' : 'FREE TRIAL')}
                <Check size={16} className="text-emerald-500" />
              </h3>
            </div>
            <div className="text-right text-xs text-zinc-400">
              {profile?.trial_ends_at ? (
                <>Ends: {new Date(profile.trial_ends_at).toLocaleDateString()}</>
              ) : (
                <>Lifetime Access</>
              )}
            </div>
          </div>
          <Button variant="outline" className="w-full border-zinc-800 text-zinc-400 hover:bg-zinc-900" disabled>
            MANAGE BILLING (Stripe Placeholder)
          </Button>
        </CardContent>
      </Card>

      {/* Logout/Session */}
      <Card className="bg-zinc-950 border-red-900/20 overflow-hidden">
        <CardHeader className="border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-2 text-red-500 mb-1">
            <LogOut size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Session</span>
          </div>
          <CardTitle className="text-xl font-bold uppercase text-red-500">Sign Out</CardTitle>
          <CardDescription className="text-zinc-500">Securely terminate your current session.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form action="/auth/signout" method="POST">
            <Button 
              type="submit" 
              className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-900/30 font-black uppercase tracking-widest h-12 transition-all"
            >
              <LogOut size={18} className="mr-2" />
              SIGN OUT FROM PROPHET
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
