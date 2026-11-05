// PolicyPlan Companion · Prepare Callback · v1
// Serializes the body once. The exact same string is signed and sent.
const it = $input.first().json;
const raw = JSON.stringify(it.callback);
const ts = String(Math.floor(Date.now() / 1000));
return [{ json: { url: it.callback_url, raw, ts, signing_input: ts + '.' + raw } }];
