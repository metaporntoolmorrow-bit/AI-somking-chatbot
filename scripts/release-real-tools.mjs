// Versioned import: stage first, publish only after application validation.
// Uses server credentials from --env-file; never writes them to artifacts.
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';
import { buildDownloadManifest, formatDownloadLinks } from '../presets/real-tools-v1/resolver.mjs';
import { bundleIdentity } from '../src/lib/package-identity.mjs';

const root=process.cwd();
const bytes=await readFile('presets/real-tools-v1/presets.json');
const preset=JSON.parse(bytes);
const hash=value=>createHash('sha256').update(value).digest('hex');
const bundleKey=manifest=>hash(bundleIdentity(manifest.packageCode,manifest.toolCodes));
const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const bucket='real-tool-assets';
const checkpointPath=`.prd-analysis/${preset.release.code}-release.json`;
await mkdir('.prd-analysis',{recursive:true});
const must=({data,error},label)=>{if(error)throw new Error(`${label}: ${error.message}`);return data;};
const administrators=must(await client.from('profiles').select('user_id').eq('access_role','admin1').eq('account_status','active').limit(1),'administrator');
if(!administrators.length)throw new Error('No active administrator');
const actor=administrators[0].user_id;
const existing=must(await client.from('content_releases').select('*').eq('version_label',preset.release.code).maybeSingle(),'release');
const mode=process.argv[2];
if(!['--stage','--publish','--rollback','--verify'].includes(mode))throw new Error('Use --stage, --verify, --publish or --rollback');
const groups=new Map();
for(const row of preset.scenarios){const a=row.answers;const key=[a.settingCode,a.roleCode,a.packageId,a.level].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
const bundles=new Map();let selections=0;
for(const rows of groups.values())for(let mask=1;mask<2**rows.length;mask++){
  const selected=rows.filter((_,i)=>mask&(1<<i));
  const answers={...selected[0].answers,audienceCodes:selected.map(s=>s.answers.audienceCode)};
  const manifest=buildDownloadManifest(preset,answers);
  bundles.set(bundleKey(manifest),manifest);selections++;
}
if(preset.assets.some(a=>a.downloads.some(d=>!d.publicAccessVerified)))throw new Error('Drive public-reader verification required');

if(mode==='--rollback'){
  const saved=JSON.parse(await readFile(checkpointPath,'utf8'));
  if(saved.previousActive)must(await client.from('active_content_release').upsert(saved.previousActive),'restore pointer');
  else must(await client.from('active_content_release').delete().eq('singleton_id',1).eq('release_id',saved.releaseId),'restore empty pointer');
  console.log('Previous active catalog restored; new release and files retained.');process.exit(0);
}

let release=existing;
if(mode==='--stage'){
  if(release&&release.workflow_status!=='draft')throw new Error('Published release is immutable; use a new version label');
  const previousActive=must(await client.from('active_content_release').select('*').eq('singleton_id',1).maybeSingle(),'previous pointer');
  if(!release)release=must(await client.from('content_releases').insert({version_label:preset.release.code,source_manifest_hash:hash(bytes),change_note:'Real source files and contextual routing; publication requested by project owner.',created_by:actor}).select().single(),'create draft');
  else must(await client.from('content_releases').update({source_manifest_hash:hash(bytes)}).eq('id',release.id).eq('workflow_status','draft'),'refresh draft fingerprint');
  let saved;
  try{saved=JSON.parse(await readFile(checkpointPath,'utf8'));}catch{}
  await writeFile(checkpointPath,JSON.stringify({releaseId:release.id,version:release.version_label,previousActive:saved?.releaseId===release.id?saved.previousActive:previousActive},null,2));
  const buckets=must(await client.storage.listBuckets(),'buckets');
  if(!buckets.some(b=>b.id===bucket))must(await client.storage.createBucket(bucket,{public:false,fileSizeLimit:50000000}),'create private assets bucket');
  const cache=new Map();
  const sourceRoot=await realpath(path.join(root,'ชุดเครื่องมือใหม่+track'));
  const upload=async(objectPath,buffer,type)=>{
    const result=await client.storage.from(bucket).upload(objectPath,buffer,{contentType:type,upsert:true,cacheControl:'3600'});
    must(result,'upload '+objectPath);
  };
  for(const asset of preset.assets.filter(a=>a.hosting==='bundle')){
    const resolved=await realpath(path.resolve(root,asset.relativePath));
    if(!resolved.startsWith(sourceRoot+path.sep))throw new Error('Source path outside project tools');
    const data=await readFile(resolved);
    if(hash(data)!==asset.sha256||data.length>preset.release.thresholdBytes)throw new Error('Source file mismatch: '+asset.code);
    cache.set(asset.code,data);
    await upload(`${release.id}/assets/${asset.code}${asset.extension}`,data,asset.mimeType);
  }
  console.log(`Uploaded ${cache.size} verified original small files.`);
  await mkdir('output/bundles/release',{recursive:true});
  const bundleReport=[];
  for(const [key,manifest] of bundles){
    const zip=new JSZip();
    const expected=[];
    const folderFor=code=>{const tool=preset.tools.find(t=>t.code===code);return `${String(manifest.toolCodes.indexOf(code)+1).padStart(2,'0')}-${tool.shortTitle||tool.title}`.replace(/[\\/:*?"<>|\u0000-\u001f]/g,' ');};
    for(const file of manifest.localFiles){
      const name=file.fileName.replace(/[\\/:*?"<>|\u0000-\u001f]/g,' ').trim();
      const folder=['evaluation_report','infographic'].includes(file.fileKind)?'ข้อมูลประกอบ':'เครื่องมือ';
      const asset=preset.assets.find(a=>a.code===file.assetCode);
      const firstCode=manifest.toolCodes.find(code=>asset.toolCodes.includes(code));
      const archivePath=`เครื่องมือ/${folderFor(firstCode)}/${folder}/${name}`;
      zip.file(archivePath,cache.get(file.assetCode));expected.push({archivePath,assetCode:file.assetCode});
    }
    zip.file('ลิงก์เครื่องมือ.txt',formatDownloadLinks(preset,manifest));
    for(const code of manifest.toolCodes){
      const links=manifest.externalFiles.filter(f=>f.toolCodes.includes(code));
      const content=manifest.contentLinks.filter(f=>f.toolCode===code);
      if(links.length||content.length)zip.file(`เครื่องมือ/${folderFor(code)}/ลิงก์ไฟล์ใหญ่และสื่อ.txt`,'\uFEFF'+[...links.flatMap(f=>[f.title||f.fileName,f.url,'']),...content.flatMap(f=>[f.title,f.url,''])].join('\n'));
    }
    const selectedTools=preset.tools.filter(t=>manifest.toolCodes.includes(t.code));
    const pkg=preset.packages.find(p=>p.code===manifest.packageCode);
    const common=preset.scenarios.find(s=>s.packageCode===manifest.packageCode);
    zip.file('00-เริ่มใช้แพ็กเกจ.txt','\uFEFF'+[pkg.title,pkg.goal,'','ลำดับการใช้เครื่องมือ',...manifest.useSequence.map(s=>`${s.order}. ${s.shortTitle} — ${s.stage}\n   ${s.action}\n   สิ่งที่อยากได้: ${s.outcome}`),'','ข้อควรระวัง',...common.cautions.map(s=>'- '+s),'','แนวทางการใช้ประโยชน์',...common.benefits.map(s=>'- '+s),'',common.guidanceNote,'','ไฟล์ต้นฉบับขนาดไม่เกิน 6 MB อยู่ในโฟลเดอร์เครื่องมือ ไฟล์ใหญ่เปิดจากลิงก์ใน TXT','รายงานและภาพสรุปแยกไว้เป็นข้อมูลประกอบ ไม่ใช่แบบประเมินเปล่า'].join('\n'));
    zip.file('รายการชุดเครื่องมือ.txt','\uFEFF'+['ชุดเครื่องมือสำหรับแผนที่คุณเลือก','',...selectedTools.flatMap(t=>[t.title,...(t.editorialNote?[t.editorialNote]:[]),'']),'ไฟล์ขนาดใหญ่เปิดจาก ลิงก์เครื่องมือ.txt'].join('\n'));
    const data=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
    const reopened=await JSZip.loadAsync(data,{checkCRC32:true});
    for(const f of expected)if(hash(await reopened.file(f.archivePath).async('nodebuffer'))!==hash(cache.get(f.assetCode)))throw new Error('Archive changed source bytes');
    if(!(await reopened.file('ลิงก์เครื่องมือ.txt').async('string')).includes('ลิงก์ไฟล์เครื่องมือ'))throw new Error('Missing links TXT');
    await writeFile(`output/bundles/release/${key}.zip`,data);
    await upload(`${release.id}/bundles/${key}.zip`,data,'application/zip');
    bundleReport.push({key,packageCode:manifest.packageCode,toolCodes:manifest.toolCodes,sizeBytes:data.length,sha256:hash(data)});
    if(bundleReport.length%10===0)console.log(`Built and uploaded ${bundleReport.length}/${bundles.size} ZIP combinations.`);
  }
  const label=(list,codes)=>[...new Set(codes)].map(code=>list.find(x=>x.code===code)?.label||code).join(' / ');
  const packages=preset.packages.map(p=>{const rows=preset.scenarios.filter(s=>s.packageCode===p.code);return {release_id:release.id,code:p.code,title_th:p.title,goal_th:p.goal,setting_label_th:label(preset.settings,[p.settingCode]),level_label_th:label(preset.levels,rows.map(s=>s.answers.level)),roles_label_th:label(preset.roles,rows.map(s=>s.answers.roleCode)),trust_status:'partially_verified'};});
  must(await client.from('packages').upsert(packages,{onConflict:'release_id,code'}),'packages');
  const tools=preset.tools.map(t=>{
    const scenarios=preset.scenarios.filter(s=>Object.values(s.tools).flat().includes(t.code));
    const assets=preset.assets.filter(a=>a.toolCodes.includes(t.code));
    const files=assets.flatMap(a=>a.hosting==='bundle'?[{id:a.code,name:a.fileName,url:`/api/tool-file/${t.code}?asset=${a.code}`,sizeBytes:a.sizeBytes,kind:a.fileKind,mimeType:a.mimeType,storagePath:`${release.id}/assets/${a.code}${a.extension}`}]:a.downloads.map((d,i)=>({id:`${a.code}-${i+1}`,name:d.title||d.fileName,url:d.url,sizeBytes:d.sizeBytes,kind:a.fileKind,mimeType:a.mimeType,publicAccessVerified:d.publicAccessVerified})));
    files.push(...t.contentLinks.map((url,i)=>({id:`content-${i+1}`,name:'ชุดสื่อตามลิงก์ในเอกสารต้นฉบับ',url,sizeBytes:0,kind:'source_link',mimeType:'text/uri-list'})));
    return {release_id:release.id,code:t.code,title_th:t.title,description_th:t.editorialNote||t.kind,tool_kind:t.kind,trust_status:'partially_verified',lifecycle_status:'active',source_payload:{assetBucket:bucket,bundleSchemaVersion:2,shortTitle:t.shortTitle,files,downloadReady:files.length>0,activity:t.title,packageIds:[...new Set(scenarios.map(s=>s.packageCode))],audiences:label(preset.audiences,scenarios.map(s=>s.answers.audienceCode)),roles:label(preset.roles,scenarios.map(s=>s.answers.roleCode)),setting:label(preset.settings,Object.keys(t.scope)),source:t,assetManifest:assets}};
  });
  must(await client.from('tools').upsert(tools,{onConflict:'release_id,code'}),'tools');
  const toolNames=new Map(preset.tools.map(t=>[t.code,t.title]));
  const scenarios=preset.scenarios.map(s=>({release_id:release.id,code:s.code,package_code:s.packageCode,setting_code:s.answers.settingCode,operator_role_code:s.answers.roleCode,target_group_code:s.answers.audienceCode,intervention_level:s.answers.level,catalogue_status:s.catalogueStatus,content_status:'partially_verified',summary_th:s.summary,source_payload:{role:s.answerLabels.role,audience:s.answerLabels.audience,level:s.answerLabels.level,activity:s.title,intro:s.editorialNote,host:s.host,phases:s.phases,useSequence:s.useSequence,cautions:s.cautions,benefits:s.benefits,guidanceNote:s.guidanceNote,steps:s.steps.map(step=>({...step,tool:step.tool.split(/[,;]\s*/).map(code=>toolNames.get(code)||code).join(' / ')})),packageChoiceLabel:preset.packages.find(p=>p.code===s.packageCode).choiceLabel,bundleReady:true,source:s}}));
  must(await client.from('scenarios').upsert(scenarios,{onConflict:'release_id,code'}),'scenarios');
  const links=preset.scenarios.flatMap(s=>Object.entries(s.tools).flatMap(([slot,codes])=>codes.map((tool_code,i)=>({release_id:release.id,scenario_code:s.code,tool_code,slot,display_order:i+1,reason_th:s.editorialNote||null}))));
  for(let i=0;i<links.length;i+=250)must(await client.from('scenario_tools').upsert(links.slice(i,i+250),{onConflict:'release_id,scenario_code,tool_code,slot'}),'scenario links');
  await writeFile('output/bundles/release/manifest.json',JSON.stringify({releaseId:release.id,selections,bundles:bundleReport},null,2));
  must(await client.from('content_audit_logs').insert({actor_user_id:actor,release_id:release.id,entity_type:'release',entity_code:preset.release.code,action:'import',after_value:{packages:packages.length,tools:tools.length,scenarios:scenarios.length,bundles:bundleReport.length,manifestHash:hash(bytes)},reason:'นำเข้าเครื่องมือจริงตามไฟล์โครงการและคำขอเจ้าของโครงการ โดยยังไม่เปลี่ยนชุดข้อมูลที่ใช้งาน'}),'import audit');
  console.log(JSON.stringify({releaseId:release.id,packages:packages.length,tools:tools.length,scenarios:scenarios.length,links:links.length,bundles:bundles.size,selections,activeUnchanged:true}));
}else{
  if(!release)throw new Error('Stage release first');
  if(release.source_manifest_hash!==hash(bytes))throw new Error('Preset changed after staging; stage the draft again before publication');
  for(const [table,expected] of [['packages',preset.packages.length],['tools',preset.tools.length],['scenarios',preset.scenarios.length]]){
    const r=await client.from(table).select('code',{count:'exact',head:true}).eq('release_id',release.id);must(r,table);if(r.count!==expected)throw new Error('Incomplete '+table);
  }
  const objects=must(await client.storage.from(bucket).list(`${release.id}/bundles`,{limit:1000}),'bundle storage');
  if(objects.filter(o=>o.name.endsWith('.zip')).length!==bundles.size)throw new Error('Missing prepared ZIPs');
  const assets=must(await client.storage.from(bucket).list(`${release.id}/assets`,{limit:100}),'asset storage');
  if(assets.length!==preset.assets.filter(a=>a.hosting==='bundle').length)throw new Error('Missing original small files');
  if(mode==='--publish'){
    if(release.workflow_status!=='published'){
      for(const table of ['packages','tools','scenarios'])must(await client.from(table).update(table==='scenarios'?{content_status:'approved'}:{trust_status:'approved'}).eq('release_id',release.id),'approve '+table);
      must(await client.from('content_releases').update({workflow_status:'published',trust_status:'approved',approved_by:actor,approved_at:new Date().toISOString(),published_at:new Date().toISOString()}).eq('id',release.id).eq('workflow_status','draft'),'publish release');
    }
    must(await client.from('active_content_release').upsert({singleton_id:1,release_id:release.id,activated_at:new Date().toISOString(),activated_by:actor}),'activate release');
    must(await client.from('content_audit_logs').insert({actor_user_id:actor,release_id:release.id,entity_type:'release',entity_code:preset.release.code,action:'publish',after_value:{releaseId:release.id},reason:'เจ้าของโครงการอนุมัติให้นำชุดคำถามและเครื่องมือจริงขึ้นเว็บไซต์ การอนุมัตินี้หมายถึงการเผยแพร่เนื้อหา ไม่ใช่การรับรองทางการแพทย์'}),'publish audit');
  }
  console.log(JSON.stringify({verified:true,releaseId:release.id,bundles:bundles.size,assets:assets.length,published:mode==='--publish'}));
}
