import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import {conversationState,resolveConversationPreset} from '../presets/real-tools-v1/conversation.mjs';
import {buildDownloadManifest} from '../presets/real-tools-v1/resolver.mjs';

const preset=JSON.parse(await readFile('presets/real-tools-v1/presets.json','utf8'));
const base=process.env.TEST_BASE_URL||'http://localhost:3000';
const dir='output/qa/concept-v3';await mkdir(dir,{recursive:true});
const smoke=process.argv.includes('--smoke');
assert.equal(preset.packages.length,10);assert.equal(preset.tools.filter(t=>t.category==='main').length,18);
assert.equal(preset.tools.length,18);assert.equal(preset.tools.filter(t=>t.category==='component_guidance').length,0);
assert.equal(preset.release.sourceEvidence.length,8);
assert.equal(preset.tools.find(t=>t.code==='MAIN-07').kind,'รายงานและภาพสรุป');
assert.equal(preset.tools.find(t=>t.code==='MAIN-01').title.includes('อุดมศึกษา'),false);
for(const evidence of preset.release.sourceEvidence)assert.equal(createHash('sha256').update(await readFile(evidence.relativePath)).digest('hex'),evidence.sha256);
const groups=new Map();
for(const row of preset.scenarios){
  const a=row.answers,key=[a.settingCode,a.roleCode,a.packageId,a.level].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);
  const codes=Object.values(row.tools).flat();
  assert.ok(codes.every(code=>preset.tools.some(t=>t.code===code)));
  assert.ok(!codes.some(code=>code.startsWith('SUP-')));
  if(codes.some(code=>['MAIN-17','MAIN-18'].includes(code)))assert.equal(a.settingCode,'HEA');
  if(row.tools.measurement.includes('MAIN-03'))assert.ok(['primary_lower','primary_upper'].includes(a.audienceCode));
  if(row.tools.measurement.includes('MAIN-06'))assert.equal(a.audienceCode,'secondary');
  assert.ok(!row.tools.measurement.includes('MAIN-07'));
  if(['student_leader','university_leader'].includes(a.roleCode))assert.ok(!['early_childhood','primary_lower'].includes(a.audienceCode));
  assert.ok(codes.every(code=>/^MAIN-\d{2}$/.test(code)));
  if(a.packageId==='PK-EDU-YOUTH')assert.ok(codes.includes('MAIN-01')&&codes.includes('MAIN-02'));
}
let combinations=0;
for(const rows of groups.values())for(let mask=1;mask<2**rows.length;mask++){
  const selected=rows.filter((_,i)=>mask&(1<<i));const input={...selected[0].answers,audienceCodes:selected.map(s=>s.answers.audienceCode)};
  assert.deepEqual(resolveConversationPreset(preset,input).scenarioCodes,selected.map(s=>s.code));
  const m=buildDownloadManifest(preset,input);assert.ok(m.toolCodes.length>=1);
  assert.ok(m.toolCodes.every(code=>m.useSequence.some(step=>step.toolCode===code)),'Tool lacks an ordered use step');
  assert.equal(new Set(m.localFiles.map(f=>f.assetCode)).size,m.localFiles.length);combinations++;
}
console.log(`Source checks passed: ${preset.scenarios.length} paths, ${groups.size} contexts, ${combinations} selections.`);
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const context=await browser.newContext({viewport:{width:1365,height:900}});
const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
const rowsForPackage=code=>[...groups.values()].filter(rows=>rows[0].packageCode===code).sort((a,b)=>b.length-a.length)[0];
const urlFor=(rows,id=1)=>`${base}/result?${new URLSearchParams({scenario:rows[0].code,scenarios:rows.map(r=>r.code).join(','),guidance:String(id)})}`;
const report={base,paths:preset.scenarios.length,combinations,conversations:[],pdfs:[],originalFiles:[]};
try{
  const page=await context.newPage();
  for(const [index,pkg] of preset.packages.entries()){
    const rows=rowsForPackage(pkg.code),first=rows[0];
    await page.goto(`${base}/plan`,{waitUntil:'networkidle'});let input={};
    for(let i=0;i<3;i++){
      const q=conversationState(preset,input).nextQuestion;
      assert.equal(await page.locator('.chat-bubble.question strong').last().innerText(),q.text);
      assert.equal(await page.locator('.chat-confirm').count(),0);
      if(pkg.code==='PK-EDU-POLICY'&&i===2){
        assert.equal(await page.locator('.chat-choice').count(),5);
        await page.screenshot({path:`${dir}/goals-desktop.png`,fullPage:true});
        await page.setViewportSize({width:390,height:844});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        await page.screenshot({path:`${dir}/goals-mobile.png`,fullPage:true});await page.setViewportSize({width:1365,height:900});
      }
      const answer=first.answers[q.key];await page.getByRole('button',{name:q.options.find(o=>o.value===answer).label,exact:true}).click();input[q.key]=answer;
    }
    for(const row of rows)await page.getByRole('button',{name:row.answerLabels.audience,exact:true}).click();
    await page.locator('.chat-confirm').click();await page.waitForURL('**/result?**');
    await page.getByRole('button',{name:'ดาวน์โหลดแผน PDF',exact:true}).waitFor();
    assert.equal(await page.locator('.package-files').count(),0,'Duplicate file list is still present');
    assert.equal(await page.getByRole('heading',{name:pkg.title,exact:true}).count(),1);
    const expected=new Set(rows.flatMap(r=>r.useSequence.map(s=>`${s.rank}:${s.toolCode}`)));
    assert.equal(await page.locator('.usage-list>li').count(),expected.size);
    assert.equal(await page.locator('.usage-list h3 a').count(),expected.size);
    const toolCodes=new Set(rows.flatMap(r=>Object.values(r.tools).flat()));
    assert.equal(await page.locator('.print-tool-follow').count(),toolCodes.size>1?1:0);
    assert.deepEqual(await page.locator('.result-section h2').allTextContents(),['สถานการณ์','เครื่องมือหลัก / เสริม','ลำดับการใช้เครื่องมือ']);
    assert.equal(await page.locator('.usage-guidance').count(),0);
    assert.equal(await page.locator('.print-guidance').count(),0);
    assert.ok(!/ข้อควรระวัง|แนวทางการใช้ประโยชน์/.test(await page.locator('.print-document').textContent()));
    if(index<4){await page.screenshot({path:`${dir}/result-${pkg.code}.png`,fullPage:true});}
    report.conversations.push(pkg.code);console.log(`Conversation passed ${pkg.code}.`);
  }
  await page.close();
  let next=0;const all=smoke?preset.packages.map(pkg=>rowsForPackage(pkg.code)):[...groups.values()];
  await Promise.all(Array.from({length:3},async()=>{
    const p=await context.newPage();
    while(next<all.length){const i=next++,rows=all[i];await p.goto(urlFor(rows,i%20+1),{waitUntil:'networkidle'});
      assert.equal(await p.locator('.package-files').count(),0);
      await p.emulateMedia({media:'print'});await p.evaluate(()=>document.fonts.ready);
      const file=`${dir}/context-${i+1}.pdf`;await p.pdf({path:file,preferCSSPageSize:true,printBackground:true});
      const info=execFileSync('pdfinfo',[file]).toString();assert.match(info,/Pages:\s+1\b/,file+' overflowed');
      const size=info.match(/Page size:\s+([\d.]+) x ([\d.]+)/);assert.ok(Number(size[1])>Number(size[2]));
      report.pdfs.push({context:i+1,package:rows[0].packageCode,pages:1});
    }await p.close();
  }));
  for(const asset of preset.assets.filter(a=>a.hosting==='bundle')){
    const tool=preset.tools.find(t=>asset.toolCodes.includes(t.code));
    const response=await context.request.get(`${base}/api/tool-file/${tool.code}?asset=${asset.code}`,{maxRedirects:0});assert.equal(response.status(),302);
    const file=await context.request.get(response.headers().location);assert.equal(file.status(),200);
    assert.equal(createHash('sha256').update(await file.body()).digest('hex'),asset.sha256);
    report.originalFiles.push({tool:tool.code,asset:asset.code});
  }
  for(let number=1;number<=5;number++)assert.equal((await context.request.get(`${base}/api/tool-file/GUIDE-0${number}?asset=FILE-${30+number}`,{maxRedirects:0})).status(),404);
  const admin=await context.request.get(`${base}/admin`,{maxRedirects:0});assert.ok([302,303,307,308].includes(admin.status()));assert.ok(admin.headers().location.includes('/login'));
  assert.deepEqual(errors,[]);await writeFile(`${dir}/report.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({base,conversations:report.conversations.length,onePageContexts:report.pdfs.length,originalFiles:report.originalFiles.length,duplicateListRemoved:true,errors}));
}finally{await browser.close();}
