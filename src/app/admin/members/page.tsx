import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { requireAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import '../admin.css';

export const dynamic='force-dynamic';
const roleNames:Record<string,string>={admin1:'ผู้ดูแลระบบ',admin2:'ผู้ดูแลเนื้อหา',user:'ผู้ใช้งาน'};

export default async function MembersPage(){
  await requireAdmin(['admin1']);
  const service=createServiceClient();
  const [profiles,users]=await Promise.all([
    service.from('profiles').select('user_id,display_name,access_role,account_status').order('created_at',{ascending:false}),
    service.auth.admin.listUsers({page:1,perPage:1000}),
  ]);
  const failed=Boolean(profiles.error||users.error);
  const emails=new Map((users.data?.users??[]).map(user=>[user.id,user.email??'']));
  return <><div className="page-head"><div className="container"><Link href="/admin" className="back-link"><ArrowLeft size={16}/> กลับไปภาพรวม</Link><h1>สมาชิก</h1><p>บัญชีและสิทธิ์ที่บันทึกอยู่ใน Supabase</p></div></div><div className="container admin-main">{failed?<div className="card empty">อ่านบัญชีสมาชิกไม่สำเร็จ กรุณาลองใหม่</div>:!profiles.data?.length?<div className="card empty"><Users size={30}/><p>ยังไม่มีบัญชีสมาชิก</p></div>:<div className="card member-list"><h2>สมาชิกในระบบ <span>{profiles.data.length}</span></h2>{profiles.data.map(profile=><div className="member-row" key={profile.user_id}><strong>{profile.display_name||emails.get(profile.user_id)||'บัญชีผู้ใช้'}</strong><span>{roleNames[profile.access_role]??'ผู้ใช้งาน'}</span><span>{profile.account_status==='active'?'ใช้งาน':'ระงับ'}</span></div>)}</div>}<div className="notice">การเชิญและเปลี่ยนสิทธิ์สมาชิกยังไม่เปิดจากหน้าเว็บ เพื่อให้การอนุมัติและบันทึกประวัติครบก่อนใช้งาน</div></div></>;
}
