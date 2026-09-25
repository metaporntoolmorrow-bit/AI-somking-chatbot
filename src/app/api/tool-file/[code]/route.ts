import { getPublishedCatalog } from '@/lib/catalog';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^T\d{2}$/.test(code)) return new Response('Not found', { status: 404 });
  const catalog = await getPublishedCatalog();
  const tool = catalog.tools.find(item => item.id === code);
  if (!catalog.simulated || !catalog.releaseId || !tool?.hasSamplePdf) return new Response('Not found', { status: 404 });
  const service = createServiceClient();
  const { data } = await service.from('tools').select('source_payload').eq('release_id', catalog.releaseId).eq('code', code).maybeSingle();
  const payload = data?.source_payload as Record<string, unknown> | undefined;
  const assetPath = payload?.previewAssetPath;
  if (typeof assetPath !== 'string' || !/^[a-f0-9]{64}\/T\d{2}\.pdf$/.test(assetPath)) return new Response('Not found', { status: 404 });
  const file = await service.storage.from('source-tool-cards').download(assetPath);
  if (file.error || !file.data) return new Response('File unavailable', { status: 502 });
  return new Response(file.data.stream(), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${code}.pdf"`, 'Cache-Control': 'private, no-store' } });
}
