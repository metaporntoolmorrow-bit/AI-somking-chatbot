import { buildPackageCatalog } from './lib/build-package-catalog.mjs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { release, settings, questions, conversationPolicy, levels, components, roles, audiences, tools, supplementaryTools, packages, rules, hostFor, usagePlanFor, toolCode } from '../presets/real-tools-v1/source-rules.mjs';
import { componentDocuments, frameworkEvidence } from '../presets/real-tools-v1/component-framework.mjs';
import {PLAN_CONTENT_POLICY} from '../src/lib/plan-content-policy.mjs';
import { TOOL_SOURCE_ROOT, TOOL_ASSET_ROOT } from '../src/lib/tool-source-policy.mjs';

const root = process.cwd();
const destination = path.join(root, 'presets', 'real-tools-v1');
const reviewFile = path.join(root, 'preset-new-tools.md');
const posix = file => file.replaceAll('\\','/');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const previous = process.argv.includes('--copy-only') ? JSON.parse(await readFile(path.join(destination,'presets.json'),'utf8')) : null;
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    const file = path.join(dir,entry.name);
    if (entry.isDirectory()) files.push(...await walk(file)); else files.push(file);
  }
  return files.sort();
}
const sourceFiles = await walk(path.join(root,'ชุดเครื่องมือใหม่+track'));
const toolSourceFiles = await walk(path.join(root,TOOL_SOURCE_ROOT));
const tracker = toolSourceFiles.find(file => path.basename(file).startsWith('รายการเครื่องมือ') && file.endsWith('.docx'));
const contentFiles = toolSourceFiles.filter(file => file.startsWith(path.join(root,TOOL_ASSET_ROOT)+path.sep) && path.basename(path.dirname(file)) === 'เครื่องมือหลัก');
if (!tracker || contentFiles.length !== 30) throw new Error('Expected supplied tracker and 30 content files');
const drive = JSON.parse(await readFile(path.join(destination,'drive-links.json'),'utf8'));
const partsFile = path.join(root,'output','pdf','tool15-parts.json');
let parts = [];
try { parts = JSON.parse(await readFile(partsFile,'utf8')); } catch { /* validation below reports the missing split PDF */ }
const assets = [];
for (const file of contentFiles) {
  const fileName = path.basename(file);
  const match = fileName.match(/^\((\d+)(?:-(\d+)|\.(\d+))?\)/);
  if (!match) throw new Error(`Unrecognized source filename: ${fileName}`);
  const numbers = match[2] ? [Number(match[1]),Number(match[2])] : [Number(match[1])];
  const codes = numbers.map(toolCode);
  const bytes = await readFile(file);
  const fileKind = fileName.includes('รายงาน') || fileName.includes('ผลประเมิน') ? (file.endsWith('.png') ? 'infographic' : 'evaluation_report')
    : file.endsWith('.pptx') ? 'presentation' : file.endsWith('.docx') ? 'link_document' : 'tool_document';
  const extension = path.extname(file).toLowerCase();
  const mimeType = ({ '.pdf':'application/pdf', '.png':'image/png', '.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation' })[extension];
  const hosting = bytes.length > release.thresholdBytes ? (bytes.length > 100_000_000 ? 'google_drive_parts' : 'google_drive') : 'bundle';
  const splitParts = hosting === 'google_drive_parts' ? parts : [];
  const downloads = hosting === 'google_drive_parts' ? splitParts.map(part => {
    const uploaded = drive.files.find(row => row.file_name === part.file_name);
    return { title:`คู่มือคณะทำงาน ตอนหน้า ${part.start_page}–${part.end_page} จาก ${splitParts.at(-1)?.end_page} หน้า`, fileName:part.file_name, url:uploaded?.url ?? null, driveFileId:uploaded?.id ?? null, sizeBytes:part.size_bytes, pageRange:[part.start_page,part.end_page], publicAccessVerified:uploaded?.public_access_verified === true };
  }) : hosting === 'google_drive' ? (() => {
    const uploaded = drive.files.find(row => row.file_name === fileName);
    return [{ title:fileName, fileName, url:uploaded?.url ?? null, driveFileId:uploaded?.id ?? null, sizeBytes:bytes.length, publicAccessVerified:uploaded?.public_access_verified === true }];
  })() : [];
  assets.push({ code:`FILE-${String(assets.length+1).padStart(2,'0')}`, toolCodes:codes, fileName, relativePath:posix(path.relative(root,file)), sizeBytes:bytes.length, sha256:digest(bytes), extension, mimeType, fileKind, hosting, downloads });
}
const referenceFiles=componentDocuments.map(document=>{
  const matches=sourceFiles.filter(file=>path.basename(path.dirname(file))==='ไฟล์ข้อมูลองค์ประกอบ'&&path.basename(file).startsWith('องค์ประกอบที่ '+document.number+' ')&&file.endsWith('.pdf'));
  if(matches.length!==1)throw new Error('Expected exactly one background reference '+document.number);
  return matches[0];
});
const conceptName=(await readdir(root)).find(name=>name.endsWith('11.8.69.pdf'));
const outline=sourceFiles.find(file=>path.basename(file).startsWith('โครงร่างการเรียบเรียง 7 มาตรการ')&&file.endsWith('.docx'));
const trackerPdf=toolSourceFiles.find(file=>path.basename(file).startsWith('รายการเครื่องมือ')&&file.endsWith('.pdf'));
if(!conceptName||!outline||!trackerPdf)throw new Error('Missing concept, component outline, or tracker');
const evidenceFiles=[path.join(root,conceptName),tracker,trackerPdf,...referenceFiles,outline];
const sourceEvidence=await Promise.all(evidenceFiles.map(async file=>({relativePath:posix(path.relative(root,file)),sha256:digest(await readFile(file))})));
const sourceTools = tools.map(tool => ({ ...tool, assetCodes:assets.filter(file => file.toolCodes.includes(tool.code)).map(file => file.code), contentLinks:tool.sourceNumber === 4 ? ['https://drive.google.com/drive/folders/1qB-KK6lIX6UUKQhpt8z1NjWCnU2Ev2tS'] : [] }));

await buildPackageCatalog({release:{...release,sourceEvidence,toolAssetRoot:TOOL_ASSET_ROOT,planContentPolicy:PLAN_CONTENT_POLICY},frameworkEvidence,settings,questions,conversationPolicy,levels,components,roles,audiences,tools,supplementaryTools,packages,rules,hostFor,usagePlanFor,assets,sourceTools,tracker,parts,destination,reviewFile,drive,root,previous});
