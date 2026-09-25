'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Search, SlidersHorizontal } from 'lucide-react';
import type { Package, Tool } from '@/lib/catalog';

export function ToolBrowser({tools,packages}:{tools:Tool[];packages:Package[]}){
  const [query,setQuery]=useState('');
  const [kind,setKind]=useState('ทั้งหมด');
  const kinds=['ทั้งหมด',...new Set(tools.map(tool=>tool.kind).filter(Boolean))];
  const filtered=useMemo(()=>tools.filter(tool=>(kind==='ทั้งหมด'||tool.kind===kind)&&`${tool.name} ${tool.description} ${tool.activity}`.toLowerCase().includes(query.toLowerCase())),[tools,query,kind]);
  return <><div className="tools-controls"><label className="search-field"><Search size={19}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="ค้นหาชื่อเครื่องมือหรือกิจกรรม" aria-label="ค้นหาเครื่องมือ"/></label><label className="filter-field"><SlidersHorizontal size={17}/><select value={kind} onChange={event=>setKind(event.target.value)} aria-label="กรองประเภทเครื่องมือ">{kinds.map(item=><option key={item}>{item}</option>)}</select></label></div>
    <div className="tools-count">แสดง {filtered.length} จาก {tools.length} เครื่องมือ</div><div className="tool-grid">{filtered.map(tool=><article className="card library-card" key={tool.id}><div className="library-top"><span className="pill">เครื่องมือในคลัง</span><span className="library-kind">{tool.kind}</span></div><h2>{tool.name}</h2><p>{tool.description}</p><div className="library-meta">{tool.activity&&<span>กิจกรรม: {tool.activity}</span>}{tool.packageIds.length>0&&<span>อยู่ในชุดแผน: {tool.packageIds.map(id=>packages.find(item=>item.id===id)?.name).filter(Boolean).join(', ')}</span>}</div><Link className="button button-outline" href={`/tools/card/${encodeURIComponent(tool.id)}`}>ดูรายละเอียด <ArrowRight size={16}/></Link></article>)}</div>{!filtered.length&&<div className="card empty">ไม่พบเครื่องมือที่ตรงกับคำค้น ลองเปลี่ยนคำหรือประเภทเครื่องมือ</div>}</>;
}
