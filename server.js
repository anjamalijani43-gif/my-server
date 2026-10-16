const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
let members = [];
const ADMIN_PASSWORD = "kirkuk123";

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>فۆڕم</title><style>
body{background:#f0f2f5;margin:0;padding:15px;font-family:sans-serif}
.card{background:#fff;max-width:500px;margin:40px auto;padding:25px;border-radius:15px;box-shadow:0 2px 15px rgba(0,0,0,0.1)}
h2{text-align:center;color:#1a237e}input{width:100%;padding:14px;margin:10px 0;border:1px solid #ddd;border-radius:10px;font-size:16px;box-sizing:border-box}
.btn{width:100%;padding:14px;border:none;border-radius:10px;font-size:17px;font-weight:bold;cursor:pointer;color:#fff;background:#1a237e}
.voter{border:3px solid #28a745 !important;background:#e8f5e9 !important;font-weight:bold;}
.success{background:#d4edda;color:#155724;padding:15px;border-radius:10px;text-align:center;margin-top:15px;display:none;}
</style></head><body>
<div class="card">
<h2>🗳️ فۆڕمی تۆمارکردن</h2>
<input id="name" placeholder="ناوی تەواو">
<input id="voter" class="voter" placeholder="ژمارەی دەنگدەر (رقم الناخب) *">
<input id="phone" placeholder="مۆبایل">
<input id="city" placeholder="شار - کەرکوک">
<input id="note" placeholder="تێبینی">
<p id="locStatus" style="font-size:11px;color:#888;text-align:center;">📍 شوێن: وەردەگیرێت...</p>
<button class="btn" onclick="add()">✅ ناردن</button>
<div id="success" class="success">✅ نێردرا - سوپاس!</div>
</div>
<script>
let loc="نەزانراو",lat="",lng="";
if(navigator.geolocation){navigator.geolocation.getCurrentPosition(p=>{lat=p.coords.latitude;lng=p.coords.longitude;loc=lat.toFixed(4)+","+lng.toFixed(4);document.getElementById('locStatus').innerHTML="📍 شوێن: تۆمارکرا ✅";},e=>{loc="بێ شوێن";document.getElementById('locStatus').innerHTML="";});}
async function add(){
  const name=document.getElementById('name').value.trim();
  const voter=document.getElementById('voter').value.trim();
  if(!name||!voter){alert('ناو و ژمارەی دەنگدەر پێویستە');return;}
  const phone=document.getElementById('phone').value.trim();
  const city=document.getElementById('city').value.trim();
  const note=document.getElementById('note').value.trim();
  const res=await fetch('/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,voter,phone,city,note,location:loc,lat,lng})});
  if((await res.json()).ok){
    document.getElementById('name').value='';document.getElementById('voter').value='';document.getElementById('phone').value='';document.getElementById('city').value='';document.getElementById('note').value='';
    document.getElementById('success').style.display='block';setTimeout(()=>document.getElementById('success').style.display='none',3000);
  }
}
</script></body></html>
`);
});

app.get('/admin', (req, res) => {
  if(req.query.pass !== ADMIN_PASSWORD){
    return res.send(`<html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#1a237e;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif}.card{background:#fff;padding:30px;border-radius:15px;max-width:350px;width:90%;text-align:center}input{width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:8px;box-sizing:border-box}.btn{width:100%;padding:12px;background:#1a237e;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer}</style></head><body><div class="card"><h2>🔐 ئەدمین</h2><input type="password" id="p" placeholder="پاسۆرد"><button class="btn" onclick="location.href='/admin?pass='+document.getElementById('p').value">چوونەژوورەوە</button></div></body></html>`);
  }
  res.send(`
<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Admin - 1M</title><style>
body{background:#0f172a;margin:0;padding:20px;font-family:sans-serif;color:#fff}
.card{background:#fff;color:#000;max-width:700px;margin:20px auto;padding:25px;border-radius:15px}
h2{text-align:center;color:#1a237e}
.stat{background:#1a237e;color:#fff;padding:20px;border-radius:12px;text-align:center;margin:15px 0}
.stat h1{font-size:48px;margin:10px 0}
.btn{padding:12px 20px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;color:#fff;margin:5px;font-size:14px}
.green{background:#0f9d58}.blue{background:#1a237e}.red{background:#ea4335}.gray{background:#555}
input{width:100%;padding:12px;margin:8px 0;border:2px solid #ddd;border-radius:8px;box-sizing:border-box}
.search-result{background:#f0f2f5;padding:10px;border-radius:8px;margin:5px 0}
</style></head><body>
<div class="card">
<h2>📊 سێرڤەری ١ ملیۆن - ئەدمین</h2>
<div class="stat">
<div>کۆی گشتی دەنگدەران</div>
<h1 id="count">0</h1>
<div id="size">قەبارە: 0 MB</div>
</div>

<h3>🔍 گەڕان بە ژمارەی دەنگدەر</h3>
<input id="search" placeholder="ژمارەی دەنگدەر بنووسە و Enter دابگرە">
<div id="results"></div>

<h3>📥 داگرتن لە لاپتۆپ</h3>
<p style="font-size:13px;color:#666;">بۆ ١ ملیۆن، داگرتن وەک CSV باشترینە - لە Excel دەکرێتەوە</p>
<button class="btn green" onclick="download('csv')">📥 داگرتنی هەموو لیستەکە وەک CSV (بۆ Excel)</button>
<button class="btn blue" onclick="download('json')">📥 داگرتن وەک JSON (پارێزراو)</button>
<button class="btn red" onclick="if(confirm('دڵنیای هەمووی دەسڕیتەوە؟')){fetch('/clear?pass=${ADMIN_PASSWORD}',{method:'POST'}).then(()=>location.reload())}">🗑️ سڕینەوەی هەموو لیستەکە</button>

<p style="font-size:11px;color:#888;margin-top:20px;text-align:center;">ئەم لینکە تەنها لای تۆیە - بە پاسۆرد: kirkuk123<br>لینک: /admin?pass=kirkuk123</p>
</div>
<script>
async function updateCount(){
  const res=await fetch('/api/count?pass=${ADMIN_PASSWORD}');
  const data=await res.json();
  document.getElementById('count').innerText=data.count.toLocaleString();
  document.getElementById('size').innerText='قەبارە: '+(JSON.stringify(data).length/1024/1024).toFixed(2)+' MB - نزیکەی '+(data.count*0.5/1000).toFixed(1)+' MB داتا';
}
async function download(type){
  document.getElementById('count').innerText='ئامادەکردن...';
  window.location.href='/api/download?pass=${ADMIN_PASSWORD}&type='+type;
  setTimeout(updateCount,2000);
}
document.getElementById('search').addEventListener('keypress', async (e)=>{
  if(e.key==='Enter'){
    const q=e.target.value.trim();
    if(!q)return;
    const res=await fetch('/api/search?pass=${ADMIN_PASSWORD}&q='+encodeURIComponent(q));
    const list=await res.json();
    const div=document.getElementById('results');
    if(list.length===0){div.innerHTML='<div class="search-result">نەدۆزرایەوە</div>';return;}
    div.innerHTML=list.slice(0,20).map(m=>'<div class="search-result"><b>'+m.name+'</b> - <span style="color:green;font-weight:bold">'+m.voter+'</span> - '+m.phone+' - '+m.city+' - '+m.date+'</div>').join('');
  }
});
updateCount();
</script></body></html>
`);
});

app.post('/add', (req, res) => {
  const { name, voter, phone, city, note, location, lat, lng } = req.body;
  const now = new Date();
  members.push({ id: Date.now()+Math.random(), name, voter, phone, city, note, location, lat, lng, date: now.toLocaleDateString('en-GB'), time: now.toLocaleTimeString('en-GB') });
  res.json({ ok: true });
});

app.get('/api/count', (req, res) => {
  if(req.query.pass !== ADMIN_PASSWORD) return res.status(401).json({error:'no'});
  res.json({ count: members.length });
});

app.get('/api/search', (req, res) => {
  if(req.query.pass !== ADMIN_PASSWORD) return res.status(401).json([]);
  const q = (req.query.q||'').toLowerCase();
  if(!q) return res.json([]);
  const results = members.filter(m => m.voter.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || (m.phone||'').includes(q)).slice(-100).reverse();
  res.json(results);
});

app.get('/api/download', (req, res) => {
  if(req.query.pass !== ADMIN_PASSWORD) return res.status(401).send('No access');
  const type = req.query.type || 'csv';
  if(type === 'json'){
    res.setHeader('Content-Disposition','attachment; filename=dangdaran-1M.json');
    res.setHeader('Content-Type','application/json');
    return res.json(members);
  }
  // CSV بۆ Excel
  let csv = "No,Name,VoterNumber,Phone,City,Note,Location,Lat,Lng,Date,Time\n";
  members.forEach((m,i)=>{
    const row = [i+1, '"'+(m.name||'').replace(/"/g,'""')+'"', m.voter, '"'+(m.phone||'')+'"', '"'+(m.city||'')+'"', '"'+(m.note||'').replace(/"/g,'""')+'"', '"'+(m.location||'')+'"', m.lat||'', m.lng||'', m.date, m.time].join(',');
    csv += row + "\n";
  });
  res.setHeader('Content-Disposition','attachment; filename=dangdaran-'+members.length+'.csv');
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.send("\uFEFF"+csv); // BOM بۆ کوردی لە Excel
});

app.post('/clear', (req, res) => {
  if(req.query.pass !== ADMIN_PASSWORD) return res.status(401).json({ok:false});
  members = [];
  res.json({ok:true});
});

app.get('/list', (req, res) => res.json([])); // بۆ کۆنەکان - بەتاڵ

app.listen(PORT);
