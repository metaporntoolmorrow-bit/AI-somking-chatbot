export const contextKeys=['setting','role','targetYouth','goalC'];

/** Filter choices to prefixes that still lead to a supplied package. */
export function availableContextChoices(paths,answers,key,options){
  const preceding=contextKeys.slice(0,contextKeys.indexOf(key));
  const pool=paths.filter(path=>preceding.every(k=>path[k]===answers[k]));
  return options.filter(option=>pool.some(path=>path[key]===option.value));
}
