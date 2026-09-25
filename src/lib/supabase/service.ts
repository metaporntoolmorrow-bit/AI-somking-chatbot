import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';

export function createServiceClient() {
  const { url } = supabaseConfig();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('ยังไม่ได้ตั้งค่า SUPABASE_SECRET_KEY');
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
