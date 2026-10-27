import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import JSZip from 'jszip';
import { conversationState } from '../presets/real-tools-v1/conversation.mjs';
import {guidanceEditionsFor,guidanceForContext} from '../src/lib/package-guidance-core.mjs';

const base=process.env.TEST_BASE_URL||'http://localhost:3000';
const preset=JSON.parse(await readFile('presets/real-tools-v1/presets.json','utf8'));
const groups=new Map();
for(const row of preset.scenarios){const a=row.answers,key=[a.settingCode,a.roleCode,a.packageId,a.level].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
const cases=preset.settings.map(s=>[...groups.values()].filter(rows=>rows[0].answers.settingCode===s.code).sort((a,b)=>new Set(b.flatMap(r=>r.useSequence.map(s=>`${s.rank}:${s.toolCode}`))).size-new Set(a.flatMap(r=>r.useSequence.map(s=>`${s.rank}:${s.toolCode}`))).size)[0]);
const editions=guidanceEditionsFor({packageId:cases[0][0].packageCode,audienceCodes:cases[0].map(s=>s.answers.audienceCode),toolCodes:[...new Set(cases[0].flatMap(s=>Object.values(s.tools).flat()))]});
assert.equal(editions.length,20);
assert.deepEqual(editions.map(s=>s.id),Array.from({length:20},(_,i)=>i+1));
assert.equal(new Set(editions.map(s=>s.cautions.join('\n'))).size,20);
assert.equal(new Set(editions.map(s=>s.benefits.join('\n'))).size,20);
const dir='output/qa/guidance-downloads';
await mkdir(dir,{recursive:true});
const urlFor=(rows,id)=>`${base}/result?${new URLSearchParams({scenario:rows[0].code,scenarios:rows.map(s=>s.code).join(','),guidance:String(id)})}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const context=await browser.newContext({viewport:{width:1365,height:900},acceptDownloads:true});
const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
const page=await context.newPage();
const exportAdvice=()=>page.locator('.print-guidance li').allTextContents();
const results={base,cycle:[],pdfs:[],downloads:[]};
const downloadsOnly=process.argv.includes('--downloads-only');
const exportsOnly=downloadsOnly||process.argv.includes('--exports-only');
async function pdf(name){
  await page.emulateMedia({media:'print'});await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.usage-guidance').count(),0);
  const file=`${dir}/${name}.pdf`;
  await page.pdf({path:file,preferCSSPageSize:true,printBackground:true});
  assert.match(execFileSync('pdfinfo',[file]).toString(),/Pages:\s+1\b/,file+' overflowed');
  results.pdfs.push(name);await page.emulateMedia({media:'screen'});
}
async function complete(rows){
  await page.goto(`${base}/plan`,{waitUntil:'networkidle'});let input={};
  for(let i=0;i<3;i++){
    const q=conversationState(preset,input).nextQuestion;
    assert.equal(await page.locator('.chat-confirm').count(),0);
    const answer=rows[0].answers[q.key];
    await page.getByRole('button',{name:q.options.find(o=>o.value===answer).label,exact:true}).click();input[q.key]=answer;
  }
  for(const row of rows)await page.getByRole('button',{name:row.answerLabels.audience,exact:true}).click();
  await page.locator('.chat-confirm').click();await page.waitForURL('**/result?**');
  await page.getByRole('button',{name:'ดาวน์โหลดแผน PDF',exact:true}).waitFor();
}
try{
  // Complete the same real conversation 21 times: no repeated edition in the first 20.
  const seen=new Set();let firstAdvice;
  for(let i=0;i<(exportsOnly?0:21);i++){
    await complete(cases[0]);const id=Number(new URL(page.url()).searchParams.get('guidance'));
    assert.equal(id,i%20+1);const advice=await exportAdvice();
    assert.deepEqual(advice,[...editions[id-1].cautions,...editions[id-1].benefits]);
    if(i<20){assert.ok(!seen.has(advice.join('\n')));seen.add(advice.join('\n'));await pdf(`EDU-${id}`);}
    else assert.deepEqual(advice,firstAdvice);
    if(i===0){
      firstAdvice=advice;await page.reload({waitUntil:'networkidle'});assert.deepEqual(await exportAdvice(),advice);
      await page.screenshot({path:`${dir}/desktop.png`,fullPage:true});
      await page.setViewportSize({width:390,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:`${dir}/mobile.png`,fullPage:true});await page.setViewportSize({width:1365,height:900});
    }
    results.cycle.push(id);if((i+1)%5===0)console.log(`Cycle and PDF passed ${i+1}/21 plans.`);
  }
  // Clinical role restrictions remain present in every edition; no new treatment instructions.
  for(let id=1;id<=(downloadsOnly?0:20);id++){
    await page.goto(urlFor(cases.find(rows=>rows[0].answers.settingCode==='HEA'),id),{waitUntil:'networkidle'});
    assert.ok((await exportAdvice()).some(s=>s.includes('ไม่ใช่คำสั่งวินิจฉัย')));
    await pdf(`HEA-${id}`);
  }
  for(const [i,rows] of cases.entries()){
    const setting=rows[0].answers.settingCode,id=[1,5,9,14,20][i];
    await page.goto(urlFor(rows,id),{waitUntil:'networkidle'});
    const advice=await exportAdvice();
    const expected=guidanceForContext({packageId:rows[0].packageCode,audienceCodes:rows.map(r=>r.answers.audienceCode),toolCodes:[...new Set(rows.flatMap(r=>Object.values(r.tools).flat()))],edition:id});
    assert.deepEqual(advice,[...expected.cautions,...expected.benefits]);
    assert.equal(await page.locator('.usage-guidance').count(),0);
    const zip=page.getByRole('link',{name:'ดาวน์โหลดชุดเครื่องมือ ZIP',exact:true});
    if(i===0){
      await page.route('**/api/tool-bundle/**',route=>route.fulfill({status:503,body:'unavailable'}));
      await zip.click();await page.locator('.export-wrap [role="alert"]').waitFor();
      assert.ok((await page.locator('.export-wrap [role="alert"]').innerText()).includes('ลองกดดาวน์โหลดอีกครั้ง'));
      await page.unroute('**/api/tool-bundle/**');
    }
    const pending=page.waitForEvent('download',{timeout:90_000});await zip.click();
    const download=await pending;assert.equal(download.suggestedFilename(),'ชุดเครื่องมือสำหรับคุณ.zip');
    const file=`${dir}/${setting}.zip`;await download.saveAs(file);assert.equal(await download.failure(),null);
    assert.equal(await page.locator('.export-wrap [role="alert"]').count(),0);
    const archive=await JSZip.loadAsync(await readFile(file),{checkCRC32:true});
    const guide=await archive.file('00-เริ่มใช้แพ็กเกจ.txt').async('string');
    for(const line of advice)assert.ok(guide.includes(line),'ZIP guide differs from the selected PDF guidance: '+line);
    const links=await archive.file('ลิงก์เครื่องมือ.txt').async('string');
    const codes=[...new Set(rows.flatMap(r=>Object.values(r.tools).flat()))];
    const assets=preset.assets.filter(a=>a.toolCodes.some(c=>codes.includes(c)));
    for(const asset of assets){
      if(asset.hosting==='bundle'){
        const name=asset.fileName.replace(/[\\/:*?"<>|\u0000-\u001f]/g,' ').trim();
        const entry=Object.values(archive.files).find(f=>f.name.endsWith('/'+name));assert.ok(entry,asset.code);
        assert.equal(createHash('sha256').update(await entry.async('nodebuffer')).digest('hex'),asset.sha256);
      }else for(const item of asset.downloads)assert.ok(links.includes(item.url));
    }
    if(!['EDU','HEA'].includes(setting))await pdf(`${setting}-${id}`);
    results.downloads.push({setting,filename:download.suggestedFilename(),assets:assets.length,guideMatches:true});
    console.log(`Real browser ZIP passed ${setting}.`);
  }
  await page.goto(urlFor(cases[0],'invalid'),{waitUntil:'networkidle'});
  assert.ok((await exportAdvice()).includes(editions[0].cautions[0]));
  assert.deepEqual(errors,[]);
  await writeFile(`${dir}/report.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify({base,cycleTested:!exportsOnly,uniqueEditions:seen.size,wrapsAfter20:!exportsOnly,pdfOnePage:results.pdfs.length,zipSettings:results.downloads.length,errors}));
}finally{await browser.close();}
