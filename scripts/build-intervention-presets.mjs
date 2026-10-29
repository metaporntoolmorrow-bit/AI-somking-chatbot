import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import definition from '../src/data/intervention-options.json' with {type:'json'};
import {oldSettings,toolsFor,gapReason,buildUsePlan,implementationGuidance,source} from '../presets/real-tools-v2/authoring.mjs';
import {assertToolSourcePolicy} from '../src/lib/tool-source-policy.mjs';
import {assertPlanContentPolicy} from '../src/lib/plan-content-policy.mjs';
import {componentFor,componentContent} from '../presets/real-tools-v2/component-content.mjs';
import {buildContextNarrative} from '../src/lib/context-narrative.mjs';

const base=JSON.parse(await readFile('presets/real-tools-v1/presets.json','utf8'));
const directory='presets/real-tools-v2';
const componentDirectory='ชุดเครื่องมือใหม่+track/ไฟล์ข้อมูลองค์ประกอบ';
const componentSources=await Promise.all(Object.values(componentContent).map(async c=>{const relativePath=`${componentDirectory}/${c.sourceFile}`;return {code:c.code,relativePath,sha256:createHash('sha256').update(await readFile(relativePath)).digest('hex')};}));
const questions=definition.questions;
const label=(key,value)=>questions.find(q=>q.key===key).options.find(o=>o.value===value).label;
const short=(key,value)=>{const o=questions.find(q=>q.key===key).options.find(o=>o.value===value);return o.shortLabel||o.label;};
const tools=base.tools.map(t=>({...t,scope:Object.fromEntries(Object.entries(t.scope).map(([key,value])=>[Object.keys(oldSettings).find(k=>oldSettings[k]===key),value]))}));
const packages=[],scenarios=[],coverage=[];
const packageTitles={
  'PK7-EDU-C1':'ชุดร่วมกำหนดนโยบายและจัดทีมสถานศึกษา',
  'PK7-EDU-C2':'ชุดออกแบบบทเรียนและกิจกรรมรู้เท่าทันบุหรี่ไฟฟ้า',
  'PK7-EDU-C3':'ชุดเชื่อมสถานศึกษา บ้าน และชุมชนให้เป็นพื้นที่ปลอดภัย',
  'PK7-EDU-C4':'ชุดเสริมพลังแกนนำและกิจกรรมที่เยาวชนร่วมออกแบบ',
  'PK7-EDU-C5':'ชุดประสานสถานศึกษาและครอบครัวเพื่อช่วยเหลือผู้เรียน',
  'PK7-FAM-C3':'ชุดดูแลครอบครัวและบ้านปลอดบุหรี่',
  'PK7-COM-C3':'ชุดชุมชนร่วมสร้างพื้นที่ปลอดบุหรี่',
  'PK7-COM-C5':'ชุดชุมชนประสานบริการช่วยเลิก',
  'PK7-WRK-C3':'ชุดขับเคลื่อนที่ทำงานปลอดบุหรี่ทั้งองค์กร',
  'PK7-HEA-C5':'ชุดจัดระบบเฝ้าระวัง ส่งต่อ และบริการช่วยเลิก'
};
for(const s of questions[0].options)for(const r of questions[1].options)for(const y of questions[2].options)for(const g of questions[3].options){
  const context={setting:s.value,role:r.value,targetYouth:y.value,goalC:g.value};
  const codes=toolsFor(context);
  const packageCode=`PK7-${oldSettings[s.value]}-${g.value.slice(-2).toUpperCase()}`;
  if(!codes.length){coverage.push({...context,status:'no_match',reason:gapReason(context)});continue;}
  const goal=label('goalC',g.value),setting=short('setting',s.value),role=label('role',r.value),audience=label('targetYouth',y.value);
  if(!packages.some(p=>p.code===packageCode)) packages.push({code:packageCode,settingCode:s.value,componentCode:g.value,componentCodes:[g.value],title:packageTitles[packageCode],choiceLabel:goal,goal,mappingBasis:[source,'existing_tracker_and_original_assets']});
  const sequence=buildUsePlan(context,codes,tools);
  const row={code:`REAL4-${String(scenarios.length+1).padStart(4,'0')}`,context,ruleId:packageCode,answers:{settingCode:s.value,roleCode:r.value,audienceCode:y.value,packageId:packageCode,level:g.value==='goal_c5'?'cessation':'prevention'},answerLabels:{setting,role,audience,package:goal,level:g.value==='goal_c5'?'ดูแลช่วยเหลือ':'ป้องกันการเริ่มใช้'},packageCode,componentCode:g.value,componentCodes:[g.value],catalogueStatus:'primary_available',title:packages.find(p=>p.code===packageCode).title,summary:`คุณคือ ${role} ที่ดำเนินงานใน ${label('setting',s.value)} เพื่อดูแลกลุ่ม ${audience} โดยมีเป้าหมายหลักคือ ${goal}`,tools:{primary:codes.filter(c=>c!=='MAIN-07'),supporting:[],measurement:[],reference:codes.filter(c=>c==='MAIN-07')},host:role,useSequence:sequence,implementationGuidance:implementationGuidance(context),phases:[],steps:sequence.map(step=>({order:step.order,when:step.stage,action:step.action,owner:role,tool:step.toolCodes.join(', '),setting})),editorialNote:codes.length<3?'มีเฉพาะไฟล์จริงตามขอบเขตนี้ จึงไม่เพิ่มเครื่องมือเพื่อให้ครบจำนวน':y.value==='youth_university'&&s.value==='setting_school'?'เครื่องมือเป็นแนวทางอ้างอิงทั่วไป ยังไม่มีคู่มืออุดมศึกษาเฉพาะ':y.value==='youth_early'?'สื่อเด็กเล็กต้องตรวจช่วงวัยในต้นฉบับ ไม่ครอบคลุมเด็ก 0–2 ปีโดยอัตโนมัติ':'',mappingBasis:{source,toolFiles:'approved_tool_database_only',crossSetting:['MAIN-11','MAIN-12'].some(c=>codes.includes(c))&&s.value!=='setting_family'?'ประสานครอบครัวร่วมกับผู้รับผิดชอบ ไม่ใช้เป็นคู่มือรักษา':null},sourceReference:base.release.sourceTracker};
  scenarios.push(row);coverage.push({...context,status:'matched',scenarioCode:row.code,packageCode,tools:codes});
}
const data={...base,release:{...base.release,code:'real-tools-2026-10-30-v8',scenarioPrefix:'REAL4',schemaVersion:4,planContentPolicy:'source_component_sop',reviewStatus:'supplied_document_summary',authoringSource:source,componentSources},sourceFramework:{...base.sourceFramework,componentSources},questions,conversationPolicy:{version:'source-sop-filtered-2026-10-30',requiredQuestionKeys:questions.map(q=>q.key),selection:'single',questionCount:4,autoAdvance:true,filterToAvailablePaths:true,generativeAI:false},settings:questions[0].options.map(o=>({code:o.value,label:o.shortLabel||o.label})),roles:questions[1].options.map(o=>({code:o.value,label:o.label})),audiences:questions[2].options.map(o=>({code:o.value,label:o.label})),components:questions[3].options.map(o=>({code:o.value,label:o.label})),packages,tools,scenarios,downloadPolicy:{...base.downloadPolicy,multiAudience:'single_target_youth',bundleIdentity:'package_and_unique_tool_set'}};
for(const row of scenarios){
  const c=componentFor(row.context),sourceFile=componentSources.find(s=>s.code===c.code);
  row.component={code:c.code,number:c.number,name:c.name,purpose:c.purpose,sequenceNote:c.sequenceNote,adaptation:c.adaptation||'',source:{...sourceFile,title:c.sourceFile,pages:[...new Set(row.useSequence.flatMap(s=>s.sourcePages))].sort((a,b)=>a-b)}};
  row.contextNarrative=buildContextNarrative(row.context,packages.find(p=>p.code===row.packageCode),c);
  row.summary=row.contextNarrative.join(' ');
  row.sourceReference={tracker:base.release.sourceTracker,component:row.component.source,sections:[3,4,5,6]};
  const notes=[];
  if(row.context.targetYouth==='youth_university'&&row.context.setting==='setting_school')notes.push('ใช้เป็นแนวทางอ้างอิงร่วมกับทีมอุดมศึกษา ยังไม่มีไฟล์คู่มืออุดมศึกษาเฉพาะ');
  if(row.context.targetYouth==='youth_early')notes.push('สื่อเด็กเล็กต้องตรวจช่วงวัยในต้นฉบับ ไม่ครอบคลุมเด็ก 0–2 ปีโดยอัตโนมัติ');
  if(row.context.targetYouth==='youth_vulnerable'&&row.context.goalC==='goal_c2')notes.push('รายงานเยาวชนชาติพันธุ์เป็นข้อมูลประกอบ ไม่ใช่แบบประเมินเปล่าหรือสื่อที่เหมาะกับทุกกลุ่ม');
  row.editorialNote=notes.join(' · ');
}
assertToolSourcePolicy(data);assertPlanContentPolicy(data);
const answers=new Set();
for(const row of scenarios){
  const key=JSON.stringify(row.context);if(answers.has(key))throw new Error('Ambiguous matching');answers.add(key);
  if(row.useSequence.length!==componentFor(row.context).steps.length)throw new Error('Component roadmap does not match source steps');
  const selected=Object.values(row.tools).flat();
  if(selected.length>5||selected.some(c=>!row.useSequence.some(step=>step.toolCodes.includes(c))))throw new Error('Unreachable or oversized package');
}
const csv=rows=>'\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
await mkdir(directory,{recursive:true});
await writeFile(`${directory}/presets.json`,JSON.stringify(data,null,2)+'\n');
await writeFile(`${directory}/coverage.json`,JSON.stringify(coverage,null,2)+'\n');
await writeFile(`${directory}/tool-registry.json`,JSON.stringify({source,main:tools.map(t=>({id:t.code,type:'main',title:t.title,format:t.kind,trackerScope:t.scope,settings:[...new Set(scenarios.filter(s=>Object.values(s.tools).flat().includes(t.code)).map(s=>s.context.setting))],goals:[...new Set(scenarios.filter(s=>Object.values(s.tools).flat().includes(t.code)).map(s=>s.context.goalC))],bureau:t.source,availability:'available',assetCodes:t.assetCodes})),supplementary:base.supplementaryTools.map(t=>({id:t.code,type:'supplementary',title:t.title,availability:'not_supplied',fileUrl:null,routingEnabled:false}))},null,2)+'\n');
const maxSteps=Math.max(...scenarios.map(row=>row.useSequence.length));
await writeFile(`${directory}/presets.csv`,csv([['เส้นทาง','พื้นที่','บทบาท','กลุ่มเยาวชน','เป้าหมาย','รหัสแพ็กเกจ','องค์ประกอบที่ขับเคลื่อน','สรุปบริบทแบบภาษาคน','เครื่องมือจริงตามลำดับ',...Array.from({length:maxSteps},(_,i)=>`ขั้นที่ ${i+1}: วิธีทำและเป้าหมาย`),'ปัจจัยความสำเร็จ','ข้อควรระวัง','มาตรฐานความสำเร็จ','ที่มาขั้นตอน'],...scenarios.map(row=>[row.code,row.answerLabels.setting,row.answerLabels.role,row.answerLabels.audience,row.answerLabels.package,row.packageCode,`${row.component.number}. ${row.component.name}`,row.contextNarrative.join(' | '),Object.values(row.tools).flat().join(' | '),...Array.from({length:maxSteps},(_,i)=>{const step=row.useSequence[i];return step?`${step.stage}: ${step.action} / เป้าหมาย: ${step.outcome}`:'';}),row.implementationGuidance.successFactors.join(' | '),row.implementationGuidance.cautions.join(' | '),row.implementationGuidance.keyStandards.join(' | '),`${row.component.source.title} หน้า ${row.component.source.pages.join(', ')}`])]));
await writeFile(`${directory}/guidance-tags.csv`,csv([['แท็ก','องค์ประกอบ','หมวด','หัวข้อแท็ก','ข้อความ','หัวข้อในต้นฉบับ','หน้า','ชื่อไฟล์'],...Object.values(componentContent).flatMap(c=>c.guidance.map(item=>[item.id,c.code,item.category,item.tag,item.text,item.category==='successFactors'?4:item.category==='cautions'?5:6,item.sourcePages.join(', '),c.sourceFile]))]));
await writeFile(`${directory}/all-paths.csv`,csv([['พื้นที่','บทบาท','กลุ่มเยาวชน','เป้าหมาย','ผลการจับคู่','แพ็กเกจ','เครื่องมือ','สาเหตุที่ยังไม่มี'],...coverage.map(r=>[label('setting',r.setting),label('role',r.role),label('targetYouth',r.targetYouth),label('goalC',r.goalC),r.status,r.packageCode,r.tools?.join(' | '),r.reason])]));
const summary={release:data.release.code,totalCombinations:coverage.length,matched:scenarios.length,noMatch:coverage.length-scenarios.length,packages:packages.length,tools:tools.length,missingSupplementary:base.supplementaryTools.length,assets:base.assets.length,bundles:new Set(scenarios.map(r=>r.packageCode+'|'+Object.values(r.tools).flat().sort().join(','))).size,sourceHash:createHash('sha256').update(JSON.stringify(base.assets)).digest('hex')};
await writeFile(`${directory}/validation-report.json`,JSON.stringify(summary,null,2)+'\n');
await writeFile(`${directory}/package-summary.csv`,csv([['รหัสแพ็กเกจ','ชื่อแพ็กเกจ','จำนวนเส้นทางคำตอบ','รูปแบบชุดไฟล์'],...packages.map(pkg=>{const rows=scenarios.filter(s=>s.packageCode===pkg.code);return [pkg.code,pkg.title,rows.length,new Set(rows.map(s=>Object.values(s.tools).flat().sort().join(','))).size];})]));
await writeFile(`${directory}/chat-preview.md`,'# ตัวอย่างบทสนทนาและแผนรุ่น 7\n\n'+packages.map(pkg=>{const row=scenarios.find(s=>s.packageCode===pkg.code);return `## ${pkg.title}\n\n`+questions.map((q,i)=>`${i+1}. ${q.question}\n   - ${label(q.key,row.context[q.key])}`).join('\n')+'\n\n'+row.contextNarrative.join('\n')+'\n\nเครื่องมือ: '+Object.values(row.tools).flat().map(c=>tools.find(t=>t.code===c).shortTitle).join(' → ')+'\n\n'+row.useSequence.map(step=>`${step.order}. **${step.stage}** — ${step.action} / เป้าหมาย: ${step.outcome} (หน้า ${step.sourcePages.join(', ')})`).join('\n')+'\n\n**ปัจจัยความสำเร็จ**\n'+row.implementationGuidance.successFactors.map(s=>'- '+s).join('\n')+'\n\n**ข้อควรระวัง**\n'+row.implementationGuidance.cautions.map(s=>'- '+s).join('\n')+'\n\n**มาตรฐานความสำเร็จ**\n'+row.implementationGuidance.keyStandards.map(s=>'- '+s).join('\n')+'\n\n';}).join(''));
await writeFile(`${directory}/README.md`,`# Preset ตามเอกสารองค์ประกอบ 30 ตุลาคม 2569\n\nรุ่น ${data.release.code} — คำถามเลือกตอบทีละข้อ 4 มิติ ไม่มี AI สร้างข้อความสด\n\n- ทั้งหมด ${coverage.length} ชุดคำตอบ จับคู่ได้ ${scenarios.length} ชุด และยังไม่มีไฟล์ที่ตรง ${summary.noMatch} ชุด\n- ${packages.length} แพ็กเกจตามพื้นที่และเป้าหมาย ${summary.bundles} รูปแบบชุดไฟล์\n- ใช้เครื่องมือหลัก 18 ชิ้นและต้นฉบับ 30 ไฟล์เดิม เครื่องมือเสริม 21 ชิ้นยังไม่รวมในผลลัพธ์เพราะยังไม่มีไฟล์\n- เป้าหมาย 3–5 ชิ้นใช้เมื่อมีไฟล์ที่ตรงจริง บางเส้นทางได้ 1–2 ชิ้น ไม่เติมเอกสารองค์ประกอบหรือไฟล์สมมติ\n- ขั้นตอน วิธีทำ เป้าหมาย และแท็กคำแนะนำสรุปจากเอกสารองค์ประกอบทั้ง 5 พร้อมเลขหน้าอ้างอิง ไม่มีการวนคำแนะนำ 20 ชุด และไม่อ้างว่าได้รับการรับรองวิชาการใหม่\n- กลุ่มปฐมวัยรวม 0–6 ปี แต่สื่อจริงไม่ครอบคลุมทุกวัย ต้องตรวจช่วงวัยก่อนใช้ เด็ก 0–2 ปีไม่ใช้โดยอัตโนมัติ\n- บทบาท อสม./บุคลากร รพ.สต. รวมหลายวิชาชีพ แผนบริการจึงระบุให้ผู้มีใบประกอบวิชาชีพใช้แนวทางคลินิก อสม. ทำหน้าที่ประสาน\n\nหน้าแชตบอตกรองคำตอบตามเส้นทางที่มีปลายทางจริงทั้ง 176 ชุด ส่วน 449 ชุดที่ยังไม่มีไฟล์เก็บใน all-paths.csv เพื่อวางแผนเติมคลัง ไม่แสดงเป็นตัวเลือกในแชตบอต\n\nดู presets.csv สำหรับเส้นทางที่จัดแพ็กเกจได้ และ guidance-tags.csv สำหรับแท็กพร้อมที่มา\n\nสร้างใหม่: node scripts/build-intervention-presets.mjs\nนำเข้า: node --env-file=.env.local scripts/release-real-tools.mjs --stage --preset=presets/real-tools-v2/presets.json\n`);
const previewPath=`${directory}/chat-preview.md`;
await writeFile(previewPath,(await readFile(previewPath,'utf8')).trimEnd()+'\n');
console.log(JSON.stringify(summary));
