import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

async function signOut(origin: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  for (const cookie of allCookies) {
    if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
      cookieStore.delete(cookie.name);
    }
  }

  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  return signOut(origin);
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return signOut(origin);
}
