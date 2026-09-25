'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Leaf } from 'lucide-react';
import type { Package, Scenario } from '@/lib/catalog';

type SingleKey = 'settingCode' | 'packageId' | 'roleCode' | 'level';
type Answers = Record<SingleKey, string> & { audienceCodes: string[] };
type Stage = { key: SingleKey | 'audienceCodes'; question: string; hint: string };
type Option = { value: string; label: string };

const stages: Stage[] = [
  { key: 'settingCode', question: 'คุณทำงานอยู่ในพื้นที่แบบไหน?', hint: 'เลือกคำตอบที่ตรงกับพื้นที่ของคุณ' },
  { key: 'packageId', question: 'อยากเริ่มจากเรื่องไหน?', hint: 'เลือกแนวทางที่เหมาะกับสิ่งที่อยากทำ' },
  { key: 'roleCode', question: 'คุณมีบทบาทอะไรในพื้นที่นี้?', hint: 'เลือกบทบาทที่ใกล้กับงานของคุณที่สุด' },
  { key: 'level', question: 'อยากดูแลเรื่องนี้ในระดับไหน?', hint: 'เลือกเป้าหมายของแผน' },
  { key: 'audienceCodes', question: 'กลุ่มเป้าหมายที่อยากดูแลมีใครบ้าง?', hint: 'เลือกได้หลายข้อ แล้วกดยืนยันคำตอบ' },
];

const settingLabels: Record<string, string> = {
  S1: 'สถานศึกษา',
  S2: 'ครอบครัว / ชุมชน / ระบบสุขภาพ',
  S3: 'สถานประกอบการ',
};

const emptyAnswers = (): Answers => ({
  settingCode: '', packageId: '', roleCode: '', level: '', audienceCodes: [],
});

function distinct(options: Option[]): Option[] {
  return [...new Map(options.map(option => [option.value, option])).values()];
}

export function PlanExperience({ scenarios, packages }: { scenarios: Scenario[]; packages: Package[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [stageIndex, setStageIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const current = stages[stageIndex];

  const available = useMemo(() => scenarios.filter(scenario =>
    (!answers.settingCode || scenario.settingCode === answers.settingCode) &&
    (!answers.packageId || scenario.packageId === answers.packageId) &&
    (!answers.roleCode || scenario.roleCode === answers.roleCode) &&
    (!answers.level || scenario.level === answers.level)
  ), [answers.settingCode, answers.packageId, answers.roleCode, answers.level, scenarios]);

  function optionsFor(key: Stage['key'], pool: Scenario[]): Option[] {
    if (key === 'settingCode') return distinct(pool.map(scenario => ({ value: scenario.settingCode, label: settingLabels[scenario.settingCode] ?? scenario.settingCode })));
    if (key === 'packageId') return distinct(pool.map(scenario => ({ value: scenario.packageId, label: packages.find(item => item.id === scenario.packageId)?.name ?? scenario.packageId })));
    if (key === 'roleCode') return distinct(pool.map(scenario => ({ value: scenario.roleCode, label: scenario.role })));
    if (key === 'level') return distinct(pool.map(scenario => ({ value: scenario.level, label: scenario.level })));
    return distinct(pool.map(scenario => ({ value: scenario.audienceCode, label: scenario.audience })));
  }

  const options = optionsFor(current.key, available);

  function previousAnswer(index: number): string {
    const key = stages[index].key;
    if (key === 'audienceCodes') return optionsFor(key, available).filter(option => answers.audienceCodes.includes(option.value)).map(option => option.label).join(', ');
    const pool = scenarios.filter(scenario =>
      (index < 1 || scenario.settingCode === answers.settingCode) &&
      (index < 2 || scenario.packageId === answers.packageId) &&
      (index < 3 || scenario.roleCode === answers.roleCode)
    );
    return optionsFor(key, pool).find(option => option.value === answers[key])?.label ?? answers[key];
  }

  function chooseSingle(key: SingleKey, value: string) {
    const next: Answers = { ...answers, [key]: value };
    for (const later of stages.slice(stageIndex + 1)) {
      if (later.key === 'audienceCodes') next.audienceCodes = [];
      else next[later.key] = '';
    }
    setAnswers(next);
    setStageIndex(stageIndex + 1);
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
    const previousIndex = stageIndex - 1;
    const next = { ...answers, audienceCodes: [...answers.audienceCodes] };
    for (const later of stages.slice(previousIndex)) {
      if (later.key === 'audienceCodes') next.audienceCodes = [];
      else next[later.key] = '';
    }
    setSubmitting(false);
    setAnswers(next);
    setStageIndex(previousIndex);
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
      {stages.slice(0, stageIndex + 1).map((stage, index) => <div className="chat-exchange" key={stage.key}>
        <div className="chat-line assistant"><div className="chat-bubble question"><span>คำถามที่ {index + 1} จาก {stages.length}</span><strong>{stage.question}</strong><small>{stage.hint}</small></div></div>
        {index < stageIndex && <div className="chat-line user"><div className="chat-bubble answer">{previousAnswer(index)}</div></div>}
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
