import {CheckCircle2,ShieldAlert,Flag} from 'lucide-react';
import type {ImplementationGuidance as Guidance} from '@/lib/catalog';

export function ImplementationGuidance({guidance}:{guidance:Guidance}){
  return <div className="implementation-guidance">{[
    {key:'success',category:'successFactors',title:'ปัจจัยความสำเร็จ',Icon:CheckCircle2,items:guidance.successFactors},
    {key:'cautions',category:'cautions',title:'ข้อควรระวัง',Icon:ShieldAlert,items:guidance.cautions},
    {key:'standards',category:'keyStandards',title:'มาตรฐานความสำเร็จ',Icon:Flag,items:guidance.keyStandards},
  ].map(({key,category,title,Icon,items})=><section key={key} className={`implementation-column ${key}`}><h3><Icon size={20} aria-hidden="true"/>{title}</h3><ul>{items.map(text=>{const item=guidance.items?.find(i=>i.category===category&&i.text===text);return <li key={text}>{item&&<span className="guidance-tag">{item.tag}</span>}<span>{text}</span>{item&&<small className="guidance-reference">หัวข้อ {item.sourceSection} · หน้า {item.sourcePages.join(', ')}</small>}</li>;})}</ul></section>)}</div>;
}
