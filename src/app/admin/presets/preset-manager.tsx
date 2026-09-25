'use client';

import { useState } from 'react';
import { Pencil, Save, X } from 'lucide-react';

export type EditablePackage={id:string;name:string;goal:string;note:string;setting:string;level:string;updatedAt:string};

export function PresetManager({initial,counts,releaseId}:{initial:EditablePackage[];counts:Record<string,number>;releaseId:string}){
  const [items,setItems]=useState(initial);
  const [editing,setEditing]=useState<string|null>(null);
  const [draft,setDraft]=useState({name:'',goal:'',note:''});
  const [message,setMessage]=useState('');
  const [saving,setSaving]=useState(false);
  function start(item:EditablePackage){setEditing(item.id);setDraft({name:item.name,goal:item.goal,note:item.note});setMessage('');}
  async function save(){
    const original=items.find(item=>item.id===editing);
    if(!original||!draft.name.trim()||!draft.goal.trim()||saving)return;
    setSaving(true);setMessage('');
    try{
      const response=await fetch('/api/admin/packages',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({releaseId,code:original.id,title:draft.name,goal:draft.goal,note:draft.note,updatedAt:original.updatedAt})});
      const result=await response.json();
      if(!response.ok){setMessage(result.error??'บันทึกไม่สำเร็จ');return;}
      setItems(items.map(item=>item.id===original.id?{...item,...draft,updatedAt:result.updatedAt}:item));
      setMessage('บันทึกข้อมูลฉบับร่างแล้ว');setEditing(null);
    }catch{setMessage('เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่');}
    finally{setSaving(false);}
  }
  return <>{items.length?<div className="preset-list">{items.map(item=><article className="card preset-row" key={item.id}><span className="pill">ชุดแผน</span><div><h2>{item.name}</h2><p>{item.goal}</p><small>{item.setting} · {item.level} · {counts[item.id]??0} สถานการณ์</small></div><button type="button" className="button button-soft preset-edit" onClick={()=>start(item)}><Pencil size={15}/> แก้ไข</button></article>)}</div>:<div className="card empty">ฉบับร่างนี้ยังไม่มีชุดแผน</div>}
    {editing&&<div className="editor-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setEditing(null);}}><section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title"><div className="editor-header"><div><span className="pill">แก้ไขข้อมูล</span><h2 id="edit-title">แก้ไขชุดแผนฉบับร่าง</h2></div><button type="button" className="icon-button" onClick={()=>setEditing(null)} aria-label="ปิดหน้าต่าง"><X size={20}/></button></div><div className="editor-body"><label><span className="field-label">ชื่อชุดแผน</span><input className="field" value={draft.name} onChange={event=>setDraft({...draft,name:event.target.value})}/></label><label><span className="field-label">เป้าหมาย</span><textarea className="field" rows={4} value={draft.goal} onChange={event=>setDraft({...draft,goal:event.target.value})}/></label><label><span className="field-label">ข้อจำกัด / หมายเหตุ</span><textarea className="field" rows={3} value={draft.note} onChange={event=>setDraft({...draft,note:event.target.value})}/></label><p className="notice">ข้อมูลที่บันทึกยังอยู่ในฉบับร่าง</p></div><div className="editor-actions"><button className="button button-outline" onClick={()=>setEditing(null)}>ยกเลิก</button><button className="button button-dark" onClick={save} disabled={saving||!draft.name.trim()||!draft.goal.trim()}><Save size={16}/> {saving?'กำลังบันทึก…':'บันทึกฉบับร่าง'}</button></div></section></div>}
    {message&&<div className="notice preset-message" role="status">{message}</div>}</>;
}
