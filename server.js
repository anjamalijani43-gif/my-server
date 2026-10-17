const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_PASS = 'kirkuk123';
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({extended:true, limit:'50mb'}));

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'members.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, {recursive:true});
let members=[]; try{ if(fs.existsSync(DATA_FILE)) members=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); }catch(e){ members=[]; }
function save(){ fs.writeFileSync(DATA_FILE, JSON.stringify(members,null,2)); }

function html(){ return `
<!DOCTYPE html><html dir="rtl" lang="ku"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ئەدەمین</title><style>
*{box-sizing:border-box;font-family:sans-serif}body{margin:0;background:#0a1931;color:#fff;padding:10px}
.box{max-width:520px;margin:0 auto;background:#fff;color:#0a1931;border-radius:25px;padding:15px}
.cards{display:flex;gap:10px;margin:15px 0}.c{flex:1;text-align:center;padding:15px;border-radius:15px;color:white;font-weight:bold}.c1{background:#22c55e}.c2{background:#1e3a8a}.c3{background:#1e3a8a}.c span{display:block;font-size:26px;margin-top:5px}
.csv{border:3px dashed #1e3a8a;border-radius:15px;padding:12px;text-align:center}
.btn{background:#1e3a8a;color:white;border:none;padding:10px 16px;border-radius:10px;font-weight:bold;cursor:pointer;margin:4px}
table{width:100%;border-collapse:collapse;font-size:13px}th{background:#1e3a8a;color:white;padding:7px}td{padding:7px;border-bottom:1px solid #eee;text-align:center}
.search{position:fixed;bottom:10px;left:10px;right:10px;background:white;border-radius:30px;padding:8px;box-shadow:0 4px 15px rgba(0,0,0,.3);display:flex}
.search input{border:none;flex:1;outline:none;padding:8px}
textarea{width:100%;height:120px;border:1px solid #ccc;border-radius:8px;padding:8px}
</style></head><body><div class="box">
<div style="font-weight:bold;color:#1e3a8a">🟢 ئەدەمین - سەوز = لە لیست هەیە</div>
<div class="cards"><div class="c c1">سەوز<span id="sawz">0</span></div><div class="c c2">تۆمار<span id="tomar">0</span></div><div class="c c3">سەرەکی<span id="sareki">0</span></div></div>
<div class="csv">
<b>📤 بارکردنی لیستی ١ ملیۆن (CSV)</b><br><br>
<textarea id="csvText" placeholder="voter,name,city&#10;12345678,ئەنجام,کەرکوک&#10;87654321,کاکە..."></textarea><br>
<button class="btn" onclick="uploadText()">بارکردن</button>
<div style="font-size:11px;margin-top:8px">فۆرمات: voter,name,city - دەتوانی لە Excel کۆپی پەیست بکەیت</div>
</div>
<h3 style="text-align:right">دوایین تۆمار - سەوزەکان</h3>
<table><thead><tr><th>#</th><th>ناو</th><th>ژمارەی دەنگدەر</th><th>دۆخ</th><th>شار</th></tr></thead><tbody id="tbody"></tbody></table>
<br><button class="btn" style="background:#22c55e" onclick="load()">🔄 نوێکردنەوە</button>
<button class="btn" onclick="location.href='/export'">📥 داگرتن CSV</button>
<br><br><br><br></div>
<div class="search"><input id="q" placeholder="گەڕان بە ژمارەی دەنگدەر - Enter" onkeypress="if(event.key==='Enter')search()"></div>
<script>
let all=[];
async function load(){const r=await fetch('/list');all=await r.json();document.getElementById('tomar').innerText=all.length;document.getElementById('sawz').innerText=all.length;render(all);}
function render(list){const tb=document.getElementById('tbody');tb.innerHTML='';list.slice().reverse().slice(0,100).forEach((m,i)=>{tb.innerHTML+=\`<tr><td>\${i+1}</td><td>\${m.name||'-'}</td><td style="direction:ltr;font-weight:bold">\${m.voter}</td><td><span style="background:#22c55e;color:white;padding:2px 8px;border-radius:10px">سەوز</span></td><td>\${m.city||'-'}</td></tr>\`;});}
function search(){const q=document.getElementById('q').value.trim();if(!q)return render(all);render(all.filter(m=>m.voter.includes(q)));}
async function uploadText(){
 const text=document.getElementById('csvText').value.trim(); if(!text) return alert('تکایە لیستەکە بنووسە');
 const r=await fetch('/upload-csv-text',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
 const d=await r.json(); alert(d.message); load();
}
load();
</script></body></html>`;}

app.get('/',(req,res)=>res.send(html()));
app.get('/admin',(req,res)=>{ if(req.query.pass!==ADMIN_PASS) return res.status(403).send('403 - پاسۆرد: /admin?pass=kirkuk123'); res.send(html()); });
app.post('/add',(req,res)=>{ const {voter,name,city}=req.body; if(!voter||!/^[0-9]{6,8}$/.test(voter)) return res.json({ok:false}); if(members.some(m=>m.voter===voter)) return res.json({ok:false,message:'پێشتر هەیە'}); members.push({id:Date.now(),voter,name,city,status:'sawz',time:new Date().toLocaleString('ku-IQ')}); save(); res.json({ok:true}); });
app.get('/list',(req,res)=>res.json(members));
app.post('/upload-csv-text',(req,res)=>{
 try{
  const text=req.body.text||''; const lines=text.split('\\n'); let count=0;
  lines.forEach(line=>{
   const p=line.split(','); const voter=(p[0]||'').trim().replace(/[^0-9]/g,''); const name=(p[1]||'').trim(); const city=(p[2]||'').trim();
   if(/^[0-9]{6,8}$/.test(voter)&&!members.some(m=>m.voter===voter)){ members.push({id:Date.now()+count++,voter,name,city,status:'sawz',time:new Date().toLocaleString('ku-IQ')}); }
  }); save(); res.json({message: count+' دانە بارکرا'});
 }catch(e){ res.json({message:'هەڵە'}); }
});
app.get('/export',(req,res)=>{ let csv='voter,name,city\\n'; members.forEach(m=>{ csv+=\`\${m.voter},\${m.name},\${m.city}\\n\`; }); res.header('Content-Type','text/csv'); res.attachment('list.csv'); res.send(csv); });
app.listen(PORT,()=>console.log('ok'));
