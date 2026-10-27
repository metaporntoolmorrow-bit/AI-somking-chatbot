// Only the supplied tool database contains distributable package tools.
// Concept/component documents may inform the design, but are not tool assets.
export const TOOL_SOURCE_ROOT = 'ชุดเครื่องมือใหม่+track/ฐานข้อมูลเครื่องมือหลัก(18 ชิ้น)+เสริม(21 ชิ้น)';
export const TOOL_ASSET_ROOT = `${TOOL_SOURCE_ROOT}/เนื้อหาเครื่องมือ`;

/** @param {string} sourcePath */
export function isAllowedToolAsset(sourcePath) {
  const normalized = sourcePath.replaceAll('\\', '/');
  return normalized.startsWith(`${TOOL_ASSET_ROOT}/`)
    && !normalized.split('/').some(part => part === '..' || part === '.');
}

/** @param {{tools:{code:string,category?:string}[],assets:{code:string,relativePath:string,toolCodes:string[]}[],scenarios:{tools:Record<string,string[]>,useSequence:{toolCode:string}[]}[]}} preset */
export function assertToolSourcePolicy(preset) {
  const codes = new Set(preset.tools.map(tool => tool.code));
  for (const tool of preset.tools) {
    if (!/^(MAIN|SUP)-\d{2}$/.test(tool.code) || tool.category === 'component_guidance')
      throw new Error(`Non-tool document in catalog: ${tool.code}`);
    if (!preset.assets.some(asset => asset.toolCodes.includes(tool.code)))
      throw new Error(`Tool has no supplied asset: ${tool.code}`);
  }
  for (const asset of preset.assets) {
    if (!isAllowedToolAsset(asset.relativePath) || !asset.toolCodes.length || asset.toolCodes.some(code => !codes.has(code)))
      throw new Error(`Asset outside the approved tool database: ${asset.code}`);
  }
  for (const row of preset.scenarios) {
    const selected = new Set(Object.values(row.tools).flat());
    if (!selected.size || [...selected].some(code => !codes.has(code)) || row.useSequence.some(step => !selected.has(step.toolCode)))
      throw new Error('Scenario references a non-tool document');
  }
}
