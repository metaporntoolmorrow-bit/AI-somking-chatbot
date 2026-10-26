import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { release, settings, questions, conversationPolicy, levels, components, roles, audiences, tools, supplementaryTools, packages, rules, hostFor, phasesFor, toolCode } from '../presets/real-tools-v1/source-rules.mjs';
import { resolvePreset, optionsFor, buildDownloadManifest, formatDownloadLinks } from '../presets/real-tools-v1/resolver.mjs';
import { conversationState, resolveConversationPreset } from '../presets/real-tools-v1/conversation.mjs';

const root = process.cwd();
const destination = path.join(root, 'presets', 'real-tools-v1');
const reviewFile = path.join(root, 'preset-new-tools.md');
const posix = file => file.replaceAll('\\','/');
const labels = list => new Map(list.map(item => [item.code, item.label]));
const settingLabels = labels(settings), roleLabels = labels(roles), audienceLabels = labels(audiences), levelLabels = labels(levels);
const packageByCode = new Map(packages.map(item => [item.code,item]));
const toolByCode = new Map(tools.map(item => [item.code,item]));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value,null,2) + '\n';
const md = value => String(value ?? '').replaceAll('|','/').replaceAll('\n',' ');
const csv = rows => '\uFEFF' + rows.map(row => row.map(cell => '"' + String(cell ?? '').replaceAll('"','""') + '"').join(',')).join('\r\n') + '\r\n';
const write = (name, content) => writeFile(path.join(destination,name),content,'utf8');
const questionByKey = new Map(questions.map(question => [question.key,question]));
const questionHeader = key => {
  const question = questionByKey.get(key);
  return `${question.askWhen === 'multiple_options' ? 'คำถามเพิ่มเติมเมื่อจำเป็น' : 'คำถาม'}: ${question.text}`;
};
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
const tracker = sourceFiles.find(file => path.basename(file).startsWith('รายการเครื่องมือ') && file.endsWith('.docx'));
const contentFiles = sourceFiles.filter(file => path.basename(path.dirname(file)) === 'เครื่องมือหลัก');
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
const sourceTools = tools.map(tool => ({ ...tool, assetCodes:assets.filter(file => file.toolCodes.includes(tool.code)).map(file => file.code), contentLinks:tool.sourceNumber === 4 ? ['https://drive.google.com/drive/folders/1qB-KK6lIX6UUKQhpt8z1NjWCnU2Ev2tS'] : [] }));

const scenarios = [];
for (const rule of rules) {
  const pkg = packageByCode.get(rule.packageId);
  if (!pkg) throw new Error(`Missing package ${rule.packageId}`);
  for (const roleCode of rule.roleCodes) for (const audienceCode of rule.audienceCodes) {
    const title = pkg.title;
    const roleLabel = roleLabels.get(roleCode), audienceLabel = audienceLabels.get(audienceCode);
    if (!roleLabel || !audienceLabel) throw new Error(`Invalid role or audience in ${rule.id}`);
    const host = hostFor(pkg.settingCode,roleCode);
    const toolSlots = { primary:rule.primary, supporting:rule.supporting, measurement:rule.measurement, reference:rule.reference };
    const phases = phasesFor(pkg,roleLabel,audienceLabel);
    scenarios.push({
      code:`REAL-${String(scenarios.length+1).padStart(4,'0')}`, ruleId:rule.id,
      answers:{ settingCode:pkg.settingCode, packageId:pkg.code, roleCode, level:rule.level, audienceCode },
      answerLabels:{ setting:settingLabels.get(pkg.settingCode), package:pkg.choiceLabel, role:roleLabel, level:levelLabels.get(rule.level), audience:audienceLabel },
      packageCode:pkg.code, componentCode:pkg.componentCode, catalogueStatus:rule.status,
      title:`${title} สำหรับ${audienceLabel}`,
      summary:`${roleLabel}ใน${settingLabels.get(pkg.settingCode)}ต้องการ${title} สำหรับ${audienceLabel} โดยเน้น${levelLabels.get(rule.level)}`,
      tools:toolSlots, host,
      phases, phasePeriodNote:'ช่วงเวลาสัปดาห์ที่ 1 / สัปดาห์ที่ 2–4 / เดือนที่ 2 / เดือนที่ 3 เป็นกรอบจัดแผนที่เสนอใหม่ ปรับตามงานจริง ไม่ใช่ระยะเวลารักษาจากแนวทางวิชาชีพ',
      steps:phases.map((action,index) => ({ order:index+1, when:['สัปดาห์ที่ 1','สัปดาห์ที่ 2–4','เดือนที่ 2','เดือนที่ 3'][index], action, owner:host, tool:[...new Set(Object.values(toolSlots).flat())].join(', '), setting:settingLabels.get(pkg.settingCode) })),
      editorialNote:rule.note, mappingBasis:rule.mappingBasis, reviewStatus:'working_draft',
      sourceReference:{ tracker:posix(path.relative(root,tracker)), trackerPages:[2,3], sourceToolNumbers:[...new Set(Object.values(toolSlots).flat())].map(code => toolByCode.get(code).sourceNumber), note:'Setting และ C.1–C.5 มาจากตารางต้นฉบับ; บทบาท กลุ่มเป้าหมาย ระดับ และการประกอบแพ็กเกจเป็นกฎที่จัดทำเพิ่มจากบริบทไฟล์' },
    });
  }
}
const data = { release:{ ...release, sourceTracker:{ relativePath:posix(path.relative(root,tracker)), sha256:digest(await readFile(tracker)) } }, questions, conversationPolicy, settings, levels, roles, audiences, components, packages, tools:sourceTools, supplementaryTools, assets, scenarios, downloadPolicy:{ thresholdBytes:release.thresholdBytes, largeFiles:'google_drive_links_in_utf8_txt', smallFiles:'original_files_in_zip', largeOriginalPdf:'preserved_locally_with_complete_page_parts_on_drive', zipDelivery:'prebuild_and_serve_from_storage; do_not_buffer_large_zip_through_vercel_function', multiAudience:'one_result_per_audience; union_and_deduplicate_assets_for_a_combined_bundle', driveFolder:drive.folder, publicSharing:drive.sharing } };

