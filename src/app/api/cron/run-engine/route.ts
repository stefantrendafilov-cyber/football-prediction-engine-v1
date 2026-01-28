import { NextRequest, NextResponse } from 'next/server';
import { runPredictionEngine } from '@/lib/engine';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

  console.log('[CRON] Triggering prediction engine cycle...');
  
  const { data: cycle, error: cycleError } = await supabase
    .from('engine_cycles')
    .insert({ 
      status: 'RUNNING', 
      started_at_utc: new Date().toISOString(),
      fixtures_found: 0,
      fixtures_processed: 0,
      predictions_published: 0,
      predictions_blocked: 0
    })
    .select('id')
    .single();

  if (cycleError) {
    console.error('[CRON] Failed to create engine cycle:', cycleError);
    return NextResponse.json({ 
      success: false, 
      error: `Failed to initialize engine cycle: ${cycleError.message}` 
    }, { status: 500 });
  }

  const cycleId = cycle.id;
  console.log(`[CRON] Engine cycle created: ${cycleId}`);

  try {
    await runPredictionEngine(cycleId);
    
    return NextResponse.json({ 
      success: true,
      timestamp: new Date().toISOString(),
      cycleId, 
      status: 'SUCCESS' 
    });
  } catch (error: any) {
    console.error(`[CRON] Engine error for cycle ${cycleId}:`, error);
    
    await supabase
      .from('engine_cycles')
      .update({ 
        status: 'FAILED', 
        finished_at_utc: new Date().toISOString(), 
        error: error.message 
      })
      .eq('id', cycleId);

    return NextResponse.json({ 
      success: false, 
      cycleId, 
      status: 'FAILED', 
      error: error.message 
    }, { status: 500 });
  }
}
