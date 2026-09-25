import Link from 'next/link';
import { ArrowLeft, ArrowRight, CalendarDays, CircleAlert, ClipboardList, Leaf, Star } from 'lucide-react';
import { ExportActions } from '@/components/export-actions';
import { PrintablePlan } from '@/components/printable-plan';
import { getPackage, getPublishedCatalog, getScenario, getTool, settingNames } from '@/lib/catalog';
import './result.css';

export const dynamic='force-dynamic';
const periods=['สัปดาห์ที่ 1','สัปดาห์ที่ 2–4','เดือนที่ 2','เดือนที่ 3'];

export default async function ResultPage({searchParams}:{searchParams:Promise<{scenario?:string;scenarios?:string}>}){
  const {scenario:code,scenarios:selection}=await searchParams;
  const catalog=await getPublishedCatalog();
  const scenario=getScenario(catalog,code??'');
  const selectedCodes=[...new Set((selection??'').split(',').filter(Boolean))].slice(0,12);
  const selectedScenarios=scenario&&selectedCodes.includes(scenario.id)
    ? selectedCodes.map(id=>getScenario(catalog,id)).filter((item):item is NonNullable<typeof item>=>Boolean(item)).filter(item=>
      item.settingCode===scenario.settingCode&&item.packageId===scenario.packageId&&item.roleCode===scenario.roleCode&&item.level===scenario.level
    )
    : [];
  const selectedQuery=selectedScenarios.map(item=>item.id).join(',');
  const item=scenario?getPackage(catalog,scenario.packageId):undefined;
  const group=scenario?[['เครื่องมือหลัก',scenario.primaryIds],['เครื่องมือเสริม',scenario.supportIds],['เครื่องมือวัดผล',scenario.measureIds],['ข้อมูลอ้างอิง',scenario.referenceIds]] as const:[];
  const toolIds=scenario?[...scenario.primaryIds,...scenario.supportIds,...scenario.measureIds,...scenario.referenceIds]:[];
  const complete=Boolean(scenario&&item&&scenario.summary&&scenario.role&&scenario.audience&&scenario.phases.length===4&&scenario.steps.length>0&&toolIds.every(id=>getTool(catalog,id))&&(scenario.status!=='support_only'||scenario.host));
  return <><div className="result-screen"><header className="result-appbar"><div className="result-appbar-inner"><span className="result-bot"><Leaf size={26}/></span><div><strong>ผู้ช่วยวางแผนพื้นที่ปลอดบุหรี่ไฟฟ้า</strong><small>แผนสำหรับพื้นที่ของคุณ</small></div><Link href="/plan" aria-label="กลับไปตอบคำถามใหม่"><ArrowLeft size={20}/></Link></div></header><main className="result-body">
    {!scenario||!item?<div className="result-empty"><h1>{catalog.status==='unavailable'?'เชื่อมต่อข้อมูลไม่ได้':'ยังไม่มีแผนที่เผยแพร่สำหรับสถานการณ์นี้'}</h1><p>{catalog.status==='unavailable'?'กรุณาลองใหม่อีกครั้ง':'กลับไปเลือกบริบทจากข้อมูลที่เผยแพร่แล้ว'}</p><Link href="/plan" className="button button-dark">กลับไปเลือกข้อมูล <ArrowRight size={18}/></Link></div>:<>{selectedScenarios.length>1&&<nav className="result-audience-nav" aria-label="เลือกแผนตามกลุ่มเป้าหมาย"><strong>แผนสำหรับกลุ่มที่คุณเลือก</strong><div>{selectedScenarios.map(item=><Link key={item.id} href={`/result?scenario=${encodeURIComponent(item.id)}&scenarios=${encodeURIComponent(selectedQuery)}`} aria-current={item.id===scenario.id?"page":undefined} className={item.id===scenario.id?"active":""}>{item.audience}</Link>)}</div></nav>}
      <section className="result-section"><div className="result-section-heading"><span><ClipboardList size={19}/></span><h2>สถานการณ์ของคุณ</h2></div><p className="situation-box">{scenario.summary}</p><p>{settingNames[scenario.settingCode]??item.setting} · {item.name} · {scenario.role} · {scenario.audience}</p></section>
      {scenario.status==='no_tool'?<div className="result-gap"><CircleAlert size={29}/><h1>ยังไม่มีเครื่องมือที่ตรงกับงานนี้</h1><p>คลังข้อมูลที่เผยแพร่ยังไม่มีเครื่องมือสำหรับสถานการณ์นี้ จึงไม่มีแผนหรือไฟล์ให้ดาวน์โหลด</p></div>:<>
        {scenario.status==='support_only'&&<div className="partial-note"><CircleAlert size={19}/><span>{scenario.host||'เส้นทางนี้ต้องมีผู้รับผิดชอบหลักร่วมดำเนินงาน'}</span></div>}
        <section className="result-section"><div className="result-section-heading"><span><Star size={19}/></span><h2>ชุดเครื่องมือที่แนะนำ</h2></div><div className="recommend-grid">{group.filter(([,ids])=>ids.length).map(([title,ids])=><div className="recommend-card" key={title}><div className="recommend-copy"><span className="recommend-kind">{title}</span><ul>{ids.map(id=>{const tool=getTool(catalog,id);return tool?<li key={id}><Link href={`/tools/card/${encodeURIComponent(id)}`}>{tool.name}</Link>{tool.description&&<p>{tool.description}</p>}</li>:null;})}</ul></div></div>)}</div></section>
        {scenario.phases.length===4&&<section className="result-section"><div className="result-section-heading"><span><CalendarDays size={19}/></span><h2>แผนดำเนินงาน</h2></div><div className="compact-phases">{scenario.phases.map((phase,index)=><div className="compact-phase" key={index}><CalendarDays size={27}/><strong>{periods[index]}</strong><span>{phase}</span></div>)}</div></section>}
        {scenario.steps.length>0&&<details className="result-details"><summary>ดูขั้นตอนทั้งหมด</summary><div className="result-details-body"><ol>{scenario.steps.map(step=><li key={step.order}><b>{step.when}</b> {step.action}</li>)}</ol></div></details>}
        {complete?<ExportActions planName={item.name} scenarioCode={scenario.id} zipAvailable={Boolean(catalog.simulated&&toolIds.length&&toolIds.every(id=>getTool(catalog,id)?.hasSamplePdf))}/>:<div className="notice"><CircleAlert size={17}/> เนื้อหาแผนยังไม่ครบสำหรับพิมพ์หรือบันทึกเป็น PDF กรุณารอผู้ดูแลตรวจสอบข้อมูล</div>}
      </>}
      <div className="result-gap-actions"><Link href="/plan" className="button button-outline">เลือกบริบทใหม่</Link></div>
    </>}
  </main></div>{scenario&&item&&complete&&<PrintablePlan catalog={catalog} scenario={scenario} item={item}/>}</>;
}
