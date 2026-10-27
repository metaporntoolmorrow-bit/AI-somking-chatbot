// Regression: withdrawn advice must not appear in any generated plan or ZIP guide.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import JSZip from 'jszip';
import {conversationState} from '../presets/real-tools-v1/conversation.mjs';
import {assertPlanContentPolicy} from '../src/lib/plan-content-policy.mjs';
const base=process.env.TEST_BASE_URL||'http://localhost:3000';
const preset=JSON.parse(await readFile('presets/real-tools-v1/presets.json','utf8'));assertPlanContentPolicy(preset);
const groups=new Map();for(const row of preset.scenarios){const a=row.answers,key=[a.settingCode,a.roleCode,a.packageId,a.level].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
const cases=preset.settings.map(s=>[...groups.values()].filter(rows=>rows[0].answers.settingCode===s.code).sort((a,b)=>new Set(b.flatMap(r=>r.useSequence.map(s=>s.rank+':'+s.toolCode))).size-new Set(a.flatMap(r=>r.useSequence.map(s=>s.rank+':'+s.toolCode))).size)[0]);
const dir='output/qa/plan-downloads-v6';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const context=await browser.newContext({viewport:{width:1365,height:900},acceptDownloads:true});
const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));const page=await context.newPage();
await page.addInitScript(()=>{window.print=()=>{window.__printRequested=true;};});
const results={base,pdfs:[],downloads:[],errors};const removed=/ข้อควรระวัง|แนวทางการใช้ประโยชน์/;
try{
for(const [i,rows] of cases.entries()){
const setting=rows[0].answers.settingCode;
if(process.argv.includes('--downloads-only'))await page.goto(base+'/result?'+new URLSearchParams({scenario:rows[0].code,scenarios:rows.map(s=>s.code).join(',')}),{waitUntil:'networkidle'});
else{
await page.goto(base+'/plan',{waitUntil:'networkidle'});let input={};
for(let qn=0;qn<3;qn++){const q=conversationState(preset,input).nextQuestion;assert.equal(await page.locator('.chat-confirm').count(),0);const value=rows[0].answers[q.key];await page.getByRole('button',{name:q.options.find(o=>o.value===value).label,exact:true}).click();input[q.key]=value;}
for(const row of rows)await page.getByRole('button',{name:row.answerLabels.audience,exact:true}).click();await page.locator('.chat-confirm').click();await page.waitForURL('**/result?**');assert.equal(new URL(page.url()).searchParams.has('guidance'),false);
}
assert.equal(await page.locator('.print-guidance').count(),0);assert.ok(!removed.test(await page.locator('.print-document').textContent()));
if(i===0){const previous=await page.title();await page.getByRole('button',{name:'ดาวน์โหลดแผน PDF',exact:true}).click();assert.equal(await page.evaluate(()=>window.__printRequested),true);await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));assert.equal(await page.title(),previous);}
const actions=await page.locator('.usage-description').allTextContents();const zip=page.getByRole('link',{name:'ดาวน์โหลดชุดเครื่องมือ ZIP',exact:true});
if(i===0){await page.route('**/api/tool-bundle/**',route=>route.fulfill({status:503,body:'unavailable'}));await zip.click();await page.locator('.export-wrap [role="alert"]').waitFor();await page.unroute('**/api/tool-bundle/**');}
const pending=page.waitForEvent('download',{timeout:90000});await zip.click();const download=await pending;assert.equal(download.suggestedFilename(),'ชุดเครื่องมือสำหรับคุณ.zip');assert.equal(await download.failure(),null);const file=dir+'/'+setting+'.zip';await download.saveAs(file);assert.equal(await page.locator('.export-wrap [role="alert"]').count(),0);
const archive=await JSZip.loadAsync(await readFile(file),{checkCRC32:true});const guide=await archive.file('00-เริ่มใช้แพ็กเกจ.txt').async('string');assert.ok(!removed.test(guide));for(const action of actions)assert.ok(guide.includes(action));
const links=await archive.file('ลิงก์เครื่องมือ.txt').async('string');const codes=[...new Set(rows.flatMap(r=>Object.values(r.tools).flat()))],assets=preset.assets.filter(a=>a.toolCodes.some(c=>codes.includes(c)));const hashes=new Set(assets.filter(a=>a.hosting==='bundle').map(a=>a.sha256));
for(const entry of Object.values(archive.files).filter(f=>!f.dir)){assert.ok(!entry.name.includes('GUIDE-'));if(/\.(pdf|png|docx|pptx)$/i.test(entry.name))assert.ok(hashes.has(createHash('sha256').update(await entry.async('nodebuffer')).digest('hex')));}
for(const asset of assets){if(asset.hosting==='bundle'){const name=asset.fileName.replace(/[\\/:*?"<>|\u0000-\u001f]/g,' ').trim();const entry=Object.values(archive.files).find(f=>f.name.endsWith('/'+name));assert.ok(entry);assert.equal(createHash('sha256').update(await entry.async('nodebuffer')).digest('hex'),asset.sha256);}else for(const link of asset.downloads)assert.ok(links.includes(link.url));}
await page.emulateMedia({media:'print'});await page.evaluate(()=>document.fonts.ready);const pdf=dir+'/'+setting+'.pdf';await page.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});assert.match(execFileSync('pdfinfo',[pdf]).toString(),/Pages:\s+1\b/);assert.ok(!removed.test(execFileSync('pdftotext',['-enc','UTF-8',pdf,'-']).toString('utf8')));await page.emulateMedia({media:'screen'});
results.pdfs.push(setting);results.downloads.push({setting,filename:download.suggestedFilename(),withdrawnSectionsAbsent:true});console.log('Plan PDF and ZIP passed '+setting+'.');
}
assert.deepEqual(errors,[]);await writeFile(dir+'/report.json',JSON.stringify(results,null,2));console.log(JSON.stringify({base,pdfOnePage:results.pdfs.length,zipSettings:results.downloads.length,withdrawnSectionsAbsent:true,errors}));
}finally{await browser.close();}
