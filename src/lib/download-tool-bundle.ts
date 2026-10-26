import { TOOL_BUNDLE_FILENAME } from './download-names';

export async function downloadToolBundle(url: string, guide: string) {
  // Fetch directly from signed Storage: large archives never pass through Vercel's body limit.
  const response = await fetch(url);
  if (!response.ok) throw new Error('bundle_download_failed');
  const JSZip = (await import('jszip')).default;
  const archive = await JSZip.loadAsync(await response.arrayBuffer());
  // Keep every original document and large-file link; only update the plan's reading guide.
  archive.file('00-เริ่มใช้แพ็กเกจ.txt', '\uFEFF' + guide);
  const blob = await archive.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  // A blob download avoids the incorrectly encoded filename returned by Storage.
  link.download = TOOL_BUNDLE_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
