import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from './server';

export type AdminRole = 'admin1' | 'admin2';

export async function getAdmin() {
  const supabase = await createClient();
  const { data: claims, error } = await supabase.auth.getClaims();
  if (error || !claims?.claims?.sub) return null;
  const { data: profile } = await supabase.from('profiles')
    .select('user_id,access_role,account_status')
    .eq('user_id', claims.claims.sub).single();
  if (!profile || profile.account_status !== 'active' || !['admin1', 'admin2'].includes(profile.access_role)) return null;
  return { supabase, userId: profile.user_id as string, role: profile.access_role as AdminRole };
}

export async function requireAdmin(allowed: AdminRole[] = ['admin1', 'admin2']) {
  const admin = await getAdmin();
  if (!admin) redirect('/login');
  if (!allowed.includes(admin.role)) redirect('/admin');
  return admin;
}
