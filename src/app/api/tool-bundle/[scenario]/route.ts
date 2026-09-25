import JSZip from 'jszip';
import { getPublishedCatalog } from '@/lib/catalog';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ scenario: string }> }) {
  const { scenario: code } = await params;
  if (!/^SC-\d{3}$/.test(code)) return new Response('ไม่พบแผน', { status: 404 });

  const catalog = await getPublishedCatalog();
  const scenario = catalog.scenarios.find(item => item.id === code);
  if (!catalog.simulated || !catalog.releaseId || !scenario || scenario.status === 'no_tool') {
    return new Response('ไม่มีชุดเครื่องมือสำหรับแผนนี้', { status: 404 });
  }
  const toolCodes = [...new Set([...scenario.primaryIds, ...scenario.supportIds, ...scenario.measureIds, ...scenario.referenceIds])];
  if (!toolCodes.length || toolCodes.length > 25) return new Response('ไม่มีชุดเครื่องมือสำหรับแผนนี้', { status: 404 });
  const selected = toolCodes.map(toolCode => catalog.tools.find(tool => tool.id === toolCode));
  if (selected.some(tool => !tool?.hasSamplePdf)) return new Response('ไฟล์เครื่องมือยังไม่ครบ', { status: 409 });

  const service = createServiceClient();
  const { data: rows, error } = await service.from('tools').select('code,source_payload')
    .eq('release_id', catalog.releaseId).in('code', toolCodes);
  if (error || !rows || rows.length !== toolCodes.length) return new Response('อ่านข้อมูลเครื่องมือไม่สำเร็จ', { status: 502 });
  const paths = new Map(rows.map(row => {
    const payload = row.source_payload as Record<string, unknown> | null;
    return [row.code, payload?.previewAssetPath];
  }));
  for (const toolCode of toolCodes) {
    const assetPath = paths.get(toolCode);
    if (typeof assetPath !== 'string' || !new RegExp(`^[a-f0-9]{64}/${toolCode}\\.pdf$`).test(assetPath)) {
      return new Response('ไฟล์เครื่องมือยังไม่ครบ', { status: 409 });
    }
  }
  const downloaded = await Promise.all(toolCodes.map(toolCode => service.storage.from('source-tool-cards').download(paths.get(toolCode) as string)));
  if (downloaded.some(file => file.error || !file.data)) return new Response('ดาวน์โหลดไฟล์เครื่องมือไม่สำเร็จ กรุณาลองใหม่', { status: 502 });

  const zip = new JSZip();
  const packageName = catalog.packages.find(item => item.id === scenario.packageId)?.name ?? 'ชุดแผน';
  const names: string[] = [];
  for (let index = 0; index < toolCodes.length; index++) {
    const tool = selected[index]!;
    const file = downloaded[index].data!;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length < 5 || new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') return new Response('ไฟล์เครื่องมือไม่ถูกต้อง', { status: 502 });
    const safeName = tool.name.replace(/[\\/:*?"<>|\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) || 'เครื่องมือ';
    const filename = `${String(index + 1).padStart(2, '0')}-${safeName}.pdf`;
    zip.file(`เครื่องมือ/${filename}`, bytes);
    names.push(`${index + 1}. ${tool.name}`);
  }
  zip.file('รายการไฟล์.txt', `\uFEFFชุดเครื่องมือสำหรับ: ${packageName}\nบทบาท: ${scenario.role}\nกลุ่มเป้าหมาย: ${scenario.audience}\n\nไฟล์ที่รวมในชุดนี้:\n${names.join('\n')}\n`);
  const output = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });
  return new Response(Uint8Array.from(output), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="tools.zip"; filename*=UTF-8''${encodeURIComponent('ชุดเครื่องมือ.zip')}`,
      'Content-Length': String(output.length),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
