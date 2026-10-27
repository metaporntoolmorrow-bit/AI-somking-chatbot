import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import {buildDownloadManifest} from '../presets/real-tools-v1/resolver.mjs';
import {guidanceForContext} from '../src/lib/package-guidance-core.mjs';

const preset=JSON.parse(await readFile('presets/real-tools-v1/presets.json','utf8'));
const base=process.env.TEST_BASE_URL||'http://localhost:3000',dir='output/qa/tool-pdf-v5';await mkdir(dir,{recursive:true});
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
      let worst={height:0,edition:1};
      // Stress the same real print layout with all 20 trusted advice editions.
      // Then reload the actual URL for the tallest edition before saving a PDF.
      for(let edition=1;edition<=20;edition++){
        const advice=guidanceForContext({packageId:first.packageCode,audienceCodes:job.rows.map(r=>r.answers.audienceCode),toolCodes:job.manifest.toolCodes,edition});
        await page.locator('.print-guidance').evaluate((element,advice)=>{
          const lists=element.querySelectorAll('ul');
          [advice.cautions,advice.benefits].forEach((texts,i)=>lists[i].replaceChildren(...texts.map(text=>{const li=document.createElement('li');li.textContent=text;return li;})));
        },advice);
        const height=await page.locator('.print-sheet').evaluate(e=>e.getBoundingClientRect().height);
        assert.ok(height<718,`${first.packageCode} variant ${index+1} edition ${edition} exceeds A4: ${height}`);
        if(height>worst.height)worst={height,edition};
      }
      params.set('guidance',String(worst.edition));await page.goto(`${base}/result?${params}`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
      const file=`${dir}/variant-${String(index+1).padStart(2,'0')}.pdf`;await page.pdf({path:file,preferCSSPageSize:true,printBackground:true});
      assert.match(execFileSync('pdfinfo',[file]).toString(),/Pages:\s+1\b/,file+' overflowed');
      results.push({variant:index+1,package:first.packageCode,toolCodes:job.manifest.toolCodes,steps:job.manifest.useSequence.length,...worst,file});
      if(results.length%10===0)console.log(`PDF variants passed ${results.length}/${jobs.length}.`);
    }await page.close();
  }));
  assert.deepEqual(errors,[]);results.sort((a,b)=>a.variant-b.variant);
  await writeFile(`${dir}/report.json`,JSON.stringify({base,results,errors},null,2));
  console.log(JSON.stringify({base,pdfVariants:results.length,adviceLayouts:results.length*20,onePage:true,errors}));
}finally{await browser.close();}
