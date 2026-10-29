import definition from '@/data/intervention-options.json';

export interface UserContextState {
  setting: string;
  role: string;
  targetYouth: string;
  goalC: string;
}
export type ContextKey = keyof UserContextState;
export const contextQuestions = definition.questions as {
  key: ContextKey; question: string; hint: string;
  options: { value: string; label: string; shortLabel?: string; description?: string }[];
}[];
export const emptyContext = (): UserContextState => ({ setting: '', role: '', targetYouth: '', goalC: '' });
export function validContext(value: unknown): value is UserContextState {
  if (!value || typeof value !== 'object') return false;
  return contextQuestions.every(q => q.options.some(o => o.value === (value as UserContextState)[q.key]));
}
export function contextLabels(context: UserContextState) {
  return Object.fromEntries(contextQuestions.map(q => [q.key, q.options.find(o => o.value === context[q.key])?.label || ''])) as Record<ContextKey, string>;
}
export function contextSummary(context: UserContextState) {
  const label = contextLabels(context);
  return `คุณคือ ${label.role} ที่ดำเนินงานใน ${label.setting} เพื่อดูแลกลุ่ม ${label.targetYouth} โดยมีเป้าหมายหลักคือ ${label.goalC}`;
}
export function contextSearch(context: UserContextState) {
  return new URLSearchParams({ ...context }).toString();
}
