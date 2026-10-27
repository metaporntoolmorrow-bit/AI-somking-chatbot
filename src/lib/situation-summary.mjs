/** @param {string[]} values @param {string} conjunction */
function joinChoices(values, conjunction) {
  const choices = [...new Set(values.map(value => value.trim()).filter(Boolean))];
  if (choices.length < 2) return choices[0] || '';
  return `${choices.slice(0, -1).join(', ')} ${conjunction} ${choices.at(-1)}`;
}

/**
 * A deterministic sentence made only from labels of selected answers.
 * Team size, duration and automatically derived answers are not inputs.
 * @param {{role:string,setting:string,purpose:string,audiences:string[]}} answers
 * @returns {string}
 */
export function situationSummary({role, setting, purpose, audiences}) {
  const roleText = joinChoices(role.split('/'), 'หรือ');
  const intent = purpose.trim().replace(/^อยาก\s*/u, '');
  const targets = joinChoices(audiences, 'และ');
  return `${roleText} ใน${setting} ต้องการ${intent} โดยมีกลุ่มเป้าหมายเป็น${targets}`;
}
