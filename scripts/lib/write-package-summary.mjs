import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {buildDownloadManifest} from '../../presets/real-tools-v1/resolver.mjs';
import {PLAN_CONTENT_POLICY} from '../../src/lib/plan-content-policy.mjs';
const csv=rows=>'\uFEFF'+rows.map(row=>row.map(value=>'\"'+String(value??'').replaceAll('\"','\"\"')+'\"').join(',')).join('\r\n')+'\r\n';
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

export async function writePackageSummaryArtifacts(preset,destination,root,presetCsv='presets.csv'){
  const summary=summarizePackages(preset);
  const totals=summary.reduce((s,p)=>({singlePaths:s.singlePaths+p.singlePaths,multiPaths:s.multiPaths+p.multiPaths,toolSets:s.toolSets+p.toolSets}),{singlePaths:0,multiPaths:0,toolSets:0});
  const table='| แพ็กเกจ | เส้นทางกลุ่มเดียว | รวมการเลือกหลายกลุ่ม | ชุดเครื่องมือที่ต่างกัน |\n|---|---:|---:|---:|\n'+summary.map(p=>'| '+[p.title,p.singlePaths,p.multiPaths,p.toolSets].join(' | ')+' |').join('\n')+'\n| **รวม** | **'+totals.singlePaths+'** | **'+totals.multiPaths+'** | **'+totals.toolSets+'** |\n';
  await writeFile(path.join(root,'docs','package-path-summary.md'),'# จำนวนแพ็กเกจและเส้นทางคำตอบ\n\nรุ่น '+preset.release.code+'\n\n'+table+'\nคอลัมน์รวมการเลือกหลายกลุ่มรวมกรณีเลือกกลุ่มเดียวแล้ว ไม่ต้องบวกสองคอลัมน์เข้าด้วยกัน คงคำถาม ตัวเลือก รหัสเส้นทาง และการจับคู่เครื่องมือเดิม\n\nแผนปัจจุบันแสดงเฉพาะบริบท เครื่องมือ และลำดับการใช้ ไม่มีชุดคำแนะนำเสริมอัตโนมัติ ดู [ตารางจับคู่ล่าสุด](../presets/real-tools-v1/'+presetCsv+') และ [ตัวอย่างบทสนทนา](../presets/real-tools-v1/chat-preview.md)\n','utf8');
  await writeFile(path.join(destination,'package-summary.json'),JSON.stringify({release:preset.release.code,planContentPolicy:PLAN_CONTENT_POLICY,packages:summary,totals},null,2)+'\n','utf8');
  await writeFile(path.join(destination,'package-summary.csv'),csv([['รหัสแพ็กเกจ','ชื่อแพ็กเกจ','เส้นทางกลุ่มเดียว','รวมการเลือกหลายกลุ่ม','ชุดเครื่องมือที่ต่างกัน'],...summary.map(p=>[p.packageId,p.title,p.singlePaths,p.multiPaths,p.toolSets])]),'utf8');
  return {summary,totals,table};
}
