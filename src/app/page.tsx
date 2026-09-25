import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, ClipboardList, HeartHandshake, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { getPublishedCatalog } from '@/lib/catalog';
import './home.css';

export const dynamic='force-dynamic';

const how=[
  {icon:MessageCircle,title:'เล่าบริบทของคุณ',text:'เลือกพื้นที่ บทบาท กลุ่มเป้าหมาย และระดับการทำงานจากคำถามสั้น ๆ'},
  {icon:Sparkles,title:'เลือกชุดกิจกรรมที่เหมาะ',text:'ระบบจับคู่คำตอบกับสถานการณ์ในคลังข้อมูล'},
  {icon:ClipboardList,title:'ดูรายละเอียดแผน',text:'ดูเครื่องมือและขั้นตอน พร้อมตรวจสถานะของข้อมูลก่อนนำไปใช้'},
];
const faq=[
  ['ต้องสมัครสมาชิกก่อนหรือไม่?','การเลือกแผนจากข้อมูลที่เผยแพร่ใช้ได้โดยไม่ต้องเข้าสู่ระบบ'],
  ['แผนที่ได้เป็นคำแนะนำทางการแพทย์หรือไม่?','ไม่ใช่คำวินิจฉัยหรือการรักษา หากต้องการความช่วยเหลือด้านสุขภาพ โปรดติดต่อหน่วยบริการสุขภาพ'],
  ['เลือกชุดเครื่องมืออย่างไร?','ตอบคำถามเกี่ยวกับพื้นที่ บทบาท และกลุ่มที่คุณดูแล ระบบจะแสดงเครื่องมือที่ตรงกับคำตอบ'],
];

