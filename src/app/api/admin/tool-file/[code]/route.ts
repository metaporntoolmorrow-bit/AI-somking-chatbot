import { getAdmin } from '@/lib/supabase/admin';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const admin = await getAdmin();
  if (!admin) return new Response('Forbidden', { status: 403 });
  const { code } = await params;
  if (!/^T\d{2}$/.test(code)) return new Response('Not found', { status: 404 });
  const service = createServiceClient();
  const { data: release } = await service.from('content_releases').select('id').eq('workflow_status', 'draft').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!release) return new Response('Not found', { status: 404 });
  const { data: tool } = await service.from('tools').select('source_payload').eq('release_id', release.id).eq('code', code).maybeSingle();
  const payload = tool?.source_payload as Record<string, unknown> | undefined;
  const assetPath = payload?.previewAssetPath;
  if (typeof assetPath !== 'string' || !/^[a-f0-9]{64}\/T\d{2}\.pdf$/.test(assetPath)) return new Response('Not found', { status: 404 });
  const { data, error } = await service.storage.from('source-tool-cards').download(assetPath);
  if (error || !data) return new Response('File unavailable', { status: 502 });
  return new Response(data.stream(), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${code}.pdf"`, 'Cache-Control': 'private, no-store' } });
}
