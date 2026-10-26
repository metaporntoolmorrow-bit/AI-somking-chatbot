import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import JSZip from 'jszip';
import { conversationState, resolveConversationPreset } from '../presets/real-tools-v1/conversation.mjs';

const preset=JSON.parse(await readFile('presets/real-tools-v1/presets.json','utf8'));
const base=process.env.TEST_BASE_URL||'http://localhost:3000';
const groups=new Map();
for(const row of preset.scenarios){const a=row.answers,key=[a.settingCode,a.roleCode,a.packageId,a.level].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
let selections=0;
for(const rows of groups.values())for(let mask=1;mask<2**rows.length;mask++){
  const selected=rows.filter((_,i)=>mask&(1<<i));
  const input={...selected[0].answers,audienceCodes:selected.map(s=>s.answers.audienceCode)};
  const result=resolveConversationPreset(preset,input);
  assert.deepEqual(result.scenarioCodes,selected.map(s=>s.code));
  assert.equal(result.conversation.answeredQuestions.length,4);
  selections++;
}
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
await mkdir('output/qa',{recursive:true});
let testedGroups=0;const runtimeErrors=[];const downloads=[];
const onlyFive=process.argv.includes('--smoke');
const rowsToTest=onlyFive?preset.settings.map(setting=>[preset.scenarios.find(s=>s.answers.settingCode===setting.code)]):[...groups.values()];
try{
  for(const rows of rowsToTest){
    const first=rows[0];
    const page=await browser.newPage({viewport:{width:1365,height:900}});
    page.on('pageerror',e=>runtimeErrors.push(e.message));
    await page.goto(`${base}/plan`,{waitUntil:'networkidle'});
    let input={};
    for(let i=0;i<3;i++){
      const state=conversationState(preset,input);const question=state.nextQuestion;
      assert.equal(await page.locator('.chat-confirm').count(),0,'Single choice must advance without confirmation');
      await page.locator('.chat-bubble.question strong').last().waitFor();
      assert.equal(await page.locator('.chat-bubble.question strong').last().innerText(),question.text);
      const value=first.answers[question.key];
      const label=question.options.find(o=>o.value===value).label;
      await page.getByRole('button',{name:label,exact:true}).click();input[question.key]=value;
    }
    const audiences=conversationState(preset,input).nextQuestion;
    assert.equal(audiences.key,'audienceCodes');
    assert.equal(await page.locator('.chat-bubble.question strong').last().innerText(),audiences.text);
    const confirm=page.locator('.chat-confirm');assert.equal(await confirm.isDisabled(),true);
    // Verify back navigation clears dependent answers and skips the derived level.
    await page.getByRole('button',{name:'ย้อนกลับไปแก้คำตอบ'}).click();
    assert.equal(await page.locator('.chat-bubble.question strong').last().innerText(),preset.questions[2].text);
    const goal=preset.packages.find(p=>p.code===first.answers.packageId).choiceLabel;
    await page.getByRole('button',{name:goal,exact:true}).click();
    for(const row of rows)await page.getByRole('button',{name:row.answerLabels.audience,exact:true}).click();
    await confirm.click();await page.waitForURL('**/result?**');
    await page.getByRole('button',{name:'ดาวน์โหลดแผน PDF',exact:true}).waitFor();
    assert.equal(await page.locator('.print-document').count(),rows.length);
    const zip=page.getByRole('link',{name:'ดาวน์โหลดชุดเครื่องมือ ZIP',exact:true});
    await zip.waitFor();
    assert.equal(await page.locator('.result-audience-nav a').count(),rows.length>1?rows.length:0);
    const link=await zip.getAttribute('href');
    // The endpoint must redirect directly to private Storage, avoiding Vercel binary limits.
    const response=await page.request.get(`${base}${link}`,{maxRedirects:0});assert.equal(response.status(),302);
    const location=response.headers().location;
    assert.match(location,/\/storage\/v1\/object\/sign\/real-tool-assets\//);
    if(downloads.length<5&& !downloads.some(d=>d.setting===first.answers.settingCode)){
      const file=await page.request.get(location);assert.equal(file.status(),200);
      const bytes=await file.body();const archive=await JSZip.loadAsync(bytes,{checkCRC32:true});
      const text=await archive.file('ลิงก์เครื่องมือ.txt').async('string');
      const codes=[...new Set(rows.flatMap(r=>Object.values(r.tools).flat()))];
      const assets=preset.assets.filter(a=>a.toolCodes.some(c=>codes.includes(c)));
      for(const asset of assets){
        if(asset.hosting==='bundle'){
          const name=asset.fileName.replace(/[\\/:*?"<>|\u0000-\u001f]/g,' ').trim();
          const entry=Object.values(archive.files).find(f=>f.name.endsWith('/'+name));assert.ok(entry,asset.code);
          const actual=await entry.async('nodebuffer');assert.equal(createHash('sha256').update(actual).digest('hex'),asset.sha256);
        }else for(const download of asset.downloads)assert.ok(text.includes(download.url));
      }
      downloads.push({setting:first.answers.settingCode,bytes:bytes.length,files:assets.length});
      await page.screenshot({path:`output/qa/result-${first.answers.settingCode}-desktop.png`,fullPage:true});
      await page.emulateMedia({media:'print'});
      await page.pdf({path:`output/qa/plan-${first.answers.settingCode}.pdf`,format:'A4',printBackground:true});
      await page.emulateMedia({media:'screen'});
      await page.setViewportSize({width:390,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile result overflows');
      await page.screenshot({path:`output/qa/result-${first.answers.settingCode}-mobile.png`,fullPage:true});
      await page.goto(`${base}/plan`,{waitUntil:'networkidle'});
      assert.equal(await page.locator('.chat-choice').count(),5);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile chat overflows');
      await page.screenshot({path:`output/qa/chat-${first.answers.settingCode}-mobile.png`,fullPage:true});
    }
    await page.close();testedGroups++;if(testedGroups%8===0)console.log(`Browser passed ${testedGroups}/${rowsToTest.length} context groups.`);
  }
  const page=await browser.newPage();
  assert.equal((await page.request.get(`${base}/api/tool-bundle/REAL-0001?scenarios=REAL-0179`,{maxRedirects:0})).status(),400);
  assert.equal((await page.request.get(`${base}/api/tool-file/MAIN-01?asset=FILE-99`,{maxRedirects:0})).status(),404);
  await page.goto(`${base}/admin`);assert.match(page.url(),/\/login/);
  for(const asset of preset.assets.filter(a=>a.hosting==='bundle')){
    const response=await page.request.get(`${base}/api/tool-file/${asset.toolCodes[0]}?asset=${asset.code}`,{maxRedirects:0});assert.equal(response.status(),302);
    const file=await page.request.get(response.headers().location);assert.equal(file.status(),200);
    assert.equal(createHash('sha256').update(await file.body()).digest('hex'),asset.sha256);
  }
  assert.deepEqual(runtimeErrors,[]);
  const report={base,selections,testedGroups,downloads,smallFilesVerified:10,invalidSelectionRejected:true,adminProtected:true,runtimeErrors};
  await writeFile('output/qa/release-test.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}finally{await browser.close();}