// Validate every deterministic answer combination and every prefix of the 5-question flow.
const seen = new Set();
for (const row of scenarios) {
  const key = JSON.stringify(row.answers);
  if (seen.has(key)) throw new Error(`Duplicate path ${key}`);
  seen.add(key);
  const allCodes = Object.values(row.tools).flat();
  if (!allCodes.length) throw new Error(`Empty package ${row.code}`);
  if (row.catalogueStatus === 'primary_available' && !row.tools.primary.length) throw new Error(`Missing main tool ${row.code}`);
  for (const code of allCodes) {
    const tool = toolByCode.get(code);
    if (!tool?.scope[row.answers.settingCode]?.includes(row.componentCode)) throw new Error(`Source scope mismatch ${row.code}: ${code}`);
    if (!assets.some(asset => asset.toolCodes.includes(code))) throw new Error(`Missing original files for ${code}`);
  }
  const result = resolvePreset(data,{...row.answers,audienceCodes:[row.answers.audienceCode]});
  if (result.results.length !== 1 || result.results[0].code !== row.code) throw new Error(`Resolver mismatch ${row.code}`);
  if (!packageByCode.get(row.packageCode).choiceLabel) throw new Error(`Missing conversational option ${row.packageCode}`);
}
const routedTools = new Set(scenarios.flatMap(row => Object.values(row.tools).flat()));
for (const tool of tools) if (!routedTools.has(tool.code)) throw new Error(`No reachable path for ${tool.code}`);
for (const pkg of packages) if (!scenarios.some(row => row.packageCode === pkg.code)) throw new Error(`No route for ${pkg.code}`);
for (const setting of settings) if (!scenarios.some(row => row.answers.settingCode === setting.code)) throw new Error(`No route for ${setting.code}`);
const prefixes = new Map();
for (const row of scenarios) {
  const prefix = Object.fromEntries(['settingCode','packageId','roleCode','level'].map(key=>[key,row.answers[key]]));
  prefixes.set(JSON.stringify(prefix),prefix);
}
let multiAudienceTests = 0;
for (const prefix of prefixes.values()) {
  const available = optionsFor(data,prefix).at(-1).values;
  const result = resolvePreset(data,{...prefix,audienceCodes:available});
  if (result.results.length !== available.length || new Set(result.toolCodes).size !== result.toolCodes.length) throw new Error('Multi-audience resolution mismatch');
  const conversationInput = {...prefix,audienceCodes:available};
  delete conversationInput.level;
  const conversationalResult = resolveConversationPreset(data,conversationInput);
  if (JSON.stringify(conversationalResult.scenarioCodes) !== JSON.stringify(result.scenarioCodes)) throw new Error('Conversation changed multi-audience matches');
  const manifest = buildDownloadManifest(data,{...prefix,audienceCodes:available});
  if (new Set(manifest.localFiles.map(file=>file.assetCode)).size !== manifest.localFiles.length) throw new Error('Duplicate bundle asset');
  multiAudienceTests++;
}
try { resolvePreset(data,{settingCode:'HEA',packageId:'PK-HEA-QUIT',roleCode:'parent',level:'cessation',audienceCodes:['adult_service_users']}); throw new Error('Invalid role accepted'); } catch(error) { if (error.message === 'Invalid role accepted') throw error; }
try { resolvePreset(data,{...scenarios[0].answers,audienceCodes:['not_an_audience']}); throw new Error('Invalid audience accepted'); } catch(error) { if (error.message === 'Invalid audience accepted') throw error; }
const visibleQuestionCounts = [];
for (const row of scenarios) {
  const { level, audienceCode, ...explicit } = row.answers;
  const input = {...explicit,audienceCodes:[audienceCode]};
  const result = resolveConversationPreset(data,input);
  if (result.results[0].code !== row.code || result.conversation.answers.level !== level) throw new Error(`Derived level changed match ${row.code}`);
  visibleQuestionCounts.push(result.conversation.answeredQuestions.length);
}
const levelGroups = new Map([...prefixes.values()].map(prefix => {
  const { level, ...key } = prefix;
  return [JSON.stringify(key),{...key,level}];
}));
let automaticallyDerivedLevelGroups = 0;
for (const group of levelGroups.values()) {
  const { level, ...answers } = group;
  const state = conversationState(data,answers);
  if (state.derivedAnswers.level) {
    if (state.derivedAnswers.level.value !== level || state.nextQuestion?.key !== 'audienceCodes') throw new Error('Invalid conditional question transition');
    automaticallyDerivedLevelGroups++;
  }
}
// Future data may permit both levels. The conditional question must then appear.
const baseline = scenarios[0];
const otherLevel = baseline.answers.level === 'prevention' ? 'cessation' : 'prevention';
const future = {...data,scenarios:[...scenarios,{...baseline,code:'VALIDATION-ONLY',answers:{...baseline.answers,level:otherLevel}}]};
const futureState = conversationState(future,{settingCode:baseline.answers.settingCode,packageId:baseline.packageCode,roleCode:baseline.answers.roleCode});
if (futureState.nextQuestion?.key !== 'level' || futureState.nextQuestion.options.length !== 2) throw new Error('Conditional level question was hidden when two options exist');
const futureResult = resolveConversationPreset(future,{...baseline.answers,level:otherLevel,audienceCodes:[baseline.answers.audienceCode]});
if (futureResult.conversation.answeredQuestions.length !== 5 || futureResult.scenarioCodes[0] !== 'VALIDATION-ONLY') throw new Error('Conditional question did not produce the selected level');
const roleQuestion = conversationState(data,{settingCode:'EDU'}).nextQuestion;
if (roleQuestion.key !== 'roleCode' || roleQuestion.displayOrder !== 2) throw new Error('Role must be asked before package');
const studentChoices = conversationState(data,{settingCode:'EDU',roleCode:'student_leader'}).nextQuestion;
if (studentChoices.key !== 'packageId' || studentChoices.options.some(option=>option.value==='PK-EDU-C1')) throw new Error('Package options were not filtered by role');
const matchFingerprint = preset => digest(JSON.stringify({
  scenarios:preset.scenarios.map(({code,ruleId,answers,packageCode,componentCode,catalogueStatus,tools})=>({code,ruleId,answers,packageCode,componentCode,catalogueStatus,tools})),
  assets:preset.assets.map(({code,toolCodes,sha256,hosting,downloads})=>({code,toolCodes,sha256,hosting,downloads})),
}));
const mappingUnchanged = previous ? matchFingerprint(previous) === matchFingerprint(data) : null;
if (previous && !mappingUnchanged) throw new Error('Copy-only review changed a scenario, tool match, or download asset');
const missingUrls = assets.filter(file => file.hosting !== 'bundle' && (!file.downloads.length || file.downloads.some(download => !download.url)));
const readyUrls = assets.filter(file => file.hosting !== 'bundle').flatMap(file => file.downloads);
const report = { release:release.code, settings:settings.length, questions:questions.length, packages:packages.length, mainTools:tools.length, supplementaryToolsWithoutFiles:supplementaryTools.length, originalAssets:assets.length, smallFiles:assets.filter(file=>file.hosting==='bundle').length, largeOriginalFiles:assets.filter(file=>file.hosting!=='bundle').length, driveFiles:readyUrls.length, answerPaths:scenarios.length, primaryPaths:scenarios.filter(row=>row.catalogueStatus==='primary_available').length, supportingPaths:scenarios.filter(row=>row.catalogueStatus==='support_only').length, multiAudienceGroups:multiAudienceTests, missingDriveUrls:missingUrls.map(file=>file.fileName), publicDriveAccessVerified:readyUrls.length>0 && readyUrls.every(file=>file.publicAccessVerified), productionDatabaseChanged:false, productionDeployed:false };
report.conversation = { mainQuestions:conversationPolicy.requiredQuestionKeys.length, conditionalQuestion:'level', actualVisibleQuestionCounts:[...new Set(visibleQuestionCounts)], groupsChecked:levelGroups.size, automaticallyDerivedLevelGroups, conditionalQuestionFutureCaseVerified:true, mappingUnchanged };
if (process.argv.includes('--require-drive') && missingUrls.length) throw new Error(`Missing Drive URLs: ${report.missingDriveUrls.join('; ')}`);
if (process.argv.includes('--require-public') && !report.publicDriveAccessVerified) throw new Error('Drive folder has not yet been verified as anyone-with-link reader');

