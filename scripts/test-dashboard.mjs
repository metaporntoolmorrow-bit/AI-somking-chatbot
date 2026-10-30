import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import vm from 'node:vm';
import {createClient} from '@supabase/supabase-js';
import {chromium} from '@playwright/test';
import {createDashboardDemoSessions,aggregateDashboard,dashboardDemoReport,dashboardCsv} from '../src/lib/dashboard-demo.mjs';

const referenceFile='แดชบอร์ด/2026-10-30/https-ai-somking-chatbot-vercel-app/work/lean-data.js';
const reference=JSON.parse(vm.runInNewContext((await readFile(referenceFile,'utf8'))+';JSON.stringify(sessions)',{}, {timeout:2000}));
const mapped=reference.map(s=>({day:s.day,stage:s.stage,setting:s.s,role:s.r,youth:s.y,goal:s.g,matched:s.matched}));
assert.deepEqual(createDashboardDemoSessions().sort((a,b)=>a.day-b.day||a.stage-b.stage||JSON.stringify(a).localeCompare(JSON.stringify(b))),mapped.sort((a,b)=>a.day-b.day||a.stage-b.stage||JSON.stringify(a).localeCompare(JSON.stringify(b))));
function parseCsv(text){return text.replace(/^\uFEFF/,'').trimEnd().split(/\r?\n/).map(line=>[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replaceAll('""','"')));}
for(const period of [30,14,7]){
  const report=dashboardDemoReport(period),rows=reference.filter(s=>s.day>=31-period),completed=rows.filter(s=>s.stage===4);
  assert.equal(report.started,rows.length);assert.equal(report.completed,completed.length);assert.equal(report.matched,completed.filter(s=>s.matched).length);
  for(const bars of Object.values(report.distributions))assert.equal(bars.reduce((sum,b)=>sum+b.count,0),report.completed);
  const csv=parseCsv(dashboardCsv(period));assert.equal(csv.length,report.totalContexts+1);assert.ok(csv.every(row=>row.length===8));
  assert.equal(csv.slice(1).reduce((sum,row)=>sum+Number(row[5]),0),report.completed);assert.equal(csv.slice(1).reduce((sum,row)=>sum+Number(row[6]),0),report.matched);
}
assert.equal(dashboardDemoReport(30).completionRate,78.8);assert.equal(dashboardDemoReport(30).matchRate,92.7);assert.equal(dashboardDemoReport(30).totalContexts,257);
assert.equal(dashboardDemoReport(7).completionRate,77.8);assert.equal(dashboardDemoReport(7).matchRate,94.3);
assert.equal(aggregateDashboard([],30).completionRate,0);assert.equal(aggregateDashboard([],30).matchRate,0);
assert.equal(aggregateDashboard([{day:30,stage:4,setting:0,role:0,youth:null,goal:0,matched:true}],30).completed,0);
assert.throws(()=>dashboardDemoReport(31));
console.log(JSON.stringify({dataMatchesSuppliedMockup:true,sessions:1248,completed:984,matched:912,contexts:257,periods:[30,14,7],csvConsistent:true}));
if(process.argv.includes('--data-only'))process.exit(0);

