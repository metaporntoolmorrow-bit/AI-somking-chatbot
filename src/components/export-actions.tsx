'use client';

import { Download, Printer } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { TOOL_BUNDLE_FILENAME } from '@/lib/download-names';

export function ExportActions({planName,scenarioCode,selection,zipAvailable,bundleGuide}:{planName:string;scenarioCode:string;selection?:string;zipAvailable:boolean;bundleGuide:string}){
  const [downloading,setDownloading]=useState(false);
  const [downloadError,setDownloadError]=useState('');
  async function downloadZip(event:MouseEvent<HTMLAnchorElement>){
    event.preventDefault();
    if(downloading)return;
    const url=event.currentTarget.href;
    setDownloading(true);setDownloadError('');
    try{
      const {downloadToolBundle}=await import('@/lib/download-tool-bundle');
      await downloadToolBundle(url,bundleGuide);
    }catch{
      setDownloadError('ยังดาวน์โหลดชุดเครื่องมือไม่ได้ ลองกดดาวน์โหลดอีกครั้งนะคะ');
    }finally{setDownloading(false);}
  }
  function printPlan(){
    const previousTitle=document.title;
    document.title=`แผน${planName.replace(/[\\/:*?"<>|]/g,' ').slice(0,70)}`;
    window.addEventListener('afterprint',()=>{document.title=previousTitle;},{once:true});
    window.print();
  }
  const query=selection?`?scenarios=${encodeURIComponent(selection)}`:'';
  return <div className="export-wrap no-print"><div className="export-buttons"><button type="button" className="button button-dark" onClick={printPlan}><Printer size={17}/> ดาวน์โหลดแผน PDF</button>{zipAvailable&&<a className="button button-dark" href={`/api/tool-bundle/${encodeURIComponent(scenarioCode)}${query}`} download={TOOL_BUNDLE_FILENAME} onClick={downloadZip} aria-disabled={downloading} aria-busy={downloading}><Download size={17}/> {downloading?'กำลังเตรียมไฟล์ ZIP...':'ดาวน์โหลดชุดเครื่องมือ ZIP'}</a>}</div>{downloadError&&<p role="alert">{downloadError}</p>}<small>ปุ่ม PDF จะเปิดหน้าต่างพิมพ์ ให้เลือก “บันทึกเป็น PDF”{zipAvailable?' · ZIP รวมเครื่องมือของทุกกลุ่มที่เลือก ไฟล์เกิน 6 MB เปิดจากลิงก์ในไฟล์ข้อความ':''}</small></div>;
}
