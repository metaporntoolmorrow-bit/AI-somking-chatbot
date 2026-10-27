import Link from 'next/link';
import { ArrowLeft, ArrowRight, Leaf } from 'lucide-react';
import { ExportActions } from '@/components/export-actions';
import { PackagePrintablePlan } from '@/components/package-printable-plan';
import { getPackage, getPublishedCatalog, getScenario, getTool, settingNames } from '@/lib/catalog';
import { compatibleSelection } from '@/lib/plan-flow';
import { packageSummary } from '@/lib/package-summary';
import { parseGuidanceId } from '@/lib/guidance-cycle';
import { situationSummary } from '@/lib/situation-summary.mjs';

export default async function PackageResult({searchParams}:{searchParams:Promise<{scenario?:string;scenarios?:string;guidance?:string}>}){
  const {scenario:code,scenarios:selection,guidance}=await searchParams;
  const guidanceId=parseGuidanceId(guidance);
  const catalog=await getPublishedCatalog();
  const scenario=getScenario(catalog,code??'');
  const selected=compatibleSelection(catalog.scenarios,code??'',selection);
  const item=scenario?getPackage(catalog,scenario.packageId):undefined;
  const plan=packageSummary(catalog,selected,guidanceId);
  const situation=scenario&&item?situationSummary({role:scenario.role,setting:settingNames[scenario.settingCode]||item.setting,purpose:item.choiceLabel||item.name,audiences:selected.map(s=>s.audience)}):'';
  const primaryIds=new Set(selected.flatMap(s=>s.primaryIds));
  const complete=Boolean(scenario&&item&&selected.length&&plan.steps.length&&plan.toolIds.every(id=>getTool(catalog,id)));
  const zipAvailable=Boolean(complete&&plan.toolIds.every(id=>{const tool=getTool(catalog,id);return tool?.downloadReady||tool?.hasSamplePdf;}));
  const bundleGuide=item?[item.name,item.goal,`พื้นที่: ${settingNames[scenario?.settingCode??'']||item.setting}`,`ผู้ขับเคลื่อน: ${scenario?.role??''}`,`กลุ่มเป้าหมาย: ${plan.audiences.join(' · ')}`,'','ลำดับการใช้เครื่องมือ',...plan.steps.map(step=>`${step.order}. ${step.shortTitle} — ${step.stage}\n   ${step.action}\n   สิ่งที่อยากได้: ${step.outcome}`),'','ข้อควรระวัง',...plan.cautions.map(text=>'- '+text),'','แนวทางการใช้ประโยชน์',...plan.benefits.map(text=>'- '+text),'',plan.guidanceNote,'','ไฟล์ต้นฉบับอยู่ในโฟลเดอร์เครื่องมือ ไฟล์ใหญ่เปิดจากลิงก์ใน TXT'].join('\n'):'';
  return <><div className="result-screen"><header className="result-appbar"><div className="result-appbar-inner"><span className="result-bot"><Leaf size={26}/></span><div><strong>ผู้ช่วยวางแผนพื้นที่ปลอดบุหรี่ไฟฟ้า</strong><small>ชุดเครื่องมือที่ต่อกันเป็นแผนของคุณ</small></div><Link href="/plan" aria-label="กลับไปตอบคำถามใหม่"><ArrowLeft size={20}/></Link></div></header><main className="result-body">
    {!complete||!scenario||!item?<div className="result-empty"><h1>{catalog.status==='unavailable'?'เชื่อมต่อข้อมูลไม่ได้':'ยังไม่พบชุดแผนสำหรับข้อมูลนี้'}</h1><p>ลองตอบคำถามอีกครั้งเพื่อรับชุดเครื่องมือปัจจุบัน</p><Link href="/plan" className="button button-dark">กลับไปเลือกข้อมูล <ArrowRight size={18}/></Link></div>:<>
      <div className="package-overview"><h1>{item.name}</h1><p>{item.goal}</p></div>
      <section className="result-section" aria-labelledby="result-context-title">
        <div className="result-section-heading"><span aria-hidden="true">1</span><h2 id="result-context-title">สถานการณ์</h2></div>
        <div className="package-context"><p>{situation}</p></div>
      </section>
      <section className="result-section" aria-labelledby="result-tools-title">
        <div className="result-section-heading"><span aria-hidden="true">2</span><h2 id="result-tools-title">เครื่องมือหลัก / เสริม</h2></div>
        <ul className="result-tools">{plan.toolIds.map(id=>{
          const tool=getTool(catalog,id)!;
          const primary=primaryIds.has(id);
          return <li key={id} data-tool-id={id}><Link href={`/tools/card/${encodeURIComponent(id)}`}><span className={`result-tool-kind${primary?'':' supporting'}`}>{primary?'หลัก':'เสริม'}</span><span>{tool.shortName||tool.name}</span></Link></li>;
        })}</ul>
      </section>
      <section className="result-section" aria-labelledby="result-sequence-title">
        <div className="result-section-heading"><span aria-hidden="true">3</span><h2 id="result-sequence-title">ลำดับการใช้เครื่องมือ</h2></div>
        <ol className="usage-list">{plan.steps.map(step=><li key={`${step.rank}-${step.toolCode}`}><span className="usage-stage">{step.stage}</span><h3><Link href={`/tools/card/${encodeURIComponent(step.toolCode)}`}>{step.shortTitle}</Link></h3><p className="usage-description">{step.action}</p></li>)}</ol>
      </section>
      <ExportActions planName={item.name} scenarioCode={scenario.id} selection={selected.map(s=>s.id).join(',')} zipAvailable={zipAvailable} bundleGuide={bundleGuide}/>
      <div className="result-gap-actions"><Link href="/plan" className="button button-outline">เลือกบริบทใหม่</Link></div>
    </>}
  </main></div>{complete&&item&&<PackagePrintablePlan catalog={catalog} scenarios={selected} item={item} guidanceId={guidanceId}/>}</>;
}
