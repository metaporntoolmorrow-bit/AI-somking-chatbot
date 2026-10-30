'use client';

import Link from 'next/link';
import {useRef,useState,type KeyboardEvent,type MouseEvent} from 'react';
import {BarChart3,CalendarDays,Download,ArrowLeft} from 'lucide-react';
import dimensions from '@/data/dashboard-dimensions.json';
import type {DashboardDimension,DashboardPeriod,DashboardReport} from '@/lib/dashboard-types';
import {dashboardExportFilename} from '@/lib/dashboard-export';

const dimensionKeys=Object.keys(dimensions) as DashboardDimension[];
const number=(value:number)=>new Intl.NumberFormat('th-TH').format(value);

export function DashboardView({reports}:{reports:Record<DashboardPeriod,DashboardReport>}){
  const [period,setPeriod]=useState<DashboardPeriod>(30);
  const [dimension,setDimension]=useState<DashboardDimension>('setting');
  const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState(''),[loginRequired,setLoginRequired]=useState(false);
  const tabs=useRef<(HTMLButtonElement|null)[]>([]);
  const report=reports[period];
  async function exportCsv(event:MouseEvent<HTMLAnchorElement>){
    event.preventDefault();if(exporting)return;
    const url=event.currentTarget.href,selectedPeriod=period;
    setExporting(true);setExportError('');setLoginRequired(false);
    try{
      const response=await fetch(url,{cache:'no-store'});
      if(response.status===401){setLoginRequired(true);throw new Error('สิทธิ์เข้าถึงเปลี่ยนไปหรือเซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง');}
      if(!response.ok||!response.headers.get('content-type')?.startsWith('text/csv'))throw new Error('ยังส่งออก CSV ไม่สำเร็จ ลองกดส่งออกอีกครั้งได้ค่ะ');
      const objectUrl=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=objectUrl;link.download=dashboardExportFilename(selectedPeriod);document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),30000);
    }catch(error){setExportError(error instanceof Error?error.message:'ยังส่งออกไม่สำเร็จ กรุณาลองใหม่');}
    finally{setExporting(false);}
  }
  function tabKey(event:KeyboardEvent<HTMLButtonElement>,index:number){
    const next=event.key==='ArrowRight'?(index+1)%4:event.key==='ArrowLeft'?(index+3)%4:event.key==='Home'?0:event.key==='End'?3:undefined;
    if(next===undefined)return;
    event.preventDefault();setDimension(dimensionKeys[next]);tabs.current[next]?.focus();
  }
  return <div className="ssdash-page">
    <header className="ssdash-header ssdash-surface">
      <div className="ssdash-identity"><span className="ssdash-mark" aria-hidden="true"><BarChart3 size={24}/></span><div><h1>แดชบอร์ดภาพรวมโครงการ</h1><p>สำหรับ สสส. · ข้อมูลตัวอย่าง</p></div></div>
      <div className="ssdash-header-actions"><span className="ssdash-date"><CalendarDays size={14} aria-hidden="true"/>ข้อมูลตัวอย่าง ณ 30/10/2569</span><label className="ssdash-sr-only" htmlFor="dashboard-period">ช่วงเวลา</label><select id="dashboard-period" className="ssdash-period" value={period} onChange={event=>setPeriod(Number(event.target.value) as DashboardPeriod)}><option value="30">30 วันล่าสุด</option><option value="14">14 วันล่าสุด</option><option value="7">7 วันล่าสุด</option></select></div>
    </header>
    <section className="ssdash-kpis" aria-label="ตัวชี้วัดหลัก">
      <article className="ssdash-kpi ssdash-surface"><p className="ssdash-kpi-label">อัตราตอบคำถามครบ 4 ข้อ</p><p className="ssdash-kpi-value" data-metric="completion">{report.completionRate.toFixed(1)}%</p><div className="ssdash-meter" aria-hidden="true"><span style={{transform:`scaleX(${report.completionRate/100})`}}/></div><p className="ssdash-kpi-note">ตอบครบ {number(report.completed)} จาก {number(report.started)} ครั้งที่เริ่มใช้งาน</p></article>
      <article className="ssdash-kpi ssdash-surface ssdash-orange"><p className="ssdash-kpi-label">อัตราจับคู่ชุดแผนสำเร็จ</p><p className="ssdash-kpi-value" data-metric="match">{report.matchRate.toFixed(1)}%</p><div className="ssdash-meter" aria-hidden="true"><span style={{transform:`scaleX(${report.matchRate/100})`}}/></div><p className="ssdash-kpi-note">จับคู่ได้ {number(report.matched)} จาก {number(report.completed)} ครั้ง · ยังจับคู่ไม่ได้ {number(report.unmatched)} ครั้ง</p></article>
    </section>
    <section className="ssdash-section ssdash-surface" aria-labelledby="dashboard-demand-title">
      <div className="ssdash-section-header"><div><h2 id="dashboard-demand-title">ผู้ใช้งานคือใคร และต้องการอะไร</h2><p>สรุปความต้องการจากคำตอบ 4 ข้อ</p></div><span className="ssdash-base">ฐาน: {number(report.completed)} ครั้งที่ตอบครบ</span></div>
      <div className="ssdash-tabs" role="tablist" aria-label="ดูคำตอบแต่ละคำถาม">{dimensionKeys.map((key,index)=><button type="button" ref={element=>{tabs.current[index]=element;}} key={key} id={`dashboard-tab-${key}`} role="tab" aria-selected={dimension===key} aria-controls="dashboard-chart-panel" tabIndex={dimension===key?0:-1} onClick={()=>setDimension(key)} onKeyDown={event=>tabKey(event,index)}>{dimensions[key].title}</button>)}</div>
      <div id="dashboard-chart-panel" role="tabpanel" aria-labelledby={`dashboard-tab-${dimension}`} tabIndex={0}>
        <ul className="ssdash-bars" aria-label={`สัดส่วนคำตอบด้าน${dimensions[dimension].title}`}>{report.distributions[dimension].map(bar=><li className="ssdash-bar-row" key={bar.index}><span className="ssdash-bar-label">{bar.label}</span><span className="ssdash-bar-track" aria-hidden="true"><span style={{transform:`scaleX(${bar.percent/100})`}}/></span><span className="ssdash-bar-value"><b>{bar.percent.toFixed(1)}%</b> · {number(bar.count)}</span></li>)}</ul>
      </div>
    </section>
    <section className="ssdash-section ssdash-surface" aria-labelledby="dashboard-contexts-title">
      <div className="ssdash-section-header"><div><h2 id="dashboard-contexts-title">5 บริบทที่มีความต้องการสูงสุด</h2><p>เชื่อมคำตอบทั้ง 4 ข้อ เพื่อเห็นกลุ่มที่ควรให้ความสำคัญ</p></div>{report.completed>0?<a className="ssdash-export" href={`/api/admin/dashboard/export?period=${period}`} download onClick={exportCsv} aria-disabled={exporting} aria-busy={exporting}><Download size={15} aria-hidden="true"/>{exporting?'กำลังเตรียม CSV…':'ส่งออก CSV'}</a>:<button className="ssdash-export" disabled>ส่งออก CSV</button>}</div>
      {exportError&&<p className="ssdash-export-error" role="alert">{exportError}{loginRequired&&<> <Link href="/login?next=%2Fdashboard">เข้าสู่ระบบอีกครั้ง</Link></>}</p>}
      <div className="ssdash-table-scroll" role="region" aria-label="ตารางบริบทความต้องการ เลื่อนด้านข้างเพื่อดูครบ" tabIndex={0}><table><caption className="ssdash-sr-only">บริบทจากข้อมูลตัวอย่างที่ตอบครบทั้ง 4 ข้อ เรียงตามจำนวนครั้งใช้งาน</caption><thead><tr><th scope="col">พื้นที่</th><th scope="col">บทบาทผู้ใช้</th><th scope="col">กลุ่มเยาวชน</th><th scope="col">เป้าหมาย</th><th scope="col">จำนวนครั้ง</th></tr></thead><tbody>{report.contexts.length?report.contexts.map(row=><tr key={[row.setting,row.role,row.youth,row.goal].join('-')}><td>{row.labels.setting}</td><td>{row.labels.role}</td><td>{row.labels.youth}</td><td>{row.labels.goal}</td><td><span className="ssdash-count">{number(row.count)}</span></td></tr>):<tr><td colSpan={5}>ยังไม่มีข้อมูลในช่วงนี้</td></tr>}</tbody></table></div>
      <p className="ssdash-table-note">แสดง {report.contexts.length} จาก {number(report.totalContexts)} บริบท · นับเฉพาะครั้งที่ตอบครบทั้ง 4 ข้อ</p>
    </section>
    <footer className="ssdash-footer"><div><p className="ssdash-example">ข้อมูลตัวอย่างจากม็อกอัป · ยังไม่ใช่สถิติการใช้งานจริง</p><p>{report.startDay}–30 ต.ค. 2569 · หน่วยนับ: ครั้งใช้งาน</p></div><nav aria-label="ทางออกจากแดชบอร์ด"><Link href="/"><ArrowLeft size={14} aria-hidden="true"/>กลับหน้าเว็บ</Link><Link href="/admin">หน้าผู้ดูแล</Link></nav></footer>
    <p className="ssdash-sr-only" role="status" aria-live="polite">ข้อมูลตัวอย่าง {period} วัน ตอบครบ {number(report.completed)} ครั้ง จาก {number(report.started)} ครั้ง จับคู่ได้ {number(report.matched)} ครั้ง</p>
  </div>;
}
