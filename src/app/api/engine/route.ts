import { NextResponse } from 'next/server';
import { runPredictionEngine } from '@/lib/engine';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST() {
  console.log('[API] Triggering prediction engine cycle...');
  
  // Create initial cycle record
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
    console.error('[API] Failed to create engine cycle:', cycleError);
    return NextResponse.json({ 
      success: false, 
      error: `Failed to initialize engine cycle: ${cycleError.message}` 
    }, { status: 500 });
  }

  const cycleId = cycle.id;
  console.log(`[API] Engine cycle created: ${cycleId}`);

  try {
    // Run the engine
    // We await it here so the client knows it started and we can return the ID
    // In a production app with long runs, we might trigger this as a background job
    await runPredictionEngine(cycleId);
    
    return NextResponse.json({ 
      success: true, 
      cycleId, 
      status: 'SUCCESS' 
    });
  } catch (error: any) {
    console.error(`[API] Engine error for cycle ${cycleId}:`, error);
    
    // Ensure status is marked as FAILED if not already handled
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

// Keep GET for health check or manual trigger if needed, but primarily use POST
export async function GET() {
  return POST();
}
