import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import JSZip from 'jszip';
import {assertToolSourcePolicy} from '../src/lib/tool-source-policy.mjs';
import {assertPlanContentPolicy} from '../src/lib/plan-content-policy.mjs';
import {bundleIdentity} from '../src/lib/package-identity.mjs';

const preset=JSON.parse(await readFile('presets/real-tools-v2/presets.json','utf8'));
const old=JSON.parse(await readFile('presets/real-tools-v1/presets.json','utf8'));
const coverage=JSON.parse(await readFile('presets/real-tools-v2/coverage.json','utf8'));
const registry=JSON.parse(await readFile('presets/real-tools-v2/tool-registry.json','utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
assertToolSourcePolicy(preset);assertPlanContentPolicy(preset);
assert.deepEqual(preset.assets,old.assets,'Source bytes and download links must remain unchanged');
assert.equal(coverage.length,625);assert.equal(new Set(coverage.map(r=>JSON.stringify([r.setting,r.role,r.targetYouth,r.goalC]))).size,625);
for(const row of coverage){const matches=preset.scenarios.filter(s=>Object.entries(s.context).every(([k,v])=>row[k]===v));assert.equal(matches.length,row.status==='matched'?1:0);}
assert.equal(registry.main.length,18);assert.equal(registry.supplementary.length,21);assert.ok(registry.supplementary.every(t=>!t.routingEnabled&&t.fileUrl===null));
for(const asset of preset.assets)assert.equal(hash(await readFile(asset.relativePath)),asset.sha256,'Changed source '+asset.code);
for(const row of preset.scenarios){assert.equal(row.useSequence.length,3);assert.ok(row.useSequence.every(s=>s.toolCodes.every(c=>Object.values(row.tools).flat().includes(c))));}
const expectedSets=new Map();for(const row of preset.scenarios){const tools=Object.values(row.tools).flat();const key=hash(bundleIdentity(row.packageCode,tools));const prior=expectedSets.get(key);if(!prior||JSON.stringify(prior.answerLabels).length<JSON.stringify(row.answerLabels).length)expectedSets.set(key,row);}
assert.equal(expectedSets.size,15);
console.log(JSON.stringify({sourcePassed:true,contexts:625,matched:preset.scenarios.length,gaps:coverage.length-preset.scenarios.length,toolSets:expectedSets.size,originalAssets:30}));
if(process.argv.includes('--source-only'))process.exit(0);

const base=process.env.TEST_BASE_URL||'http://localhost:3000';
const output='output/qa/master-v7';await mkdir(output,{recursive:true});
const url=row=>`${base}/result?${new URLSearchParams(row.context)}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const errors=[],pdfs=[];let flows=0,zips=0;
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.on('pageerror',error=>errors.push(error.message));
try{
  if(!process.argv.includes('--smoke')){
    for(const [key,row] of expectedSets){
      await page.goto(url(row),{waitUntil:'networkidle'});await page.emulateMedia({media:'print'});await page.evaluate(()=>document.fonts.ready);
      assert.equal(await page.locator('.print-step-column').count(),3);
      assert.equal(await page.locator('.print-implementation').count(),1);
      const file=`${output}/plan-${key.slice(0,8)}.pdf`;
      await page.pdf({path:file,preferCSSPageSize:true,printBackground:true});
      assert.match(execFileSync('pdfinfo',[file]).toString(),/Pages:\s+1\b/,file+' overflowed');
      const text=execFileSync('pdftotext',['-enc','UTF-8',file,'-']).toString('utf8');
      for(const title of ['ปัจจัยความสำเร็จ','ข้อควรระวัง','มาตรฐานความสำเร็จ'])assert.ok(text.includes(title),file+' missing '+title);
      assert.ok(!text.includes('แนวทางการใช้ประโยชน์'));
      pdfs.push({scenario:row.code,tools:Object.values(row.tools).flat(),file});
    }
    await page.emulateMedia({media:'screen'});
    console.log(`One-page PDF variants passed ${pdfs.length}.`);
  }
  for(const setting of preset.settings){
    const row=preset.scenarios.find(s=>s.context.setting===setting.code&&s.context.targetYouth!=='youth_early')||preset.scenarios.find(s=>s.context.setting===setting.code);
    await page.setViewportSize({width:390,height:844});await page.goto(`${base}/plan`,{waitUntil:'networkidle'});
    for(let index=0;index<4;index++){
      const question=preset.questions[index],label=question.options.find(o=>o.value===row.context[question.key]).label;
      assert.equal(await page.locator('.chat-confirm').count(),0);
      assert.match(await page.locator('.chat-identity span').textContent(),new RegExp(`${index+1}.*4`));
      if(index===1){await page.getByRole('button',{name:'ย้อนกลับไปแก้คำตอบ'}).click();assert.match(await page.locator('.chat-identity span').textContent(),/1.*4/);await page.locator('.chat-choice').filter({hasText:preset.questions[0].options.find(o=>o.value===row.context.setting).label}).click();}
      if(index===3&&flows===0){
        await page.waitForFunction(()=>{const question=[...document.querySelectorAll('.chat-exchange')].at(-1)?.querySelector('.chat-bubble.question');const header=document.querySelector('.chat-header');const composer=document.querySelector('.chat-composer');if(!question||!header||!composer)return false;const rect=question.getBoundingClientRect();return rect.top>=header.getBoundingClientRect().bottom-1&&rect.bottom<=composer.getBoundingClientRect().top+1;});
        await page.screenshot({path:`${output}/wizard-mobile.png`,fullPage:true});
      }
      await page.locator('.chat-choice').filter({hasText:label}).click();
    }
    await page.waitForURL(/\/result\?/);await page.locator('.usage-list').waitFor();
    assert.equal(await page.locator('.usage-list>li').count(),3);
    assert.equal(await page.locator('.result-tools>li').count(),Object.values(row.tools).flat().length);
    assert.equal(await page.locator('.implementation-column').count(),3);
    const summary=await page.locator('.context-summary-banner').textContent();
    for(const q of preset.questions)assert.ok(summary.includes(q.options.find(o=>o.value===row.context[q.key]).label));
    assert.ok(!(await page.locator('.result-screen').textContent()).includes('ข้อมูลทดลอง'));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(flows===0){await page.screenshot({path:`${output}/result-mobile.png`,fullPage:true});await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:`${output}/result-desktop.png`,fullPage:true});}
    const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'ดาวน์โหลดชุดเครื่องมือ ZIP',exact:true}).click();const download=await downloadPromise;
    assert.equal(download.suggestedFilename(),'ชุดเครื่องมือสำหรับคุณ.zip');
    const bytes=await readFile(await download.path()),archive=await JSZip.loadAsync(bytes,{checkCRC32:true});
    const guide=await archive.file('00-เริ่มใช้แพ็กเกจ.txt').async('string');
    assert.ok(guide.includes(row.answerLabels.role));assert.ok(guide.includes('ข้อควรระวัง'));
    for(const step of row.useSequence)assert.ok(guide.includes(step.action));
    for(const asset of preset.assets.filter(a=>a.toolCodes.some(c=>Object.values(row.tools).flat().includes(c)))){
      if(asset.hosting==='bundle'){const entry=Object.values(archive.files).find(e=>!e.dir&&e.name.endsWith('/'+asset.fileName.replace(/[\\/:*?"<>|\u0000-\u001f]/g,' ').trim()));assert.ok(entry,asset.fileName);assert.equal(hash(await entry.async('nodebuffer')),asset.sha256);}
      else {const links=await archive.file('ลิงก์เครื่องมือ.txt').async('string');for(const link of asset.downloads)assert.ok(links.includes(link.url));}
    }
    assert.ok(!Object.keys(archive.files).some(name=>/GUIDE-|ไฟล์ข้อมูลองค์ประกอบ/.test(name)));
    zips++;flows++;
  }
  // Missing and malformed contexts never render an export action or an invented plan.
  const missing=coverage.find(r=>r.status==='no_match');
  await page.goto(`${base}/result?${new URLSearchParams({setting:missing.setting,role:missing.role,targetYouth:missing.targetYouth,goalC:missing.goalC})}`,{waitUntil:'networkidle'});
  assert.equal(await page.locator('.export-wrap').count(),0);assert.equal(await page.locator('#no-package-title').count(),1);
  await page.goto(`${base}/result?setting=bad&role=bad&targetYouth=bad&goalC=bad`,{waitUntil:'networkidle'});assert.equal(await page.locator('.export-wrap').count(),0);
  await page.goto(`${base}/result?scenario=REAL4-0001&scenario=REAL4-0002`,{waitUntil:'networkidle'});assert.equal(await page.locator('.result-empty').count(),1);
  assert.equal((await fetch(`${base}/api/tool-file/GUIDE-01`)).status,404);
  assert.equal((await fetch(`${base}/admin`,{redirect:'manual'})).status,307);

  // Persist once, verify the actual private record, retry the same token, then
  // delete only this test's nonce so user satisfaction totals aren't polluted.
  if(process.argv.includes('--feedback')){
    const row=preset.scenarios[0];await page.goto(url(row),{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'ส่งผลประเมิน',exact:true}).click();await page.locator('.feedback-error').waitFor();
    await page.getByRole('radio',{name:'5 ดาว',exact:true}).check();await page.getByLabel('ข้อเสนอแนะเพิ่มเติม').fill('QA master spec automated verification');
    await page.route('**/api/feedback',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'ทดสอบส่งซ้ำ'})}));
    await page.getByRole('button',{name:'ส่งผลประเมิน',exact:true}).click();await page.getByText('ทดสอบส่งซ้ำ',{exact:true}).waitFor();assert.equal(await page.getByLabel('ข้อเสนอแนะเพิ่มเติม').inputValue(),'QA master spec automated verification');
    await page.unroute('**/api/feedback');
    const requestPromise=page.waitForRequest(r=>r.url().endsWith('/api/feedback')&&r.method()==='POST');
    await page.getByRole('button',{name:'ส่งผลประเมิน',exact:true}).click();const input=(await requestPromise).postDataJSON();
    const claims=JSON.parse(Buffer.from(input.token.split('.')[0],'base64url').toString('utf8'));
    const object=`${claims.releaseId}/${claims.id}.json`;
    const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
    try{
      await page.locator('.satisfaction-saved').waitFor();
      const post=data=>fetch(`${base}/api/feedback`,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(data)});
      assert.equal((await post({...input,rating:1})).status,200);
      const saved=await service.storage.from('plan-feedback').download(object);assert.equal(saved.error,null);const record=JSON.parse(await saved.data.text());assert.equal(record.rating,5);assert.equal(record.scenarioId,row.code);
      const anonymous=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
      assert.ok((await anonymous.storage.from('plan-feedback').download(object)).error,'Feedback must be private');
      assert.equal((await post({...input,token:input.token+'tampered'})).status,400);
      assert.equal((await post({...input,rating:6})).status,400);
      assert.equal((await fetch(`${base}/api/feedback`,{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify(input)})).status,403);
      console.log('Private feedback persistence, idempotency and access checks passed.');
    }finally{const cleanup=await service.storage.from('plan-feedback').remove([object]);assert.equal(cleanup.error,null);}
  }
  assert.deepEqual(errors,[]);
  const report={base,contexts:625,matched:176,flows,pdfVariants:pdfs.length,zips,errors,pdfs};
  await writeFile(`${output}/report${base.includes('localhost')?'-local':'-production'}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}
