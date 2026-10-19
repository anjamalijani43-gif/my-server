const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const app = express();
app.set('trust proxy', 1);
app.use(express.json({limit:'500mb'}));

// فایلە گرنگەکان (کۆد، پاسوۆرد، داتا) نابێت لە ڕێگەی وێبەوە بخوێنرێنەوە
app.use((req, res, next) => {
  if (/\.(js|json|md|env|lock|map)$/i.test(req.path) || /^\/(node_modules|\.git)/i.test(req.path)) return res.status(404).end();
  next();
});
app.get('/', (req, res) => res.redirect('/login.html'));
app.use(express.static('public'));
app.use(express.static('.'));

/* =====================================================================
   چوونەژوورەوە (Login) و ڕۆڵەکان
   ===================================================================== */
// پاسوۆردەکان بە شێوەی hash (scrypt) هەڵگیراون، نەک دەقی ڕاستەقینە
const USERS = {
  anjam: { role: 'admin',    salt: '9e7e3672febbf9d5264129765711b319', hash: '7af1d75de4a2a0ed14108e5f1a1eee018a2ef7189d91f0fe38ab41e43aad1fea' },
  azhet: { role: 'employee', salt: 'aa05b08f00b7b285ad15cc21097c6d17', hash: '0ed85716112ce286ceca119ac8b7e521672d4bea6627c75ad6895e83d487a7db' }
};
const hasUser = u => Object.prototype.hasOwnProperty.call(USERS, u);
const SECRET = crypto.createHash('sha256')
  .update(process.env.SESSION_SECRET || process.env.DATABASE_URL || crypto.randomBytes(32).toString('hex')).digest();

function sign(p) {
  const b = Buffer.from(JSON.stringify(p)).toString('base64url');
  return b + '.' + crypto.createHmac('sha256', SECRET).update(b).digest('base64url');
}
function verify(t) {
  if (!t) return null;
  const [b, s] = String(t).split('.');
  if (!b || !s) return null;
  const e = crypto.createHmac('sha256', SECRET).update(b).digest('base64url');
  const A = Buffer.from(s), B = Buffer.from(e);
  if (A.length !== B.length || !crypto.timingSafeEqual(A, B)) return null;
  try { const p = JSON.parse(Buffer.from(b, 'base64url').toString()); return p.exp > Date.now() ? p : null } catch (e) { return null }
}
function getCookie(req, n) {
  const m = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(n + '='));
  return m ? decodeURIComponent(m.slice(n.length + 1)) : null;
}

const fails = new Map(); // دژی حەدس کردنی پاسوۆرد
app.post('/api/login', (req, res) => {
  const ip = req.ip, f = fails.get(ip);
  if (f && f.until > Date.now()) return res.status(429).json({ error: 'هەوڵی زۆر دراوە، ١٥ خولەک چاوەڕێ بکە' });
  const u = String(req.body.username || '').trim().toLowerCase();
  const p = String(req.body.password || '');
  let ok = false;
  if (hasUser(u)) {
    const h = crypto.scryptSync(p, USERS[u].salt, 32);
    ok = crypto.timingSafeEqual(h, Buffer.from(USERS[u].hash, 'hex'));
  } else crypto.scryptSync(p, 'x', 32);
  if (!ok) {
    const n = ((f && f.n) || 0) + 1;
    fails.set(ip, { n, until: n >= 8 ? Date.now() + 15 * 60 * 1000 : 0 });
    return res.status(401).json({ error: 'ناوی بەکارهێنەر یان پاسوۆرد هەڵەیە' });
  }
  fails.delete(ip);
  const token = sign({ u, exp: Date.now() + 12 * 3600 * 1000 });
  res.setHeader('Set-Cookie', `sid=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${req.secure ? '; Secure' : ''}`);
  res.json({ ok: true, role: USERS[u].role, username: u });
});
app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  res.json({ ok: true });
});

