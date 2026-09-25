import { createClient } from '@supabase/supabase-js';

const hash = process.argv[2];
if (!/^[a-f0-9]{64}$/.test(hash ?? '')) throw new Error('Provide the exact source hash printed by the import check');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: release, error } = await client.from('content_releases').select('id,workflow_status,trust_status').eq('source_manifest_hash', hash).single();
if (error || !release) throw error || new Error('Release not found');
if (release.workflow_status !== 'draft' || release.trust_status !== 'simulated') throw new Error('Only a simulated draft may be exposed as a labeled preview');
const results = await Promise.all(['packages', 'tools', 'scenarios', 'scenario_tools'].map(async table => {
  const result = await client.from(table).select('*', { head: true, count: 'exact' }).eq('release_id', release.id);
  if (result.error) throw result.error;
  return result.count;
}));
if (results.some((count, index) => count !== [9, 25, 54, 112][index])) throw new Error(`Incomplete release: ${results.join(', ')}`);
const update = await client.from('content_releases').update({ change_note: 'public-preview:simulated' }).eq('id', release.id).eq('workflow_status', 'draft').eq('trust_status', 'simulated').select('id').single();
if (update.error) throw update.error;
console.log(JSON.stringify({ releaseId: update.data.id, publicPreview: true, simulated: true }));
