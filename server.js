const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const app = express();
app.use(express.json({limit:'500mb'}));
app.use(express.static('public'));
app.use(express.static('.'));

/* =====================================================================
   بەشی نوێ: داتابەیس، ٧ لیست، ناردراوەکان، لیستی خێزانی
   ===================================================================== */
const DB = process.env.DATABASE_URL;
const ADMIN = process.env.ADMIN_KEY || '';
const MAX_LISTS = 7;

// ناوی خانەکان لە JSON ەکەتدا. ئەگەر ناوەکانت جیاوازن لێرە زیادیان بکە.
const KEYS = {
  voter: ['voterNumber'],
  family: ['familyNumber', 'familyNo', 'familyNum', 'familyId', 'family', 'رقم العائلة', 'رقم العائلي']
};
const FIELDS = [
  ['ژمارەی دەنگدەر', ['voterNumber']],
  ['ناوی دەنگدەر', ['voterName', 'name', 'fullName', 'اسم الناخب']],
  ['موالید', ['birth', 'birthYear', 'birthDate', 'dob', 'مواليد']],
  ['ژمارەی خێزان', KEYS.family],
  ['ژمارەی ناوەندی تۆمار', ['registrationCenterNumber', 'regCenterNumber', 'registrationCenterNo', 'registrationNumber', 'رقم مركز التسجيل']],
  ['ناوی ناوەندی تۆمار', ['registrationCenterName', 'regCenterName', 'registrationName', 'اسم مركز التسجيل']],
  ['ژمارەی بنکەی دەنگدان', ['pollingCenterNumber', 'pollingNumber', 'pollingCenterNo', 'رقم مركز الاقتراع']],
  ['ناوی بنکەی دەنگدان', ['pollingCenterName', 'pollingName', 'اسم مركز الاقتراع']],
  ['ناونیشانی بنکە', ['pollingCenterAddress', 'pollingAddress', 'address', 'عنوان مركز الاقتراع']],
  ['ژمارەی مۆبایل', ['phone', 'mobile', 'phoneNumber', 'رقم الهاتف']]
];

function pick(o, keys) {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null && String(o[k]).trim() !== '') return o[k];
  return undefined;
}

