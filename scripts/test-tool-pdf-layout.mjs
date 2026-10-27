import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import {buildDownloadManifest} from '../presets/real-tools-v1/resolver.mjs';

const preset=JSON.parse(await readFile('presets/real-tools-v1/presets.json','utf8'));
const base=process.env.TEST_BASE_URL||'http://localhost:3000',dir='output/qa/tool-pdf-v6';await mkdir(dir,{recursive:true});
const groups=new Map(),variants=new Map();
for(const row of preset.scenarios){const a=row.answers,key=[a.settingCode,a.roleCode,a.packageId,a.level].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
for(const rows of groups.values())for(let mask=1;mask<2**rows.length;mask++){
  const selected=rows.filter((_,i)=>mask&(1<<i)),first=selected[0];
  const manifest=buildDownloadManifest(preset,{...first.answers,audienceCodes:selected.map(s=>s.answers.audienceCode)});
  const key=[first.packageCode,...manifest.toolCodes.slice().sort()].join('|');
  const score=manifest.useSequence.length*100000+selected.length*1000+first.answerLabels.role.length;
  if(!variants.has(key)||variants.get(key).score<score)variants.set(key,{rows:selected,manifest,score});
}
assert.equal(variants.size,31);
const jobs=[...variants.values()],browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
let next=0;const results=[],errors=[];
try{
  await Promise.all(Array.from({length:3},async()=>{
    const page=await browser.newPage({viewport:{width:1047,height:718}});page.on('pageerror',e=>errors.push(e.message));
    while(next<jobs.length){
      const index=next++,job=jobs[index],first=job.rows[0];
      const params=new URLSearchParams({scenario:first.code,scenarios:job.rows.map(r=>r.code).join(','),guidance:'1'});
      await page.goto(`${base}/result?${params}`,{waitUntil:'networkidle'});await page.emulateMedia({media:'print'});await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.locator('.print-tool-follow').count(),job.manifest.toolCodes.length>1?1:0);
      assert.equal(await page.locator('.print-guidance').count(),0);
      const printText=await page.locator('.print-document').textContent();assert.ok(!/ข้อควรระวัง|แนวทางการใช้ประโยชน์/.test(printText));
      const height=await page.locator('.print-sheet').evaluate(e=>e.getBoundingClientRect().height);assert.ok(height<718);
      if(index===0){params.set('guidance','20');await page.goto(`${base}/result?${params}`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);assert.equal(await page.locator('.print-document').textContent(),printText);}
      const file=`${dir}/variant-${String(index+1).padStart(2,'0')}.pdf`;await page.pdf({path:file,preferCSSPageSize:true,printBackground:true});
      assert.match(execFileSync('pdfinfo',[file]).toString(),/Pages:\s+1\b/,file+' overflowed');
      assert.ok(!/ข้อควรระวัง|แนวทางการใช้ประโยชน์/.test(execFileSync('pdftotext',['-enc','UTF-8',file,'-']).toString('utf8')));
      results.push({variant:index+1,package:first.packageCode,toolCodes:job.manifest.toolCodes,steps:job.manifest.useSequence.length,height,file});
      if(results.length%10===0)console.log(`PDF variants passed ${results.length}/${jobs.length}.`);
    }await page.close();
  }));
  assert.deepEqual(errors,[]);results.sort((a,b)=>a.variant-b.variant);
  await writeFile(`${dir}/report.json`,JSON.stringify({base,results,errors},null,2));
  console.log(JSON.stringify({base,pdfVariants:results.length,withdrawnSectionsAbsent:true,onePage:true,errors}));
}finally{await browser.close();}
