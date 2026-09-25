import { createClient } from '@supabase/supabase-js';

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!email || !url || !secret) throw new Error('ใช้คำสั่ง npm run admin:bootstrap -- user@example.com หลังตั้ง URL และ Secret Key');
const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const { count, error: countError } = await client.from('profiles').select('user_id', { count: 'exact', head: true }).eq('access_role', 'admin1');
if (countError) throw countError;
if (count !== 0) throw new Error('มี Admin1 แล้ว คำสั่งนี้ใช้ได้เฉพาะตั้งค่าผู้ดูแลคนแรก');
let user;
for (let page = 1; page <= 20 && !user; page++) {
  const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  user = data.users.find(item => item.email?.toLowerCase() === email);
  if (data.users.length < 1000) break;
}
if (!user) throw new Error('ยังไม่พบอีเมลนี้ใน Supabase Auth กรุณาสร้างบัญชีใน Dashboard ก่อน');
const { data, error } = await client.from('profiles').update({ access_role: 'admin1', account_status: 'active', updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('access_role', 'user').select('user_id').maybeSingle();
if (error) throw error;
if (!data) throw new Error('ไม่พบ profile ที่เป็น user สำหรับบัญชีนี้ กรุณาตรวจ migration/trigger');
process.stdout.write(`ตั้ง Admin1 คนแรกให้ ${email} แล้ว\n`);
