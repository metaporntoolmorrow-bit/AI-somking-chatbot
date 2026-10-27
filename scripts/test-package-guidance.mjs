import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {guidanceForContext,guidanceEditionsFor,packageGuidanceProfiles,guidanceCombinations} from '../src/lib/package-guidance-core.mjs';
import {summarizePackages} from './lib/write-package-guidance.mjs';

const preset=JSON.parse(await readFile('presets/real-tools-v1/presets.json','utf8'));
const summary=summarizePackages(preset),dir='output/qa/package-guidance';await mkdir(dir,{recursive:true});
const expectedCounts=[[28,508,1],[33,524,17],[33,524,1],[25,140,1],[12,28,1],[18,189,4],[8,12,2],[18,42,2],[4,4,1],[8,12,1]];
assert.deepEqual(summary.map(p=>[p.singlePaths,p.multiPaths,p.toolSets]),expectedCounts);
assert.equal(guidanceCombinations.length,20);
assert.equal(new Set(guidanceCombinations.map(a=>[...a].sort().join(','))).size,20,'Reordering the same advice is not a new set');
const statements=new Map();
for(const pkg of preset.packages){
  const profile=packageGuidanceProfiles[pkg.code];assert.equal(profile.points.length,6);
  const editions=guidanceEditionsFor({packageId:pkg.code});assert.equal(editions.length,20);
  assert.equal(new Set(editions.map(e=>e.cautions.join('\n'))).size,20);
  assert.equal(new Set(editions.map(e=>e.benefits.join('\n'))).size,20);
  for(const text of [...profile.requiredCautions,...profile.points.flatMap(p=>[p.caution,p.benefit])]){
    assert.ok(!statements.has(text),'Text is shared across packages: '+text);statements.set(text,pkg.code);
  }
  for(const edition of editions)for(const required of profile.requiredCautions)assert.ok(edition.cautions.includes(required));
}
for(const row of preset.scenarios){
  const expected=guidanceForContext({packageId:row.packageCode,audienceCodes:[row.answers.audienceCode],toolCodes:Object.values(row.tools).flat(),edition:1});
  assert.deepEqual(row.cautions,expected.cautions,'Preset has stale cautions '+row.code);
  assert.deepEqual(row.benefits,expected.benefits,'Preset has stale benefits '+row.code);
}
for(let id=1;id<=20;id++){
  const learn=guidanceForContext({packageId:'PK-EDU-LEARN',toolCodes:['MAIN-07'],audienceCodes:['university'],edition:id});
  assert.ok(learn.cautions.some(t=>t.includes('ไม่ใช่แบบประเมินรายบุคคล')));
  assert.ok(learn.cautions.includes(packageGuidanceProfiles['PK-EDU-LEARN'].universityCaution));
  const health=guidanceForContext({packageId:'PK-HEA-SERVICE',edition:id});
  assert.ok(health.cautions.some(t=>t.includes('ไม่ใช่คำสั่งวินิจฉัย')));
}
assert.equal(guidanceForContext({packageId:'__proto__'}),null);
const baselineFlag=process.argv.find(a=>a.startsWith('--baseline='));
if(baselineFlag){
  const before=JSON.parse(await readFile(baselineFlag.slice('--baseline='.length),'utf8'));
  const fingerprint=p=>createHash('sha256').update(JSON.stringify({questions:p.questions,packages:p.packages,scenarios:p.scenarios.map(s=>({code:s.code,answers:s.answers,tools:s.tools,useSequence:s.useSequence})),assets:p.assets})).digest('hex');
  assert.equal(fingerprint(preset),fingerprint(before),'Question, routing, tool order, or source files changed');
}

// Independent CSV reader: supports quoted newlines and doubled quotation marks.
function csvRows(text){const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(field);field='';}
    else if(c==='\n'&&!quoted){row.push(field);if(row.some(Boolean))rows.push(row);row=[];field='';}
    else if(c!=='\r'||quoted)field+=c;
  }if(field||row.length){row.push(field);rows.push(row);}return rows;
}
const exported=JSON.parse(await readFile('presets/real-tools-v1/export-status.json','utf8'));
const rows=csvRows((await readFile('presets/real-tools-v1/'+exported.presetCsv,'utf8')).replace(/^\uFEFF/,''));
assert.equal(rows.length,188);const [headers,...records]=rows;
for(const record of records){const item=preset.scenarios.find(s=>s.code===record[0]);assert.ok(item);
  for(const [key,values] of [['ข้อควรระวัง',item.cautions],['แนวทางการใช้ประโยชน์',item.benefits]])assert.equal(record[headers.indexOf(key)].replaceAll('\\n','\n').replaceAll('\r\n','\n'),values.join('\n'));
}
const adviceCsv=csvRows((await readFile('presets/real-tools-v1/guidance-by-package.csv','utf8')).replace(/^\uFEFF/,''));assert.equal(adviceCsv.length,201);
const preview=await readFile('presets/real-tools-v1/chat-preview.md','utf8');
for(const pkg of preset.packages){assert.ok(preview.includes('## '+pkg.title));for(const text of guidanceForContext({packageId:pkg.code}).benefits)assert.ok(preview.includes(text));}
console.log(JSON.stringify({sourcePassed:true,packages:10,editions:200,paths:187,multiPaths:1983,toolSets:31,csv:exported.presetCsv,mappingUnchanged:Boolean(baselineFlag)}));
if(process.argv.includes('--source-only'))process.exit(0);

