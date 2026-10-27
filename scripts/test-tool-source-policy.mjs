import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {assertPlanContentPolicy} from '../src/lib/plan-content-policy.mjs';
import {assertToolSourcePolicy,isAllowedToolAsset,TOOL_ASSET_ROOT} from '../src/lib/tool-source-policy.mjs';

const preset=JSON.parse(await readFile('presets/real-tools-v1/presets.json','utf8'));
const baselineFlag=process.argv.find(a=>a.startsWith('--baseline='));
const before=baselineFlag?JSON.parse(await readFile(baselineFlag.slice('--baseline='.length),'utf8')):null;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const eligible=code=>/^MAIN-\d{2}$/.test(code);
assertToolSourcePolicy(preset);
assertPlanContentPolicy(preset);
assert.equal(preset.tools.length,18);
assert.equal(preset.assets.length,30);
assert.equal(preset.assets.filter(a=>a.hosting==='bundle').length,10);
if(before){
assert.deepEqual(preset.tools,before.tools.filter(t=>eligible(t.code)),'Eligible tools changed');
assert.deepEqual(preset.assets,before.assets.filter(a=>isAllowedToolAsset(a.relativePath)),'Original tool files or links changed');
for(const key of ['questions','conversationPolicy','packages','settings','roles','audiences'])assert.deepEqual(preset[key],before[key],key+' changed');
assert.equal(preset.scenarios.length,before.scenarios.length);
for(const row of preset.scenarios){
  const prior=before.scenarios.find(s=>s.code===row.code);assert.ok(prior);
  assert.deepEqual(row.answers,prior.answers);
  assert.deepEqual(row.answerLabels,prior.answerLabels);
  for(const slot of Object.keys(row.tools))assert.deepEqual(row.tools[slot],prior.tools[slot].filter(eligible));
  assert.deepEqual(row.useSequence,prior.useSequence.filter(s=>eligible(s.toolCode)).map((s,i)=>({...s,order:i+1})),'A removed document was reassigned as an unrelated tool');
  assert.ok(row.useSequence.length>0);
}
}
const forbidden=preset.release.sourceEvidence.filter(doc=>doc.relativePath.includes('/ไฟล์ข้อมูลองค์ประกอบ/')&&doc.relativePath.endsWith('.pdf')).map(doc=>({...doc,fileName:doc.relativePath.split('/').at(-1)}));assert.equal(forbidden.length,4);
const forbiddenHashes=new Set(forbidden.map(a=>a.sha256));
for(const asset of preset.assets){assert.ok(!forbiddenHashes.has(asset.sha256));assert.equal(sha(await readFile(asset.relativePath)),asset.sha256);}
assert.throws(()=>assertToolSourcePolicy({...preset,tools:[...preset.tools,{code:'GUIDE-01'}]}),/Non-tool document/);
assert.equal(isAllowedToolAsset(TOOL_ASSET_ROOT+'/../ไฟล์ข้อมูลองค์ประกอบ/example.pdf'),false);
assert.equal(isAllowedToolAsset(TOOL_ASSET_ROOT.replaceAll('/','\\')+'\\..\\example.pdf'),false);
console.log(JSON.stringify({sourcePolicyPassed:true,tools:18,assets:30,excludedDocuments:4,answerPaths:preset.scenarios.length,baselineCompared:Boolean(before)}));

if(process.argv.includes('--bundles')){
  const manifest=JSON.parse(await readFile('output/bundles/release/manifest.json','utf8'));
  const checkpoint=JSON.parse(await readFile(`.prd-analysis/${preset.release.code}-release.json`,'utf8'));
  assert.equal(manifest.releaseId,checkpoint.releaseId);
  assert.equal(manifest.bundles.length,31);
  for(const bundle of manifest.bundles){
    assert.ok(bundle.toolCodes.every(eligible));
    const bytes=await readFile(`output/bundles/release/${bundle.key}.zip`);assert.equal(sha(bytes),bundle.sha256);
    const zip=await JSZip.loadAsync(bytes,{checkCRC32:true});
    assert.ok(!/ข้อควรระวัง|แนวทางการใช้ประโยชน์/.test(await zip.file('00-เริ่มใช้แพ็กเกจ.txt').async('string')),'Withdrawn sections in stored ZIP guide');
    const expected=new Set(preset.assets.filter(a=>a.hosting==='bundle'&&a.toolCodes.some(c=>bundle.toolCodes.includes(c))).map(a=>a.sha256));
    const actual=new Set();
    for(const file of Object.values(zip.files).filter(f=>!f.dir)){
      assert.ok(!file.name.includes('GUIDE-'));
      for(const doc of forbidden)assert.ok(!file.name.endsWith(doc.fileName),'Excluded document found in ZIP');
      const data=await file.async('nodebuffer'),digest=sha(data);assert.ok(!forbiddenHashes.has(digest));
      if(/\.(pdf|png|docx|pptx)$/i.test(file.name)){assert.ok(expected.has(digest),'ZIP contains an unapproved source file');actual.add(digest);}
      else if(file.name.endsWith('.txt'))assert.ok(!data.toString('utf8').includes('GUIDE-'));
    }
    assert.deepEqual(actual,expected,'ZIP missing a real tool file');
  }
  console.log(JSON.stringify({bundlesPassed:true,bundles:manifest.bundles.length,releaseId:manifest.releaseId}));
}
