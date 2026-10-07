const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_SERVICE_KEY;

// ID MT5 hanya boleh angka (1-20 digit). Selalu diperlakukan sebagai string.
const ACC_RE = /^[0-9]{1,20}$/;

// Rate limit sederhana (best-effort, per instance serverless).
const reqHits = new Map(), missHits = new Map();
const MAX_REQ = 120, REQ_WIN = 60 * 1000;      // 120 request / menit / IP
const MAX_MISS = 10, MISS_WIN = 5 * 60 * 1000; // 10 ID tidak terdaftar / 5 menit / IP
const bucket = (m, k, win) => {
  const now = Date.now();
  if (m.size > 5000) m.clear();
  let b = m.get(k);
  if (!b || now - b.t > win) { b = { n: 0, t: now }; m.set(k, b); }
  return b;
};

const g = async p => {
  const r = await fetch(`${U}/rest/v1/${p}`, { headers: { apikey: K, Authorization: 'Bearer ' + K } });
  const j = await r.json();
  if (!Array.isArray(j)) throw new Error(JSON.stringify(j));
  return j;
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  const ip = String(req.headers['x-real-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0] ||
    (req.socket && req.socket.remoteAddress) || 'x').trim();

  const rb = bucket(reqHits, ip, REQ_WIN);
  const mb = bucket(missHits, ip, MISS_WIN);
  if (++rb.n > MAX_REQ || mb.n >= MAX_MISS) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'terlalu banyak permintaan' });
  }

  // Validasi account
  const raw = req.query.account;
  if (raw === undefined || raw === '') return res.status(400).json({ error: 'account wajib diisi' });
  if (typeof raw !== 'string' || !ACC_RE.test(raw)) return res.status(400).json({ error: 'format ID MT5 tidak valid' });
  const q = encodeURIComponent(raw);

  try {
    // Server memfilter: hanya baris dengan account = ID ini yang pernah dibaca.
    const equity = await g(`equity?select=*&account=eq.${q}`);

    if (!equity.length) {
      const t1 = await g(`trades?select=id&account=eq.${q}&limit=1`);
      if (!t1.length) {
        mb.n++;
        return res.status(404).json({ error: 'ID MT5 tidak terdaftar' });
      }
    }

    if (req.query.live) return res.json({ equity });

    let trades = [];
    for (let o = 0; o < 20000; o += 1000) {
      const p = await g(`trades?select=*&account=eq.${q}&order=close_time.desc,id.asc&limit=1000&offset=${o}`);
      trades = trades.concat(p);
      if (p.length < 1000) break;
    }
    res.json({ trades, equity });
  } catch (e) {
    console.error('api/data error:', e && e.message ? e.message : e);
    res.status(500).json({ error: 'server error' });
  }
};
