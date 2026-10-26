import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const preset=JSON.parse(await readFile('presets/real-tools-v1/presets.json','utf8'));
const groups=new Map();
for(const row of preset.scenarios){const a=row.answers,key=[a.settingCode,a.roleCode,a.packageId,a.level].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
const cases=[...groups.values()];
const base=process.env.TEST_BASE_URL||'http://localhost:3000';
const dir='output/qa/pdf-artwork';
await mkdir(dir,{recursive:true});
const urlFor=rows=>`${base}/result?${new URLSearchParams({scenario:rows[0].code,scenarios:rows.map(s=>s.code).join(',')})}`;
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
  const page=await browser.newPage({viewport:{width:1365,height:900}});
  await page.goto(urlFor(cases[0]),{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'ดาวน์โหลดแผน PDF',exact:true}).waitFor();
  const baseline=process.argv.includes('--baseline');
  for(const [name,size] of [['desktop',{width:1365,height:900}],['mobile',{width:390,height:844}]]){
    await page.setViewportSize(size);
    const screenshot=await page.screenshot({fullPage:true});
    if(baseline)await writeFile(`${dir}/baseline-${name}.png`,screenshot);
    else{
      assert.ok(screenshot.equals(await readFile(`${dir}/baseline-${name}.png`)),`On-screen ${name} preview changed`);
      await writeFile(`${dir}/verified-${name}.png`,screenshot);
    }
  }
  if(baseline){console.log('Saved existing desktop and mobile previews for exact comparison.');}
  else{
    await page.evaluate(()=>{window.print=()=>{document.documentElement.dataset.printRequested='true';};});
    await page.getByRole('button',{name:'ดาวน์โหลดแผน PDF',exact:true}).click();
    assert.equal(await page.locator('html').getAttribute('data-print-requested'),'true');
    await page.close();
    let next=0;const results=[];
    await Promise.all(Array.from({length:3},async()=>{
      const p=await browser.newPage({viewport:{width:1123,height:794}});
      while(next<cases.length){
        const index=next++,rows=cases[index];
        await p.goto(urlFor(rows),{waitUntil:'networkidle'});
        await p.emulateMedia({media:'print'});await p.evaluate(()=>document.fonts.ready);
        assert.equal(await p.locator('.print-tool-card').count(),2);
        const stepIds=new Set(rows.flatMap(s=>s.useSequence.map(step=>`${step.rank}:${step.toolCode}`)));
        assert.equal(await p.locator('.print-sequence li').count(),stepIds.size);
        assert.equal(await p.locator('.print-document').count(),1);
        assert.equal(await p.locator('.print-guidance h2').count(),2);
        const filename=`${dir}/context-${String(index+1).padStart(2,'0')}.pdf`;
        await p.pdf({path:filename,preferCSSPageSize:true,printBackground:true});
        const info=execFileSync('pdfinfo',[filename]).toString();
        assert.match(info,/Pages:\s+1\b/,'PDF overflowed one page');
        const size=info.match(/Page size:\s+([\d.]+) x ([\d.]+)/);assert.ok(Number(size[1])>Number(size[2]),'PDF must be landscape');
        results.push({case:index+1,package:rows[0].packageCode,setting:rows[0].answers.settingCode,groups:rows.length,steps:stepIds.size,pages:1});
        if(results.length%8===0)console.log(`PDF passed ${results.length}/${cases.length} contexts.`);
      }
      await p.close();
    }));
    const report={base,onScreenPreviewUnchanged:true,nativePrintButtonWorks:true,contexts:results.sort((a,b)=>a.case-b.case),allOnePage:true,orientation:'A4 landscape'};
    await writeFile(`${dir}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({base,contexts:results.length,allOnePage:true,onScreenPreviewUnchanged:true}));
  }
}finally{await browser.close();}
