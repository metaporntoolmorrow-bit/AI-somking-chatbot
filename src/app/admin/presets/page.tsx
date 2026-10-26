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
  const {data:release,error:releaseError}=await service.from('content_releases').select('id,version_label,workflow_status').order('created_at',{ascending:false}).limit(1).maybeSingle();
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
  return <><div className="page-head"><div className="container"><Link href="/admin" className="back-link"><ArrowLeft size={16}/> กลับไปภาพรวม</Link><h1>จัดการชุดแผน</h1><p>ตรวจข้อมูลชุดแผนรุ่นล่าสุด และแก้ไขได้เมื่อเป็นฉบับร่าง</p></div></div><div className="container admin-main">{failed?<div className="card empty">อ่านข้อมูลไม่สำเร็จ กรุณาลองใหม่</div>:!release?<div className="card empty"><h2>ยังไม่มีข้อมูลชุดแผน</h2></div>:<><div className="notice">รุ่น {release.version_label} · {release.workflow_status==='draft'?'ฉบับร่าง การบันทึกยังไม่เผยแพร่':'เผยแพร่แล้ว อ่านอย่างเดียว เพื่อเก็บแผนที่ผู้ใช้ได้รับให้ตรงกับรุ่นเดิม'}</div><PresetManager initial={rows} counts={counts} releaseId={release.id} readOnly={release.workflow_status!=='draft'}/></>}</div></>;
}
