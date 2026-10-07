const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_SERVICE_KEY;
const g = async p => {
  const r = await fetch(`${U}/rest/v1/${p}`, { headers: { apikey: K, Authorization: 'Bearer ' + K } });
  const j = await r.json(); if (!Array.isArray(j)) throw new Error(JSON.stringify(j)); return j;
};
module.exports = async (req, res) => {
  if (req.headers['x-pass'] !== process.env.DASH_PASS) return res.status(401).json({ error: 'unauthorized' });
  try {
    res.setHeader('Cache-Control', 'no-store');
    const equity = await g('equity?select=*');
    if (req.query.live) return res.json({ equity });
    let trades = [];
    for (let o = 0; o < 20000; o += 1000) {
      const p = await g(`trades?select=*&order=close_time.desc&limit=1000&offset=${o}`);
      trades = trades.concat(p); if (p.length < 1000) break;
    }
    res.json({ trades, equity });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
};