// پاسەوانی هەموو /api: ئەدمین هەموو شتێک، کارمەند تەنها ناردنی ژمارە
app.use('/api', (req, res, next) => {
  const s = verify(getCookie(req, 'sid'));
  if (s && hasUser(s.u)) req.user = { username: s.u, role: USERS[s.u].role };
  const p = req.path;
  if (p === '/login' || p === '/logout') return next();
  if (p === '/me') return req.user ? res.json(req.user) : res.status(401).json({ error: 'login' });
  if (!req.user) return res.status(401).json({ error: 'پێویستە بچیتە ژوورەوە' });
  if (req.user.role === 'admin') return next();
  if (req.user.role === 'employee' && (p === '/send' || p === '/my-recent')) return next();
  res.status(403).json({ error: 'ڕێگەپێدراو نیت' });
});

/* =====================================================================
   داتابەیس: ٧ لیست، ناردراوەکان، تۆماری کارمەندان، لیستی خێزانی
   ===================================================================== */
const DB = process.env.DATABASE_URL;
const MAX_LISTS = 7;

const KEYS = {
  voter: ['voterNumber'],
  family: ['familyNumber', 'familyNo', 'familyNum', 'familyId', 'family', 'رقم العائلة', 'رقم العائلي']
};
const FIELDS = [
  ['ژمارەی دەنگدەر', ['voterNumber']],
  ['ناوی دەنگدەر', ['voterName', 'name', 'fullName', 'اسم الناخب']],
  ['موالید', ['birth', 'birthYear', 'birthDate', 'dob', 'مواليد']],
  ['ژمارەی خێزان', KEYS.family],
  ['ژمارەی ناوەندی تۆمار', ['regCenterNumber', 'registrationCenterNumber', 'registrationCenterNo', 'registrationNumber', 'رقم مركز التسجيل']],
  ['ناوی ناوەندی تۆمار', ['regCenterName', 'registrationCenterName', 'registrationName', 'اسم مركز التسجيل']],
  ['ژمارەی بنکەی دەنگدان', ['pollingCenterNumber', 'pollingNumber', 'pollingCenterNo', 'رقم مركز الاقتراع']],
  ['ناوی بنکەی دەنگدان', ['pollingCenterName', 'pollingName', 'اسم مركز الاقتراع']],
  ['ناونیشانی بنکە', ['pollingCenterAddress', 'pollingAddress', 'address', 'عنوان مركز الاقتراع']],
  ['ژمارەی مۆبایل', ['phone', 'mobile', 'phoneNumber', 'رقم الهاتف']]
];
function pick(o, keys) {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null && String(o[k]).trim() !== '') return o[k];
  return undefined;
}
const clip = (s, n) => String(s === undefined || s === null ? '' : s).slice(0, n);
function normDigits(s) {
  return String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}
