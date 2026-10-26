import { settingNames, type Catalog, type Package, type Scenario } from '@/lib/catalog';
import { packageSummary } from '@/lib/package-summary';

export function PackagePrintablePlan({catalog,scenarios,item}:{catalog:Catalog;scenarios:Scenario[];item:Package}){
  const plan=packageSummary(catalog,scenarios);
  const first=scenarios[0];
  return <div className={`print-document${plan.steps.length>9?' print-compact':''}`} aria-hidden="true"><article className="print-sheet">
    <header className="print-heading"><div><h1>{item.name}</h1><p>{item.goal}</p></div><strong>พื้นที่ปลอด<br/>บุหรี่ไฟฟ้า</strong></header>
    <dl className="print-context"><div><dt>พื้นที่</dt><dd>{settingNames[first.settingCode]||item.setting}</dd></div><div><dt>ผู้ร่วมขับเคลื่อน</dt><dd>{first.role}</dd></div><div className="print-audiences"><dt>กลุ่มที่ดูแล</dt><dd>{plan.audiences.join(' · ')}</dd></div></dl>
    <section className="print-sequence"><h2>ลำดับการใช้เครื่องมือ</h2><ol>{plan.steps.map(step=><li key={`${step.rank}-${step.toolCode}`}><span className="print-step-number">{step.order}</span><div><h3>{step.shortTitle}<span> · {step.stage}</span></h3><p>{step.action}</p></div></li>)}</ol></section>
    <div className="print-guidance"><section><h2>ข้อควรระวัง</h2><ul>{plan.cautions.map(text=><li key={text}>{text}</li>)}</ul></section><section><h2>แนวทางการใช้ประโยชน์</h2><ul>{plan.benefits.map(text=><li key={text}>{text}</li>)}</ul></section></div>
    <footer className="print-foot"><p>{plan.guidanceNote}</p><p>ชุดนี้มี {plan.toolIds.length} เครื่องมือ · เปิดไฟล์ต้นฉบับและลิงก์ไฟล์ใหญ่ได้ในชุด ZIP · เครื่องมือเดิมอาจใช้ซ้ำในขั้นทบทวน</p></footer>
  </article></div>;
}
