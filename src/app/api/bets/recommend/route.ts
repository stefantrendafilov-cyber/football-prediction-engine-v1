import { NextRequest, NextResponse } from 'next/server';
import { BettingService } from '@/lib/betting/service';

export async function POST(req: NextRequest) {
  try {
    const candidate = await req.json();
    const kelly = await BettingService.getStakeRecommendation(candidate);
    return NextResponse.json(kelly);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
