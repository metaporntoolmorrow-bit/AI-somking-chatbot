import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { requireAdmin } from '@/lib/supabase/admin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) redirect('/login');
  await requireAdmin();
  return children;
}
