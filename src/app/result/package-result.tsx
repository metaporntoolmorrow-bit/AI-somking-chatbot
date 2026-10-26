import Link from 'next/link';
import { ArrowLeft, ArrowRight, Leaf, ListOrdered, ShieldCheck, Lightbulb } from 'lucide-react';
import { ExportActions } from '@/components/export-actions';
import { PackagePrintablePlan } from '@/components/package-printable-plan';
import { getPackage, getPublishedCatalog, getScenario, getTool, settingNames } from '@/lib/catalog';
import { compatibleSelection } from '@/lib/plan-flow';
import { packageSummary } from '@/lib/package-summary';

export default async function PackageResult({searchParams}:{searchParams:Promise<{scenario?:string;scenarios?:string}>}){
  const {scenario:code,scenarios:selection}=await searchParams;
  const catalog=await getPublishedCatalog();
  const scenario=getScenario(catalog,code??'');
  const selected=compatibleSelection(catalog.scenarios,code??'',selection);
  const item=scenario?getPackage(catalog,scenario.packageId):undefined;
  const plan=packageSummary(catalog,selected);
  const complete=Boolean(scenario&&item&&selected.length&&plan.steps.length&&plan.toolIds.every(id=>getTool(catalog,id)));
  const zipAvailable=Boolean(complete&&plan.toolIds.every(id=>{const tool=getTool(catalog,id);return tool?.downloadReady||tool?.hasSamplePdf;}));
  return <><div className="result-screen"><header className="result-appbar"><div className="result-appbar-inner"><span className="result-bot"><Leaf size={26}/></span><div><strong>ผู้ช่วยวางแผนพื้นที่ปลอดบุหรี่ไฟฟ้า</strong><small>ชุดเครื่องมือที่ต่อกันเป็นแผนของคุณ</small></div><Link href="/plan" aria-label="กลับไปตอบคำถามใหม่"><ArrowLeft size={20}/></Link></div></header><main className="result-body">
    {!complete||!scenario||!item?<div className="result-empty"><h1>{catalog.status==='unavailable'?'เชื่อมต่อข้อมูลไม่ได้':'ยังไม่พบชุดแผนสำหรับข้อมูลนี้'}</h1><p>ลองตอบคำถามอีกครั้งเพื่อรับชุดเครื่องมือปัจจุบัน</p><Link href="/plan" className="button button-dark">กลับไปเลือกข้อมูล <ArrowRight size={18}/></Link></div>:<>
      <section className="package-overview"><h1>{item.name}</h1><p>{item.goal}</p><dl className="package-context"><div><dt>พื้นที่ของคุณ</dt><dd>{settingNames[scenario.settingCode]||item.setting}</dd></div><div><dt>บทบาทของคุณ</dt><dd>{scenario.role}</dd></div><div><dt>กลุ่มที่อยากดูแล</dt><dd>{plan.audiences.join(' · ')}</dd></div></dl></section>
      <section className="result-section"><div className="result-section-heading"><span><ListOrdered size={19}/></span><h2>ลำดับการใช้เครื่องมือ</h2></div><p className="section-help">เริ่มจากข้อแรก แล้วใช้เครื่องมือต่อกันตามลำดับ เครื่องมือบางชิ้นจะกลับมาใช้ซ้ำเพื่อทบทวนผล</p><ol className="usage-list">{plan.steps.map(step=><li key={`${step.rank}-${step.toolCode}`}><span className="usage-number">{step.order}</span><div><span className="usage-stage">{step.stage}</span><h3><Link href={`/tools/card/${encodeURIComponent(step.toolCode)}`}>{step.shortTitle}</Link></h3><p>{step.action}</p><p className="usage-outcome"><b>สิ่งที่อยากได้:</b> {step.outcome}</p></div></li>)}</ol></section>
      <div className="usage-guidance"><section><h2><ShieldCheck size={21}/> ข้อควรระวัง</h2><ul>{plan.cautions.map(text=><li key={text}>{text}</li>)}</ul>{plan.notes.map(text=><p className="usage-source-note" key={text}>{text}</p>)}</section><section><h2><Lightbulb size={21}/> แนวทางการใช้ประโยชน์</h2><ul>{plan.benefits.map(text=><li key={text}>{text}</li>)}</ul></section></div>
      <details className="package-files"><summary>ดูไฟล์ในแพ็กเกจนี้ ({plan.toolIds.length} เครื่องมือ)</summary><ol>{plan.toolIds.map(id=>{const tool=getTool(catalog,id)!;return <li key={id}><Link href={`/tools/card/${encodeURIComponent(id)}`}>{tool.shortName||tool.name}</Link><small>{tool.files.length} ไฟล์และลิงก์</small></li>;})}</ol></details>
      {plan.guidanceNote&&<p className="usage-guidance-note">{plan.guidanceNote}</p>}
      <ExportActions planName={item.name} scenarioCode={scenario.id} selection={selected.map(s=>s.id).join(',')} zipAvailable={zipAvailable}/>
      <div className="result-gap-actions"><Link href="/plan" className="button button-outline">เลือกบริบทใหม่</Link></div>
    </>}
  </main></div>{complete&&item&&<PackagePrintablePlan catalog={catalog} scenarios={selected} item={item}/>}</>;
}
