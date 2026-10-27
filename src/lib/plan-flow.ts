import type { Package, Scenario } from './catalog';

export const settingNames: Record<string, string> = {
  EDU: 'สถานศึกษา', FAM: 'ครอบครัว', COM: 'ชุมชน', HEA: 'ระบบบริการสุขภาพ', WRK: 'สถานประกอบการ',
  S1: 'สถานศึกษา', S2: 'ครอบครัว / ชุมชน / ระบบสุขภาพ', S3: 'สถานประกอบการ',
};
export const questions = [
  { key: 'settingCode', question: 'คุณอยากเริ่มดูแลปัญหาบุหรี่ไฟฟ้าในพื้นที่ไหน?', hint: 'เลือกพื้นที่ที่จะนำแผนไปใช้จริง' },
  { key: 'roleCode', question: 'คุณจะร่วมดูแลพื้นที่นี้ในบทบาทไหน?', hint: 'เลือกบทบาทที่ใกล้กับงานที่คุณจะทำ' },
  { key: 'packageId', question: 'เรื่องไหนที่คุณอยากเริ่มทำให้เป็นระบบ?', hint: 'เลือกจุดเริ่มต้น แล้วเราจะเรียงเครื่องมือให้ใช้ต่อกัน' },
  { key: 'level', question: 'อยากเน้นป้องกันการเริ่มใช้ หรือช่วยคนที่เริ่มใช้แล้ว?', hint: 'เลือกสถานการณ์ที่ต้องการดูแล' },
  { key: 'audienceCodes', question: 'คุณอยากเริ่มทำงานกับกลุ่มไหนบ้าง?', hint: 'เลือกกลุ่มที่จะทำงานด้วยจริง เลือกได้หลายข้อแล้วกดยืนยัน' },
] as const;
export type AnswerKey = typeof questions[number]['key'];
export type Answers = Record<Exclude<AnswerKey, 'audienceCodes'>, string> & { audienceCodes: string[] };
export const emptyAnswers = (): Answers => ({ settingCode: '', roleCode: '', packageId: '', level: '', audienceCodes: [] });
export function planFlow(scenarios: Scenario[], packages: Package[], input: Answers) {
  const answers = { ...input };
  let pool = scenarios;
  const answered: { stage: typeof questions[number]; label: string }[] = [];
  for (const stage of questions) {
    const key = stage.key;
    const options = [...new Map(pool.map(s => {
      const value = key === 'audienceCodes' ? s.audienceCode : s[key];
      const label = key === 'settingCode' ? settingNames[value] ?? value
        : key === 'roleCode' ? s.role : key === 'audienceCodes' ? s.audience
        : key === 'packageId' ? packages.find(p => p.id === value)?.choiceLabel || packages.find(p => p.id === value)?.name || value : value;
      return [value, { value, label }] as const;
    })).values()];
    if (key === 'level' && options.length === 1) {
      answers.level = options[0].value;
      pool = pool.filter(s => s.level === answers.level);
      continue;
    }
    if (key === 'audienceCodes' || !answers[key]) return { answers, pool, answered, current: stage, options };
    const option = options.find(o => o.value === answers[key]);
    if (!option) return { answers, pool: [], answered, current: stage, options: [] };
    answered.push({ stage, label: option.label });
    pool = pool.filter(s => s[key] === answers[key]);
  }
  throw new Error('Missing audience question');
}
export const scenarioToolIds = (s: Scenario) => [...new Set([...s.primaryIds, ...s.supportIds, ...s.measureIds, ...s.referenceIds])];
export function compatibleSelection(scenarios: Scenario[], code: string, selection?: string | null): Scenario[] {
  const first = scenarios.find(s => s.id === code);
  if (!first) return [];
  const ids = [...new Set([code, ...(selection || '').split(',').filter(Boolean)])];
  if (ids.length > 12) return [];
  const rows = ids.map(id => scenarios.find(s => s.id === id));
  if (rows.some(s => !s || s.settingCode !== first.settingCode || s.packageId !== first.packageId || s.roleCode !== first.roleCode || s.level !== first.level)) return [];
  return rows as Scenario[];
}
