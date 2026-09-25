import Link from 'next/link';
import { getPublishedCatalog } from '@/lib/catalog';
import { PlanExperience } from './plan-experience';
import './plan.css';

export const dynamic = 'force-dynamic';

export default async function PlanPage() {
  const catalog=await getPublishedCatalog();
  const available=catalog.scenarios.filter(scenario=>scenario.role&&scenario.audience&&scenario.summary);
  if(catalog.status!=='ready'||!available.length) return <><div className="page-head"><div className="container"><h1>สร้างแผนสำหรับพื้นที่ของคุณ</h1><p>ระบบจะแสดงตัวเลือกจากข้อมูลที่มีในคลัง</p></div></div><section className="section"><div className="container"><div className="card empty"><h2>{catalog.status==='unavailable'?'ยังเชื่อมต่อคลังข้อมูลไม่ได้':'ยังไม่มีชุดแผนในคลัง'}</h2><p>{catalog.status==='unavailable'?'กรุณาลองใหม่อีกครั้งในภายหลัง':'เมื่อมีชุดแผนแล้ว คุณจะเริ่มสร้างแผนได้จากหน้านี้'}</p><Link href="/" className="button button-outline">กลับหน้าแรก</Link></div></div></section></>;
  return <PlanExperience scenarios={available} packages={catalog.packages}/>;
}
