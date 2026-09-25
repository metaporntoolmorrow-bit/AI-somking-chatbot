import { notFound } from 'next/navigation';
import { getPublishedCatalog, getTool } from '@/lib/catalog';
import './tool-card.css';

export const dynamic='force-dynamic';

export default async function ToolCardPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const catalog=await getPublishedCatalog();
  const tool=getTool(catalog,id);
  if(!tool)notFound();
  const steps=tool.steps.split('\n').map(step=>step.trim()).filter(Boolean);
  const items=(text:string)=>text.split(/[;\n]/).map(item=>item.trim()).filter(Boolean);
  return <div className="document-wrap"><article className="document-page"><header className="document-head"><div><span>รายละเอียดเครื่องมือ</span><h1>{tool.name}</h1><p>{tool.description}</p></div><strong>พื้นที่ปลอด<br/>บุหรี่ไฟฟ้า</strong></header>
    {tool.hasSamplePdf&&<p><a className="button button-outline" href={`/api/tool-file/${encodeURIComponent(tool.id)}`} target="_blank" rel="noopener noreferrer">เปิดไฟล์ PDF</a></p>}
    <div className="document-context">{tool.audiences&&<div><span>เหมาะกับใคร</span><strong>{tool.audiences}</strong></div>}{tool.roles&&<div><span>คนที่เกี่ยวข้อง</span><strong>{tool.roles}</strong></div>}{tool.setting&&<div><span>ใช้ที่ไหน</span><strong>{tool.setting}</strong></div>}</div>
    {steps.length>0&&<section><h2>เริ่มใช้อย่างไร</h2><ol>{steps.map((step,index)=><li key={index}>{step}</li>)}</ol></section>}
    {(tool.preparation||tool.risks)&&<div className="document-columns">{tool.preparation&&<section><h2>เตรียมอะไรบ้าง</h2><p>{tool.preparation}</p></section>}{tool.risks&&<section><h2>เรื่องที่ควรระวัง</h2><ul>{items(tool.risks).map(item=><li key={item}>{item}</li>)}</ul></section>}</div>}
    {(tool.success||tool.indicators)&&<div className="document-columns">{tool.success&&<section><h2>เมื่อไรจึงถือว่าไปได้ดี</h2><ul>{items(tool.success).map(item=><li key={item}>{item}</li>)}</ul></section>}{tool.indicators&&<section><h2>ติดตามผลอย่างไร</h2><ul>{items(tool.indicators).map(item=><li key={item}>{item}</li>)}</ul></section>}</div>}
  </article></div>;
}
