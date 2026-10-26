import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root=process.cwd();
const parts=JSON.parse(await readFile(path.join(root,'output','pdf','tool15-parts.json'),'utf8'));
const temporary=path.join(os.tmpdir(),'ai-smoking-tool15-pages');
const qa=path.join(temporary,'qa');
await mkdir(qa,{recursive:true});
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:8*1024*1024});if(r.error||r.status!==0)throw new Error(r.error?.message||r.stderr);return r.stdout;};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const original=path.join(temporary,'source.pdf');
const sourceText=path.join(qa,'source.txt');
run('pdftotext',['-layout','-nopgbrk','-enc','UTF-8',original,sourceText]);
let nextPage=1;
const textParts=[];
const rendered=[];
for(const part of parts){
  if(part.start_page!==nextPage)throw new Error('Gap or overlap between PDF parts');
  const split=path.join(temporary,part.file_name);
  const textPath=path.join(qa,part.file_name+'.txt');
  run('pdftotext',['-layout','-nopgbrk','-enc','UTF-8',split,textPath]);
  textParts.push(await readFile(textPath,'utf8'));
  for(const [label,sourcePage,partPage] of [['first',part.start_page,1],['last',part.end_page,part.page_count]]){
    const sourceImage=path.join(qa,`${part.start_page}-${label}-source`);
    const partImage=path.join(qa,`${part.start_page}-${label}-part`);
    run('pdftoppm',['-f',String(sourcePage),'-l',String(sourcePage),'-scale-to','700','-png','-singlefile',original,sourceImage]);
    run('pdftoppm',['-f',String(partPage),'-l',String(partPage),'-scale-to','700','-png','-singlefile',split,partImage]);
    const same=sha(await readFile(sourceImage+'.png'))===sha(await readFile(partImage+'.png'));
    if(!same)throw new Error(`Rendered page changed: original ${sourcePage}`);
    rendered.push({sourcePage,partFile:part.file_name,partPage,pixelIdentical:true});
  }
  nextPage=part.end_page+1;
}
const normalize=text=>text.replace(/\s+/gu,'');
const fullTextUnchanged=normalize(await readFile(sourceText,'utf8'))===normalize(textParts.join(''));
if(!fullTextUnchanged||nextPage!==225)throw new Error('Original PDF text or page coverage differs');
const report={sourcePages:224,partCount:parts.length,coveredPages:nextPage-1,fullTextUnchanged,boundaryPagesCompared:rendered.length,rendered};
await writeFile(path.join(root,'presets','real-tools-v1','pdf-parts-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
