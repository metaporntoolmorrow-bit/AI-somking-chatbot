import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { requireAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';
import '../admin.css';
import './source.css';

export const dynamic = 'force-dynamic';

export default async function SourceReviewPage() {
  await requireAdmin();
  const service = createServiceClient();
  const { data: release, error: releaseError } = await service.from('content_releases')
    .select('id,version_label').eq('workflow_status', 'draft').order('created_at', { ascending: false }).limit(1).maybeSingle();
  const [packages, tools, scenarios] = release ? await Promise.all([
    service.from('packages').select('code,title_th,goal_th,limitations_th').eq('release_id', release.id).order('code'),
    service.from('tools').select('code,title_th,description_th').eq('release_id', release.id).order('code'),
    service.from('scenarios').select('code,package_code,catalogue_status,summary_th,source_payload').eq('release_id', release.id).order('code'),
  ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  const failed = Boolean(releaseError || packages.error || tools.error || scenarios.error);
  const packageRows = packages.data ?? [];
  const toolRows = tools.data ?? [];
  const scenarioRows = scenarios.data ?? [];
  return <><div className="page-head"><div className="container"><Link href="/admin" className="back-link"><ArrowLeft size={16}/> กลับไปภาพรวม</Link><h1>ตรวจข้อมูลจากไฟล์โครงการ</h1><p>ชุดแผน สถานการณ์ และเครื่องมือที่นำเข้า Supabase จากไฟล์ที่เตรียมไว้</p></div></div><main className="container admin-main">
    {failed ? <div className="card empty">อ่านข้อมูลจาก Supabase ไม่สำเร็จ กรุณาลองใหม่</div> : !release ? <div className="card empty">ยังไม่มีข้อมูลที่นำเข้า</div> : <>
      <div className="notice">รุ่น {release.version_label} · {packageRows.length} ชุดแผน · {scenarioRows.length} สถานการณ์ · {toolRows.length} เครื่องมือ</div>
      <section className="source-section"><h2>ชุดแผนและสถานการณ์</h2>{packageRows.map(item => <details className="card source-item" key={item.code}><summary><strong>{item.title_th}</strong><span>{scenarioRows.filter(row => row.package_code === item.code).length} สถานการณ์</span></summary><p>{item.goal_th}</p>{item.limitations_th && <p className="source-note">ข้อจำกัด: {item.limitations_th}</p>}<ul>{scenarioRows.filter(row => row.package_code === item.code).map(row => { const payload = row.source_payload as Record<string, unknown> | null; return <li key={row.code}><strong>{String(payload?.role ?? '')} · {String(payload?.audience ?? '')}</strong><span>{row.summary_th || 'ยังไม่มีคำอธิบาย'} · {row.catalogue_status === 'no_tool' ? 'ยังไม่มีเครื่องมือ' : row.catalogue_status === 'support_only' ? 'มีเครื่องมือเสริม' : 'มีเครื่องมือหลัก'}</span></li>; })}</ul></details>)}</section>
      <section className="source-section"><h2>เครื่องมือและไฟล์ประกอบ</h2><div className="source-tools">{toolRows.map(item => <div className="card source-tool" key={item.code}><div><strong>{item.title_th}</strong><p>{item.description_th}</p></div><a href={`/api/admin/tool-file/${encodeURIComponent(item.code)}`} target="_blank" rel="noopener noreferrer"><FileText size={16}/> เปิดไฟล์ PDF</a></div>)}</div></section>
    </>}
  </main></>;
}