const base=process.env.TEST_BASE_URL||'http://localhost:3000',output='output/qa/dashboard-v1';await mkdir(output,{recursive:true});
const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const email=`qa-dashboard-${randomUUID()}@example.invalid`,password=randomBytes(30).toString('base64url')+'aA1!';
let userId,browser;const errors=[];
try{
  const anonymous=await fetch(`${base}/dashboard`,{redirect:'manual'});assert.equal(anonymous.status,307);assert.ok(anonymous.headers.get('location').includes('/login?next='));
  assert.equal((await fetch(`${base}/api/admin/dashboard/export?period=30`)).status,401);
  const created=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{qa_test:'dashboard-v1'}});if(created.error)throw created.error;userId=created.data.user.id;
  const grant=await service.from('profiles').update({access_role:'admin2',account_status:'active'}).eq('user_id',userId);assert.equal(grant.error,null);
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});await page.getByRole('link',{name:'แดชบอร์ดสำหรับ สสส.',exact:true}).first().click();await page.waitForURL(/\/login\?next=/);
  await page.getByLabel('อีเมล',{exact:true}).fill(email);await page.getByLabel('รหัสผ่าน',{exact:true}).fill(password);await page.getByRole('button',{name:'เข้าสู่ระบบ',exact:true}).click();
  await page.waitForURL(`${base}/dashboard`);await page.locator('.ssdash-page').waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.match(await page.locator('h1').textContent(),/แดชบอร์ดภาพรวมโครงการ/);assert.ok((await page.locator('.ssdash-identity').textContent()).includes('ข้อมูลตัวอย่าง'));
  for(const period of [30,14,7]){
    await page.getByLabel('ช่วงเวลา',{exact:true}).selectOption(String(period));const report=dashboardDemoReport(period);
    assert.equal(await page.locator('[data-metric="completion"]').textContent(),`${report.completionRate.toFixed(1)}%`);assert.equal(await page.locator('[data-metric="match"]').textContent(),`${report.matchRate.toFixed(1)}%`);
    assert.equal(await page.locator('tbody tr').count(),5);assert.ok((await page.locator('.ssdash-table-note').textContent()).includes(String(report.totalContexts)));
    for(const [dimension,label] of [['setting','พื้นที่'],['role','บทบาท'],['youth','กลุ่มเยาวชน'],['goal','เป้าหมาย']]){
      await page.getByRole('tab',{name:label,exact:true}).click();assert.equal(await page.getByRole('tab',{name:label,exact:true}).getAttribute('aria-selected'),'true');
      const rendered=await page.locator('.ssdash-bar-label').allTextContents();assert.deepEqual(rendered,report.distributions[dimension].map(b=>b.label));
    }
    const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'ส่งออก CSV',exact:true}).click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),`สรุปการใช้งาน-ข้อมูลตัวอย่าง-${period}วัน.csv`);
    const data=await readFile(await download.path(),'utf8');assert.equal(data,dashboardCsv(period));
  }
  await page.getByRole('tab',{name:'พื้นที่',exact:true}).focus();await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('tab',{name:'บทบาท',exact:true}).getAttribute('aria-selected'),'true');await page.keyboard.press('End');assert.equal(await page.getByRole('tab',{name:'เป้าหมาย',exact:true}).getAttribute('aria-selected'),'true');await page.keyboard.press('Home');
  await page.getByLabel('ช่วงเวลา',{exact:true}).selectOption('30');
  await page.route('**/api/admin/dashboard/export?period=30',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"retry"}'}));
  await page.getByRole('link',{name:'ส่งออก CSV',exact:true}).click();await page.locator('.ssdash-export-error').waitFor();assert.equal(await page.getByLabel('ช่วงเวลา',{exact:true}).inputValue(),'30');
  await page.unroute('**/api/admin/dashboard/export?period=30');
  const retryDownload=page.waitForEvent('download');await page.getByRole('link',{name:'ส่งออก CSV',exact:true}).click();assert.equal(await readFile(await(await retryDownload).path(),'utf8'),dashboardCsv(30));
  for(const width of [1440,690,390,320]){
    await page.setViewportSize({width,height:1100});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Page overflows at ${width}`);
    if(width===1440||width===390)await page.screenshot({path:`${output}/${base.includes('localhost')?'local':'production'}-${width}.png`,fullPage:true});
  }
  assert.equal((await context.request.get(`${base}/api/admin/dashboard/export?period=99`)).status(),400);
  assert.equal((await context.request.get(`${base}/api/admin/dashboard/export?period=7&period=30`)).status(),400);
  assert.equal((await service.from('profiles').update({access_role:'admin1'}).eq('user_id',userId)).error,null);
  assert.equal((await context.request.get(`${base}/dashboard`)).status(),200);
  assert.equal((await service.from('profiles').update({access_role:'admin2'}).eq('user_id',userId)).error,null);
  const members=await context.request.get(`${base}/admin/members`,{maxRedirects:0});assert.equal(members.status(),307);assert.equal(members.headers().location,'/admin');
  const unsafe=await context.request.get(`${base}/login?next=https://example.com`,{maxRedirects:0});assert.equal(unsafe.status(),307);assert.equal(unsafe.headers().location,'/admin');
  // Verify a fresh role/status read, including a forged browser role hint.
  assert.equal((await service.from('profiles').update({account_status:'suspended'}).eq('user_id',userId)).error,null);
  assert.equal((await context.request.get(`${base}/dashboard?role=admin1`,{maxRedirects:0})).status(),307);assert.equal((await context.request.get(`${base}/api/admin/dashboard/export?period=30`)).status(),401);
  await page.getByRole('link',{name:'ส่งออก CSV',exact:true}).click();await page.locator('.ssdash-export-error').filter({hasText:'เข้าสู่ระบบอีกครั้ง'}).waitFor();
  assert.equal((await service.from('profiles').update({access_role:'user',account_status:'active'}).eq('user_id',userId)).error,null);
  assert.equal((await context.request.get(`${base}/dashboard`,{maxRedirects:0})).status(),307);
  await context.request.post(`${base}/auth/signout`);
  await page.goto(`${base}/login?next=%2Fdashboard`,{waitUntil:'networkidle'});await page.getByLabel('อีเมล',{exact:true}).fill(email);await page.getByLabel('รหัสผ่าน',{exact:true}).fill(password);await page.getByRole('button',{name:'เข้าสู่ระบบ',exact:true}).click();await page.locator('[role="alert"]').filter({hasText:'บัญชีนี้ยังไม่มีสิทธิ์'}).waitFor();
  assert.deepEqual(errors,[]);
  const report={base,periods:3,chartViews:4,csvDownloadPeriods:3,csvRetryAndExpiredSessionHandled:true,responsiveWidths:[1440,690,390,320],bothAdminsAllowed:true,anonymousUserAndSuspendedDenied:true,admin2MembersDenied:true,openRedirectPrevented:true,errors};
  await writeFile(`${output}/report-${base.includes('localhost')?'local':'production'}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{
  try{if(browser)await browser.close();}finally{if(userId){const removed=await service.auth.admin.deleteUser(userId);if(removed.error)throw removed.error;console.log('Removed the isolated dashboard QA account.');}}
}
