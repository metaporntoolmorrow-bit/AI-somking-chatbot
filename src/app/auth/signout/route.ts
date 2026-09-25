import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export async function POST(request: Request) {
  if (isSupabaseConfigured()) await (await createClient()).auth.signOut();
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
