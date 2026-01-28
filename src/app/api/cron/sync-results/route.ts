import { NextRequest, NextResponse } from 'next/server';
import { syncResults } from '@/lib/jobs/syncResults';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function validateCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '');
  return token === process.env.CRON_SECRET;
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[CRON] Starting results sync...');
    const result = await syncResults();
    console.log('[CRON] Results sync completed:', result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error('[CRON] Results sync error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
