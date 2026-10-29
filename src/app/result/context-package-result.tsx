import Link from 'next/link';
import {ArrowLeft,ArrowRight,Leaf} from 'lucide-react';
import {getPublishedCatalog,getPackage,getTool} from '@/lib/catalog';
import {contextLabels,contextSummary,contextSearch,validContext,contextQuestions,type UserContextState} from '@/lib/intervention-context';
import {packageSummary} from '@/lib/package-summary';
import {ExportActions} from '@/components/export-actions';
import {PackagePrintablePlan} from '@/components/package-printable-plan';
import {ImplementationGuidance} from '@/components/implementation-guidance';
import {SatisfactionRating} from '@/components/satisfaction-rating';
import {createFeedbackToken} from '@/lib/feedback-token';

export type ResultQuery={scenario?:string;scenarios?:string;setting?:string;role?:string;targetYouth?:string;goalC?:string};
export default async function ContextPackageResult({query}:{query:ResultQuery}){
  const catalog=await getPublishedCatalog();
  const fromCode=catalog.scenarios.find(s=>s.id===query.scenario)?.context;
  const hasTags=contextQuestions.some(q=>query[q.key]!==undefined);
  const input=hasTags?{setting:query.setting,role:query.role,targetYouth:query.targetYouth,goalC:query.goalC}:fromCode;
  const context=validContext(input)?input:undefined;
  const matches=context?catalog.scenarios.filter(s=>s.context&&contextQuestions.every(q=>s.context![q.key]===context[q.key])):[];
  const scenario=matches.length===1?matches[0]:undefined;
  const item=scenario?getPackage(catalog,scenario.packageId):undefined;
  const plan=packageSummary(catalog,scenario?[scenario]:[]);
  const complete=Boolean(scenario&&item&&plan.steps.length&&plan.toolIds.length&&plan.toolIds.every(id=>getTool(catalog,id)));
  const suggestions=context?catalog.scenarios.filter(s=>s.context&&s.context.setting===context.setting&&s.context.role===context.role&&s.context.targetYouth===context.targetYouth):[];
  const guidance=scenario?.implementationGuidance;
  const zipAvailable=complete&&plan.toolIds.every(id=>getTool(catalog,id)?.downloadReady);
  const labels=context?contextLabels(context):undefined;
  const guide=complete&&item&&context?[item.name,...(scenario?.contextNarrative?.length?scenario.contextNarrative:[contextSummary(context)]),`พื้นที่: ${labels?.setting} / บทบาท: ${labels?.role} / กลุ่มเป้าหมาย: ${labels?.targetYouth}`,'','ลำดับการใช้เครื่องมือ',...plan.steps.map(step=>`${step.order}. ${step.stage}\n   เครื่องมือ: ${step.shortTitle}\n   วิธีทำ: ${step.action}\n   เป้าหมาย: ${step.outcome}${step.sourcePages?.length?`\n   เอกสารองค์ประกอบ หน้า ${step.sourcePages.join(', ')}`:''}`),...(guidance?['','ปัจจัยความสำเร็จ',...guidance.successFactors,'','ข้อควรระวัง',...guidance.cautions,'','มาตรฐานความสำเร็จ',...guidance.keyStandards,...(guidance.sourceTitle?['',`อ้างอิง: ${guidance.sourceTitle}`]:[])]:[]),'','ไฟล์ต้นฉบับขนาดไม่เกิน 6 MB อยู่ในโฟลเดอร์เครื่องมือ ไฟล์ใหญ่เปิดจากลิงก์ใน TXT'].join('\n'):'';
  return <><div className="result-screen"><header className="result-appbar"><div className="result-appbar-inner"><span className="result-bot"><Leaf size={26}/></span><div><strong>ผู้ช่วยวางแผนพื้นที่ปลอดบุหรี่ไฟฟ้า</strong><small>จากบริบทของคุณ สู่ชุดเครื่องมือพร้อมใช้</small></div><Link href="/plan" aria-label="กลับไปตอบคำถามใหม่"><ArrowLeft size={20}/></Link></div></header><main className="result-body">
    {context&&labels&&<section className="context-summary-banner" aria-labelledby="context-summary-title"><h2 id="context-summary-title">สรุปบริบทการดำเนินงานของคุณ</h2>{scenario?.contextNarrative?.length?<div className="context-narrative">{scenario.contextNarrative.map((text,index)=><p key={index}>{text}</p>)}</div>:<p>{contextSummary(context)}</p>}</section>}
    {!complete||!scenario||!item?<section className="result-empty" aria-labelledby="no-package-title"><h1 id="no-package-title">{catalog.status==='unavailable'?'ยังเชื่อมต่อคลังเครื่องมือไม่ได้':!context?'ข้อมูลคำตอบไม่ครบหรือไม่ถูกต้อง':'ยังไม่มีชุดเครื่องมือที่ตรงกับคำตอบนี้'}</h1><p>{catalog.status==='unavailable'?'ลองโหลดหน้าใหม่อีกครั้ง หรือลองใหม่ในภายหลัง':!context?'ตอบคำถามทั้ง 4 ข้ออีกครั้ง เพื่อให้จับคู่กับไฟล์ปัจจุบันได้ถูกต้อง':'คลังปัจจุบันยังไม่มีไฟล์ที่รองรับบริบทนี้ครบ จึงยังสร้างแผนและไฟล์ดาวน์โหลดให้ไม่ได้'}</p>
      {suggestions.length>0&&<div className="available-goals"><h2>เป้าหมายที่มีเครื่องมือในบริบทนี้</h2>{suggestions.map(s=><Link key={s.id} href={`/result?${contextSearch(s.context as UserContextState)}`} className="button button-outline">{contextLabels(s.context!).goalC}<ArrowRight size={16}/></Link>)}</div>}
      <Link href="/plan" className="button button-dark">กลับไปเลือกบริบท <ArrowRight size={18}/></Link>
    </section>:<>
      <div className="package-overview"><h1>{item.name}</h1><p>เรียงเครื่องมือให้ใช้ต่อกัน ตั้งแต่เตรียมงาน ลงมือทำ จนถึงทบทวนผล</p></div>
      <section className="result-section" aria-labelledby="result-tools-title"><div className="result-section-heading"><span aria-hidden="true">1</span><h2 id="result-tools-title">ชุดเครื่องมือสำหรับคุณ</h2></div>
        <p className="package-file-count">{plan.toolIds.length} เครื่องมือ{plan.toolIds.length<3?' · มีไฟล์ที่ตรงบริบทเท่านี้ในคลังปัจจุบัน':''}</p>
        <ul className="result-tools">{plan.toolIds.map(id=>{const tool=getTool(catalog,id)!;return <li key={id} data-tool-id={id}><Link href={`/tools/card/${encodeURIComponent(id)}`}><span className={`result-tool-kind${id.startsWith('SUP-')?' supporting':''}`}>{id.startsWith('SUP-')?'เสริม':'หลัก'}</span><span>{tool.shortName||tool.name}<small className="result-tool-format">{tool.kind}</small></span></Link></li>;})}</ul>
        {scenario.intro&&<p className="package-scope-note">{scenario.intro}</p>}
      </section>
      <section className="result-section" aria-labelledby="result-sequence-title"><div className="result-section-heading"><span aria-hidden="true">2</span><h2 id="result-sequence-title">ลำดับการใช้เครื่องมือ</h2></div>{scenario.component&&<p className="sequence-source">{scenario.component.sequenceNote} · องค์ประกอบที่ {scenario.component.number} หน้า {scenario.component.source.pages[0]}–{scenario.component.source.pages.at(-1)}</p>}{scenario.component?.adaptation&&<p className="package-scope-note">{scenario.component.adaptation}</p>}<ol className="usage-list">{plan.steps.map(step=><li key={step.order}><h3>{step.stage}</h3><p className="usage-description"><b>วิธีทำ:</b> {step.action}</p><p className="usage-goal"><b>เป้าหมาย:</b> {step.outcome}</p><div className="step-tool-links">{(step.toolCodes?.length?step.toolCodes:[step.toolCode]).map(id=><Link key={id} href={`/tools/card/${encodeURIComponent(id)}`}>{getTool(catalog,id)?.shortName}</Link>)}</div></li>)}</ol></section>
      {guidance&&<section className="result-section" aria-labelledby="implementation-title"><div className="result-section-heading"><span aria-hidden="true">3</span><h2 id="implementation-title">แนวทางดำเนินงาน</h2></div>{scenario.component&&<p className="sequence-source">คัดประเด็นจากหัวข้อ 4–6 ในเอกสารองค์ประกอบที่ {scenario.component.number}</p>}<ImplementationGuidance guidance={guidance}/></section>}
      <section className="result-section" aria-label="ดาวน์โหลดแผนและชุดเครื่องมือ"><ExportActions planName={item.name} scenarioCode={scenario.id} zipAvailable={zipAvailable} bundleGuide={guide}/></section>
      {catalog.releaseId&&<SatisfactionRating token={createFeedbackToken(catalog.releaseId,scenario.id)}/>}
      <div className="result-gap-actions"><Link href="/plan" className="button button-outline">เริ่มเลือกบริบทใหม่</Link></div>
    </>}
  </main></div>{complete&&item&&scenario&&<PackagePrintablePlan catalog={catalog} scenarios={[scenario]} item={item}/>}</>;
}
