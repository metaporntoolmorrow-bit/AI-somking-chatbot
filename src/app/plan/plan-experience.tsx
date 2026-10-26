'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Leaf } from 'lucide-react';
import type { Package, Scenario } from '@/lib/catalog';
import { emptyAnswers, planFlow, questions, type AnswerKey } from '@/lib/plan-flow';

export function PlanExperience({ scenarios, packages }: { scenarios: Scenario[]; packages: Package[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState(emptyAnswers);
  const [submitting, setSubmitting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const flow = planFlow(scenarios, packages, answers);
  const { current, options, answered, pool: available } = flow;
  const stageIndex = answered.length;

  function chooseSingle(key: Exclude<AnswerKey, 'audienceCodes'>, value: string) {
    const next = { ...answers, [key]: value };
    for (const later of questions.slice(questions.findIndex(q => q.key === key) + 1)) {
      if (later.key === 'audienceCodes') next.audienceCodes = [];
      else next[later.key] = '';
    }
    setAnswers(next);
  }

  function toggleAudience(value: string) {
    setAnswers(previous => ({
      ...previous,
      audienceCodes: previous.audienceCodes.includes(value)
        ? previous.audienceCodes.filter(code => code !== value)
        : [...previous.audienceCodes, value],
    }));
  }

  function goBack() {
    if (!stageIndex) return;
    const previousKey = answered.at(-1)!.stage.key;
    const next = { ...answers, audienceCodes: [...answers.audienceCodes] };
    for (const later of questions.slice(questions.findIndex(q => q.key === previousKey))) {
      if (later.key === 'audienceCodes') next.audienceCodes = [];
      else next[later.key] = '';
    }
    setSubmitting(false);
    setAnswers(next);
  }

  function confirmAudiences() {
    if (!answers.audienceCodes.length || submitting) return;
    const selected = answers.audienceCodes.map(code => available.find(scenario => scenario.audienceCode === code));
    if (selected.some(scenario => !scenario)) return;
    const ids = selected.map(scenario => scenario!.id);
    setSubmitting(true);
    const params = new URLSearchParams({ scenario: ids[0] });
    if (ids.length > 1) params.set('scenarios', ids.join(','));
    router.push(`/result?${params.toString()}`);
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [stageIndex]);

  return <div className="chat-shell">
    <header className="chat-header"><div className="chat-header-inner">
      {stageIndex > 0 ? <button type="button" className="chat-icon-button" onClick={goBack} aria-label="ย้อนกลับไปแก้คำตอบ"><ArrowLeft size={20} /></button> : <Link className="chat-icon-button" href="/" aria-label="กลับหน้าหลัก"><ArrowLeft size={20} /></Link>}
      <div className="chat-identity"><strong>ผู้ช่วยวางแผนพื้นที่ปลอดบุหรี่ไฟฟ้า</strong><span><i />พร้อมช่วยคุณวางแผน</span></div>
      <span className="chat-icon-button" aria-hidden="true"><Leaf size={19} /></span>
    </div></header>
    <div className="chat-stage"><div className="chat-transcript" aria-live="polite">
      <div className="chat-line assistant"><div className="chat-bubble greeting">สวัสดีค่ะ มาช่วยกันวางแผนให้เหมาะกับพื้นที่ของคุณนะคะ</div></div>
      {[...answered, { stage: current, label: '' }].map(({stage,label}, index) => <div className="chat-exchange" key={stage.key}>
        <div className="chat-line assistant"><div className="chat-bubble question"><span>คำถามที่ {index + 1}</span><strong>{stage.question}</strong><small>{stage.hint}</small></div></div>
        {label && <div className="chat-line user"><div className="chat-bubble answer">{label}</div></div>}
      </div>)}
      <div ref={endRef} />
    </div></div>
    <div className="chat-composer"><div className="chat-composer-inner">
      <p className="chat-choice-label">เลือกคำตอบของคุณ <span>{current.key === 'audienceCodes' ? 'เลือกได้หลายข้อ' : 'เลือกได้ 1 ข้อ'}</span></p>
      {options.length ? <div className="chat-options">{options.map(option => {
        const selected = current.key === 'audienceCodes' && answers.audienceCodes.includes(option.value);
        return <button key={option.value} type="button" className={`chat-choice${selected ? ' selected' : ''}`} aria-pressed={current.key === 'audienceCodes' ? selected : undefined} onClick={() => current.key === 'audienceCodes' ? toggleAudience(option.value) : chooseSingle(current.key, option.value)}>{selected && <Check size={16} aria-hidden="true" />}{option.label}</button>;
      })}</div> : <div className="chat-no-options">ยังไม่มีตัวเลือกที่ตรงกับคำตอบก่อนหน้า ลองย้อนกลับไปเลือกใหม่</div>}
      {current.key === 'audienceCodes' && <button type="button" className="chat-confirm" disabled={!answers.audienceCodes.length || submitting} onClick={confirmAudiences}>{submitting ? 'กำลังเปิดแผน...' : `ยืนยันคำตอบ${answers.audienceCodes.length ? ` (${answers.audienceCodes.length})` : ''}`}</button>}
    </div></div>
  </div>;
}
