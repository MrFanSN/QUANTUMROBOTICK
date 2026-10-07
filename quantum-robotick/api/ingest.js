const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_SERVICE_KEY;
const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' };
async function up(table, conflict, rows) {
  const r = await fetch(`${U}/rest/v1/${table}?on_conflict=${conflict}`, { method: 'POST', headers: H, body: JSON.stringify(rows) });
  if (!r.ok) throw new Error(await r.text());
}
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (req.headers['x-api-key'] !== process.env.INGEST_KEY) return res.status(401).json({ error: 'unauthorized' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (b.type === 'trades') {
      const rows = (b.trades || []).map(t => ({
        id: String(t.id), account: String(t.account), account_name: t.accountName, broker: t.broker,
        pair: t.pair, dir: t.dir, lot: t.lot, entry: t.entry, exit: t.exit, sl: t.sl, tp: t.tp, pl: t.pl,
        open_time: new Date(t.openTime * 1000).toISOString(), close_time: new Date(t.closeTime * 1000).toISOString(),
        magic: t.magic, reason: t.reason
      }));
      if (rows.length) await up('trades', 'id', rows);
    } else if (b.type === 'equity') {
      await up('equity', 'account', [{ account: String(b.account), account_name: b.accountName, broker: b.broker,
        equity: b.equity, floating: b.floating, positions: b.positions, ts: new Date().toISOString() }]);
    } else return res.status(400).json({ error: 'type tidak dikenal' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
};