const LISTS_HTML = String.raw`<!DOCTYPE html>
<html lang="ckb" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>بەڕێوەبردنی لیستەکان</title>
<style>
  body{font-family:Tahoma,Arial,sans-serif;margin:0;background:#f4f5f7;color:#222}
  header{background:#1e3a5f;color:#fff;padding:12px 16px}
  nav{display:flex;gap:6px;padding:10px;flex-wrap:wrap}
  nav button{flex:1;padding:10px;border:0;border-radius:8px;background:#dde3ea;font-size:15px;cursor:pointer}
  nav button.on{background:#1e3a5f;color:#fff}
  .box{padding:10px 12px}
  .card{background:#fff;border-radius:10px;padding:12px;margin-bottom:10px;box-shadow:0 1px 3px #0002}
  .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:8px}
  button.b{padding:8px 12px;border:0;border-radius:8px;color:#fff;cursor:pointer;font-size:14px}
  .up{background:#2e7d32}.dl{background:#1565c0}.rm{background:#c62828}
  progress{width:100%}
  table{border-collapse:collapse;width:100%;font-size:13px;background:#fff}
  th,td{border:1px solid #ccc;padding:5px;text-align:right}
  th{background:#e8ecf1}
  .g{background:#c8f0c8}.r{background:#f8c9c9}
  .wrap{overflow-x:auto}
  .fam{margin-bottom:14px}
  .famh{font-weight:bold;margin:6px 0}
  input[type=password]{padding:6px;border:1px solid #bbb;border-radius:6px}
  .pager{display:flex;gap:8px;align-items:center;margin:8px 0}
  .pager button{padding:6px 12px}
</style>
</head>
<body>
<header>
  <b>بەڕێوەبردنی لیستەکان</b>
  <span style="float:left"><input id="key" type="password" placeholder="کلیلی ئەدمین (ئەگەر هەبوو)"></span>
</header>
<nav>
  <button class="on" data-t="lists">٧ لیست</button>
  <button data-t="sent">ناردراوەکان</button>
  <button data-t="fam">لیستی خێزانی</button>
</nav>

<div class="box" id="t-lists"></div>
<div class="box" id="t-sent" style="display:none"></div>
<div class="box" id="t-fam" style="display:none"></div>

<script>
let FIELDS=[];
const $=id=>document.getElementById(id);
const keyEl=$('key'); keyEl.value=localStorage.getItem('adminKey')||'';
keyEl.onchange=()=>localStorage.setItem('adminKey',keyEl.value);
const H=()=>({'Content-Type':'application/json','x-admin-key':keyEl.value});
const pick=(o,ks)=>{for(const k of ks){if(o[k]!==undefined&&o[k]!==null&&String(o[k]).trim()!=='')return o[k]}return ''};

document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));
  ['lists','sent','fam'].forEach(t=>$('t-'+t).style.display=(t===b.dataset.t)?'':'none');
  if(b.dataset.t==='lists')loadLists();
  if(b.dataset.t==='sent'){sentOff=0;loadSent()}
  if(b.dataset.t==='fam'){famOff=0;loadFam()}
});

function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function rowCells(o,cls){
  return '<tr class="'+cls+'">'+FIELDS.map(f=>'<td>'+esc(pick(o,f[1]))+'</td>').join('')+'</tr>';
}
function head(){return '<tr>'+FIELDS.map(f=>'<th>'+f[0]+'</th>').join('')+'</tr>'}

/* ===== ٧ لیست ===== */
async function loadLists(){
  const r=await (await fetch('/api/lists')).json();
  $('t-lists').innerHTML=r.map(l=>
   '<div class="card"><b>لیستی '+l.list+'</b> — '+l.count.toLocaleString()+' دەنگدەر'+
   '<div class="row">'+
   '<input type="file" accept=".json" id="f'+l.list+'">'+
   '<button class="b up" onclick="upload('+l.list+')">بارکردن</button>'+
   '<button class="b dl" onclick="download('+l.list+')">داگرتن</button>'+
   '<button class="b rm" onclick="del('+l.list+')">سڕینەوە</button></div>'+
   '<div id="p'+l.list+'"></div></div>').join('');
}
async function upload(n){
  const file=$('f'+n).files[0]; if(!file)return alert('فایلێک هەڵبژێرە');
  const p=$('p'+n); p.innerHTML='خوێندنەوەی فایل...';
  let data;
  try{const j=JSON.parse(await file.text()); data=Array.isArray(j)?j:j.data}catch(e){return p.innerHTML='فایلەکە JSON ی دروست نییە'}
  if(!Array.isArray(data))return p.innerHTML='فایلەکە دەبێت array بێت';
  const B=5000; p.innerHTML='<progress max="'+data.length+'" value="0"></progress><div id="pt'+n+'"></div>';
  const bar=p.querySelector('progress');
  for(let i=0;i<data.length;i+=B){
    const res=await fetch('/api/lists/'+n+'/upload',{method:'POST',headers:H(),body:JSON.stringify({data:data.slice(i,i+B)})});
    if(!res.ok){const e=await res.json().catch(()=>({}));return p.innerHTML='هەڵە: '+(e.error||res.status)+' (لە دێڕی '+i+')'}
    bar.value=Math.min(i+B,data.length); $('pt'+n).textContent=bar.value.toLocaleString()+' / '+data.length.toLocaleString();
  }
  loadLists();
}
function download(n){location='/api/lists/'+n+'/download?key='+encodeURIComponent(keyEl.value)}
async function del(n){
  if(!confirm('دڵنیایت لە سڕینەوەی لیستی '+n+' ؟'))return;
  const r=await fetch('/api/lists/'+n,{method:'DELETE',headers:H()});
  if(!r.ok)return alert('هەڵە: '+r.status);
  loadLists();
}

/* ===== ناردراوەکان ===== */
let sentOff=0;
async function loadSent(){
  const L=100, r=await (await fetch('/api/sent?limit='+L+'&offset='+sentOff)).json();
  $('t-sent').innerHTML='<b>کۆی ناردراو: '+r.total.toLocaleString()+'</b>'+
   pager(sentOff,L,r.total,'sent')+
   '<div class="wrap"><table>'+head()+r.rows.map(o=>rowCells(o,'g')).join('')+'</table></div>';
}

/* ===== لیستی خێزانی ===== */
let famOff=0;
async function loadFam(){
  const L=30, r=await (await fetch('/api/family-list?limit='+L+'&offset='+famOff)).json();
  $('t-fam').innerHTML='<b>ژمارەی خێزانەکان: '+r.total.toLocaleString()+'</b>'+
   pager(famOff,L,r.total,'fam')+
   r.families.map(f=>'<div class="fam"><div class="famh">خێزان: '+esc(f.family)+'</div><div class="wrap"><table>'+head()+
     f.members.map(m=>rowCells(m.data,m.sent?'g':'r')).join('')+'</table></div></div>').join('');
}
function pager(off,L,total,w){
  return '<div class="pager"><button onclick="go(\''+w+'\','+(off-L)+')" '+(off<=0?'disabled':'')+'>پێشوو</button>'+
   '<span>'+(total?off+1:0)+' - '+Math.min(off+L,total)+'</span>'+
   '<button onclick="go(\''+w+'\','+(off+L)+')" '+(off+L>=total?'disabled':'')+'>دواتر</button></div>';
}
function go(w,o){ if(w==='sent'){sentOff=Math.max(0,o);loadSent()}else{famOff=Math.max(0,o);loadFam()} }

fetch('/api/fields').then(r=>r.json()).then(f=>{FIELDS=f;loadLists()});
</script>
</body>
</html>`;

