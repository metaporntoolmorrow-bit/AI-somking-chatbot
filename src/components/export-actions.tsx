'use client';

import { Download, Printer } from 'lucide-react';

export function ExportActions({planName,scenarioCode,selection,zipAvailable}:{planName:string;scenarioCode:string;selection?:string;zipAvailable:boolean}){
  function printPlan(){
    const previousTitle=document.title;
    document.title=`แผน${planName.replace(/[\\/:*?"<>|]/g,' ').slice(0,70)}`;
    window.addEventListener('afterprint',()=>{document.title=previousTitle;},{once:true});
    window.print();
  }
  const query=selection?`?scenarios=${encodeURIComponent(selection)}`:'';
  return <div className="export-wrap no-print"><div className="export-buttons"><button type="button" className="button button-dark" onClick={printPlan}><Printer size={17}/> ดาวน์โหลดแผน PDF</button>{zipAvailable&&<a className="button button-dark" href={`/api/tool-bundle/${encodeURIComponent(scenarioCode)}${query}`}><Download size={17}/> ดาวน์โหลดชุดเครื่องมือ ZIP</a>}</div><small>ปุ่ม PDF จะเปิดหน้าต่างพิมพ์ ให้เลือก “บันทึกเป็น PDF”{zipAvailable?' · ZIP รวมเครื่องมือของทุกกลุ่มที่เลือก ไฟล์เกิน 6 MB เปิดจากลิงก์ในไฟล์ข้อความ':''}</small></div>;
}
