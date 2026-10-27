import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { resolvePreset, buildDownloadManifest } from '../../presets/real-tools-v1/resolver.mjs';
import { conversationState } from '../../presets/real-tools-v1/conversation.mjs';
import {writePackageSummaryArtifacts} from './write-package-summary.mjs';
import {assertPlanContentPolicy,PLAN_CONTENT_POLICY} from '../../src/lib/plan-content-policy.mjs';
import {assertToolSourcePolicy} from '../../src/lib/tool-source-policy.mjs';

const hash=s=>createHash('sha256').update(s).digest('hex');
const json=d=>JSON.stringify(d,null,2)+'\n';
const csv=rows=>'\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';
const md=s=>String(s??'').replaceAll('|','/').replaceAll('\n',' ');
export async function buildPackageCatalog(c){
  const {release,settings,questions,conversationPolicy,levels,components,roles,audiences,tools,supplementaryTools,packages,rules,hostFor,usagePlanFor,assets,sourceTools,tracker,destination,reviewFile,drive,root}=c;
  const label=(list,code)=>list.find(x=>x.code===code)?.label;
  const scenarios=[];
  for(const rule of rules){
    const pkg=packages.find(p=>p.code===rule.packageId);
    if(!pkg)throw new Error('Unknown package '+rule.packageId);
    for(const roleCode of rule.roleCodes)for(const audienceCode of rule.audienceCodes){
      const role=label(roles,roleCode),audience=label(audiences,audienceCode),setting=label(settings,pkg.settingCode);
      if(!role||!audience)throw new Error('Unknown answer');
      const slots={primary:rule.primary,supporting:rule.supporting,measurement:rule.measurement,reference:rule.reference};
      const plan=usagePlanFor(pkg,slots);
      const host=hostFor(pkg.settingCode,roleCode);
      scenarios.push({code:`${release.scenarioPrefix||'REAL2'}-${String(scenarios.length+1).padStart(4,'0')}`,ruleId:rule.id,
        answers:{settingCode:pkg.settingCode,packageId:pkg.code,roleCode,level:rule.level,audienceCode},
        answerLabels:{setting,package:pkg.choiceLabel,role,level:label(levels,rule.level),audience},
        packageCode:pkg.code,componentCode:pkg.componentCode,componentCodes:pkg.componentCodes,catalogueStatus:rule.status,
        title:pkg.title,summary:`${role}ต้องการ${pkg.goal} สำหรับ${audience}ใน${setting}`,
        tools:slots,host,...plan,phases:[],
        steps:plan.useSequence.map(s=>({order:s.order,when:s.stage,action:s.action,owner:host,tool:s.shortTitle,setting})),
        editorialNote:rule.note,mappingBasis:rule.mappingBasis,collaborationBridges:rule.bridges,reviewStatus:'editorial_design',
        sourceReference:{tracker:path.relative(root,tracker).replaceAll('\\','/'),trackerPages:[2,3],sourceToolNumbers:[...new Set(Object.values(slots).flat())].map(code=>tools.find(t=>t.code===code).sourceNumber),backgroundComponents:c.frameworkEvidence?.referenceDocuments.filter(doc=>pkg.componentCodes.includes(doc.componentCode))??[],conceptPages:c.frameworkEvidence?.conceptPages??[],note:'ชื่อและขอบเขตเครื่องมือยึดตารางและไฟล์ในฐานข้อมูลเครื่องมือเท่านั้น เอกสารองค์ประกอบเป็นข้อมูลประกอบการออกแบบ ไม่ใช่เครื่องมือหรือไฟล์แจก'},
      });
    }
  }
  const data={release:{...release,sourceTracker:{relativePath:path.relative(root,tracker).replaceAll('\\','/'),sha256:hash(await readFile(tracker))}},sourceFramework:c.frameworkEvidence,questions,conversationPolicy,settings,levels,roles,audiences,components,packages,tools:sourceTools,supplementaryTools,assets,scenarios,
    downloadPolicy:{thresholdBytes:release.thresholdBytes,largeFiles:'google_drive_links_in_utf8_txt',smallFiles:'original_files_in_zip',zipDelivery:'prebuilt_private_storage_signed_redirect',bundleIdentity:'package_and_unique_tool_set',orderedGuide:'00-start-here-and-numbered-tool-folders',multiAudience:'one_combined_summary_and_deduplicated_bundle',driveFolder:drive.folder},
  };
  assertToolSourcePolicy(data);
  assertPlanContentPolicy(data);
  const seen=new Set();
  for(const row of scenarios){
    const key=JSON.stringify(row.answers);if(seen.has(key))throw new Error('Duplicate answers');seen.add(key);
    const codes=[...new Set(Object.values(row.tools).flat())];
    if(!codes.length)throw new Error('Empty package '+row.code);
    if(!row.useSequence.length)throw new Error('Missing use plan');
    for(const code of codes){
      const tool=tools.find(t=>t.code===code),pkg=packages.find(p=>p.code===row.packageCode);
      if(!tool||!assets.some(a=>a.toolCodes.includes(code)))throw new Error('Missing source file '+code);
      const scoped=tool.scope[row.answers.settingCode]?.some(component=>pkg.componentCodes.includes(component));
      if(!scoped&&!row.collaborationBridges[code])throw new Error('Unexplained cross-setting use '+code);
      if(!row.useSequence.some(s=>s.toolCode===code))throw new Error('Tool has no usage step '+code);
    }
    if(row.useSequence.some(s=>!codes.includes(s.toolCode)))throw new Error('Step references unselected tool');
    const result=resolvePreset(data,{...row.answers,audienceCodes:[row.answers.audienceCode]});
    if(result.scenarioCodes[0]!==row.code)throw new Error('Match failed');
    const conversation=conversationState(data,{...row.answers,level:undefined,audienceCodes:[row.answers.audienceCode]});
    if(!conversation.complete||conversation.answeredQuestions.length!==4)throw new Error('Unexpected conversation');
  }
  for(const tool of tools)if(!scenarios.some(s=>Object.values(s.tools).flat().includes(tool.code)))throw new Error('Unreachable tool '+tool.code);
  // A real manual can support different goals. Distinct goals must have distinct
  // use plans; never add a non-tool document just to make their file sets differ.
  const goalSets=new Map();let sharedFileGoalRoutes=0;
  for(const row of scenarios){
    const a=row.answers,key=[a.settingCode,a.roleCode,a.audienceCode,[...new Set(Object.values(row.tools).flat())].sort().join(',')].join('|');
    const previous=goalSets.get(key)||[];
    for(const prior of previous)if(prior.packageCode!==row.packageCode){
      if(JSON.stringify(prior.useSequence)===JSON.stringify(row.useSequence))throw new Error('Duplicate goals with identical use plans');
      sharedFileGoalRoutes++;
    }
    previous.push(row);goalSets.set(key,previous);
  }
  const groups=new Map();for(const row of scenarios){const a=row.answers,key=[a.settingCode,a.roleCode,a.packageId,a.level].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
  const bundles=new Set();let selections=0;
  for(const rows of groups.values())for(let mask=1;mask<2**rows.length;mask++){
    const selected=rows.filter((_,i)=>mask&(1<<i)),answers={...selected[0].answers,audienceCodes:selected.map(s=>s.answers.audienceCode)};
    const manifest=buildDownloadManifest(data,answers);if(new Set(manifest.localFiles.map(f=>f.assetCode)).size!==manifest.localFiles.length)throw new Error('Duplicate ZIP asset');
    bundles.add(answers.packageId+'|'+[...manifest.toolCodes].sort().join(','));selections++;
  }
  const publicDriveAccessVerified=assets.every(a=>a.downloads.every(d=>d.url&&d.publicAccessVerified));
  if(process.argv.includes('--require-drive')&&assets.some(a=>a.hosting!=='bundle'&&(!a.downloads.length||a.downloads.some(d=>!d.url))))throw new Error('Missing Drive URL');
  if(process.argv.includes('--require-public')&&!publicDriveAccessVerified)throw new Error('Unverified Drive link');
  if(c.previous){const fingerprint=p=>hash(JSON.stringify({scenarios:p.scenarios.map(s=>({code:s.code,answers:s.answers,tools:s.tools})),assets:p.assets.map(a=>({code:a.code,sha256:a.sha256,hosting:a.hosting,downloads:a.downloads}))}));if(fingerprint(c.previous)!==fingerprint(data))throw new Error('Copy-only mode changed routing or source files');}
  const report={release:release.code,settings:settings.length,packages:packages.length,mainTools:tools.filter(t=>t.category==='main').length,componentDocumentsAsTools:0,backgroundEvidenceDocuments:release.sourceEvidence.length,answerPaths:scenarios.length,contextGroups:groups.size,audienceSelections:selections,bundleCombinations:bundles.size,singleToolPaths:scenarios.filter(s=>new Set(Object.values(s.tools).flat()).size===1).length,sharedFileGoalRoutes,duplicateGoalsWithIdenticalUsePlans:0,originalAssets:assets.length,smallFiles:assets.filter(a=>a.hosting==='bundle').length,largeOriginalFiles:assets.filter(a=>a.hosting!=='bundle').length,publicDriveAccessVerified,maximumSteps:Math.max(...scenarios.map(s=>s.useSequence.length)),planContentPolicy:PLAN_CONTENT_POLICY};
  await mkdir(destination,{recursive:true});const lockedExports=[];
  const write=async(name,content)=>{
    try{await writeFile(path.join(destination,name),content,'utf8');return name;}
    catch(error){
      if(error.code!=='EBUSY'||!name.endsWith('.csv')||!process.argv.includes('--locked-csv-copy'))throw error;
      const alternative=name.replace(/\.csv$/,'-'+release.code.split('-').at(-1)+'.csv');
      await writeFile(path.join(destination,alternative),content,'utf8');
      lockedExports.push({locked:name,written:alternative});
      return alternative;
    }
  };
  await write('presets.json',json(data));await write('validation-report.json',json(report));
  await write('question-tree.json',json({questions,settings:settings.map(setting=>({...setting,roles:roles.filter(role=>scenarios.some(s=>s.answers.settingCode===setting.code&&s.answers.roleCode===role.code)).map(role=>({...role,packages:packages.filter(pkg=>scenarios.some(s=>s.answers.settingCode===setting.code&&s.answers.roleCode===role.code&&s.packageCode===pkg.code)).map(pkg=>({...pkg,audiences:scenarios.filter(s=>s.answers.roleCode===role.code&&s.packageCode===pkg.code).map(s=>({code:s.answers.audienceCode,label:s.answerLabels.audience,scenarioCode:s.code}))}))}))}))}));
  const presetCsv=await write('presets.csv',csv([['รหัสเส้นทาง',...questions.map(q=>q.text),'แพ็กเกจที่ได้รับ','เครื่องมือเรียงตามการใช้ครั้งแรก','ลำดับการใช้เครื่องมือและสิ่งที่อยากได้','ข้อสังเกตจากไฟล์ต้นฉบับ'],...scenarios.map(s=>[s.code,s.answerLabels.setting,s.answerLabels.role,s.answerLabels.package,s.answerLabels.level,s.answerLabels.audience,s.title,[...new Set(s.useSequence.map(step=>step.toolCode))].map(code=>tools.find(t=>t.code===code).title).join('\n'),s.useSequence.map(step=>`${step.order}. ${step.stage} — ${step.shortTitle}: ${step.action} → ${step.outcome}`).join('\n'),s.editorialNote])]));
  await write('questions.csv',csv([['ข้อมูล','คำถาม','คำแนะนำ','การเลือก','แสดงเมื่อ'],...questions.map(q=>[q.key,q.text,q.hint,q.selection,q.askWhen])]));
  await write('tools-and-files.csv',csv([['รหัสเครื่องมือ','ลำดับต้นฉบับ','ชื่ออ่านสั้น','ชื่อเครื่องมือต้นฉบับ','พื้นที่และองค์ประกอบจากตาราง','ไฟล์ต้นฉบับ','ประเภทไฟล์','ขนาด MB','การส่งไฟล์','ลิงก์ไฟล์ใหญ่หรือชุดสื่อ','ข้อสังเกตจากต้นฉบับ'],...sourceTools.flatMap(t=>assets.filter(a=>a.toolCodes.includes(t.code)).map(a=>[t.code,t.sourceNumber,t.shortTitle,t.title,Object.entries(t.scope).map(([setting,codes])=>`${label(settings,setting)} ${codes.join('/')}`).join('; '),a.fileName,a.fileKind,(a.sizeBytes/1e6).toFixed(2),a.hosting==='bundle'?'ไฟล์ต้นฉบับใน ZIP':'ลิงก์ใน TXT',[...a.downloads.map(d=>d.url),...t.contentLinks].join('\n'),t.editorialNote]))]));
  const previews=packages.map(pkg=>{
    const row=scenarios.find(s=>s.packageCode===pkg.code);
    const state=conversationState(data,{...row.answers,level:undefined,audienceCodes:[row.answers.audienceCode]});
    return `## ${pkg.title}\n\n${state.answeredQuestions.map(q=>`**ผู้ช่วย:** ${q.text}\n\n**คุณ:** ${q.options.filter(o=>(Array.isArray(q.answer)?q.answer:[q.answer]).includes(o.value)).map(o=>o.label).join(', ')}`).join('\n\n')}\n\n**ชุดที่ได้รับ:** ${row.title}\n\n${row.useSequence.map(s=>`${s.order}. **${s.shortTitle}** — ${s.action}`).join('\n')}\n`;
  }).join('\n');
  await write('chat-preview.md','# ตัวอย่างบทสนทนาและชุดแผนครบ 10 แพ็กเกจ\n\nผลลัพธ์แสดงเฉพาะสถานการณ์ เครื่องมือหลัก/เสริม และลำดับการใช้เครื่องมือ ดูทุกเส้นทางใน all-paths.md และตาราง CSV ล่าสุดตาม export-status.json\n\n'+previews);
  const summaryReport=await writePackageSummaryArtifacts(data,destination,root,presetCsv);
  await write('all-paths.md','# ตารางเส้นทางและลำดับการใช้เครื่องมือ\n\nมี 10 แพ็กเกจ หลายเส้นทางไปยังแพ็กเกจเดียวกันได้ ตารางต่อไปแสดงจำนวนเส้นทางและชุดเครื่องมือจริง\n\n'+summaryReport.table+'\nคอลัมน์รวมการเลือกหลายกลุ่มรวมกรณีเลือกกลุ่มเดียวแล้ว รายละเอียดทุกเส้นทางอยู่ใน '+presetCsv+'\n\n| เส้นทาง | พื้นที่ | บทบาท | กลุ่ม | ชุดที่ได้ | ลำดับการใช้ |\n|---|---|---|---|---|---|\n'+scenarios.map(s=>'| '+[s.code,s.answerLabels.setting,s.answerLabels.role,s.answerLabels.audience,s.title,s.useSequence.map(step=>`${step.order}. ${step.shortTitle}`).join(' → ')].map(md).join(' | ')+' |').join('\n'));
  const review='# การจัดแพ็กเกจจากเครื่องมือจริง\n\nรุ่น '+release.code+' ใช้เฉพาะ 18 เครื่องมือจากฐานข้อมูลที่เจ้าของโครงการกำหนด เอกสารองค์ประกอบเป็นข้อมูลอ้างอิงภายใน ไม่แจกเป็นเครื่องมือ\n\n## ชุดที่เปิดใช้\n\n'+packages.map(p=>'- **'+p.title+'**: '+p.goal).join('\n')+'\n\nผลลัพธ์ประกอบด้วยสถานการณ์ เครื่องมือ และลำดับการใช้ แผน PDF คง Artwork เดิม บางเส้นทางมีเครื่องมือเดียวตามไฟล์ที่มีจริง\n\nผลตรวจ: '+scenarios.length+' เส้นทาง, '+groups.size+' กลุ่มบริบท, '+selections+' การเลือกกลุ่มเป้าหมาย, '+bundles.size+' ชุด ZIP\n';
  await write('package-review.md',review+'\n'+summaryReport.table);
  await writeFile(reviewFile,review+'\n'+summaryReport.table+'\nดู [ตัวอย่างบทสนทนา](presets/real-tools-v1/chat-preview.md) และ [ตาราง CSV](presets/real-tools-v1/'+presetCsv+')\n','utf8');
  await write('README.md',`# ชุดเครื่องมือจริง — ${release.code}\n\nแก้ข้อมูลเครื่องมือที่ source-rules.mjs และชุด/ลำดับที่ package-playbooks.mjs แล้วรัน node scripts/build-real-tool-presets.mjs --require-public\n\nดู package-review.md, chat-preview.md และ ${presetCsv} สำหรับการประกอบชุดและลำดับทั้งหมด เก็บต้นฉบับไว้ไม่เปลี่ยนข้อความ การเผยแพร่เป็น content release ใหม่เสมอ\n`);
  await write('export-status.json',json({release:release.code,presetCsv,lockedExports}));
  console.log(JSON.stringify({...report,...(lockedExports.length?{lockedExports}:{})}));
}
