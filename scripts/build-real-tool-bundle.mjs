import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { buildDownloadManifest, formatDownloadLinks } from '../presets/real-tools-v1/resolver.mjs';

const root = process.cwd();
const preset = JSON.parse(await readFile(path.join(root,'presets','real-tools-v1','presets.json'),'utf8'));
const outputDir = path.join(root,'output','bundles');
await mkdir(outputDir,{recursive:true});
const flag = name => process.argv[process.argv.indexOf(name)+1];
const selectedCodes = process.argv.includes('--examples')
  ? ['PK-EDU-C2','PK-FAM-TEAM','PK-COM-C3','PK-HEA-QUIT','PK-WRK-SYSTEM'].map(code => preset.scenarios.find(row=>row.packageCode===code).code)
  : [flag('--scenario')];
if (!process.argv.includes('--examples') && !process.argv.includes('--scenario')) throw new Error('Use --scenario REAL-0001 or --examples');
const sourceDir = await realpath(path.join(root,'ชุดเครื่องมือใหม่+track'));
const report = [];
for (const code of selectedCodes) {
  const scenario = preset.scenarios.find(row=>row.code===code);
  if (!scenario) throw new Error(`Unknown scenario ${code}`);
  const answers = {...scenario.answers,audienceCodes:[scenario.answers.audienceCode]};
  const manifest = buildDownloadManifest(preset,answers);
  if (manifest.externalFiles.some(file=>!file.url)) throw new Error('Some Drive files have not been uploaded');
  if (!manifest.publicAccessVerified && !process.argv.includes('--allow-restricted')) throw new Error('Public access to Drive files is not verified. For local review only, add --allow-restricted.');
  const zip = new JSZip();
  const expectedFiles = [];
  for (const file of manifest.localFiles) {
    const actualPath = await realpath(path.resolve(root,file.relativePath));
    if (!actualPath.startsWith(sourceDir+path.sep)) throw new Error('Bundle file is outside the supplied source directory');
    const bytes = await readFile(actualPath);
    if (bytes.length > preset.release.thresholdBytes) throw new Error('Large source file must be a Drive link');
    const asset = preset.assets.find(row=>row.code===file.assetCode);
    if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error('Source changed; rebuild presets');
    const folder = file.fileKind==='evaluation_report' || file.fileKind==='infographic' ? 'ข้อมูลประกอบ' : 'เครื่องมือ';
    const safeName = file.fileName.replace(/[\\/:*?"<>|\u0000-\u001f]/g,' ').trim();
    const archivePath = `${folder}/${safeName}`;
    zip.file(archivePath,bytes);
    expectedFiles.push(archivePath);
  }
  const txt = formatDownloadLinks(preset,manifest);
  zip.file('ลิงก์เครื่องมือ.txt',txt);
  zip.file('รายการชุดเครื่องมือ.txt','\uFEFF'+[scenario.title,`พื้นที่: ${scenario.answerLabels.setting}`,`ผู้ดำเนินการ: ${scenario.answerLabels.role}`,`กลุ่มเป้าหมาย: ${scenario.answerLabels.audience}`,'',...manifest.toolCodes.map(code=>preset.tools.find(row=>row.code===code).title),'','ไฟล์ใหญ่ให้เปิดจาก ลิงก์เครื่องมือ.txt'].join('\n'));
  const bytes = await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
  const filename = `${code}.zip`;
  await writeFile(path.join(outputDir,filename),bytes);
  // Re-open and compare original small-file bytes and TXT content.
  const reopened = await JSZip.loadAsync(bytes,{checkCRC32:true});
  if (await reopened.file('ลิงก์เครื่องมือ.txt').async('string') !== txt) throw new Error('TXT verification failed');
  for (const archivePath of expectedFiles) {
    const bundled = await reopened.file(archivePath).async('nodebuffer');
    const original = manifest.localFiles.find(file=>archivePath.endsWith(file.fileName));
    const asset = preset.assets.find(row=>row.code===original?.assetCode);
    if (!asset || createHash('sha256').update(bundled).digest('hex') !== asset.sha256) throw new Error('Bundled source bytes changed');
  }
  report.push({scenarioCode:code,packageCode:scenario.packageCode,filename,sizeBytes:bytes.length,originalFiles:manifest.localFiles.length,driveLinks:manifest.externalFiles.length,sourceContentLinks:manifest.contentLinks.length,publicAccessVerified:manifest.publicAccessVerified});
}
await writeFile(path.join(outputDir,'bundle-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
