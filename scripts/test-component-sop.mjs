import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {availableContextChoices,contextKeys} from '../src/lib/context-paths.mjs';
import {componentFor,componentContent,COMPONENT_SOURCE} from '../presets/real-tools-v2/component-content.mjs';

const preset=JSON.parse(await readFile('presets/real-tools-v2/presets.json','utf8'));
const baselinePath=process.argv.find(arg=>arg.startsWith('--baseline='))?.slice(11);
if(baselinePath){
  const old=JSON.parse(await readFile(baselinePath,'utf8'));
  assert.deepEqual(preset.assets,old.assets,'Original files and links changed');
  const shape=p=>p.scenarios.map(s=>({code:s.code,answers:s.answers,tools:s.tools}));
  assert.deepEqual(shape(preset),shape(old),'Matching routes or selected tools changed');
}
const documents=new Map();let totalPages=0;
for(const source of preset.release.componentSources){
  assert.equal(createHash('sha256').update(await readFile(source.relativePath)).digest('hex'),source.sha256);
  const raw=execFileSync('pdftotext',['-raw','-enc','UTF-8',source.relativePath,'-'],{maxBuffer:16000000}).toString('utf8');
  const pages=raw.split('\f').filter(p=>p.trim()).map(p=>p.replace(/\s/g,''));
  documents.set(source.code,pages);totalPages+=pages.length;
}
const expectedSteps={goal_c1:8,goal_c2:5,goal_c3:3,goal_c4:4,goal_c5:5};
const references=new Set();
for(const row of preset.scenarios){
  const component=componentFor(row.context),pages=documents.get(component.code);
  assert.equal(row.component.code,component.code);assert.equal(row.useSequence.length,expectedSteps[row.context.goalC]);
  assert.equal(row.contextNarrative.length,3);assert.ok(row.contextNarrative.every(line=>line.length<220&&!/undefined|คุณเคย|จากที่คุณพบ/.test(line)));
  assert.ok(row.contextNarrative[1].includes(String(component.number)));
  assert.equal(row.implementationGuidance.source,COMPONENT_SOURCE);assert.equal(row.implementationGuidance.items.length,6);
  for(const ref of [...component.steps,...component.guidance]){
    assert.ok(ref.sourcePages.length&&ref.sourceAnchor);
    const text=ref.sourcePages.map(page=>pages[page-1]||'').join('');
    assert.ok(text.includes(ref.sourceAnchor.replace(/\s/g,'')),`${component.code} missing source: ${ref.sourceAnchor}`);
    references.add(`${component.code}:${ref.sourceAnchor}`);
  }
  for(const item of row.implementationGuidance.items){assert.ok(item.tags.includes(row.context.goalC));assert.ok(item.tags.includes(row.context.setting));assert.ok([4,5,6].includes(item.sourceSection));}
  assert.ok(row.useSequence.every(step=>step.action&&step.outcome&&step.sourcePages.length));
}
const paths=preset.scenarios.map(row=>row.context);let leaves=0,prefixes=0;
function walk(answers,index){
  if(index===contextKeys.length){assert.equal(paths.filter(p=>contextKeys.every(k=>p[k]===answers[k])).length,1);leaves++;return;}
  const key=contextKeys[index],question=preset.questions.find(q=>q.key===key);
  const options=availableContextChoices(paths,answers,key,question.options);assert.ok(options.length,'Dead end before final answer');prefixes++;
  for(const option of options)walk({...answers,[key]:option.value},index+1);
}
walk({},0);assert.equal(leaves,176);
const health=preset.questions[1];assert.deepEqual(availableContextChoices(paths,{setting:'setting_health'},'role',health.options).map(o=>o.value),['role_health_agent']);
assert.equal(new Set(Object.values(componentContent).flatMap(c=>c.guidance.map(i=>i.id))).size,30);
console.log(JSON.stringify({sourceDocuments:documents.size,sourcePages:totalPages,verifiedReferences:references.size,guidanceTags:30,reachableTerminals:leaves,validPrefixes:prefixes,deadEnds:0,mappingUnchanged:Boolean(baselinePath)}));
