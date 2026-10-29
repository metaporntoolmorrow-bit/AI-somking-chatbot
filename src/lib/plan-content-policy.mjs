// Generated advice is withheld until expert-authored content is supplied.
export const PLAN_CONTENT_POLICY = 'context_tools_and_sequence_only';
export const WITHHELD_PLAN_FIELDS = ['cautions','benefits','guidanceNote','guidanceEdition','guidanceVersion','guidanceBasis'];
export const PLAN_GUIDANCE_SOURCES=['user_master_brief_2026_10_29','supplied_component_documents_2026_10_30'];

/** @param {{scenarios:Record<string,unknown>[]}} preset */
export function assertPlanContentPolicy(preset) {
  for (const row of preset.scenarios) {
    if (WITHHELD_PLAN_FIELDS.some(key => Object.hasOwn(row, key)))
      throw new Error('Withdrawn guidance must not be included in a preset or release');
    if (row.implementationGuidance) {
      const guidance=row.implementationGuidance;
      if (!PLAN_GUIDANCE_SOURCES.includes(guidance.source) ||
        !['successFactors','cautions','keyStandards'].every(key => Array.isArray(guidance[key]) && guidance[key].length && guidance[key].every(text => typeof text==='string' && text.length<350)))
        throw new Error('Implementation guidance requires the explicit owner-supplied source and bounded static text');
      if(guidance.source==='supplied_component_documents_2026_10_30'&&(!guidance.items?.length||guidance.items.some(item=>!item.sourcePages?.length||!item.sourceAnchor||!item.tag||![4,5,6].includes(item.sourceSection))))
        throw new Error('Component guidance requires tags, source sections and page references');
    }
  }
}
