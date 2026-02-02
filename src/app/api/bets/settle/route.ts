import { NextRequest, NextResponse } from 'next/server';
import { BettingService } from '@/lib/betting/service';

export async function POST(req: NextRequest) {
  try {
    const { betId, result } = await req.json();
    if (!betId || !result) {
      return NextResponse.json({ error: 'Missing betId or result' }, { status: 400 });
    }

    const bet = await BettingService.settleBet(betId, result);
    return NextResponse.json(bet);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