const base=process.env.TEST_BASE_URL||'http://localhost:3000',smoke=process.argv.includes('--smoke');
const groups=new Map();for(const row of preset.scenarios){const a=row.answers,k=[a.packageId,a.roleCode,a.level].join('|');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(row);}
const score=rows=>new Set(rows.flatMap(r=>r.useSequence.map(s=>s.rank+':'+s.toolCode))).size*10000+rows.length*100+rows[0].answerLabels.role.length;
const contexts=preset.packages.map(pkg=>[...groups.values()].filter(rows=>rows[0].packageCode===pkg.code).sort((a,b)=>score(b)-score(a))[0]);
const jobs=contexts.flatMap(rows=>Array.from({length:smoke?1:20},(_,i)=>({rows,id:smoke?7:i+1})));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
let next=0;const checked=[],runtimeErrors=[];
try{
  await Promise.all(Array.from({length:3},async()=>{
    const page=await browser.newPage({viewport:{width:1047,height:718}});page.on('pageerror',e=>runtimeErrors.push(e.message));
    while(next<jobs.length){
      const {rows,id}=jobs[next++],first=rows[0];const params=new URLSearchParams({scenario:first.code,scenarios:rows.map(r=>r.code).join(','),guidance:String(id)});
      await page.goto(`${base}/result?${params}`,{waitUntil:'networkidle'});
      const expected=guidanceForContext({packageId:first.packageCode,audienceCodes:rows.map(r=>r.answers.audienceCode),toolCodes:[...new Set(rows.flatMap(r=>Object.values(r.tools).flat()))],edition:id});
      const advice=[...expected.cautions,...expected.benefits];
      assert.deepEqual(await page.locator('.result-section h2').allTextContents(),['สถานการณ์','เครื่องมือหลัก / เสริม','ลำดับการใช้เครื่องมือ']);
      assert.equal(await page.locator('.usage-guidance, .usage-guidance-note, .usage-source-note').count(),0,'Expert guidance must not appear in the result preview');
      const toolCodes=[...new Set(rows.flatMap(r=>Object.values(r.tools).flat()))];
      const primaryCodes=new Set(rows.flatMap(r=>r.tools.primary));
      const toolRows=page.locator('.result-tools li');assert.equal(await toolRows.count(),toolCodes.length);
      for(const row of await toolRows.all()){
        const code=await row.getAttribute('data-tool-id');assert.ok(toolCodes.includes(code));
        assert.equal(await row.locator('.result-tool-kind').innerText(),primaryCodes.has(code)?'หลัก':'เสริม');
      }
      assert.deepEqual(await page.locator('.print-guidance li').allTextContents(),advice);
      assert.equal(await page.locator('.package-files').count(),0);
      if(['PK-EDU-LEARN','PK-EDU-ENV'].includes(first.packageCode)&&id===(smoke?7:1)){
        const prefix=first.packageCode==='PK-EDU-ENV'?'reference-':'';
        await page.setViewportSize({width:1365,height:900});await page.screenshot({path:`${dir}/${prefix}desktop.png`,fullPage:true});
        await page.setViewportSize({width:320,height:740});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        const controls=await page.locator('.export-buttons .button').evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height};}));
        assert.equal(controls.length,2);assert.equal(controls[0].y,controls[1].y);
        for(const control of controls){assert.ok(control.x>=0&&control.right<=390);assert.ok(control.y>=0&&control.bottom<=844);assert.ok(control.height>=44);}
        await page.screenshot({path:`${dir}/${prefix}mobile.png`,fullPage:true});await page.setViewportSize({width:1047,height:718});
      }
      await page.emulateMedia({media:'print'});await page.evaluate(()=>document.fonts.ready);
      const height=await page.locator('.print-sheet').evaluate(e=>e.getBoundingClientRect().height);
      assert.ok(height<718,`${first.packageCode} edition ${id} exceeds one page: ${height}`);
      if(id===(smoke?7:1)){
        const file=`${dir}/${first.packageCode}.pdf`;await page.pdf({path:file,preferCSSPageSize:true,printBackground:true});
        assert.match(execFileSync('pdfinfo',[file]).toString(),/Pages:\s+1\b/);
      }
      checked.push({packageId:first.packageCode,edition:id,height});await page.emulateMedia({media:'screen'});
      if(checked.length%40===0)console.log(`Package-specific UI and print passed ${checked.length}/${jobs.length}.`);
    }await page.close();
  }));
  assert.deepEqual(runtimeErrors,[]);
  await writeFile(`${dir}/report.json`,JSON.stringify({base,sourcePassed:true,checked,runtimeErrors},null,2));
  console.log(JSON.stringify({base,packages:10,editionsChecked:checked.length,onePage:true,csvMatches:true,runtimeErrors}));
}finally{await browser.close();}
