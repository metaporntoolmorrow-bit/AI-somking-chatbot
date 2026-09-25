import { getPublishedCatalog } from '@/lib/catalog';
import { ToolBrowser } from './tool-browser';
import './tools.css';

export const dynamic='force-dynamic';

export default async function ToolsPage(){
  const catalog=await getPublishedCatalog();
  return <><div className="page-head"><div className="container"><span className="eyebrow">คลังเครื่องมือ</span><h1>หาเครื่องมือที่เหมาะ<br/>กับงานของคุณ</h1><p>{catalog.status==='ready'?`เครื่องมือในคลัง ${catalog.tools.length} รายการ`:'รายการเครื่องมือจะแสดงเมื่อมีข้อมูลพร้อมใช้งาน'}</p></div></div><section className="section tools-section"><div className="container">{catalog.status==='ready'&&catalog.tools.length?<ToolBrowser tools={catalog.tools} packages={catalog.packages}/>:<div className="card empty"><h2>{catalog.status==='unavailable'?'เชื่อมต่อคลังเครื่องมือไม่ได้':'ยังไม่มีเครื่องมือในคลัง'}</h2><p>{catalog.status==='unavailable'?'กรุณาลองใหม่อีกครั้งในภายหลัง':'เมื่อมีเครื่องมือแล้ว รายการจะแสดงที่หน้านี้'}</p></div>}</div></section></>;
}
