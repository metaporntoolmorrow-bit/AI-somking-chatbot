import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {buildDownloadManifest} from '../../presets/real-tools-v1/resolver.mjs';
import {guidanceEditionsFor,packageGuidanceProfiles,packageGuidanceVersion,guidanceCombinations} from '../../src/lib/package-guidance-core.mjs';

const md=text=>String(text).replaceAll('|','/');
const csv=rows=>'\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';

export function summarizePackages(preset){
  return preset.packages.map(pkg=>{
    const rows=preset.scenarios.filter(row=>row.packageCode===pkg.code),groups=new Map(),sets=new Set();let multiPaths=0;
    for(const row of rows){const a=row.answers,key=[a.settingCode,a.roleCode,a.packageId,a.level].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
    for(const group of groups.values())for(let mask=1;mask<2**group.length;mask++){
      const selected=group.filter((_,index)=>mask&(1<<index));
      const manifest=buildDownloadManifest(preset,{...selected[0].answers,audienceCodes:selected.map(row=>row.answers.audienceCode)});
      sets.add([...manifest.toolCodes].sort().join(','));multiPaths++;
    }
    return {packageId:pkg.code,title:pkg.title,setting:pkg.settingCode,singlePaths:rows.length,multiPaths,roleContexts:groups.size,toolSets:sets.size};
  });
}

export async function writePackageGuidanceArtifacts(preset,destination,root,presetCsv='presets.csv'){
  const summary=summarizePackages(preset);
  const totals=summary.reduce((s,p)=>({singlePaths:s.singlePaths+p.singlePaths,multiPaths:s.multiPaths+p.multiPaths,toolSets:s.toolSets+p.toolSets}),{singlePaths:0,multiPaths:0,toolSets:0});
  const table='| แพ็กเกจ | เส้นทางกลุ่มเดียว | รวมการเลือกหลายกลุ่ม | ชุดเครื่องมือที่ต่างกัน |\n|---|---:|---:|---:|\n'+summary.map(p=>'| '+[p.title,p.singlePaths,p.multiPaths,p.toolSets].map(md).join(' | ')+' |').join('\n')+'\n| **รวม** | **'+totals.singlePaths+'** | **'+totals.multiPaths+'** | **'+totals.toolSets+'** |\n';
  const explanation='มี '+summary.length+' แพ็กเกจ ครอบคลุม '+totals.singlePaths+' เส้นทางกลุ่มเดียว ซึ่งหมายถึงคำตอบพื้นที่ บทบาท เรื่องที่ทำ สถานการณ์ และกลุ่มเป้าหมายหนึ่งกลุ่มที่จับคู่ได้จริง\n\nคอลัมน์รวมการเลือกหลายกลุ่มนับชุดกลุ่มเป้าหมายที่เลือกได้พร้อมกัน รวมกรณีเลือกกลุ่มเดียวแล้ว ไม่นับลำดับการกดซ้ำเป็นเส้นทางใหม่ จึงไม่ต้องนำ '+totals.singlePaths+' ไปบวกกับ '+totals.multiPaths+'\n\n';
  const reasons='ตารางจับคู่ล่าสุด: ['+presetCsv+'](../presets/real-tools-v1/'+presetCsv+')\n\n## ทำไมจึงเห็นข้อมูลซ้ำ\n\n1. คนต่างบทบาทหรือกลุ่มเป้าหมายอาจทำงานชนิดเดียวกัน จึงไปยังแพ็กเกจเดียวกัน เช่น นโยบายมี 4 บทบาท × 7 กลุ่ม = 28 เส้นทาง\n2. แพ็กเกจเดียวกันอาจมีเครื่องมือต่างกันตามวัย โดยชุดการเรียนรู้มี 17 รูปแบบ ไม่ได้ส่งไฟล์ชุดเดียวกันทุกเส้นทาง\n3. รุ่นก่อนใช้ข้อความข้อควรระวังกลางและคำแนะนำกลาง 20 ชุดร่วมกัน และไฟล์ตัวอย่างแสดงเพียงข้อความแรก จึงดูเหมือนคำแนะนำเหมือนกันทุกชุด\n\n## วิธีแก้ในรุ่นนี้\n\nแต่ละแพ็กเกจมีคลังประเด็นเฉพาะ 6 เรื่อง เลือกครั้งละ 3 เรื่องเป็น 20 ชุดที่ต่างกัน โดยเรียงประเด็นตามลำดับเดิม รวม 200 ชุดสำหรับ 10 แพ็กเกจ และไม่หยิบข้อความจากแพ็กเกจอื่นมาใช้\n\nข้อควรระวังสำคัญของแพ็กเกจและข้อจำกัดตามไฟล์จริง เช่น รายงานชาติพันธุ์หรือการปรับใช้ในอุดมศึกษา แสดงเสมอ การวนข้อความไม่ทำให้ข้อจำกัดเหล่านี้หายไป ภายในแพ็กเกจเดียวกันจึงยังมีแกนที่ซ้ำได้ตามเหตุผลของงาน\n\nคำถาม การจับคู่ ชื่อแพ็กเกจ ลำดับเครื่องมือ และไฟล์ต้นฉบับคงโครงเดิม การแก้ครั้งนี้เปลี่ยนคำแนะนำและการนำเสนอเอกสารให้เข้าใจจำนวนชุดได้ถูกต้อง\n\nดู [คำแนะนำแยกครบ 200 ชุด](../presets/real-tools-v1/guidance-by-package.csv), [คลังประเด็นรายแพ็กเกจ](../presets/real-tools-v1/guidance-sets.md) และ [ตัวอย่างครบ 10 แพ็กเกจ](../presets/real-tools-v1/chat-preview.md)\n';
  await writeFile(path.join(root,'docs','package-path-summary.md'),'# จำนวนแพ็กเกจและเส้นทางคำตอบ\n\nรุ่น '+preset.release.code+'\n\n'+explanation+table+'\n'+reasons,'utf8');
  await writeFile(path.join(destination,'package-summary.json'),JSON.stringify({release:preset.release.code,guidanceVersion:packageGuidanceVersion,packages:summary,totals},null,2)+'\n','utf8');
  await writeFile(path.join(destination,'package-summary.csv'),csv([['รหัสแพ็กเกจ','ชื่อแพ็กเกจ','เส้นทางกลุ่มเดียว','รวมการเลือกหลายกลุ่ม','ชุดเครื่องมือที่ต่างกัน'],...summary.map(p=>[p.packageId,p.title,p.singlePaths,p.multiPaths,p.toolSets])]),'utf8');
  const editions=summary.flatMap(pkg=>guidanceEditionsFor({packageId:pkg.packageId}).map(edition=>({packageId:pkg.packageId,title:pkg.title,...edition})));
  await writeFile(path.join(destination,'guidance-by-package.csv'),csv([['รหัสแพ็กเกจ','ชื่อแพ็กเกจ','ชุดคำแนะนำ','ข้อควรระวัง','แนวทางการใช้ประโยชน์'],...editions.map(e=>[e.packageId,e.title,e.id,e.cautions.join('\n'),e.benefits.join('\n')])]),'utf8');
  const library=summary.map(pkg=>{const profile=packageGuidanceProfiles[pkg.packageId];return '## '+pkg.title+'\n\nข้อควรระวังที่คงไว้เสมอ\n\n'+profile.requiredCautions.map(t=>'- '+t).join('\n')+'\n\nประเด็นเฉพาะของแพ็กเกจนี้\n\n'+profile.points.map((p,i)=>'### ประเด็น '+(i+1)+'\n\n- ข้อควรระวัง: '+p.caution+'\n- แนวทางใช้ประโยชน์: '+p.benefit).join('\n\n');}).join('\n\n');
  await writeFile(path.join(destination,'guidance-sets.md'),'# คลังคำแนะนำเฉพาะแพ็กเกจ\n\nมี 10 คลังแยกจากกัน แต่ละคลังมี 6 ประเด็นและข้อควรระวังหลัก ใช้ครั้งละ 3 ประเด็นเป็น 20 ชุด รวม 200 ชุด ข้อความในแต่ละประเด็นเป็นของแพ็กเกจนั้น ไม่ใช่ข้อความกลางที่เติมชื่อชุด\n\nในไฟล์ '+presetCsv+' และ chat-preview.md ใช้ชุด 1 เป็นตัวอย่าง คำแนะนำทุกชุดอ่านได้ใน [guidance-by-package.csv](guidance-by-package.csv)\n\nตาราง 20 ชุดใช้หมายเลขประเด็น ไม่ใช่ลำดับการใช้เครื่องมือ\n\n| ชุด | ประเด็นที่ใช้ |\n|---|---|\n'+guidanceCombinations.map((p,i)=>'| '+(i+1)+' | '+p.map(n=>n+1).join(', ')+' |').join('\n')+'\n\n'+library+'\n','utf8');
  return {summary,totals,table,editions:editions.length};
}
