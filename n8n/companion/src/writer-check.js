// PolicyPlan Companion · Writer Check · v1
// A light pre-check so a malformed answer gets one retry. The app re-parses
// strictly and runs the full claim guard; this node never repairs output.
const raw = String(($input.first().json || {}).output ?? '').trim();
const input = $('Companion Gate').first().json.writer_input || { blocks: [] };
let reason = '';
let j = null;
if (!raw.startsWith('{') || !raw.endsWith('}')) reason = 'not_a_single_json_object';
else {
  try { j = JSON.parse(raw); } catch (e) { reason = 'invalid_json'; }
}
if (!reason) {
  if (j.schema !== 'companion_writer.v1') reason = 'wrong_schema';
  else if (!Array.isArray(j.blocks) || !j.blocks.length) reason = 'no_blocks';
  else {
    const want = input.blocks.map((b) => b.block_id);
    const got = j.blocks.map((b) => b && b.block_id);
    const missing = want.filter((id) => !got.includes(id));
    if (missing.length) reason = 'missing_blocks:' + missing.join(',');
    const digits = j.blocks.filter((b) => /\d/.test(String(b.body || '').replace(/\{\{\s*f\.[a-z0-9_.]+\s*\}\}/g, ' ')));
    if (!reason && digits.length) reason = 'typed_numbers_in:' + digits.map((b) => b.block_id).join(',');
  }
}
return [{ json: { valid: !reason, reason, raw, attempt: 1 } }];
