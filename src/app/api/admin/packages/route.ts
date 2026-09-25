import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabase/admin';

export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขข้อมูล' }, { status: 403 });
  if (Number(request.headers.get('content-length') || 0) > 16_384) return NextResponse.json({ error: 'ข้อมูลยาวเกินไป' }, { status: 413 });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 }); }
  if (!input || typeof input !== 'object') return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  const body = input as Record<string, unknown>;
  const { releaseId, code, title, goal, note, updatedAt } = body;
  if (typeof releaseId !== 'string' || !releaseId || typeof code !== 'string' || !code || typeof title !== 'string' || !title || typeof goal !== 'string' || !goal || typeof updatedAt !== 'string' || !updatedAt || typeof note !== 'string' || title.length > 200 || goal.length > 3000 || note.length > 3000) {
    return NextResponse.json({ error: 'กรุณาตรวจข้อมูลที่แก้ไข' }, { status: 400 });
  }
  const { data, error } = await admin.supabase.rpc('save_draft_package', {
    p_release_id: releaseId, p_code: code, p_title: title, p_goal: goal,
    p_note: note, p_expected_updated_at: updatedAt,
  });
  if (error?.code === '40001') return NextResponse.json({ error: 'มีคนแก้ไขข้อมูลนี้ไปแล้ว กรุณาโหลดหน้าใหม่' }, { status: 409 });
  if (error?.code === '22023') return NextResponse.json({ error: 'แก้ไขได้เฉพาะข้อมูลฉบับร่างที่ถูกต้อง' }, { status: 409 });
  if (error) return NextResponse.json({ error: 'บันทึกไม่สำเร็จ' }, { status: 500 });
  return NextResponse.json({ updatedAt: data });
}