function addon(app) {
  app.get(['/lists', '/lists.html'], (req, res) => res.type('html').send(LISTS_HTML));

  if (!DB) {
    console.log('DATABASE_URL نییە - بەشی نوێ کار ناکات');
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
  `).catch(e => console.log('DB error:', e.message));

  const auth = (req, res, next) => {
    if (!ADMIN) return next();
    if ((req.get('x-admin-key') || req.query.key) === ADMIN) return next();
    res.status(401).json({ error: 'کلیلی ئەدمین هەڵەیە' });
  };
  const wrap = fn => async (req, res, next) => {
    try { await ready; await fn(req, res, next); }
    catch (e) { console.log(e); if (!res.headersSent) res.status(500).json({ error: e.message }); }
  };

  let hasT = 0, hasV = false;
  async function hasData() {
    if (Date.now() - hasT > 10000) {
      hasV = (await pool.query('SELECT 1 FROM voters LIMIT 1')).rows.length > 0;
      hasT = Date.now();
    }
    return hasV;
  }
  let cntT = 0, cntV = 0;
  async function totalCount() {
    if (Date.now() - cntT > 30000) {
      cntV = (await pool.query('SELECT count(*)::int c FROM voters')).rows[0].c;
      cntT = Date.now();
    }
    return cntV;
  }

  // ناردنی ژمارە لەلایەن کارمەندەوە (جێگەی /api/send ی کۆن دەگرێتەوە، هەمان شێوە)
  app.post('/api/send', wrap(async (req, res, next) => {
    if (!(await hasData())) return next();
    const n = String(req.body.voterNumber ?? '').trim();
    const r = await pool.query('SELECT data FROM voters WHERE voter=$1', [n]);
    if (!r.rows.length) {
      return res.json({ found: false, message: 'ئەم ژمارەیە ئەو ژمارەیەیە کە لەو لیستەی تۆ نییە کە لە سێرڤەرەکە هەتە' });
    }
    await pool.query('INSERT INTO sent(voter) VALUES($1) ON CONFLICT DO NOTHING', [n]);
    res.json({ found: true, data: r.rows[0].data });
  }));

  app.get('/api/list', wrap(async (req, res, next) => {
    if (!(await hasData())) return next();
    const s = await pool.query('SELECT v.data FROM sent s JOIN voters v ON v.voter=s.voter ORDER BY s.at');
    res.json({ allCount: await totalCount(), sent: s.rows.map(r => r.data) });
  }));

  app.delete('/api/clear', wrap(async (req, res, next) => {
    if (!(await hasData())) return next();
    await pool.query('DELETE FROM sent');
    res.json({ ok: true });
  }));

  app.get('/api/fields', (req, res) => res.json(FIELDS));

  app.get('/api/lists', wrap(async (req, res) => {
    const r = await pool.query('SELECT list_no, count(*)::int c FROM voters GROUP BY list_no');
    const out = [];
    for (let i = 1; i <= MAX_LISTS; i++) {
      const f = r.rows.find(x => x.list_no === i);
      out.push({ list: i, count: f ? f.c : 0 });
    }
    res.json(out);
  }));

  app.post('/api/lists/:n/upload', auth, wrap(async (req, res) => {
    const n = parseInt(req.params.n, 10);
    if (!(n >= 1 && n <= MAX_LISTS)) return res.status(400).json({ error: 'ژمارەی لیست هەڵەیە' });
    const rows = req.body.data;
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'data دەبێت array بێت' });
    const m = new Map();
    for (const o of rows) {
      if (!o || typeof o !== 'object') continue;
      const v = pick(o, KEYS.voter);
      if (v === undefined) continue;
      m.set(String(v).trim(), o);
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
    hasT = 0; cntT = 0;
    res.json({ ok: true, received: rows.length, saved: vs.length });
  }));

  app.delete('/api/lists/:n', auth, wrap(async (req, res) => {
    const n = parseInt(req.params.n, 10);
    if (!(n >= 1 && n <= MAX_LISTS)) return res.status(400).json({ error: 'ژمارەی لیست هەڵەیە' });
    const r = await pool.query('DELETE FROM voters WHERE list_no=$1', [n]);
    hasT = 0; cntT = 0;
    res.json({ ok: true, deleted: r.rowCount });
  }));

  app.get('/api/lists/:n/download', auth, wrap(async (req, res) => {
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

  app.get('/api/sent', wrap(async (req, res) => {
    const limit = Math.min(+req.query.limit || 100, 500), off = +req.query.offset || 0;
    const t = await pool.query('SELECT count(*)::int c FROM sent');
    const r = await pool.query(
      'SELECT v.data FROM sent s JOIN voters v ON v.voter=s.voter ORDER BY s.at DESC LIMIT $1 OFFSET $2', [limit, off]);
    res.json({ total: t.rows[0].c, rows: r.rows.map(x => x.data) });
  }));

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
