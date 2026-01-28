import { NextResponse } from 'next/server';
import { syncResults } from '@/lib/jobs/syncResults';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  try {
    console.log('Starting results sync...');
    const result = await syncResults();
    console.log('Results sync completed:', result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Results sync error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
