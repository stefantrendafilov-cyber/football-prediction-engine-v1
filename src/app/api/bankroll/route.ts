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

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();
    if (typeof amount !== 'number') {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    const bankroll = await BettingService.updateBankroll(amount);
    return NextResponse.json(bankroll);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 500 });
  }
}
