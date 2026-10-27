import localFont from 'next/font/local';
import { getTool, settingNames, type Catalog, type Package, type Scenario } from '@/lib/catalog';
import { packageSummary } from '@/lib/package-summary';
import './package-print.css';

const printFont=localFont({src:'../../public/fonts/noto-sans-thai/NotoSansThai-Variable.ttf',weight:'100 900',display:'swap',variable:'--font-print-thai',preload:true});

export function PackagePrintablePlan({catalog,scenarios,item,guidanceId=1}:{catalog:Catalog;scenarios:Scenario[];item:Package;guidanceId?:number}){
  const plan=packageSummary(catalog,scenarios,guidanceId);
  const first=scenarios[0];
  const compact=plan.steps.length>4||plan.toolIds.length>2||plan.cautions.length>5;
  const count=plan.steps.length>8?4:Math.min(3,plan.steps.length);
  const columns=Array.from({length:count},(_,index)=>{
    const base=Math.floor(plan.steps.length/count),remainder=plan.steps.length%count;
    const offset=index*base+Math.min(index,remainder);
    return plan.steps.slice(offset,offset+base+(index<remainder?1:0));
  });
  const start=getTool(catalog,plan.toolIds[0]);
  return <div className={`print-document ${printFont.variable}${compact?' print-compact':''}`} aria-hidden="true"><article className="print-sheet">
    <header className="print-top"><div className="print-cover"><h1>ชุดเครื่องมือ<br/>ที่เหมาะสม<br/>กับสถานการณ์</h1><p>{item.name}</p></div><section className="print-situation"><h2>สถานการณ์ของคุณ</h2><dl><div><dt>พื้นที่ดำเนินการ:</dt><dd>{settingNames[first.settingCode]||item.setting}</dd></div><div><dt>สิ่งที่อยากทำ:</dt><dd>{item.goal}</dd></div><div><dt>กลุ่มเป้าหมาย:</dt><dd>{plan.audiences.join(' · ')}</dd></div><div><dt>ผู้ขับเคลื่อน:</dt><dd>{first.role}</dd></div></dl></section></header>
    <section className="print-tools"><h2>{plan.toolIds.length>1?'ชุดเครื่องมือที่ใช้ร่วมกัน':'เครื่องมือสำหรับแผนนี้'}</h2><div className={`print-tool-pair${plan.toolIds.length===1?' print-tool-single':''}`}><div className="print-tool-card print-tool-start"><h3>เริ่มจากเครื่องมือนี้</h3><strong>{start?.shortName||start?.name}</strong><p>{plan.steps[0]?.outcome}</p><p><b>ผู้ขับเคลื่อน:</b> {first.role}</p></div>{plan.toolIds.length>1&&<div className="print-tool-card print-tool-follow"><h3>เครื่องมือที่ใช้ต่อ</h3><ol className={plan.toolIds.length>5?'print-tool-columns':''} start={2}>{plan.toolIds.slice(1).map(id=>{const tool=getTool(catalog,id);return <li key={id}>{tool?.shortName||tool?.name}</li>;})}</ol></div>}</div></section>
    <section className="print-sequence"><h2>ลำดับการใช้เครื่องมือ</h2><div className="print-step-columns" style={{gridTemplateColumns:`repeat(${columns.length}, minmax(0, 1fr))`}}>{columns.map(steps=><section className="print-step-column" key={steps[0].order}><h3 className="print-column-title">ขั้นที่ {steps[0].order}{steps.length>1?`–${steps.at(-1)!.order}`:''}</h3><ol start={steps[0].order}>{steps.map(step=><li key={`${step.rank}-${step.toolCode}`}><h4>{step.order}. {step.shortTitle}</h4><p><b>{step.stage}:</b> {step.action}</p></li>)}</ol></section>)}</div></section>
    <div className="print-guidance"><section><h2>ข้อควรระวัง</h2><ul>{plan.cautions.map(text=><li key={text}>{text}</li>)}</ul></section><section><h2>แนวทางการใช้ประโยชน์</h2><ul>{plan.benefits.map(text=><li key={text}>{text}</li>)}</ul></section></div>
    <footer className="print-foot"><p>{plan.guidanceNote} · ชุดนี้มี {plan.toolIds.length} เครื่องมือ · เปิดไฟล์และลิงก์ไฟล์ใหญ่ได้ใน ZIP</p></footer>
  </article></div>;
}