const nested = settings.map(setting => ({
  ...setting,
  roles:roles.filter(role=>scenarios.some(row=>row.answers.settingCode===setting.code&&row.answers.roleCode===role.code)).map(role=>({
    ...role,
    packages:packages.filter(pkg=>pkg.settingCode===setting.code&&scenarios.some(row=>row.packageCode===pkg.code&&row.answers.roleCode===role.code)).map(pkg=>({
      code:pkg.code,label:pkg.choiceLabel,resultTitle:pkg.title,
      levels:levels.filter(level=>scenarios.some(row=>row.packageCode===pkg.code&&row.answers.roleCode===role.code&&row.answers.level===level.code)).map(level=>({
        ...level,
        audiences:scenarios.filter(row=>row.packageCode===pkg.code&&row.answers.roleCode===role.code&&row.answers.level===level.code).map(row=>({code:row.answers.audienceCode,label:row.answerLabels.audience,scenarioCode:row.code,packageCode:row.packageCode})),
      })),
    })),
  })),
}));
await mkdir(destination,{recursive:true});
await write('presets.json',json(data));
await write('question-tree.json',json({questions,conversationPolicy,settings:nested}));
await write('validation-report.json',json(report));
await write('presets.csv',csv([['รหัสเส้นทาง',questionHeader('settingCode'),questionHeader('roleCode'),questionHeader('packageId'),questionHeader('level'),questionHeader('audienceCodes'),'เมื่อเลือกคำตอบชุดนี้ จะได้รับแผนอะไร?','รหัสแพ็กเกจ','องค์ประกอบตามเอกสารต้นฉบับ','เครื่องมือหลักที่แนะนำ','เครื่องมือเสริมสำหรับแผนนี้','เครื่องมือที่ใช้ติดตามผล','เอกสารอ่านประกอบ','แผนนี้มีเครื่องมือพร้อมใช้แค่ไหน?','เรื่องที่ควรทราบก่อนนำแผนไปใช้','รหัสกฎสำหรับตรวจย้อนกลับ','ที่มาของการจับคู่','คำตอบเรื่องเป้าหมายของแผนได้มาอย่างไร?'],...scenarios.map(row=>[row.code,row.answerLabels.setting,row.answerLabels.role,row.answerLabels.package,row.answerLabels.level,row.answerLabels.audience,row.title,row.packageCode,row.componentCode,...['primary','supporting','measurement','reference'].map(slot=>row.tools[slot].map(code=>`${code} ${toolByCode.get(code).title}`).join('; ')),row.catalogueStatus==='support_only'?'มีกรอบหรือเครื่องมือประกอบให้ปรับใช้':'มีเครื่องมือหลักสำหรับแนวทางนี้',row.editorialNote,row.ruleId,'พื้นที่และองค์ประกอบจากตาราง; บทบาท/กลุ่มเป้าหมาย/ชุดแผนเป็นการจัดทำเพิ่ม',conversationState(data,{settingCode:row.answers.settingCode,packageId:row.packageCode,roleCode:row.answers.roleCode}).derivedAnswers.level?'ระบบสรุปจากแนวทางที่เลือก จึงไม่ต้องถามซ้ำ':'ผู้ใช้เลือกเมื่อมีแนวทางให้เลือกมากกว่าหนึ่งแบบ'])]));
await write('questions.csv',csv([['ข้อมูลที่ใช้จับคู่ภายในระบบ','คำถามที่แสดงต่อผู้ใช้','คำแนะนำใต้คำถาม','เลือกคำตอบอย่างไร?','ถามเมื่อใด?','หัวคอลัมน์ในตาราง preset'],...questions.map(question=>[question.key,question.text,question.hint,question.selection==='multiple'?'เลือกหลายกลุ่มแล้วกดยืนยัน':'เลือกข้อเดียวแล้วไปต่อทันที',question.askWhen==='multiple_options'?'ถามเมื่อมีเป้าหมายให้เลือกมากกว่าหนึ่งแบบ; ถ้ามีแบบเดียวระบบสรุปให้':'ถามทุกเส้นทาง',questionHeader(question.key)])]));
await write('tools-and-files.csv',csv([['รหัสเครื่องมือ','ลำดับต้นฉบับ','ชื่อเครื่องมือ','พื้นที่และองค์ประกอบจากตาราง','ไฟล์ต้นฉบับ','ชนิดไฟล์','ขนาด MB','วิธีส่ง','ลิงก์ Drive / ชุดสื่อ','ข้อสังเกต'],...sourceTools.flatMap(tool=>assets.filter(asset=>asset.toolCodes.includes(tool.code)).map(asset=>[tool.code,tool.sourceNumber,tool.title,Object.entries(tool.scope).map(([setting,codes])=>`${settingLabels.get(setting)} ${codes.join('/')}`).join('; '),asset.fileName,asset.fileKind,(asset.sizeBytes/1_000_000).toFixed(2),asset.hosting,asset.downloads.map(item=>item.url??'รออัปโหลด').concat(tool.contentLinks).join('\n'),tool.editorialNote]))]));
await write('supplementary-not-supplied.csv',csv([['ลำดับ','รหัส','ชื่อ','สถานะต้นฉบับ','ไฟล์','ใช้ในเส้นทาง'],...supplementaryTools.map(tool=>[tool.sourceNumber,tool.code,tool.title,tool.sourceStatus,'ยังไม่มีในโฟลเดอร์ที่ส่งมา','ยังไม่เปิดใช้'])]));
await write('all-paths.md','# ตารางจับคู่จากข้อมูลครบ 5 ด้าน\n\nบทสนทนามี 4 คำถามหลัก และถามเรื่องเป้าหมายเพิ่มเฉพาะเมื่อมีมากกว่าหนึ่งตัวเลือก หนึ่งแถวคือหนึ่งผลลัพธ์ต่อกลุ่มที่เลือก\n\n| รหัส | '+['settingCode','roleCode','packageId','level','audienceCodes'].map(questionHeader).map(md).join(' | ')+' | เครื่องมือที่แนะนำ (หลัก / เสริม / วัดผล / อ่านประกอบ) |\n|---|---|---|---|---|---|---|\n'+scenarios.map(row=>'| '+[row.code,row.answerLabels.setting,row.answerLabels.role,row.answerLabels.package,row.answerLabels.level,row.answerLabels.audience,['primary','supporting','measurement','reference'].map(slot=>row.tools[slot].join(',')||'–').join(' / ')].map(md).join(' | ')+' |').join('\n')+'\n');
const questionsReview = [
  ['คุณทำงานอยู่ในพื้นที่แบบไหน?',questionByKey.get('settingCode'),'ไม่ควรสมมติว่าทุกคนเข้ามาในฐานะคนทำงาน คนในครอบครัวก็เริ่มสร้างแผนได้'],
  ['อยากเริ่มจากเรื่องไหน?',questionByKey.get('packageId'),'ระบุให้ชัดว่าต้องการเริ่มทำอะไรในพื้นที่ และแสดงตัวเลือกเป็นสิ่งที่ผู้ใช้อยากทำ แยกจากชื่อแพ็กเกจผลลัพธ์'],
  ['คุณมีบทบาทอะไรในพื้นที่นี้?',questionByKey.get('roleCode'),'ถามบทบาทที่จะใช้ทำแผนรอบนี้ เพราะคนเดียวอาจเป็นทั้งครู ผู้ปกครอง หรือแกนนำ'],
  ['อยากดูแลเรื่องนี้ในระดับไหน?',questionByKey.get('level'),'คำว่าระดับกำกวม และในข้อมูลปัจจุบันเป้าหมายถูกกำหนดจากแนวทางที่เลือกแล้ว จึงไม่ควรให้กดตอบซ้ำ'],
  ['กลุ่มเป้าหมายที่อยากดูแลมีใครบ้าง?',questionByKey.get('audienceCodes'),'ใช้ภาษาที่พูดถึงคนที่อยากดูแลโดยตรง แทนคำเรียกแบบเอกสารโครงการ และคงการเลือกหลายกลุ่ม'],
];
await write('question-copy-review.md',`# ผลทบทวนคำถามและภาษาใน preset

โครงข้อมูล 5 ด้านยังใช้จับคู่ได้ แต่ไม่จำเป็นต้องให้ผู้ใช้ตอบครบ 5 คำถามทุกครั้ง ตอนแรกคงโครงเดิมตามข้อกำหนดให้ถาม 5 ข้อ เมื่อทบทวนกับชุดเครื่องมือใหม่ พบว่าบางคำถามควรปรับถ้อยคำและบางข้อควรถามตามเงื่อนไข

ตรวจจาก ${packages.length} แพ็กเกจ ${scenarios.length} เส้นทาง และ ${levelGroups.size} ชุดคำตอบพื้นที่–บทบาท–เรื่องที่อยากทำ พบว่า ${automaticallyDerivedLevelGroups} ชุดมีเป้าหมายให้เลือกเพียงแบบเดียว จึงข้ามคำถามเรื่องเป้าหมายได้ในข้อมูลชุดนี้ โดยระบบยังเก็บค่า prevention/cessation ไว้จับคู่เหมือนเดิม

## คำถามที่เสนอให้ใช้

| เดิม | ปรับเป็น | เหตุผล |
|---|---|---|
${questionsReview.map(([old,question,reason])=>`| ${md(old)} | ${md(question.text)}${question.askWhen==='multiple_options'?' (ถามเมื่อยังเลือกได้หลายทาง)':''} | ${md(reason)} |`).join('\n')}

## ลำดับที่ผู้ใช้เห็น

${questions.filter(question=>question.askWhen==='always').map((question,index)=>`${index+1}. ${question.text}`).join('\n')}

ถามบทบาทก่อนเรื่องที่อยากทำ เพื่อกรองให้เห็นเฉพาะแนวทางที่บทบาทนั้นมีส่วนทำได้ตามกฎปัจจุบัน ลดกรณีเลือกเรื่องไปแล้วแต่ไม่มีบทบาทของตัวเองให้เลือก

หลังเลือกเรื่องที่อยากทำ หากยังมีเป้าหมายให้เลือกหลายแบบ จะแทรกคำถาม “${questionByKey.get('level').text}” ก่อนถามคนที่อยากดูแล แต่ข้อมูลปัจจุบันไม่จำเป็นต้องแสดงคำถามนี้ ส่วนตัวเลือกแบบคำตอบเดียวเลือกแล้วไปต่อได้ทันที และการเลือกหลายกลุ่มมีปุ่มยืนยันตามเดิม

อย่าแสดงเลขตายตัวว่า “คำถามที่ 5 จาก 5” ให้เรียงเลขจากคำถามที่แสดงจริง เพราะแต่ละเส้นทางอาจถามไม่เท่ากัน

หลักการถามเฉพาะข้อมูลที่ต้องใช้และไม่ให้ตอบข้อมูลเดิมซ้ำสอดคล้องกับ [GOV.UK Design System: Question pages](https://design-system.service.gov.uk/patterns/question-pages/) การเลือกถ้อยคำภาษาไทยในไฟล์นี้เป็นข้อเสนอจากบริบทโครงการ ยังไม่ได้ทดสอบความเข้าใจกับผู้ใช้จริง

## หัวคอลัมน์ CSV ควรใช้ประโยคเต็มหรือไม่

หัวเดิม เช่น “ข้อ1 พื้นที่” และ “ข้อ4 ระดับ” เป็นชื่อคอลัมน์ย่อสำหรับคนตรวจข้อมูล ไม่ใช่ประโยคที่แชตบอตบนเว็บไซต์กำลังแสดง เว็บไซต์ปัจจุบันกำหนดคำถามใน src/app/plan/plan-experience.tsx และอ่านข้อมูลแผนจาก Supabase ไม่ได้อ่านหัว CSV โดยตรง

ในไฟล์ที่ต้องใช้ตรวจบทสนทนา ควรเปลี่ยนหัวคอลัมน์เป็นคำถามเต็มเพื่อให้ทุกคนเห็นคำถามเดียวกับที่จะใช้จริง พร้อมระบุคอลัมน์เป้าหมายว่าเป็นคำถามเพิ่มเติมเมื่อจำเป็น การเปลี่ยนชื่อคอลัมน์ไม่ควรทำให้ความหมายของรหัสหรือการจับคู่เปลี่ยน

ตัวเลือกควรสั้นพอให้กดเลือกได้ ไม่ต้องเป็นประโยคยาวทุกข้อ คำตอบอย่าง “สถานศึกษา”, “ผู้ปกครอง” และ “นักเรียนมัธยม” อ่านเป็นธรรมชาติอยู่แล้วเมื่ออยู่ใต้คำถามเต็ม จึงคงความกระชับไว้ ส่วนตัวเลือกเรื่องที่อยากทำเปลี่ยนเป็น “อยาก...” เพื่อแยกจากชื่อแพ็กเกจที่ได้รับ

ตัวอย่าง: คำถาม “${questionByKey.get('packageId').text}” → ตัวเลือก “อยากจัดการเรียนรู้เรื่องบุหรี่ไฟฟ้า” → ผลลัพธ์ “จัดการเรียนรู้และกิจกรรมรู้เท่าทันบุหรี่ไฟฟ้า”

## ไฟล์ที่ใช้ตรวจและเชื่อมต่อ

- questions.csv: คำถามเต็ม คำแนะนำ วิธีเลือก และเงื่อนไขการถาม
- presets.csv: คำตอบครบทุกเส้นทาง พร้อมระบุว่าเป้าหมายมาจากระบบสรุปหรือผู้ใช้เลือก
- chat-preview.md: ตัวอย่างบทสนทนาครบทั้ง 5 พื้นที่
- source-rules.mjs: ต้นทางคำถามและตัวเลือก แก้แล้วสร้าง CSV/JSON ใหม่จากที่เดียว
- conversation.mjs: ตัวช่วยข้ามคำถามที่ซ้ำ แต่ยังคืนคำตอบครบ 5 ด้านสำหรับ resolver เดิม

การปรับรอบนี้อยู่ในไฟล์ preset และตัวช่วยเตรียมเชื่อมต่อ เว็บไซต์จริงจะใช้ข้อความและพฤติกรรมชุดนี้เมื่อเชื่อมข้อมูลรุ่นใหม่เข้ากับหน้าแชตบอตแล้ว
`);
const previewCodes = ['PK-EDU-C2','PK-FAM-HOME','PK-COM-C3','PK-HEA-QUIT','PK-WRK-SYSTEM'];
const preview = previewCodes.map(packageCode=>{
  const row=scenarios.find(item=>item.packageCode===packageCode);
  const {audienceCode,...input}=row.answers;
  const state=conversationState(data,{...input,audienceCodes:[audienceCode]});
  const dialogue=state.answeredQuestions.map(question=>{
    const answers=Array.isArray(question.answer)?question.answer:[question.answer];
    return `**ผู้ช่วย:** ${question.text}\n\n**คุณ:** ${question.options.filter(option=>answers.includes(option.value)).map(option=>option.label).join(', ')}`;
  }).join('\n\n');
  return `## ตัวอย่างใน${row.answerLabels.setting}\n\n${dialogue}\n\n**แผนที่ได้รับ:** ${row.title}\n\nระบบสรุปเป้าหมายเป็น “${row.answerLabels.level}” จากเรื่องที่เลือก จึงไม่ถามซ้ำ\n`;
}).join('\n');
await write('chat-preview.md',`# ตัวอย่างบทสนทนาที่เสนอ\n\nตัวอย่างจาก preset ใหม่ครบ 5 พื้นที่ ใช้อ่านทวนภาษาก่อนเชื่อมเข้าหน้าเว็บจริง ตัวเลือกเดี่ยวเลือกแล้วไปต่อ ส่วนคำถามคนที่อยากดูแลเลือกได้หลายกลุ่มและมีปุ่มยืนยัน\n\n${preview}`);
const packageRows=packages.map(pkg=>{const rows=scenarios.filter(row=>row.packageCode===pkg.code);return `| ${pkg.code} | ${settingLabels.get(pkg.settingCode)} | ${pkg.title} | ${pkg.componentCode} | ${rows.length} | ${[...new Set(rows.flatMap(row=>Object.values(row.tools).flat()))].join(', ')} |`;});
const mainGuide=`# Preset ชุดเครื่องมือจริง - ฉบับจัดทำเพื่อเชื่อมต่อ\n\nสร้างจากไฟล์รายการเครื่องมือหลัก 18 ชิ้นและเสริม 21 ชิ้น กับไฟล์เนื้อหา 30 ไฟล์ที่ส่งมา คงคำถามเดิม 5 ข้อ แยกพื้นที่เป็น 5 แบบ ได้ ${scenarios.length} เส้นทาง และ ${packages.length} แพ็กเกจ\n\nไฟล์นี้เป็นชุดข้อมูลเตรียมใช้งานแยกจาก production ยังไม่มีการเปลี่ยน Supabase หรือ deploy เว็บไซต์\n\n## เปิดไฟล์ไหน\n\n- [ตารางทุกเส้นทาง CSV](presets/real-tools-v1/presets.csv): เปิดด้วย Excel ได้ หนึ่งแถวมีคำตอบครบ 5 ข้อและแพ็กเกจที่ได้\n- [ตารางทุกเส้นทาง Markdown](presets/real-tools-v1/all-paths.md): อ่านใน IDE ได้ทันที\n- [ต้นไม้คำถาม JSON](presets/real-tools-v1/question-tree.json): แสดงตัวเลือกที่จะปรากฏหลังตอบแต่ละข้อ\n- [Preset JSON](presets/real-tools-v1/presets.json): ชุดข้อมูลครบทั้งคำถาม ชุดแผน เครื่องมือ ไฟล์ และเส้นทาง\n- [เครื่องมือโยงไฟล์ CSV](presets/real-tools-v1/tools-and-files.csv): สร้างจากไฟล์เดิมโดยอัตโนมัติ ไม่ต้องจัดไฟล์ใหม่\n- [เครื่องมือเสริมที่ยังไม่มีไฟล์](presets/real-tools-v1/supplementary-not-supplied.csv)\n- [ลิงก์ Google Drive](presets/real-tools-v1/google-drive-links.txt)\n- [ผลตรวจข้อมูล](presets/real-tools-v1/validation-report.json)\n\n## คำถามและพฤติกรรม\n\n${questions.map(q=>`${q.order}. ${q.text} — ${q.selection==='multiple'?'เลือกหลายข้อและมีปุ่มยืนยัน':'เลือกข้อเดียวแล้วไปต่อทันที'}`).join('\n')}\n\nข้อ 1 มี: ${settings.map(item=>item.label).join(' / ')}\n\nข้อ 2–5 แสดงเฉพาะตัวเลือกที่มีเส้นทางไปต่อจริง ไม่สร้างทุกคำตอบแบบคูณไขว้โดยไม่มีเครื่องมือรองรับ เมื่อเลือกหลายกลุ่ม ระบบคืนแผนแยกตามกลุ่ม และรวมไฟล์ที่ซ้ำเพียงครั้งเดียวเมื่อทำ ZIP รวม\n\n## แพ็กเกจที่จัดทำ\n\n| รหัส | พื้นที่ | เรื่อง | องค์ประกอบ | เส้นทาง | เครื่องมือที่อาจใช้ |\n|---|---|---|---|---:|---|\n${packageRows.join('\n')}\n\n## ความสัมพันธ์จากต้นฉบับและส่วนที่จัดทำเพิ่ม\n\n- รายชื่อเครื่องมือ พื้นที่ และ C.1–C.5 ถอดจากตารางรายการใหม่\n- บทบาท กลุ่มเป้าหมาย ระดับการดูแล การประกอบแพ็กเกจ และกรอบแผน 4 ช่วง จัดทำเป็นกฎเพิ่มจากบริบทของเครื่องมือ ไม่ได้อ้างว่าตารางต้นฉบับกำหนดครบแล้ว\n- ทุกเส้นทางมี ruleId และ mappingBasis ให้ตรวจย้อนกลับได้ และสถานะ working_draft ในไฟล์ข้อมูล\n- ข้อ 4 ใช้ไฟล์ DOCX ที่มีอยู่พร้อมลิงก์ในเอกสาร ไม่สร้างเนื้อหาชุดสื่อแทนต้นฉบับ\n- ข้อ 7 ใช้รายงานและภาพสรุปเป็นข้อมูลอ้างอิง ไม่แสดงเป็นแบบประเมินเปล่าที่ไม่มีไฟล์\n- เส้นทางอุดมศึกษา ${scenarios.filter(row=>row.answers.audienceCode==='university').length} เส้นทางใช้กรอบอ้างอิงจากข้อ 1 และระบุ support_only เพราะยังไม่พบคู่มืออุดมศึกษาแยกในไฟล์ที่แนบ\n- เส้นทางครอบครัวและสถานประกอบการระดับดูแลผู้ใช้แล้ว เน้นสื่อสารและจัดระบบสนับสนุน ไม่สร้างคำแนะนำรักษา\n- แนวทางเครื่องมือ 17–18 จับคู่กับบทบาทบุคลากรวิชาชีพที่เกี่ยวข้อง; บทบาท อสม. หรือผู้ปกครองไม่ได้รับเส้นทางปฏิบัติการรักษา\n- เครื่องมือเสริม 21 รายการไม่มีไฟล์ จึงเก็บไว้ในตารางอ้างอิงและปิด routingEnabled\n\n## การใช้ไฟล์และดาวน์โหลด\n\nเกณฑ์ 6 MB ใช้ 6,000,000 bytes ไฟล์ไม่เกินเกณฑ์ ${report.smallFiles} ไฟล์รวมต้นฉบับใน ZIP; ไฟล์ใหญ่ ${report.largeOriginalFiles} ไฟล์ใช้ลิงก์ Google Drive ในไฟล์ TXT การแยกประเภทไฟล์เป็นรายการภายในระบบจากโฟลเดอร์เดิม ผู้ใช้ไม่ต้องจัดส่งใหม่\n\nคู่มือคณะทำงาน 384,746,926 bytes เกินช่องทางอัปโหลด Drive plugin 100 MB จึงทำสำเนาแบ่งเป็น 6 ตอน หน้า 1–40, 41–80, 81–120, 121–160, 161–200, 201–224 เก็บต้นฉบับไว้และไม่แก้ข้อความ\n\nลิงก์ใน Google Drive อัปโหลดด้วยบัญชี metaporn.toolmorrow@gmail.com สถานะการเข้าถึงสาธารณะ: ${report.publicDriveAccessVerified?'ตรวจแล้วว่าเปิดอ่านผ่านลิงก์ได้':'ยังต้องตั้งค่าโฟลเดอร์เป็นทุกคนที่มีลิงก์/ผู้มีสิทธิ์อ่าน ก่อนใช้กับผู้ใช้เว็บทั่วไป'}\n\nสร้าง ZIP ล่วงหน้าแล้วเก็บใน Storage ให้ดาวน์โหลดโดยตรง เพราะแม้ไฟล์เดี่ยวจะไม่เกิน 6 MB แต่ ZIP รวมอาจเกินขนาดคำตอบของฟังก์ชันเว็บ ไม่ใส่ไฟล์ใหญ่ไว้ใน Git หรือ deployment\n\n## วิธีตรวจและสร้างซ้ำ\n\n\`node scripts/build-real-tool-presets.mjs --require-drive\`\n\nตรวจการเข้าถึงสาธารณะเพิ่มเติมเมื่อแชร์แล้ว: \`node scripts/build-real-tool-presets.mjs --require-drive --require-public\`\n\nตัวอย่าง resolve คำตอบอยู่ใน presets/real-tools-v1/README.md และสคริปต์สร้างชุด ZIP อยู่ที่ scripts/build-real-tool-bundle.mjs\n\n## ขอบเขตการเชื่อมเว็บรอบถัดไป\n\nนำเข้าเป็น content release ใหม่ เปลี่ยนส่วนอ่านข้อมูลและการดาวน์โหลดให้รองรับหลายไฟล์และลิงก์ TXT แล้วทดสอบใน Preview ก่อนสลับรุ่น production ไม่เขียนทับรหัสและไฟล์ของรุ่นเดิม รหัสชุดใหม่นี้ใช้ REAL-/MAIN-/PK- เพื่อให้แยกจาก SC-/T/IP เดิมอย่างชัดเจน ต้องปรับการตรวจรหัสใน API ตอนเชื่อมต่อจริง\n\nหน้าเว็บปัจจุบันยังไม่อ่านไฟล์ชุดนี้ การเพิ่มไฟล์และลิงก์ครั้งนี้จึงเป็นการเตรียมข้อมูลและตัวสร้างแพ็กเกจ ยังไม่ทำให้เมนู 5 พื้นที่บน production เปลี่ยนทันที\n`;
const actualPartRanges = parts.map(part => `${part.start_page}–${part.end_page}`).join(', ');
const mainQuestionSection = `## คำถามและพฤติกรรม\n\nเก็บข้อมูลที่ใช้จับคู่ครบ 5 ด้าน แต่มี 4 คำถามหลัก โดยใช้ถ้อยคำใหม่ดังนี้\n\n${questions.filter(question=>question.askWhen==='always').map((question,index)=>`${index+1}. ${question.text} — ${question.selection==='multiple'?'เลือกหลายกลุ่มแล้วกดยืนยัน':'เลือกข้อเดียวแล้วไปต่อ'}`).join('\n')}\n\nหลังตอบเรื่องบทบาท ถ้ายังเลือกเป้าหมายของแผนได้มากกว่าหนึ่งแบบ จึงถามเพิ่มว่า “${questionByKey.get('level').text}” ข้อมูลปัจจุบันทั้ง ${levelGroups.size} ชุดคำตอบสรุปเป้าหมายได้แล้ว จึงไม่ต้องถามข้อนี้ซ้ำ\n\nข้อเรื่องพื้นที่มี: ${settings.map(item=>item.label).join(' / ')}\n\nแสดงเฉพาะตัวเลือกที่มีเส้นทางไปต่อจริง เมื่อเลือกหลายกลุ่ม ระบบคืนแผนแยกตามกลุ่มและรวมไฟล์ที่ซ้ำเพียงครั้งเดียว หัวคอลัมน์ CSV ใช้คำถามเต็ม โดยคอลัมน์เป้าหมายระบุว่าเป็นคำถามเพิ่มเติมเมื่อจำเป็น และไม่ยึดเลขคำถาม 1–5 เป็นเลขที่ต้องแสดงบนหน้าจอ\n\nอ่าน [ผลทบทวนคำถาม](presets/real-tools-v1/question-copy-review.md), [คำถามและเงื่อนไข CSV](presets/real-tools-v1/questions.csv) และ [ตัวอย่างบทสนทนา 5 พื้นที่](presets/real-tools-v1/chat-preview.md)\n\n`;
const updatedGuide = mainGuide
  .replace('คงคำถามเดิม 5 ข้อ','เก็บโครงข้อมูล 5 ด้านและปรับเป็น 4 คำถามหลักพร้อมคำถามเพิ่มเมื่อจำเป็น')
  .replaceAll('คำตอบครบ 5 ข้อ','ข้อมูลครบ 5 ด้าน')
  .replace(/## คำถามและพฤติกรรม[\s\S]*?(?=## แพ็กเกจที่จัดทำ)/u,mainQuestionSection)
  .replace('หลังตอบเรื่องบทบาท ถ้ายังเลือก','หลังเลือกเรื่องที่อยากทำ ถ้ายังเลือก')
  .replace('6 ตอน หน้า 1–40, 41–80, 81–120, 121–160, 161–200, 201–224', `${parts.length} ตอน หน้า ${actualPartRanges}`);
await writeFile(reviewFile,updatedGuide,'utf8');
await write('README.md',`# ใช้งาน preset ชุดเครื่องมือจริง\n\nอ่านภาพรวมที่ [preset-new-tools.md](../../preset-new-tools.md) และแก้กฎที่ source-rules.mjs แล้วสร้างข้อมูลซ้ำด้วย node scripts/build-real-tool-presets.mjs\n\n\`\`\`js\nimport { readFile } from 'node:fs/promises';\nimport { resolvePreset, buildDownloadManifest, optionsFor } from './presets/real-tools-v1/resolver.mjs';\nconst preset = JSON.parse(await readFile('./presets/real-tools-v1/presets.json','utf8'));\nconst answers = { settingCode:'EDU', packageId:'PK-EDU-C2', roleCode:'teacher', level:'prevention', audienceCodes:['primary_lower','primary_upper'] };\nconst result = resolvePreset(preset,answers); // แผนแยกสองกลุ่ม\nconst files = buildDownloadManifest(preset,answers); // ไฟล์เดียวกันรวมครั้งเดียว\nconst next = optionsFor(preset,{settingCode:'FAM'});\n\`\`\`\n\nคำตอบไม่ครบหรือชุดคำตอบที่ไม่รองรับจะได้ error โดยไม่แอบเลือกเส้นทางใกล้เคียงแทน\n\nสร้าง ZIP ตัวอย่าง: node scripts/build-real-tool-bundle.mjs --scenario ${scenarios[0].code}\n\nสถานะ working_draft หมายถึงกฎบทบาทและการประกอบแผนจัดทำใหม่จากบริบท ไม่ได้เปลี่ยนสถานะรับรองเนื้อหาใน production อัตโนมัติ\n`);
const allManifest={release:release.code,toolCodes:tools.map(item=>item.code),externalFiles:assets.filter(file=>file.hosting!=='bundle').flatMap(asset=>asset.downloads.map(download=>({toolCodes:asset.toolCodes,...download}))),contentLinks:sourceTools.flatMap(tool=>tool.contentLinks.map(url=>({toolCode:tool.code,url}))) };
const existingReadme = await readFile(path.join(destination,'README.md'),'utf8');
await write('README.md',existingReadme+`\n## บทสนทนาที่ปรับแล้ว\n\nดู questions.csv และ chat-preview.md สำหรับข้อความที่ผู้ใช้เห็น โครงจับคู่ยังเก็บคำตอบ 5 ด้าน แต่ question level มี askWhen=multiple_options จึงไม่ต้องให้ผู้ใช้กดซ้ำเมื่อมีเป้าหมายแบบเดียว\n\n\`\`\`js\nimport { conversationState, resolveConversationPreset } from './presets/real-tools-v1/conversation.mjs';\nconst input = { settingCode:'EDU', packageId:'PK-EDU-C2', roleCode:'teacher', audienceCodes:['primary_lower','primary_upper'] };\nconst state = conversationState(preset,input); // เติม level ให้จากทางเลือกที่มีจริง\nconst result = resolveConversationPreset(preset,input); // ผลลัพธ์เดิมสองกลุ่ม\nconst next = conversationState(preset,{settingCode:'FAM'}).nextQuestion;\n\`\`\`\n\nหน้าเว็บที่เชื่อมภายหลังควรอ่าน choiceLabel เป็นตัวเลือกเรื่องที่อยากทำ และ title เป็นชื่อแพ็กเกจผลลัพธ์ อย่านำหัวคอลัมน์ CSV ไปแสดงเป็นคำถามโดยตรง และให้นับเฉพาะคำถามที่แสดงจริง\n`);
await write('google-drive-links.txt',formatDownloadLinks(data,allManifest));
console.log(JSON.stringify(report));
