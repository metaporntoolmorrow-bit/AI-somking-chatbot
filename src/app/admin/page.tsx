import Link from 'next/link';
import { ArrowRight, BookOpen, Layers3, Users } from 'lucide-react';
import { requireAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import './admin.css';

export const dynamic='force-dynamic';

export default async function AdminPage(){
  const {role}=await requireAdmin();
  const service=createServiceClient();
  const {data:release,error:releaseError}=await service.from('content_releases').select('id,version_label,workflow_status,trust_status,change_note').order('created_at',{ascending:false}).limit(1).maybeSingle();
  const counts=release?await Promise.all([
    service.from('packages').select('code',{head:true,count:'exact'}).eq('release_id',release.id),
    service.from('tools').select('code',{head:true,count:'exact'}).eq('release_id',release.id),
    service.from('scenarios').select('code',{head:true,count:'exact'}).eq('release_id',release.id),
    service.from('scenarios').select('code',{head:true,count:'exact'}).eq('release_id',release.id).eq('catalogue_status','no_tool'),
  ]):[];
  const hasError=Boolean(releaseError||counts.some(result=>result.error));
  const [packageCount,toolCount,scenarioCount,gapCount]=counts.map(result=>result.count??0);
  return <><div className="page-head"><div className="container"><span className="eyebrow">ระบบหลังบ้าน</span><h1>ภาพรวมชุดแผนและเครื่องมือ</h1><p>ข้อมูลจาก Supabase ตามรุ่นล่าสุดที่มีในระบบ</p></div></div><div className="container admin-main"><div className="admin-top"><nav className="admin-nav"><Link href="/admin" className="current">ภาพรวม</Link><Link href="/admin/source">ตรวจข้อมูลจากไฟล์</Link><Link href="/admin/presets">จัดการชุดแผน</Link>{role==='admin1'&&<Link href="/admin/members">สมาชิก</Link>}</nav><form action="/auth/signout" method="post"><button className="button button-outline">ออกจากระบบ</button></form></div>
    {hasError?<div className="card empty"><h2>อ่านข้อมูลจาก Supabase ไม่สำเร็จ</h2><p>กรุณาตรวจการเชื่อมต่อและลองใหม่</p></div>:!release?<div className="card empty"><h2>ยังไม่มีชุดข้อมูลในระบบ</h2><p>นำเข้าหรือสร้างข้อมูลฉบับร่างก่อน จึงจะมีรายการให้ตรวจสอบ</p></div>:<><div className="notice">รุ่นล่าสุด: {release.version_label} · สถานะ {release.workflow_status} · การรับรอง {release.trust_status}</div><div className="grid-3 admin-stats"><div className="card stat-card"><Layers3 size={23}/><strong>{packageCount}</strong><span>ชุดแผน</span></div><div className="card stat-card"><BookOpen size={23}/><strong>{toolCount}</strong><span>เครื่องมือ</span></div><div className="card stat-card"><Users size={23}/><strong>{scenarioCount}</strong><span>สถานการณ์</span></div></div><div className="grid-2 admin-panels"><div className="card admin-panel"><h2>ความครอบคลุมของรุ่นนี้</h2><div className="coverage"><div><span>สถานการณ์ทั้งหมด</span><strong>{scenarioCount}</strong></div><div><span>ยังไม่มีเครื่องมือ</span><strong>{gapCount}</strong></div></div><Link href="/admin/presets">ดูชุดแผน <ArrowRight size={16}/></Link></div><div className="card admin-panel"><h2>การเผยแพร่</h2><p>{release.workflow_status==='published'&&release.trust_status==='approved'?'รุ่นนี้เผยแพร่แล้ว':release.change_note==='public-preview:simulated'?'เปิดให้ใช้งานบนเว็บไซต์แล้ว':'รุ่นนี้ยังไม่เปิดให้ผู้ใช้งานทั่วไปเห็น'}</p></div></div></>}
  </div></>;
}
