import {CheckCircle2,ShieldAlert,Flag} from 'lucide-react';
import type {ImplementationGuidance as Guidance} from '@/lib/catalog';

export function ImplementationGuidance({guidance}:{guidance:Guidance}){
  return <div className="implementation-guidance">{[
    {key:'success',title:'ปัจจัยความสำเร็จ',Icon:CheckCircle2,items:guidance.successFactors},
    {key:'cautions',title:'ข้อควรระวัง',Icon:ShieldAlert,items:guidance.cautions},
    {key:'standards',title:'มาตรฐานความสำเร็จ',Icon:Flag,items:guidance.keyStandards},
  ].map(({key,title,Icon,items})=><section key={key} className={`implementation-column ${key}`}><h3><Icon size={20} aria-hidden="true"/>{title}</h3><ul>{items.map(text=><li key={text}>{text}</li>)}</ul></section>)}</div>;
}
