const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_SERVICE_KEY;
const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      if (req.headers['x-api-key'] !== process.env.INGEST_KEY) return res.status(401).json({ error: 'unauthorized' });
      const acc = String(req.query.account || '');
      if (!acc) return res.status(400).json({ error: 'account wajib' });
      const r = await fetch(`${U}/rest/v1/bot_control?account=eq.${encodeURIComponent(acc)}&select=enabled`, { headers: H });
      if (!r.ok) throw new Error(await r.text());
      const rows = await r.json();
      return res.json({ enabled: rows.length ? rows[0].enabled === true : false });
    }
    if (req.method === 'POST') {
      const ck = process.env.CONTROL_KEY;
      if (!ck || req.headers['x-control-key'] !== ck) return res.status(401).json({ error: 'unauthorized' });
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      if (!b.account || typeof b.enabled !== 'boolean') return res.status(400).json({ error: 'account dan enabled (true/false) wajib' });
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