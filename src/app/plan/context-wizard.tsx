'use client';

import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft,Leaf} from 'lucide-react';
import {contextQuestions,emptyContext,contextSearch,type ContextKey} from '@/lib/intervention-context';

export function ContextWizard() {
  const router=useRouter();
  const [answers,setAnswers]=useState(emptyContext);
  const [step,setStep]=useState(0);
  const [submitting,setSubmitting]=useState(false);
  const end=useRef<HTMLDivElement>(null);
  const current=contextQuestions[step];
  function choose(key:ContextKey,value:string) {
    if(submitting)return;
    const next={...answers,[key]:value};
    for(const later of contextQuestions.slice(step+1))next[later.key]='';
    setAnswers(next);
    if(step===contextQuestions.length-1){setSubmitting(true);router.push(`/result?${contextSearch(next)}`);}
    else setStep(step+1);
  }
  function back(){if(!step)return;setSubmitting(false);setStep(step-1);}
  useEffect(()=>{end.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'end'});},[step]);
  return <div className="chat-shell">
    <header className="chat-header"><div className="chat-header-inner">
      {step>0?<button type="button" className="chat-icon-button" onClick={back} aria-label="ย้อนกลับไปแก้คำตอบ"><ArrowLeft size={20}/></button>:<Link className="chat-icon-button" href="/" aria-label="กลับหน้าหลัก"><ArrowLeft size={20}/></Link>}
      <div className="chat-identity"><strong>ผู้ช่วยวางแผนพื้นที่ปลอดบุหรี่ไฟฟ้า</strong><span>คำถามที่ {step+1} จาก 4</span></div><Leaf size={20} aria-hidden="true"/>
    </div></header>
    <div className="chat-stage"><div className="chat-transcript" aria-live="polite">
      <div className="chat-line assistant"><div className="chat-bubble greeting">ตอบ 4 คำถามสั้นๆ แล้วมารับชุดเครื่องมือที่ตรงกับพื้นที่ของคุณกันค่ะ</div></div>
      {contextQuestions.slice(0,step+1).map((question,index)=><div className="chat-exchange" key={question.key}>
        <div className="chat-line assistant"><div className="chat-bubble question"><span>คำถามที่ {index+1} จาก 4</span><strong>{question.question}</strong><small>{question.hint}</small></div></div>
        {index<step&&<div className="chat-line user"><div className="chat-bubble answer">{question.options.find(o=>o.value===answers[question.key])?.label}</div></div>}
      </div>)}<div ref={end}/>
    </div></div>
    <div className="chat-composer"><div className="chat-composer-inner">
      <p className="chat-choice-label">เลือกคำตอบของคุณ <span>เลือกได้ 1 ข้อ · เลือกแล้วไปต่อได้เลย</span></p>
      <div className={`chat-options${current.key==='goalC'?' chat-options-goals':''}`}>{current.options.map(option=><button key={option.value} type="button" className="chat-choice" disabled={submitting} onClick={()=>choose(current.key,option.value)}><span>{option.label}{option.description&&<small>{option.description}</small>}</span></button>)}</div>
      {submitting&&<p className="chat-loading" role="status">กำลังจับคู่กับคลังเครื่องมือ… <button type="button" onClick={()=>setSubmitting(false)}>เลือกเป้าหมายใหม่</button></p>}
    </div></div>
  </div>;
}
