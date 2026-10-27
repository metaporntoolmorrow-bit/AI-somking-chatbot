import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { resolvePreset, buildDownloadManifest } from '../../presets/real-tools-v1/resolver.mjs';
import { conversationState } from '../../presets/real-tools-v1/conversation.mjs';

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
      const plan=usagePlanFor(pkg,slots,audienceCode);
      const host=hostFor(pkg.settingCode,roleCode);
      scenarios.push({code:`${release.scenarioPrefix||'REAL2'}-${String(scenarios.length+1).padStart(4,'0')}`,ruleId:rule.id,
        answers:{settingCode:pkg.settingCode,packageId:pkg.code,roleCode,level:rule.level,audienceCode},
        answerLabels:{setting,package:pkg.choiceLabel,role,level:label(levels,rule.level),audience},
        packageCode:pkg.code,componentCode:pkg.componentCode,componentCodes:pkg.componentCodes,catalogueStatus:rule.status,
        title:pkg.title,summary:`${role}ต้องการ${pkg.goal} สำหรับ${audience}ใน${setting}`,
        tools:slots,host,...plan,phases:[],
        steps:plan.useSequence.map(s=>({order:s.order,when:s.stage,action:s.action,owner:host,tool:s.shortTitle,setting})),
        editorialNote:rule.note,mappingBasis:rule.mappingBasis,collaborationBridges:rule.bridges,reviewStatus:'editorial_design',
        sourceReference:{tracker:path.relative(root,tracker).replaceAll('\\','/'),trackerPages:[2,3],sourceToolNumbers:[...new Set(Object.values(slots).flat())].map(code=>tools.find(t=>t.code===code).sourceNumber).filter(n=>n!==null),componentGuides:tools.filter(t=>t.category==='component_guidance'&&Object.values(slots).flat().includes(t.code)).map(t=>({code:t.code,component:t.componentCode,pages:t.sourcePages})),conceptPages:c.frameworkEvidence?.conceptPages??[],note:'ชื่อและขอบเขตเครื่องมือยึดตารางปัจจุบัน ลำดับย่อจากคอนเซปต์และคู่มือองค์ประกอบ ปรับเป็นแนวทางดำเนินงานโดยไม่แต่งคำสั่งรักษา'},
      });
    }
  }
  const data={release:{...release,sourceTracker:{relativePath:path.relative(root,tracker).replaceAll('\\','/'),sha256:hash(await readFile(tracker))}},sourceFramework:c.frameworkEvidence,questions,conversationPolicy,settings,levels,roles,audiences,components,packages,tools:sourceTools,supplementaryTools,assets,scenarios,
    downloadPolicy:{thresholdBytes:release.thresholdBytes,largeFiles:'google_drive_links_in_utf8_txt',smallFiles:'original_files_in_zip',zipDelivery:'prebuilt_private_storage_signed_redirect',bundleIdentity:'package_and_unique_tool_set',orderedGuide:'00-start-here-and-numbered-tool-folders',multiAudience:'one_combined_summary_and_deduplicated_bundle',driveFolder:drive.folder},
  };
  const seen=new Set();
  for(const row of scenarios){
    const key=JSON.stringify(row.answers);if(seen.has(key))throw new Error('Duplicate answers');seen.add(key);
    const codes=[...new Set(Object.values(row.tools).flat())];
    if(codes.length<2)throw new Error('Singleton package '+row.code);
    if(!row.useSequence.length||!row.cautions.length||!row.benefits.length)throw new Error('Missing use plan');
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
  // Identical file sets across roles/audiences can share one package. They must not be offered as different goals for the same person.
  const goalSets=new Map();
  for(const row of scenarios){const a=row.answers,key=[a.settingCode,a.roleCode,a.audienceCode,[...new Set(Object.values(row.tools).flat())].sort().join(',')].join('|');const prev=goalSets.get(key);if(prev&&prev!==row.packageCode)throw new Error('Duplicate goals with identical files');goalSets.set(key,row.packageCode);}
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
  const report={release:release.code,settings:settings.length,packages:packages.length,mainTools:tools.filter(t=>t.category==='main').length,componentGuides:tools.filter(t=>t.category==='component_guidance').length,evidenceDocuments:release.sourceEvidence.length,answerPaths:scenarios.length,contextGroups:groups.size,audienceSelections:selections,bundleCombinations:bundles.size,singleToolPackages:0,duplicateGoalsWithIdenticalFiles:0,originalAssets:assets.length,smallFiles:assets.filter(a=>a.hosting==='bundle').length,largeOriginalFiles:assets.filter(a=>a.hosting!=='bundle').length,publicDriveAccessVerified,maximumSteps:Math.max(...scenarios.map(s=>s.useSequence.length)),guidanceBasis:'concept_tracker_and_component_sources'};
  await mkdir(destination,{recursive:true});const write=(name,content)=>writeFile(path.join(destination,name),content,'utf8');
  await write('presets.json',json(data));await write('validation-report.json',json(report));
  await write('question-tree.json',json({questions,settings:settings.map(setting=>({...setting,roles:roles.filter(role=>scenarios.some(s=>s.answers.settingCode===setting.code&&s.answers.roleCode===role.code)).map(role=>({...role,packages:packages.filter(pkg=>scenarios.some(s=>s.answers.settingCode===setting.code&&s.answers.roleCode===role.code&&s.packageCode===pkg.code)).map(pkg=>({...pkg,audiences:scenarios.filter(s=>s.answers.roleCode===role.code&&s.packageCode===pkg.code).map(s=>({code:s.answers.audienceCode,label:s.answerLabels.audience,scenarioCode:s.code}))}))}))}))}));
  await write('presets.csv',csv([['รหัสเส้นทาง',...questions.map(q=>q.text),'แพ็กเกจที่ได้รับ','เครื่องมือเรียงตามการใช้ครั้งแรก','ลำดับการใช้เครื่องมือและสิ่งที่อยากได้','ข้อควรระวัง','แนวทางการใช้ประโยชน์','ที่มาของแนวทางประกอบ','ข้อสังเกตจากไฟล์ต้นฉบับ'],...scenarios.map(s=>[s.code,s.answerLabels.setting,s.answerLabels.role,s.answerLabels.package,s.answerLabels.level,s.answerLabels.audience,s.title,[...new Set(s.useSequence.map(step=>step.toolCode))].map(code=>tools.find(t=>t.code===code).title).join('\n'),s.useSequence.map(step=>`${step.order}. ${step.stage} — ${step.shortTitle}: ${step.action} → ${step.outcome}`).join('\n'),s.cautions.join('\n'),s.benefits.join('\n'),s.guidanceNote,s.editorialNote])]));
  await write('questions.csv',csv([['ข้อมูล','คำถาม','คำแนะนำ','การเลือก','แสดงเมื่อ'],...questions.map(q=>[q.key,q.text,q.hint,q.selection,q.askWhen])]));
  await write('tools-and-files.csv',csv([['รหัสเครื่องมือ','ลำดับต้นฉบับ','ชื่ออ่านสั้น','ชื่อเครื่องมือต้นฉบับ','พื้นที่และองค์ประกอบจากตาราง','ไฟล์ต้นฉบับ','ประเภทไฟล์','ขนาด MB','การส่งไฟล์','ลิงก์ไฟล์ใหญ่หรือชุดสื่อ','ข้อสังเกตจากต้นฉบับ'],...sourceTools.flatMap(t=>assets.filter(a=>a.toolCodes.includes(t.code)).map(a=>[t.code,t.sourceNumber,t.shortTitle,t.title,Object.entries(t.scope).map(([setting,codes])=>`${label(settings,setting)} ${codes.join('/')}`).join('; '),a.fileName,a.fileKind,(a.sizeBytes/1e6).toFixed(2),a.hosting==='bundle'?'ไฟล์ต้นฉบับใน ZIP':'ลิงก์ใน TXT',[...a.downloads.map(d=>d.url),...t.contentLinks].join('\n'),t.editorialNote]))]));
  const previews=settings.map(setting=>{
    const row=scenarios.find(s=>s.answers.settingCode===setting.code);
    const state=conversationState(data,{...row.answers,level:undefined,audienceCodes:[row.answers.audienceCode]});
    return `## ${setting.label}\n\n${state.answeredQuestions.map(q=>`**ผู้ช่วย:** ${q.text}\n\n**คุณ:** ${q.options.filter(o=>(Array.isArray(q.answer)?q.answer:[q.answer]).includes(o.value)).map(o=>o.label).join(', ')}`).join('\n\n')}\n\n**ชุดที่ได้รับ:** ${row.title}\n\n${row.useSequence.map(s=>`${s.order}. **${s.shortTitle}** — ${s.action}`).join('\n')}\n\n**ข้อควรระวัง:** ${row.cautions[0]}\n`;
  }).join('\n');
  await write('chat-preview.md','# ตัวอย่างบทสนทนาและแพ็กเกจที่ใช้ต่อได้\n\n'+previews);
  await write('all-paths.md','# ตารางเส้นทางและลำดับการใช้เครื่องมือ\n\n| เส้นทาง | พื้นที่ | บทบาท | กลุ่ม | ชุดที่ได้ | ลำดับการใช้ |\n|---|---|---|---|---|---|\n'+scenarios.map(s=>'| '+[s.code,s.answerLabels.setting,s.answerLabels.role,s.answerLabels.audience,s.title,s.useSequence.map(step=>`${step.order}. ${step.shortTitle}`).join(' → ')].map(md).join(' | ')+' |').join('\n'));
  const legacyReview=`# การจัดแพ็กเกจใหม่ รุ่น 2\n\nลดจาก 14 หัวข้อย่อยเป็น ${packages.length} ชุดที่เชื่อมเครื่องมือเข้าด้วยกัน ไม่มีเส้นทางที่ได้เครื่องมือเพียงชิ้นเดียว และไม่มีสองหัวข้อที่เสนอไฟล์ชุดเดียวกันให้บทบาทและกลุ่มเดียวกัน\n\n| เดิม | ชุดใหม่ | เหตุผล |\n|---|---|---|\n| สถานศึกษา: นโยบาย / พื้นที่ / การมีส่วนร่วม / การเรียนรู้ | ชุดเชื่อมทีม กิจกรรม และการเรียนรู้ | รวมเป็นกระบวนการเดียว แล้วเลือกกิจกรรมและแบบสำรวจตามวัย |\n| สถานศึกษา: ดูแลและส่งต่อ | ชุดประสานโรงเรียนและครอบครัว | เชื่อมคู่มือโรงเรียนกับการสื่อสารร่วมกับผู้ปกครอง |\n| ครอบครัว: ดูแลบ้าน / สนับสนุนคนอยากเลิก | ชุดคุยกันและสร้างข้อตกลงบ้าน | เชื่อมการฟัง กิจกรรมครอบครัว และการกลับมาทบทวน |\n| ครอบครัว: อบรม | ชุดจัดวงเรียนรู้ | แยกบทบาทผู้จัดวง และเพิ่มหลักสูตรพ่อแกนนำเฉพาะกลุ่ม |\n| ชุมชน: พื้นที่ / ประสานช่วยเลิก | ชุดชุมชนและครอบครัว | ใช้ท้องถิ่นเป็นเจ้าภาพ เชื่อมกิจกรรมและช่องทางบริการ |\n| ที่ทำงาน: จัดระบบ / สนับสนุนการเลิก | ชุดขับเคลื่อนทั้งองค์กร | ผู้บริหารตัดสินใจ → คณะทำงานลงมือ → ทบทวนระบบ |\n| บริการสุขภาพ: เฝ้าระวัง / ช่วยเลิก | ชุดจัดระบบบริการ | เชื่อมบทบาทเฝ้าระวัง ส่งต่อ และบริการช่วยเลิกตามวิชาชีพ |\n\nเครื่องมือแกนร่วมยังซ้ำข้ามบทบาทหรือกลุ่มได้เมื่อเป็นงานชุดเดียวกัน ไม่เพิ่มไฟล์ที่ไม่เกี่ยวข้องเพื่อทำให้ดูต่าง การจับคู่ข้ามพื้นที่มี collaborationBridges ระบุเหตุผลเฉพาะรายเครื่องมือ\n\nลำดับ ข้อควรระวัง และแนวทางการใช้ประโยชน์เป็นข้อเสนอประกอบที่จัดทำเพิ่มตามคำขอ ไม่ใช่ข้อความอ้างจากคู่มือทั้งหมด ไม่มีการสร้างคำสั่งรักษาหรือขนาดยา\n\n## ชุดที่เปิดใช้\n\n${packages.map(p=>`- **${p.title}**: ${p.goal}`).join('\n')}\n\nไฟล์ไม่เกิน 6 MB รวมต้นฉบับที่เปิดต่อได้ใน ZIP ไฟล์ใหญ่เป็นลิงก์ใน TXT พร้อมคู่มือเริ่มใช้ที่บอกลำดับและเหตุผล ไม่ใส่ไฟล์รายงานผลแทนแบบประเมินเปล่า\n\nผลตรวจ: ${scenarios.length} เส้นทาง, ${groups.size} กลุ่มบริบท, ${selections} การเลือกหลายกลุ่ม, ${bundles.size} ชุด ZIP ที่ไม่ซ้ำ\n`;
  const review=c.frameworkEvidence ? '# การจัดแพ็กเกจตามคอนเซปต์และ 5 องค์ประกอบ\n\nรุ่น '+release.code+' ใช้เอกสารหลักฐาน 8 ไฟล์ เครื่องมือหลัก 18 ชิ้น และแนวทางองค์ประกอบที่มีจริง 4 ฉบับ\n\nสถานศึกษาเลือกเริ่มได้ 5 เรื่อง: นโยบาย การเรียนรู้ สภาพแวดล้อม การมีส่วนร่วมของเยาวชน และการดูแลช่วยเหลือ ส่วนพื้นที่อื่นเชื่อมกับบทบาทและเครื่องมือที่มีจริง\n\n## ชุดที่เปิดใช้\n\n'+packages.map(p=>'- **'+p.title+'**: '+p.goal).join('\n')+'\n\n## ที่มาของการตัดสินใจ\n\nดู [ผลวิเคราะห์เอกสาร](../../docs/concept-v3-analysis.md) สำหรับความสัมพันธ์ 5 องค์ประกอบ ข้อจำกัดการใช้เครื่องมือ และหน้าอ้างอิง\n\n- สไลด์และ tracker ใช้เลขเครื่องมือต่างกัน จับคู่ด้วยชื่อและไฟล์จริง\n- เครื่องมือเสริมที่ไม่มีไฟล์ยังไม่เปิดเส้นทาง\n- ไม่มีไฟล์องค์ประกอบที่ 5 แยก จึงไม่สร้างไฟล์แทน\n- แนวทางอุดมศึกษาต้องปรับร่วมกับทีมอุดมศึกษา\n- ไม่ให้แกนนำเด็กตรวจค้น จับผิดเพื่อน หรือทำงานแทนวิชาชีพ\n\nทุกชุดมีหลายเครื่องมือและมีลำดับใช้งาน ไม่ใส่ไฟล์ที่ไม่เกี่ยวข้องเพื่อทำให้ดูต่าง ข้อความในเว็บ PDF และคู่มือใน ZIP ใช้แผนเดียวกัน พร้อมคำแนะนำวน 20 ชุดและข้อจำกัดเฉพาะบริบท\n\nผลตรวจ: '+scenarios.length+' เส้นทาง, '+groups.size+' กลุ่มบริบท, '+selections+' การเลือกหลายกลุ่ม, '+bundles.size+' ชุด ZIP ที่ไม่ซ้ำ\n' : legacyReview;
  await write('package-review.md',review);
  await writeFile(reviewFile,review.replaceAll('(../../docs/','(docs/')+'\nดู [ตัวอย่างบทสนทนา](presets/real-tools-v1/chat-preview.md) และ [ตาราง CSV](presets/real-tools-v1/presets.csv)\n','utf8');
  await write('README.md',`# ชุดเครื่องมือจริง — ${release.code}\n\nแก้ข้อมูลเครื่องมือที่ source-rules.mjs และชุด/ลำดับที่ package-playbooks.mjs แล้วรัน node scripts/build-real-tool-presets.mjs --require-public\n\nดู package-review.md, chat-preview.md และ presets.csv สำหรับการประกอบชุดและลำดับทั้งหมด เก็บต้นฉบับไว้ไม่เปลี่ยนข้อความ การเผยแพร่เป็น content release ใหม่เสมอ\n`);
  console.log(JSON.stringify(report));
}
