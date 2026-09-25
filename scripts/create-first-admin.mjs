import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!email || !/^\S+@\S+\.\S+$/.test(email) || !url || !secret) {
  throw new Error('ใช้คำสั่ง npm run admin:create -- email@example.com หลังตั้งค่า .env.local');
}
const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const { count, error: countError } = await client.from('profiles').select('user_id', { count: 'exact', head: true }).eq('access_role', 'admin1');
if (countError) throw countError;
if (count !== 0) throw new Error('มี Admin1 อยู่แล้ว คำสั่งนี้ใช้สร้างผู้ดูแลคนแรกเท่านั้น');

const password = randomBytes(24).toString('base64url');
const { data, error: createError } = await client.auth.admin.createUser({ email, password, email_confirm: true });
if (createError || !data.user) throw createError || new Error('สร้างบัญชีไม่สำเร็จ');
const userId = data.user.id;
const { data: profile, error: roleError } = await client.from('profiles')
  .update({ access_role: 'admin1', account_status: 'active', updated_at: new Date().toISOString() })
  .eq('user_id', userId).eq('access_role', 'user').select('user_id').maybeSingle();
if (roleError || !profile) {
  await client.auth.admin.deleteUser(userId);
  throw roleError || new Error('ตั้งสิทธิ์ไม่สำเร็จ; ยกเลิกบัญชีที่เพิ่งสร้างแล้ว');
}
const signInClient = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { error: loginError } = await signInClient.auth.signInWithPassword({ email, password });
if (loginError) throw new Error(`สร้างบัญชีแล้ว แต่ทดสอบล็อกอินไม่ผ่าน: ${loginError.message}`);
process.stdout.write(`EMAIL=${email}\nTEMP_PASSWORD=${password}\nLOGIN_VERIFIED=true\n`);
