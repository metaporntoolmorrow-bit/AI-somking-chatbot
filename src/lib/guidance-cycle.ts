export const GUIDANCE_SET_COUNT = 20;
const storageKey = 'package-guidance-cycle-v1';
let memoryId = 0;

export function parseGuidanceId(value: unknown): number {
  const id = typeof value === 'string' && /^\d{1,2}$/.test(value) ? Number(value) : value;
  return typeof id === 'number' && Number.isInteger(id) && id >= 1 && id <= GUIDANCE_SET_COUNT ? id : 1;
}

// Only a counter is stored: no answers, personal details, or clinical information.
// A result URL pins its edition, so refreshing or printing does not change the advice.
export function nextGuidanceId(): number {
  let previous = memoryId;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved !== null) previous = parseGuidanceId(saved);
  } catch { /* Storage can be unavailable in private/restricted browsers. */ }
  memoryId = previous % GUIDANCE_SET_COUNT + 1;
  try { window.localStorage.setItem(storageKey, String(memoryId)); } catch { /* Keep the in-memory cycle. */ }
  return memoryId;
}
