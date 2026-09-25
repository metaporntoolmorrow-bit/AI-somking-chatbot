import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getAdmin } from '@/lib/supabase/admin';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (!isSupabaseConfigured()) return <main className="container section"><div className="card empty"><h1>ยังไม่ได้ตั้งค่า Supabase</h1><p>คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ URL และ Publishable Key</p></div></main>;
  if (await getAdmin()) redirect('/admin');
  return <main className="container section"><div className="card" style={{maxWidth:460,margin:'auto',padding:32}}><h1>เข้าสู่ระบบผู้ดูแล</h1><p>ใช้บัญชีที่ได้รับสิทธิ์จัดการเนื้อหาหรือระบบ</p><LoginForm/></div></main>;
}
