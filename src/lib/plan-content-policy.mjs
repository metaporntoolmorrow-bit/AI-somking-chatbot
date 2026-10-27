// Generated advice is withheld until expert-authored content is supplied.
export const PLAN_CONTENT_POLICY = 'context_tools_and_sequence_only';
export const WITHHELD_PLAN_FIELDS = ['cautions','benefits','guidanceNote','guidanceEdition','guidanceVersion','guidanceBasis'];

/** @param {{scenarios:Record<string,unknown>[]}} preset */
export function assertPlanContentPolicy(preset) {
  for (const row of preset.scenarios) {
    if (WITHHELD_PLAN_FIELDS.some(key => Object.hasOwn(row, key)))
      throw new Error('Withdrawn guidance must not be included in a preset or release');
  }
}
