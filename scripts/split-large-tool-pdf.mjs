import { readdir, mkdir, stat, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const sourceRoot = path.join(root, 'ชุดเครื่องมือใหม่+track');
async function findFile(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { const found = await findFile(full); if (found) return found; }
    else if (entry.name.startsWith('(15) ') && entry.name.endsWith('.pdf')) return full;
  }
}
const source = await findFile(sourceRoot);
if (!source) throw new Error('Source PDF for main tool 15 was not found');
const output = path.join(root, 'output', 'pdf');
// pdfunite on Windows cannot reliably accept non-ASCII paths.
const temporary = path.join(os.tmpdir(), 'ai-smoking-tool15-pages');
await mkdir(output, { recursive: true });
await mkdir(temporary, { recursive: true });
function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${command}: ${result.error?.message || result.stderr}`);
  return result.stdout;
}
const temporarySource = path.join(temporary, 'source.pdf');
await copyFile(source, temporarySource);
const total = Number(run('pdfinfo', [temporarySource]).match(/^Pages:\s+(\d+)/m)?.[1]);
if (!total) throw new Error('Cannot read source page count');
run('pdfseparate', [temporarySource, path.join(temporary, 'page-%d.pdf')]);
const parts = [];
const pageSizes = await Promise.all(Array.from({ length: total }, (_, index) => stat(path.join(temporary, `page-${index+1}.pdf`)).then(info => info.size)));
// Balance by bytes rather than page count: the first pages have larger images.
let start = 1;
for (let partIndex = 0; partIndex < 6; partIndex++) {
  const target = pageSizes.slice(start-1).reduce((sum,value) => sum+value,0) / (6-partIndex);
  let end = start, approximateBytes = pageSizes[start-1];
  if (partIndex === 5) end = total;
  else while (end < total-(5-partIndex) && approximateBytes + pageSizes[end] <= target) { approximateBytes += pageSizes[end]; end++; }
  const filename = `tool15-pages-${String(start).padStart(3, '0')}-${String(end).padStart(3, '0')}.pdf`;
  const destination = path.join(output, filename);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => path.join(temporary, `page-${start + i}.pdf`));
  const temporaryOutput = path.join(temporary, filename);
  run('pdfunite', [...pages, temporaryOutput]);
  const bytes = (await stat(temporaryOutput)).size;
  const count = Number(run('pdfinfo', [temporaryOutput]).match(/^Pages:\s+(\d+)/m)?.[1]);
  if (bytes > 100_000_000 || count !== end - start + 1) throw new Error(`Invalid part ${filename}: ${bytes} bytes / ${count} pages`);
  await copyFile(temporaryOutput, destination);
  parts.push({ source_file: path.relative(root, source).replaceAll('\\', '/'), source_tool_code: 'MAIN-15', start_page: start, end_page: end, page_count: count, size_bytes: bytes, local_path: destination, file_name: filename });
  start = end + 1;
}
await writeFile(path.join(output, 'tool15-parts.json'), JSON.stringify(parts, null, 2) + '\n');
console.log(JSON.stringify({ source_pages: total, parts }));