export default async function Home(){
  const catalog=await getPublishedCatalog();
  const ready=catalog.status==='ready'&&catalog.scenarios.length>0;
  return <>
    <section className="hero"><div className="container hero-grid"><div className="hero-copy"><span className="eyebrow"><span className="live-dot"/> ตัวช่วยวางแผนสำหรับพื้นที่ของคุณ</span><h1>เปลี่ยนเครื่องมือ<br/>ให้เป็น <em>แผนที่ใช้ได้จริง</em><br/>ในพื้นที่ของคุณ</h1><p>ตอบคำถามเกี่ยวกับบทบาท กลุ่มเป้าหมาย และบริบทของคุณ เพื่อดูชุดกิจกรรมที่ตรงกับงาน</p><div className="hero-actions">{ready?<Link href="/plan" className="button button-dark">เริ่มสร้างแผนของฉัน <ArrowUpRight size={19}/></Link>:<span className="button button-dark" aria-disabled="true">ยังไม่มีแผนที่เผยแพร่</span>}<Link href="#how" className="button button-light">ดูวิธีใช้งาน <ArrowRight size={18}/></Link></div><div className="hero-foot"><span><Check size={16}/> เลือกเครื่องมือตามบริบทของคุณ</span></div></div>
      <div className="hero-visual"><div className="visual-orbit orbit-one"/><div className="visual-orbit orbit-two"/><div className="preview-card"><div className="preview-head"><span className="preview-avatar"><ShieldCheck size={19}/></span><div><strong>สถานะคลังข้อมูล</strong><small>เชื่อมต่อกับ Supabase</small></div></div><div className="preview-result"><div><span className="pill">{catalog.status==='unavailable'?'เชื่อมต่อไม่ได้':ready?'เปิดให้ใช้งาน':'รอเผยแพร่'}</span><h3>{ready?'มีชุดแผนที่พร้อมให้เลือก':'ยังไม่มีชุดแผนที่เผยแพร่'}</h3><p>{ready?`${catalog.packages.length} ชุดแผน · ${catalog.scenarios.length} สถานการณ์ · ${catalog.tools.length} เครื่องมือ`:'ผู้ดูแลกำลังตรวจสอบเนื้อหา ก่อนเปิดให้สร้างแผน'}</p></div><div className="result-icon"><ClipboardList size={26}/></div></div></div></div></div></section>
    {ready&&<section className="stats"><div className="container stats-grid"><div><strong>{catalog.packages.length}</strong><span>ชุดแผนในคลัง</span></div><div><strong>{catalog.scenarios.length}</strong><span>สถานการณ์ที่รองรับ</span></div><div><strong>{catalog.tools.length}</strong><span>เครื่องมือในคลัง</span></div></div></section>}
    <section className="section" id="how"><div className="container"><div className="section-header"><div><p className="section-label">วิธีใช้งาน</p><h2 className="section-title">จากคำถามสั้น ๆ<br/>สู่แผนลงมือทำ</h2></div><p className="section-intro">ข้อมูลมาจากคลังที่แสดงสถานะชัดเจน หากยังไม่มีข้อมูล ระบบจะแจ้งตามตรง</p></div><div className="grid-3 how-grid">{how.map((item,index)=><div className="card how-card" key={item.title}><span className="step-number">0{index+1}</span><span className="how-icon"><item.icon size={28}/></span><h3>{item.title}</h3><p>{item.text}</p></div>)}</div></div></section>
    <section className="section feature-section"><div className="container feature-grid"><div className="feature-copy"><p className="section-label">แผนที่เข้ากับคุณ</p><h2 className="section-title">หนึ่งพื้นที่<br/>หนึ่งแผนที่เข้ากัน</h2><p className="section-intro">เลือกจากบริบทจริงของคุณ แล้วดูข้อมูลที่ระบบรองรับ พร้อมข้อจำกัดของเครื่องมือแต่ละชุด</p><div className="feature-points"><span><Check size={18}/> แยกเครื่องมือหลัก เครื่องมือเสริม และเครื่องมือวัดผล</span><span><Check size={18}/> เห็นขั้นตอนจากข้อมูลในคลัง</span><span><Check size={18}/> แจ้งเมื่อข้อมูลยังไม่พร้อม</span></div>{ready&&<Link href="/plan" className="button button-dark">เริ่มสร้างแผน <ArrowUpRight size={18}/></Link>}</div><div className="feature-panel"><div className="panel-top"><span className="pill">ข้อมูลปัจจุบัน</span></div><h3>{ready?'คลังพร้อมให้เลือก':'กำลังเตรียมคลังข้อมูล'}</h3><p>{ready?'เลือกบริบทเพื่อดูเส้นทางที่ตรงกับงานของคุณ':'เมื่อเนื้อหาได้รับการตรวจและเผยแพร่ รายการจะปรากฏบนเว็บไซต์โดยอัตโนมัติ'}</p></div></div></section>
    <section className="section" id="resources"><div className="container"><div className="section-header"><div><p className="section-label">คลังเครื่องมือ</p><h2 className="section-title">มีเครื่องมือให้เลือก<br/>ตามจังหวะการทำงาน</h2></div><Link href="/tools" className="button button-outline">ดูคลังทั้งหมด <ArrowUpRight size={18}/></Link></div><div className="grid-3 resource-grid"><div className="card resource-card"><span className="resource-icon"><ClipboardList size={26}/></span><h3>เครื่องมือหลัก</h3><p>กิจกรรมที่เป็นแกนของแผน</p></div><div className="card resource-card"><span className="resource-icon"><HeartHandshake size={26}/></span><h3>เครื่องมือเสริม</h3><p>ใช้ประกอบเมื่อมีผู้รับผิดชอบหลัก</p></div><div className="card resource-card"><span className="resource-icon"><ShieldCheck size={26}/></span><h3>วัดผลและทบทวน</h3><p>ใช้ติดตามการทำงานในพื้นที่</p></div></div></div></section>
    <section className="section faq-section" id="faq"><div className="container faq-grid"><div><p className="section-label">เรื่องที่อยากรู้</p><h2 className="section-title">คำถามที่พบบ่อย</h2></div><div className="faq-list">{faq.map(([question,answer])=><details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></div></section>
  </>;
}