function deviceString(ua, dev) {
  let os = '', model = clip(dev && dev.model, 60), br = '';
  if (/Android/i.test(ua)) {
    os = 'Android ' + ((ua.match(/Android\s([\d.]+)/) || [])[1] || '');
    if (!model) { const m = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\sBuild|[;)])/); if (m && m[1].trim().length > 1) model = m[1].trim(); }
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    os = (/iPad/.test(ua) ? 'iPad' : 'iPhone') + ' iOS ' + ((ua.match(/OS ([\d_]+)/) || [])[1] || '').replace(/_/g, '.');
  } else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  if (/Edg\//.test(ua)) br = 'Edge'; else if (/OPR\//.test(ua)) br = 'Opera';
  else if (/Firefox\//.test(ua)) br = 'Firefox'; else if (/Chrome\//.test(ua)) br = 'Chrome';
  else if (/Safari\//.test(ua)) br = 'Safari';
  return [model, os.trim(), br].filter(Boolean).join(' · ') || 'نەزانراو';
}

function addon(app) {
  if (!DB) {
    console.log('DATABASE_URL نییە - بەشی داتابەیس کار ناکات');
    return;
  }
  const pool = new Pool({
    connectionString: DB,
    ssl: DB.includes('railway.internal') ? false : { rejectUnauthorized: false },
    max: 5
  });

  const ready = pool.query(`
    CREATE TABLE IF NOT EXISTS voters(
      id BIGSERIAL PRIMARY KEY,
      list_no INT NOT NULL,
      voter TEXT NOT NULL UNIQUE,
      family TEXT,
      data JSONB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS voters_family_idx ON voters(family);
    CREATE INDEX IF NOT EXISTS voters_list_idx ON voters(list_no, id);
    CREATE TABLE IF NOT EXISTS sent(
      voter TEXT PRIMARY KEY,
      at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE sent ADD COLUMN IF NOT EXISTS username TEXT;
    ALTER TABLE sent ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
    ALTER TABLE sent ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
    ALTER TABLE sent ADD COLUMN IF NOT EXISTS acc REAL;
    ALTER TABLE sent ADD COLUMN IF NOT EXISTS ip TEXT;
    ALTER TABLE sent ADD COLUMN IF NOT EXISTS device TEXT;
    ALTER TABLE sent ADD COLUMN IF NOT EXISTS ua TEXT;
    CREATE TABLE IF NOT EXISTS send_log(
      id BIGSERIAL PRIMARY KEY,
      at TIMESTAMPTZ DEFAULT now(),
      username TEXT, voter TEXT, result TEXT,
      lat DOUBLE PRECISION, lng DOUBLE PRECISION, acc REAL,
      ip TEXT, device TEXT, ua TEXT
    );
  `).catch(e => console.log('DB error:', e.message));

  const wrap = fn => async (req, res, next) => {
    try { await ready; await fn(req, res, next); }
    catch (e) { console.log(e); if (!res.headersSent) res.status(500).json({ error: e.message }); }
  };

  let cntT = 0, cntV = 0;
  async function totalCount() {
    if (Date.now() - cntT > 30000) {
      cntV = (await pool.query('SELECT count(*)::int c FROM voters')).rows[0].c;
      cntT = Date.now();
    }
    return cntV;
  }

  // ===== ناردنی ژمارە لەلایەن کارمەندەوە (شوێن + کات + ئامێر + IP تۆمار دەکرێت) =====
  const MSG = {
    ok: 'نێردرا ✓',
    dup: 'ئەم ژمارەیە پێشتر نێردراوە',
    notfound: 'ئەم ژمارەیە ئەو ژمارەیەیە کە لەو لیستەی تۆ نییە کە لە سێرڤەرەکە هەتە'
  };
  app.post('/api/send', wrap(async (req, res) => {
    const n = normDigits(req.body.voterNumber === undefined ? '' : req.body.voterNumber).trim();
    if (!n) return res.status(400).json({ error: 'ژمارەی دەنگدەر بنووسە' });
    const { lat, lng, accuracy } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ error: 'location_required', message: 'پێویستە شوێنی مۆبایلەکەت (Location) ڕێگەپێبدەیت' });
    }
    const acc = typeof accuracy === 'number' && isFinite(accuracy) ? accuracy : null;
    const ua = clip(req.get('user-agent'), 400);
    const device = deviceString(ua, req.body.device);
    const ip = req.ip;
    const user = req.user.username;

    const f = await pool.query('SELECT 1 FROM voters WHERE voter=$1', [n]);
    let result;
    if (!f.rows.length) result = 'notfound';
    else {
      const ins = await pool.query(
        `INSERT INTO sent(voter,username,lat,lng,acc,ip,device,ua) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT DO NOTHING RETURNING voter`, [n, user, lat, lng, acc, ip, device, ua]);
      result = ins.rows.length ? 'ok' : 'dup';
    }
    await pool.query(
      'INSERT INTO send_log(username,voter,result,lat,lng,acc,ip,device,ua) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [user, clip(n, 60), result, lat, lng, acc, ip, device, ua]);
    res.json({ result, found: result !== 'notfound', message: MSG[result] });
  }));

  app.get('/api/my-recent', wrap(async (req, res) => {
    const r = await pool.query('SELECT voter,result,at FROM send_log WHERE username=$1 ORDER BY id DESC LIMIT 15', [req.user.username]);
    res.json(r.rows);
  }));

  // سازگار لەگەڵ کۆدی کۆن
  app.get('/api/list', wrap(async (req, res) => {
    const s = await pool.query('SELECT v.data FROM sent s JOIN voters v ON v.voter=s.voter ORDER BY s.at');
    res.json({ allCount: await totalCount(), sent: s.rows.map(r => r.data) });
  }));
  app.delete('/api/clear', wrap(async (req, res) => {
    await pool.query('DELETE FROM sent');
    res.json({ ok: true });
  }));

  app.get('/api/fields', (req, res) => res.json(FIELDS));

  // ===== ٧ لیست =====
  app.get('/api/lists', wrap(async (req, res) => {
    const r = await pool.query('SELECT list_no, count(*)::int c FROM voters GROUP BY list_no');
    const out = [];
    for (let i = 1; i <= MAX_LISTS; i++) {
      const f = r.rows.find(x => x.list_no === i);
      out.push({ list: i, count: f ? f.c : 0 });
    }
    res.json(out);
  }));

  app.post('/api/lists/:n/upload', wrap(async (req, res) => {
    const n = parseInt(req.params.n, 10);
    if (!(n >= 1 && n <= MAX_LISTS)) return res.status(400).json({ error: 'ژمارەی لیست هەڵەیە' });
    const rows = req.body.data;
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'data دەبێت array بێت' });
    const m = new Map();
    for (const o of rows) {
      if (!o || typeof o !== 'object') continue;
      const v = pick(o, KEYS.voter);
      if (v === undefined) continue;
      m.set(normDigits(String(v)).trim(), o);
    }
    const vs = [], fs_ = [], ds = [];
    for (const [v, o] of m) {
      vs.push(v);
      const f = pick(o, KEYS.family);
      fs_.push(f === undefined ? null : String(f).trim());
      ds.push(JSON.stringify(o));
    }
    if (vs.length) {
      await pool.query(
        `INSERT INTO voters(list_no,voter,family,data)
         SELECT $1::int, t.v, t.f, t.d::jsonb
         FROM unnest($2::text[],$3::text[],$4::text[]) AS t(v,f,d)
         ON CONFLICT (voter) DO UPDATE
           SET list_no=EXCLUDED.list_no, family=EXCLUDED.family, data=EXCLUDED.data`,
        [n, vs, fs_, ds]
      );
    }
    cntT = 0;
    res.json({ ok: true, received: rows.length, saved: vs.length });
  }));

  app.delete('/api/lists/:n', wrap(async (req, res) => {
    const n = parseInt(req.params.n, 10);
    if (!(n >= 1 && n <= MAX_LISTS)) return res.status(400).json({ error: 'ژمارەی لیست هەڵەیە' });
    const r = await pool.query('DELETE FROM voters WHERE list_no=$1', [n]);
    cntT = 0;
    res.json({ ok: true, deleted: r.rowCount });
  }));

  app.get('/api/lists/:n/download', wrap(async (req, res) => {
    const n = parseInt(req.params.n, 10);
    if (!(n >= 1 && n <= MAX_LISTS)) return res.status(400).json({ error: 'ژمارەی لیست هەڵەیە' });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="list${n}.json"`);
    res.write('[');
    let last = 0, first = true;
    for (;;) {
      if (res.destroyed) return;
      const r = await pool.query(
        'SELECT id, data FROM voters WHERE list_no=$1 AND id>$2 ORDER BY id LIMIT 5000', [n, last]);
      if (!r.rows.length) break;
      let chunk = '';
      for (const x of r.rows) { chunk += (first ? '' : ',') + JSON.stringify(x.data); first = false; last = x.id; }
      if (!res.write(chunk)) await new Promise(ok => res.once('drain', ok));
    }
    res.end(']');
  }));

  // ===== ناردراوەکان (لەگەڵ زانیاری کارمەند) =====
  app.get('/api/sent', wrap(async (req, res) => {
    const limit = Math.min(+req.query.limit || 100, 500), off = +req.query.offset || 0;
    const t = await pool.query('SELECT count(*)::int c FROM sent');
    const r = await pool.query(
      `SELECT v.data, s.username, s.at, s.lat, s.lng, s.acc, s.ip, s.device
       FROM sent s JOIN voters v ON v.voter=s.voter ORDER BY s.at DESC LIMIT $1 OFFSET $2`, [limit, off]);
    res.json({
      total: t.rows[0].c,
      rows: r.rows.map(x => ({ data: x.data, meta: { username: x.username, at: x.at, lat: x.lat, lng: x.lng, acc: x.acc, ip: x.ip, device: x.device } }))
    });
  }));

  // ===== تۆماری هەموو ناردنەکانی کارمەندان =====
  app.get('/api/log', wrap(async (req, res) => {
    const limit = Math.min(+req.query.limit || 100, 500), off = +req.query.offset || 0;
    const t = await pool.query('SELECT count(*)::int c FROM send_log');
    const r = await pool.query(
      'SELECT at, username, voter, result, lat, lng, acc, ip, device FROM send_log ORDER BY id DESC LIMIT $1 OFFSET $2', [limit, off]);
    res.json({ total: t.rows[0].c, rows: r.rows });
  }));

  // ===== لیستی خێزانی =====
  app.get('/api/family-list', wrap(async (req, res) => {
    const limit = Math.min(+req.query.limit || 30, 100), off = +req.query.offset || 0;
    const t = await pool.query(
      `SELECT count(DISTINCT v.family)::int c FROM sent s JOIN voters v ON v.voter=s.voter WHERE v.family IS NOT NULL`);
    const f = await pool.query(
      `SELECT v.family FROM sent s JOIN voters v ON v.voter=s.voter
       WHERE v.family IS NOT NULL GROUP BY v.family ORDER BY max(s.at) DESC LIMIT $1 OFFSET $2`, [limit, off]);
    const fams = f.rows.map(r => r.family);
    const out = fams.map(x => ({ family: x, members: [] }));
    if (fams.length) {
      const m = await pool.query(
        `SELECT v.family, v.voter, v.data, (s.voter IS NOT NULL) AS sent
         FROM voters v LEFT JOIN sent s ON s.voter=v.voter
         WHERE v.family = ANY($1::text[]) ORDER BY v.family, v.id`, [fams]);
      const idx = new Map(out.map(o => [o.family, o]));
      for (const r of m.rows) idx.get(r.family).members.push({ voter: r.voter, sent: r.sent, data: r.data });
    }
    res.json({ total: t.rows[0].c, families: out });
  }));
}
addon(app);

/* =====================================================================
   کۆدی کۆنی خۆت (بێ دەستکاری)
   ===================================================================== */
let sent=[];
function getFiles(){
  let files=[];
  try{ if(fs.existsSync('public')) files=files.concat(fs.readdirSync('public').filter(f=>f.startsWith('data')&&f.endsWith('.json')).map(f=>path.join('public',f))) }catch(e){}
  try{ files=files.concat(fs.readdirSync('.').filter(f=>f.startsWith('data')&&f.endsWith('.json'))) }catch(e){}
  return files;
}
function findNum(n){
  n=String(n).trim();
  for(let fp of getFiles()){
    try{ let j=JSON.parse(fs.readFileSync(fp,'utf8')); let fd=j.find(d=>String(d.voterNumber).trim()===n); if(fd) return fd }catch(e){}
  }
  return null;
}
function loadAll(){
  let a=[];
  for(let fp of getFiles()){
    try{ a=a.concat(JSON.parse(fs.readFileSync(fp,'utf8'))) }catch(e){}
  }
  return a;
}
app.post('/api/upload-json',(req,res)=>{
  try{
    let inc=req.body.data;
    if(!Array.isArray(inc)) return res.status(400).json({error:'array'});
    let ex=loadAll();
    let m=new Map();
    [...ex,...inc].forEach(o=>{ if(o.voterNumber) m.set(String(o.voterNumber).trim(),o) });
    let fin=Array.from(m.values());
    for(let fp of getFiles()){ try{ fs.unlinkSync(fp) }catch(e){} }
    let CH=150000;
    for(let i=0;i<fin.length;i+=CH){
      fs.writeFileSync(`data${Math.floor(i/CH)+1}.json`, JSON.stringify(fin.slice(i,i+CH)));
    }
    if(fin.length===0) fs.writeFileSync('data.json','[]');
    res.json({ok:true,added:inc.length,total:fin.length});
  }catch(e){ res.status(500).json({error:e.message}) }
});
app.post('/api/send',(req,res)=>{
  let f=findNum(req.body.voterNumber);
  if(f){ sent.push(f); res.json({found:true,data:f}) }else res.json({found:false});
});
app.get('/api/list',(req,res)=>{ res.json({allCount:loadAll().length,sent}) });
app.delete('/api/clear',(req,res)=>{ sent=[]; res.json({ok:true}) });
app.get('/health',(req,res)=>res.send('ok'));
app.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('UP'));
