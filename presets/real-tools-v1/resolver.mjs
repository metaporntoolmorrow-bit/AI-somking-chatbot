// Data-only resolver. No network access, Supabase writes, or production fallback.
export function optionsFor(preset, answers = {}) {
  const keys = ['settingCode', 'packageId', 'roleCode', 'level'];
  let pool = preset.scenarios;
  const options = [];
  for (const [index, key] of keys.entries()) {
    const values = [...new Set(pool.map(row => row.answers[key]))];
    options.push({ order: index + 1, key, selection: 'single', values });
    if (!answers[key]) return options;
    if (!values.includes(answers[key])) throw new Error(`Unsupported answer at ${key}: ${answers[key]}`);
    pool = pool.filter(row => row.answers[key] === answers[key]);
  }
  options.push({ order: 5, key: 'audienceCodes', selection: 'multiple', values: [...new Set(pool.map(row => row.answers.audienceCode))] });
  return options;
}

export function resolvePreset(preset, answers) {
  for (const key of ['settingCode','packageId','roleCode','level']) if (typeof answers[key] !== 'string' || !answers[key]) throw new Error(`Missing ${key}`);
  if (!Array.isArray(answers.audienceCodes) || !answers.audienceCodes.length) throw new Error('Select at least one audience');
  const available = optionsFor(preset, answers).at(-1).values;
  const requested = [...new Set(answers.audienceCodes)];
  for (const code of requested) if (!available.includes(code)) throw new Error(`Unsupported audience: ${code}`);
  const rows = requested.map(audienceCode => {
    const matches = preset.scenarios.filter(row => ['settingCode','packageId','roleCode','level'].every(key => row.answers[key] === answers[key]) && row.answers.audienceCode === audienceCode);
    if (matches.length !== 1) throw new Error(`Expected one exact match, found ${matches.length}`);
    return matches[0];
  });
  const toolCodes = [...new Set(rows.flatMap(row => Object.values(row.tools).flat()))];
  return { release: preset.release.code, scenarioCodes: rows.map(row => row.code), results: rows, toolCodes };
}

export function buildDownloadManifest(preset, answers) {
  const result = resolvePreset(preset, answers);
  const assets = preset.assets.filter(asset => asset.toolCodes.some(code => result.toolCodes.includes(code)));
  const localFiles = assets.filter(asset => asset.hosting === 'bundle').map(asset => ({ assetCode: asset.code, relativePath: asset.relativePath, fileName: asset.fileName, fileKind: asset.fileKind, sizeBytes: asset.sizeBytes }));
  const externalFiles = assets.filter(asset => asset.hosting !== 'bundle').flatMap(asset => asset.downloads.map(download => ({ assetCode: asset.code, toolCodes: asset.toolCodes, ...download })));
  const contentLinks = preset.tools.filter(tool => result.toolCodes.includes(tool.code)).flatMap(tool => tool.contentLinks.map(url => ({ toolCode: tool.code, title: tool.title, url, provider: 'source_document_link' })));
  return { release: result.release, scenarioCodes: result.scenarioCodes, toolCodes: result.toolCodes, localFiles, externalFiles, contentLinks, publicAccessVerified: externalFiles.every(file => file.publicAccessVerified === true) };
}

export function formatDownloadLinks(preset, manifest) {
  const lines = ['ลิงก์ไฟล์เครื่องมือ', 'ไฟล์ขนาดใหญ่เปิดอ่านหรือดาวน์โหลดได้จากลิงก์ด้านล่าง', ''];
  const seenUrls = new Set();
  for (const code of manifest.toolCodes) {
    const tool = preset.tools.find(row => row.code === code);
    const links = manifest.externalFiles.filter(file => file.toolCodes.includes(code) && !seenUrls.has(file.url));
    const resourceLinks = manifest.contentLinks.filter(file => file.toolCode === code && !seenUrls.has(file.url));
    if (!links.length && !resourceLinks.length) continue;
    lines.push(tool.title);
    for (const file of links) { lines.push(`- ${file.title || file.fileName}`, `  ${file.url}`); seenUrls.add(file.url); }
    for (const file of resourceLinks) { lines.push('- ชุดสื่อตามลิงก์ในเอกสารต้นฉบับ', `  ${file.url}`); seenUrls.add(file.url); }
    lines.push('');
  }
  lines.push('ไฟล์ขนาดไม่เกิน 6 MB ที่เกี่ยวข้องรวมอยู่ในโฟลเดอร์ภายใน ZIP นี้');
  if (manifest.toolCodes.includes('MAIN-15')) lines.push('คู่มือคณะทำงานสถานประกอบการฉบับเต็ม แบ่งสำเนาเป็นตอนตามช่วงหน้า โดยรวมครบทุกหน้าต้นฉบับ');
  lines.push('');
  return '\uFEFF' + lines.join('\n');
}
