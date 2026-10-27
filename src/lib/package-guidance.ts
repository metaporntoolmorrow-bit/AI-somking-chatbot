import type { Scenario } from './catalog';
import { guidanceForContext } from './package-guidance-core.mjs';

export function packageGuidance(scenarios: Scenario[], edition: number) {
  if (!scenarios.length) return { cautions: [], benefits: [] };
  return guidanceForContext({
    packageId: scenarios[0].packageId,
    audienceCodes: [...new Set(scenarios.map(s => s.audienceCode))],
    toolCodes: [...new Set(scenarios.flatMap(s => [...s.primaryIds, ...s.supportIds, ...s.measureIds, ...s.referenceIds]))],
    edition,
  }) ?? {
    cautions: [...new Set(scenarios.flatMap(s => s.cautions))],
    benefits: [...new Set(scenarios.flatMap(s => s.benefits))],
  };
}
