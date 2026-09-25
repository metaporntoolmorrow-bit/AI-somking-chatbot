'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const { error: authError } = await createClient().auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message.toLowerCase().includes('fetch') || authError.message.toLowerCase().includes('network')
          ? 'เชื่อมต่อระบบบัญชีไม่ได้ กรุณาลองใหม่อีกครั้ง'
          : 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        return;
      }
      router.replace('/admin');
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
