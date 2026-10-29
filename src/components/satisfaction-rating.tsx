'use client';
import {useState,type FormEvent} from 'react';
import {Star,CheckCircle2} from 'lucide-react';

export function SatisfactionRating({token}:{token:string}){
  const [rating,setRating]=useState(0),[comment,setComment]=useState('');
  const [state,setState]=useState<'idle'|'saving'|'saved'>('idle'),[error,setError]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(state!=='idle')return;
    if(!rating){setError('เลือกคะแนนความพึงพอใจ 1–5 ดาวก่อนส่งนะคะ');return;}
    setError('');setState('saving');
    try{
      const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating,comment,token})});
      if(!response.ok){const body=await response.json();throw new Error(body.error||'ยังบันทึกไม่ได้ ลองส่งอีกครั้งนะคะ');}
      setState('saved');
    }catch(e){setError(e instanceof Error?e.message:'ส่งไม่สำเร็จ ลองอีกครั้งนะคะ');setState('idle');}
  }
  if(state==='saved')return <div className="satisfaction-saved" role="status"><CheckCircle2 size={26}/><h2>ขอบคุณที่ช่วยพัฒนาระบบค่ะ</h2><p>บันทึกผลประเมินของคุณแล้ว</p></div>;
  return <form className="satisfaction-form" onSubmit={submit} aria-labelledby="satisfaction-title">
    <h2 id="satisfaction-title">ชุดเครื่องมือนี้ช่วยคุณได้แค่ไหน?</h2><p>ประเมินความพึงพอใจ เพื่อช่วยพัฒนาระบบคลังเครื่องมือ สสส.</p>
    <fieldset disabled={state==='saving'}><legend>เลือกคะแนนความพึงพอใจ 1–5 ดาว</legend><div className="rating-stars">{[1,2,3,4,5].map(value=><label key={value}><input type="radio" name="satisfaction" value={value} checked={rating===value} onChange={()=>setRating(value)} aria-label={`${value} ดาว`}/><Star size={32} aria-hidden="true" fill={value<=rating?'currentColor':'none'}/></label>)}</div></fieldset>
    <label className="feedback-comment" htmlFor="feedback-comment">ข้อเสนอแนะเพิ่มเติม <span>(ไม่จำเป็น)</span></label>
    <textarea id="feedback-comment" value={comment} onChange={e=>setComment(e.target.value)} maxLength={1000} rows={3} placeholder="เล่าให้ฟังว่ามีอะไรที่อยากให้ปรับปรุง…" disabled={state==='saving'} aria-describedby="feedback-privacy"/>
    <small id="feedback-privacy">ไม่ต้องระบุชื่อ ข้อมูลสุขภาพ หรือข้อมูลส่วนตัวของเด็กและเยาวชน</small>
    {error&&<p className="feedback-error" role="alert">{error}</p>}
    <button className="button button-dark" type="submit" disabled={state==='saving'} aria-busy={state==='saving'}>{state==='saving'?'กำลังบันทึก…':'ส่งผลประเมิน'}</button>
  </form>;
}
