import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const preview = !process.argv.includes('--write');
const root = process.cwd();
const sourceDir = path.join(root, 'ไฟล์ Preset');
const pdfDir = path.join(root, 'ไฟล์ เครื่องมือ (ประกอบเป็น Preset)');
const sourceFiles = (await readdir(sourceDir)).filter(name => name.endsWith('.xlsx')).sort();
if (sourceFiles.length !== 2) throw new Error(`Expected 2 source workbooks, found ${sourceFiles.length}`);
const manifest = createHash('sha256');
for (const name of sourceFiles) manifest.update(await readFile(path.join(sourceDir, name)));
const hash = manifest.digest('hex');
// The parsed workbook snapshot must match these exact supplied files.
if (hash !== '394495e20e50a04901e95be70ecf81688b1bd4ca167e0ac587c184b141537ec4') throw new Error('Source workbooks changed; regenerate .prd-analysis/workbooks.json before importing');
const workbooks = JSON.parse(await readFile(path.join(root, '.prd-analysis', 'workbooks.json'), 'utf8'));
const sheet = (book, index) => workbooks[book].sheets[index].rows.map(row => Object.fromEntries(row.cells.map(cell => [cell.cell.match(/^[A-Z]+/)[0], cell.value])));
const rows = (book, index, code) => sheet(book, index).filter(row => code.test(String(row.A ?? '')));
const codeList = value => [...new Set(String(value ?? '').match(/T\d{2}/g) ?? [])];
const parseLabel = value => String(value ?? '').replace(/^[A-Z]\d{2}\s*/, '').trim();
const packagesRaw = rows(0, 3, /^IP-\d{2}$/);
const toolsRaw = rows(0, 2, /^T\d{2}$/);
const scenariosRaw = rows(0, 4, /^SC-\d{3}$/);
const planRows = new Map(rows(1, 1, /^SC-\d{3}$/).map(row => [row.A, row]));
const stepRows = rows(1, 2, /^SC-\d{3}$/);
const referralRows = new Map(rows(1, 5, /^IP-\d{2}$/).map(row => [row.A, row]));
const toolStepRows = rows(1, 3, /^T\d{2}$/);
const reasons = rows(1, 6, /^SC-\d{3}$/);
const pdfFiles = new Set((await readdir(pdfDir)).filter(name => name.endsWith('.pdf')));
const packageCodes = new Set(packagesRaw.map(row => row.A));
const toolCodes = new Set(toolsRaw.map(row => row.A));
if (packagesRaw.length !== 9 || toolsRaw.length !== 25 || scenariosRaw.length !== 54 || planRows.size !== 54 || pdfFiles.size !== 25) throw new Error('Source inventory count does not match the workbooks');
for (const row of toolsRaw) if (!pdfFiles.has(row.S)) throw new Error(`Missing PDF for ${row.A}: ${row.S}`);
for (const row of scenariosRaw) {
  if (!packageCodes.has(row.B) || !planRows.has(row.A)) throw new Error(`Missing package or action plan: ${row.A}`);
  for (const column of ['H', 'I', 'J', 'K']) for (const code of codeList(row[column])) if (!toolCodes.has(code)) throw new Error(`Missing tool ${code} for ${row.A}`);
}
const statusOf = value => ({ 'มีเครื่องมือหลัก': 'primary_available', 'มีเฉพาะเครื่องมือเสริม': 'support_only', 'ไม่มีเครื่องมือในคลัง': 'no_tool' })[value];
for (const row of scenariosRaw) if (!statusOf(row.L)) throw new Error(`Unknown status: ${row.A}`);
const packages = release_id => packagesRaw.map(row => ({ release_id, code: row.A, title_th: row.B, goal_th: row.C, measures_label_th: row.D, roles_label_th: row.E, setting_label_th: row.F, level_label_th: row.G, limitations_th: row.M || null, trust_status: 'simulated' }));
const tools = release_id => toolsRaw.map(row => ({ release_id, code: row.A, title_th: row.B, description_th: row.D, tool_kind: row.C, trust_status: 'simulated', source_payload: { activity: row.L, audiences: row.E, roles: [row.G, row.H].filter(Boolean).join('; '), setting: row.I, steps: row.M, preparation: row.N, risks: row.O, success: row.P, indicators: row.Q, packageIds: String(row.K ?? '').match(/IP-\d{2}/g) ?? [], sourceLabel: row.T, sourceStatus: row.U, previewAssetPath: `${hash}/${row.S}`, detailedSteps: toolStepRows.filter(step => step.A === row.A).map(step => ({ order: Number(step.C), when: step.D, action: step.E, owner: step.F, preparation: step.G, indicator: step.H })) } }));
const scenarios = release_id => scenariosRaw.map(row => {
  const plan = planRows.get(row.A);
  const steps = stepRows.filter(step => step.A === row.A).map(step => ({ order: Number(step.B), when: step.C, action: step.D, owner: step.E, tool: step.F, setting: step.G, outcome: step.H, preparation: step.I }));
  return { release_id, code: row.A, package_code: row.B, setting_code: row.C, operator_role_code: String(row.D).match(/^R\d{2}/)?.[0] ?? '', target_group_code: String(row.E).match(/^G\d{2}/)?.[0] ?? '', intervention_level: row.F === 'ป้องกัน' ? 'prevention' : 'cessation', catalogue_status: statusOf(row.L), content_status: 'simulated', summary_th: plan.G || row.M || null, source_payload: { role: parseLabel(row.D), audience: parseLabel(row.E), level: row.F, activity: row.G, intro: plan.H, host: plan.I === '-' ? '' : plan.I, phases: [plan.J, plan.K, plan.L, plan.M], referral: plan.N || referralRows.get(row.B)?.C || '', steps, toolReasons: reasons.filter(reason => reason.A === row.A).map(reason => ({ code: reason.B, label: reason.D, reason: reason.E })), sourceNote: row.M || '' } };
});
const links = release_id => scenariosRaw.flatMap(row => [['H', 'primary'], ['I', 'supporting'], ['J', 'measurement'], ['K', 'reference']].flatMap(([column, slot]) => codeList(row[column]).map((tool_code, index) => ({ release_id, scenario_code: row.A, tool_code, slot, display_order: index + 1, reason_th: reasons.find(reason => reason.A === row.A && reason.B === tool_code)?.E || null }))));
const report = { sourceHash: hash, packages: packagesRaw.length, tools: toolsRaw.length, scenarios: scenariosRaw.length, links: links('00000000-0000-0000-0000-000000000000').length, pdfs: pdfFiles.size, mode: preview ? 'check-only' : 'write-draft' };
if (preview) { console.log(JSON.stringify(report)); process.exit(0); }
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error('Supabase environment is missing');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const check = ({ error }, stage) => { if (error) throw new Error(`${stage}: ${error.message}`); };
const existing = await client.from('content_releases').select('id,workflow_status').eq('source_manifest_hash', hash).limit(1).maybeSingle();
check(existing, 'Find release');
if (existing.data) throw new Error(`Already imported: ${existing.data.id} (${existing.data.workflow_status})`);
const created = await client.from('content_releases').insert({ version_label: `source-${hash.slice(0,12)}`, workflow_status: 'draft', trust_status: 'simulated', source_manifest_hash: hash, change_note: 'นำเข้าข้อมูลจากไฟล์โครงการเพื่อให้ผู้ดูแลตรวจทาน; มีเนื้อหาจำลองและยังไม่ผ่านการรับรอง' }).select('id').single();
check(created, 'Create release');
const releaseId = created.data.id;
for (const [stage, table, data] of [['packages', 'packages', packages(releaseId)], ['tools', 'tools', tools(releaseId)], ['scenarios', 'scenarios', scenarios(releaseId)], ['scenario_tools', 'scenario_tools', links(releaseId)]]) {
  const result = await client.from(table).insert(data);
  check(result, stage);
}
let bucket = await client.storage.getBucket('source-tool-cards');
if (bucket.error && bucket.error.status !== 404 && bucket.error.statusCode !== '404') throw bucket.error;
if (!bucket.data) {
  bucket = await client.storage.createBucket('source-tool-cards', { public: false, allowedMimeTypes: ['application/pdf'] });
  check(bucket, 'Create private bucket');
}
if (bucket.data?.public) throw new Error('Source bucket unexpectedly public');
for (const row of toolsRaw) {
  const bytes = await readFile(path.join(pdfDir, row.S));
  const result = await client.storage.from('source-tool-cards').upload(`${hash}/${row.S}`, bytes, { contentType: 'application/pdf', upsert: false });
  check(result, `Upload ${row.S}`);
}
console.log(JSON.stringify({ ...report, releaseId, uploadedPdfs: pdfFiles.size }));
