'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LoginForm({nextPath='/admin'}:{nextPath?:'/admin'|'/dashboard'}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const client=createClient();
      const { data:authData,error: authError } = await client.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message.toLowerCase().includes('fetch') || authError.message.toLowerCase().includes('network')
          ? 'เชื่อมต่อระบบบัญชีไม่ได้ กรุณาลองใหม่อีกครั้ง'
          : 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        return;
      }
      if(!authData.user){setError('ยังตรวจสอบบัญชีไม่ได้ กรุณาลองเข้าสู่ระบบอีกครั้ง');return;}
      const {data:profile,error:profileError}=await client.from('profiles').select('access_role,account_status').eq('user_id',authData.user.id).single();
      if(profileError){setError('ยังตรวจสอบสิทธิ์ไม่ได้ กรุณาลองเข้าสู่ระบบอีกครั้ง');return;}
      if(!profile||profile.account_status!=='active'||!['admin1','admin2'].includes(profile.access_role)){
        await client.auth.signOut();setError('บัญชีนี้ยังไม่มีสิทธิ์เข้าใช้งานส่วนผู้ดูแล');return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError('เชื่อมต่อระบบบัญชีไม่ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  }
  return <form onSubmit={submit} style={{display:'grid',gap:16,marginTop:24}}>
    <label><span className="field-label">อีเมล</span><input className="field" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label><span className="field-label">รหัสผ่าน</span><input className="field" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <button className="button button-dark" disabled={busy}>{busy?'กำลังเข้าสู่ระบบ…':'เข้าสู่ระบบ'}</button>
  </form>;
}
