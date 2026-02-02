import { NextResponse } from 'next/server';
import { BettingService } from '@/lib/betting/service';

export async function GET() {
  try {
    const bankroll = await BettingService.getOrCreateBankroll();
    return NextResponse.json(bankroll);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  }
}
