const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_SERVICE_KEY;
const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const ACC_RE = /^[0-9]{1,20}$/;
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const ik = process.env.INGEST_KEY, ck = process.env.CONTROL_KEY;
    const okIngest = !!ik && req.headers['x-api-key'] === ik;
    const okControl = !!ck && req.headers['x-control-key'] === ck;
    if (req.method === 'GET') {
      if (!okIngest && !okControl) return res.status(401).json({ error: 'unauthorized' });
      const acc = String(req.query.account || '');
      if (!ACC_RE.test(acc)) return res.status(400).json({ error: 'account wajib (angka)' });
      const r = await fetch(`${U}/rest/v1/bot_control?account=eq.${encodeURIComponent(acc)}&select=enabled,updated_at`, { headers: H });
      if (!r.ok) throw new Error(await r.text());
      const rows = await r.json();
      return res.json({ enabled: rows.length ? rows[0].enabled === true : false, updated_at: rows.length ? rows[0].updated_at : null });
    }
    if (req.method === 'POST') {
      if (!okControl) return res.status(401).json({ error: 'unauthorized' });
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      if (!ACC_RE.test(String(b.account || '')) || typeof b.enabled !== 'boolean') return res.status(400).json({ error: 'account (angka) dan enabled (true/false) wajib' });
      const r = await fetch(`${U}/rest/v1/bot_control?on_conflict=account`, {
        method: 'POST',
        headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{ account: String(b.account), enabled: b.enabled, updated_at: new Date().toISOString() }])
      });
      if (!r.ok) throw new Error(await r.text());
      return res.json({ ok: true });
    }
    return res.status(405).end();
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
};
