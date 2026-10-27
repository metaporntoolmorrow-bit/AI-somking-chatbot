import { getPublishedCatalog } from '@/lib/catalog';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^(T\d{2}|MAIN-\d{2}|SUP-\d{2})$/.test(code)) return new Response('ไม่พบไฟล์', { status: 404 });
  const catalog = await getPublishedCatalog();
  const tool = catalog.tools.find(item => item.id === code);
  if(catalog.bundleBucket&&catalog.releaseId&&tool){
    const asset=new URL(request.url).searchParams.get('asset');
    if(!asset||!/^FILE-\d{2}$/.test(asset)||!tool.files.some(f=>f.id===asset)) return new Response('ไม่พบไฟล์', {status:404});
    const service=createServiceClient();
    const {data:row,error:rowError}=await service.from('tools').select('source_payload').eq('release_id',catalog.releaseId).eq('code',code).maybeSingle();
    const payload=row?.source_payload as {files?:{id:string;name:string;storagePath?:string}[]}|undefined;
    const file=payload?.files?.find(f=>f.id===asset);
    if(rowError||!file?.storagePath||!file.storagePath.startsWith(`${catalog.releaseId}/assets/${asset}.`)||file.storagePath.includes('..')) return new Response('ไม่พบไฟล์', {status:404});
    const {data,error}=await service.storage.from(catalog.bundleBucket).createSignedUrl(file.storagePath,300,{download:file.name});
    if(error||!data)return new Response('เปิดไฟล์ไม่ได้ กรุณาลองใหม่', {status:502});
    return new Response(null,{status:302,headers:{Location:data.signedUrl,'Cache-Control':'private, no-store'}});
  }
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
