// Presentation of the existing five answer fields as four main questions plus
// a conditional level question. Matching rules and scenario IDs are unchanged.
import { resolvePreset } from './resolver.mjs';

function choices(preset, key, values) {
  if (key === 'packageId') return values.map(value => {
    const pkg = preset.packages.find(item => item.code === value);
    return { value, label: pkg.choiceLabel || pkg.title };
  });
  const dictionary = ({ settingCode:preset.settings, roleCode:preset.roles, level:preset.levels, audienceCodes:preset.audiences })[key];
  return values.map(value => ({ value, label:dictionary.find(item => item.code === value).label }));
}

export function conversationState(preset, input = {}) {
  const answers = { ...input };
  let pool = preset.scenarios;
  const asked = [];
  const derivedAnswers = {};
  for (const question of [...preset.questions].sort((a,b) => a.order-b.order)) {
    const multiple = question.selection === 'multiple';
    const answerKey = multiple ? 'audienceCode' : question.key;
    const values = [...new Set(pool.map(row => row.answers[answerKey]))];
    if (!values.length) throw new Error('No supported path for the preceding answers');
    const provided = answers[question.key];
    if (!multiple && question.askWhen === 'multiple_options' && values.length === 1) {
      if (provided !== undefined && provided !== values[0]) throw new Error(`Unsupported answer at ${question.key}`);
      answers[question.key] = values[0];
      derivedAnswers[question.key] = { value:values[0], reason:'Only one valid value remains after the preceding answers.' };
      pool = pool.filter(row => row.answers[answerKey] === values[0]);
      continue;
    }
    const entry = { ...question, displayOrder:asked.length+1, options:choices(preset,question.key,values) };
    if (provided === undefined || provided === '' || (multiple && Array.isArray(provided) && !provided.length)) {
      return { complete:false, answers, derivedAnswers, answeredQuestions:asked, nextQuestion:entry };
    }
    if (multiple) {
      if (!Array.isArray(provided) || provided.some(value => !values.includes(value))) throw new Error('Unsupported audience selection');
      answers[question.key] = [...new Set(provided)];
    } else {
      if (!values.includes(provided)) throw new Error(`Unsupported answer at ${question.key}`);
      pool = pool.filter(row => row.answers[answerKey] === provided);
    }
    asked.push({ ...entry, answer:answers[question.key] });
  }
  return { complete:true, answers, derivedAnswers, answeredQuestions:asked, nextQuestion:null };
}

export function resolveConversationPreset(preset, input) {
  const state = conversationState(preset,input);
  if (!state.complete) throw new Error(`Missing answer for ${state.nextQuestion.key}`);
  return { ...resolvePreset(preset,state.answers), conversation:state };
}
