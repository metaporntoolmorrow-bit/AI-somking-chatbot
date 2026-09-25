import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import { PresetManager, type EditablePackage } from './preset-manager';
import '../admin.css';

export const dynamic='force-dynamic';

export default async function PresetsPage(){
  await requireAdmin();
  const service=createServiceClient();
  const {data:release,error:releaseError}=await service.from('content_releases').select('id,version_label').eq('workflow_status','draft').order('created_at',{ascending:false}).limit(1).maybeSingle();
  let rows:EditablePackage[]=[];
  const counts:Record<string,number>={};
  let failed=Boolean(releaseError);
  if(release){
    const [packageResult,scenarioResult]=await Promise.all([
      service.from('packages').select('code,title_th,goal_th,limitations_th,setting_label_th,level_label_th,updated_at').eq('release_id',release.id).order('code'),
      service.from('scenarios').select('package_code').eq('release_id',release.id),
    ]);
    failed=Boolean(packageResult.error||scenarioResult.error);
    rows=(packageResult.data??[]).map(row=>({id:row.code,name:row.title_th,goal:row.goal_th,note:row.limitations_th??'',setting:row.setting_label_th??'',level:row.level_label_th??'',updatedAt:row.updated_at}));
    for(const scenario of scenarioResult.data??[])counts[scenario.package_code]=(counts[scenario.package_code]??0)+1;
  }
  return <><div className="page-head"><div className="container"><Link href="/admin" className="back-link"><ArrowLeft size={16}/> กลับไปภาพรวม</Link><h1>จัดการชุดแผน</h1><p>ตรวจและแก้ไขข้อมูลฉบับร่างใน Supabase</p></div></div><div className="container admin-main">{failed?<div className="card empty">อ่านข้อมูลฉบับร่างไม่สำเร็จ กรุณาลองใหม่</div>:!release?<div className="card empty"><h2>ยังไม่มีข้อมูลฉบับร่าง</h2><p>สร้างชุดข้อมูลใน Supabase ก่อนจึงจะแก้ไขจากหน้านี้ได้</p></div>:<><div className="notice">ฉบับร่าง {release.version_label} · การบันทึกยังไม่เผยแพร่ต่อผู้ใช้งาน</div><PresetManager initial={rows} counts={counts} releaseId={release.id}/></>}</div></>;
}
