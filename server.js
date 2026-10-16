const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.json({limit: '100mb'}));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
let members = [];
let masterList = [];
let masterMap = new Map();
const ADMIN_PASSWORD = "kirkuk123";

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>فۆڕم</title><style>
body{background:#f0f2f5;margin:0;padding:15px;font-family:sans-serif}
.card{background:#fff;max-width:500px;margin:30px auto;padding:25px;border-radius:15px;box-shadow:0 2px 15px rgba(0,0,0,0.1)}
h2{text-align:center;color:#1a237e}input{width:100%;padding:14px;margin:10px 0;border:1px solid #ddd;border-radius:10px;font-size:16px;box-sizing:border-box}
.btn{width:100%;padding:14px;border:none;border-radius:10px;font-size:17px;font-weight:bold;cursor:pointer;color:#fff;background:#1a237e}
.voter{border:3px solid #28a745 !important;background:#e8f5e9 !important;font-weight:bold;}
.success{background:#d4edda;color:#155724;padding:15px;border-radius:10px;text-align:center;margin-top:15px;display:none;border:2px solid #28a745;}
.info{padding:12px;border-radius:10px;font-size:13px;margin:10px 0;display:none;font-weight:bold;text-align:center}
.info.ok{background:#d4edda;color:#155724;border:2px solid #28a745;}
.info.no{background:#fff3cd;color:#856404;border:2px solid #ffc107;}
</style></head><body>
<div class="card">
<h2>🗳️ فۆڕمی تۆمارکردن</h2>
<input id="name" placeholder="ناوی تەواو">
<input id="voter" class="voter" placeholder="ژمارەی دەنگدەر (رقم الناخب) *" oninput="checkVoter()">
<div id="voterInfo" class="info"></div>
<input id="phone" placeholder="مۆبایل">
<input id="city" placeholder="شار">
<input id="note" placeholder="تێبینی">
<p id="locStatus" style="font-size:11px;color:#888;text-align:center;">📍 شوێن: وەردەگیرێت...</p>
<button class="btn" onclick="add()">✅ ناردن</button>
<div id="success" class="success">✅ سوپاس! تۆمارکرا</div>
</div>
<script>
let loc="نەزانراو",lat="",lng="";
if(navigator.geolocation){navigator.geolocation.getCurrentPosition(p=>{lat=p.coords.latitude;lng=p.coords.longitude;loc=lat.toFixed(4)+","+lng.toFixed(4);document.getElementById('locStatus').innerHTML="📍 شوێن: تۆمارکرا ✅";},e=>{loc="بێ شوێن";});}
async function checkVoter(){
  const voter=document.getElementById('voter').value.trim();
  const div=document.getElementById('voterInfo');
  if(!voter){div.style.display='none';return;}
  const res=await fetch('/api/check-voter?v='+encodeURIComponent(voter));
  const data=await res.json();
  div.style.display='block';
  if(data.found){
    div.className='info ok';
    div.innerHTML='✅ بەڵێ لە لیستەکە هەیە<br>ناو: '+(data.info.name||'')+'<br>شار: '+(data.info.city||'')+'<br>ژمارە: '+data.info.voter;
    // ئۆتۆماتیک ناو و شار پڕ بکەرەوە
    if(data.info.name && !document.getElementById('name').value) document.getElementById('name').value=data.info.name;
    if(data.info.city && !document.getElementById('city').value) document.getElementById('city').value=data.info.city;
  } else {
    if(data.totalMaster>0){
      div.className='info no';
      div.innerHTML='❌ لە لیستی سەرەکی نیە';
    } else {
      div.style.display='none';
    }
  }
}
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
    document.getElementById('voterInfo').style.display='none';
    document.getElementById('success').style.display='block';setTimeout(()=>document.getElementById('success').style.display='none',4000);
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
<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Admin</title><style>
body{background:#0f172a;margin:0;padding:15px;font-family:sans-serif}
.card{background:#fff;color:#000;max-width:900px;margin:15px auto;padding:20px;border-radius:15px}
h2{text-align:center;color:#1a237e}
.stat{display:flex;gap:10px;margin:15px 0}
.stat div{flex:1;background:#1a237e;color:#fff;padding:15px;border-radius:10px;text-align:center}
.stat h2{color:#fff;margin:5px 0}
.btn{padding:10px 15px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;color:#fff;margin:4px;font-size:12px}
.green{background:#0f9d58}.blue{background:#1a237e}.orange{background:#ff9800}.red{background:#ea4335}
input{width:100%;padding:12px;margin:8px 0;border:2px solid #ddd;border-radius:8px;box-sizing:border-box}
.upload-area{border:3px dashed #1a237e;padding:15px;border-radius:12px;text-align:center;background:#f8f9ff;margin:10px 0}
table{width:100%;border-collapse:collapse;font-size:11px;margin-top:15px}th{background:#1a237e;color:#fff;padding:8px}td{padding:8px;border-bottom:1px solid #eee}
.row-green{background:#d4edda !important;border-left:5px solid #28a745;}
.row-green td{color:#155724;font-weight:bold;}
.badge-green{background:#28a745;color:#fff;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:bold;}
.badge-red{background:#dc3545;color:#fff;padding:4px 10px;border-radius:12px;font-size:11px;}
</style></head><body>
<div class="card">
<h2>📊 سێرڤەر - سەوز = لە لیستەکە هەیە</h2>
<div class="stat">
<div><small>لیستی سەرەکی</small><h2 id="masterCount">0</h2></div>
<div><small>تۆمارکراو</small><h2 id="memberCount">0</h2></div>
<div style="background:#28a745;"><small>سەوز (لە لیست)</small><h2 id="greenCount">0</h2></div>
</div>

<div class="upload-area">
<b>📤 بارکردنی لیستی ١ ملیۆن</b><br>
<input type="file" id="file" accept=".csv"><br>
<button class="btn blue" onclick="uploadFile()">بارکردن</button>
<div id="uploadStatus" style="font-size:12px;margin-top:8px;"></div>
</div>

<h3>📋 دوایین تۆمارکراوەکان - سەوز = لە لیستەکە هەیە</h3>
<div style="overflow-x:auto;max-height:500px;overflow-y:auto;">
<table><thead><tr><th>#</th><th>ناو</th><th>ژمارەی دەنگدەر</th><th>لە لیست؟</th><th>مۆبایل</th><th>شار</th><th>کات</th></tr></thead><tbody id="tbody"></tbody></table>
</div>

<div style="text-align:center;margin-top:15px;">
<button class="btn green" onclick="load()">🔄 نوێکردنەوە</button>
<button class="btn blue" onclick="download()">📥 داگرتنی هەموو</button>
</div>

<input id="search" placeholder="گەڕان بە ژمارەی دەنگدەر - Enter" style="margin-top:15px;">
<div id="searchResult"></div>
</div>
<script>
async function update(){
  const res=await fetch('/api/counts?pass=${ADMIN_PASSWORD}');
  const data=await res.json();
  document.getElementById('masterCount').innerText=data.master.toLocaleString();
  document.getElementById('memberCount').innerText=data.members.toLocaleString();
  document.getElementById('greenCount').innerText=data.green.toLocaleString();
  const tbody=document.getElementById('tbody');
  tbody.innerHTML='';
  data.recent.forEach((m,i)=>{
    const isGreen=m.inMaster;
    const cls=isGreen?'row-green':'';
    const badge=isGreen?'<span class="badge-green">✅ بەڵێ - سەوز</span>':'<span class="badge-red">❌ نیە</span>';
    tbody.innerHTML+='<tr class="'+cls+'"><td>'+(i+1)+'</td><td><b>'+m.name+'</b><br><small>'+(m.masterName||'')+'</small></td><td style="font-weight:bold;font-size:13px">'+m.voter+'</td><td>'+badge+'</td><td>'+(m.phone||'-')+'</td><td>'+(m.city||'-')+'</td><td style="font-size:10px">'+m.date+'<br>'+m.time+'</td></tr>';
  });
}
async function uploadFile(){
  const file=document.getElementById('file').files[0];
  if(!file)return alert('فایل هەڵبژێرە');
  const status=document.getElementById('uploadStatus');
  status.innerHTML='⏳ خوێندنەوە...';
  const text=await file.text();
  const lines=text.split('\\n').filter(l=>l.trim());
  let data=[];
  const start=lines[0].toLowerCase().includes('voter')?1:0;
  for(let i=start;i<lines.length;i++){
    const p=lines[i].split(',').map(s=>s.trim().replace(/^"|"$/g,''));
    if(p[0]) data.push({voter:p[0], name:p[1]||'', city:p[2]||'', phone:p[3]||''});
  }
  status.innerHTML='⏳ ناردن: '+data.length.toLocaleString()+'...';
  const res=await fetch('/api/upload-master?pass=${ADMIN_PASSWORD}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({list:data})});
  const r=await res.json();
  status.innerHTML='✅ '+r.count.toLocaleString()+' بارکرا - ئێستا هەموو شت سەوز دەبێت!';
  update();
}
function download(){window.location.href='/api/download?pass=${ADMIN_PASSWORD}';}
document.getElementById('search').addEventListener('keypress', async(e)=>{
  if(e.key==='Enter'){
    const q=e.target.value.trim();if(!q)return;
    const res=await fetch('/api/search-all?pass=${ADMIN_PASSWORD}&q='+encodeURIComponent(q));
    const d=await res.json();
    document.getElementById('searchResult').innerHTML='<div style="background:'+(d.masterFound?'#d4edda':'#fff3cd')+';padding:15px;border-radius:10px;margin-top:10px;border:2px solid '+(d.masterFound?'#28a745':'#ffc107')+';"><b>ئەنجام:</b> '+(d.masterFound?'✅ <b style="color:green">بەڵێ لە لیستەکە هەیە - سەوز</b> - '+d.masterInfo.name:'❌ لە لیستەکە نیە')+'</div>';
  }
});
async function load(){update();}
update();setInterval(update,10000);
</script></body></html>
`);
});

app.get('/api/check-voter', (req, res) => {
  const v=req.query.v; const found=masterMap.has(v);
  res.json({ found, info: found?masterMap.get(v):null, totalMaster: masterList.length });
});
app.post('/add', (req, res) => {
  const { name, voter, phone, city, note, location, lat, lng } = req.body;
  const now=new Date(); const masterInfo=masterMap.get(voter);
  members.push({ id: Date.now()+Math.random(), name, voter, phone, city, note, location, lat, lng, date: now.toLocaleDateString('en-GB'), time: now.toLocaleTimeString('en-GB'), inMaster: !!masterInfo, masterName: masterInfo?.name||'' });
  res.json({ ok: true });
});
app.get('/api/counts', (req, res) => {
  if(req.query.pass!==ADMIN_PASSWORD) return res.status(401).json({});
  const green=members.filter(m=>m.inMaster).length;
  res.json({ master: masterList.length, members: members.length, green, recent: members.slice(-100).reverse() });
});
app.post('/api/upload-master', (req, res) => {
  if(req.query.pass!==ADMIN_PASSWORD) return res.status(401).json({ok:false});
  const list=req.body.list||[]; masterList=list; masterMap.clear(); list.forEach(i=>{ if(i.voter) masterMap.set(i.voter,i); });
  res.json({ ok:true, count: masterList.length });
});
app.get('/api/download', (req, res) => {
  if(req.query.pass!==ADMIN_PASSWORD) return res.status(401).send('No');
  let csv="No,Voter,Name,City,Phone,InMaster,MasterName,Location,Date,Time,Note\n";
  members.forEach((m,i)=>{ csv+= [i+1,m.voter,'"'+(m.name||'').replace(/"/g,'""')+'"', '"'+(m.city||'')+'"', '"'+(m.phone||'')+'"', m.inMaster?'YES':'NO', '"'+(m.masterName||'')+'"', '"'+(m.location||'')+'"', m.date,m.time,'"'+(m.note||'').replace(/"/g,'""')+'"'].join(',')+"\n"; });
  res.setHeader('Content-Disposition','attachment; filename=SEWZ-'+members.length+'.csv');
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.send("\uFEFF"+csv);
});
app.get('/api/search-all', (req, res) => {
  if(req.query.pass!==ADMIN_PASSWORD) return res.json({});
  const q=req.query.q||''; const masterInfo=masterMap.get(q);
  res.json({ masterFound:!!masterInfo, masterInfo });
});
app.listen(PORT);
