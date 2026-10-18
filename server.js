const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== پاشەکەوتکردنی هەمیشەیی لەسەر دیسک =====
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const VOTER_FILE = path.join(DATA_DIR, 'voters.json');
const MEMBER_FILE = path.join(DATA_DIR, 'members.json');
const META_FILE = path.join(DATA_DIR, 'meta.json');

let members = [];
let voterDB = {};
let meta = { lastUpdate: null }; // بۆ ئاگادارکردنەوەی مانگانە

function loadData(){
  try{ if(fs.existsSync(VOTER_FILE)) voterDB = JSON.parse(fs.readFileSync(VOTER_FILE,'utf8')); }catch(e){ voterDB={}; }
  try{ if(fs.existsSync(MEMBER_FILE)) members = JSON.parse(fs.readFileSync(MEMBER_FILE,'utf8')); }catch(e){ members=[]; }
  try{ if(fs.existsSync(META_FILE)) meta = JSON.parse(fs.readFileSync(META_FILE,'utf8')); }catch(e){ meta={lastUpdate:null}; }
}
function saveVoters(){ fs.writeFileSync(VOTER_FILE, JSON.stringify(voterDB, null, 2)); }
function saveMembers(){ fs.writeFileSync(MEMBER_FILE, JSON.stringify(members, null, 2)); }
function saveMeta(){ fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2)); }

loadData();

let staffUsers = [{ username: 'staff', password: 'staff123' }];

// Helper بۆ حیسابکردنی ماوەی ئاپدەیت
function getUpdateStatus(){
  if(!meta.lastUpdate) return { daysPassed: 999, daysLeft: -1, needsUpdate: true, text: "هەرگیز ئاپدەیت نەکراوە!" };
  const last = new Date(meta.lastUpdate);
  const now = new Date();
  const diffMs = now - last;
  const daysPassed = Math.floor(diffMs / (1000*60*60*24));
  const daysLeft = 30 - daysPassed;
  return {
    daysPassed,
    daysLeft,
    needsUpdate: daysLeft <= 3,
    text: `دوایین ئاپدەیت: ${last.toLocaleDateString('ku')} - ${daysPassed} ڕۆژ پێش ئێستا`,
    lastDate: meta.lastUpdate
  };
}

// ===== HOME =====
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html dir="rtl" lang="ku">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>App Anjam Jani</title>
<link rel="manifest" href="/manifest.json">
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui}
body{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;padding:20px}
.container{max-width:900px;margin:auto}
.header{text-align:center;color:white;margin:25px 0}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0}
@media(max-width:600px){.cards{grid-template-columns:1fr}}
.card{background:white;border-radius:20px;padding:25px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.2);text-decoration:none;color:#333;display:block;transition:0.3s}
.card:hover{transform:translateY(-4px)}
.card.staff{border-top:5px solid #4CAF50}.card.admin{border-top:5px solid #f44336}
.form-section{background:white;border-radius:20px;padding:30px;margin-top:20px}
input,select{width:100%;padding:14px;margin:8px 0;border:2px solid #e0e0e0;border-radius:12px;font-size:16px;outline:none}
input:focus{border-color:#667eea}
input.auto-filled{background:#e8f5e9;border-color:#4CAF50;font-weight:bold}
input.invalid{border-color:#f44336;background:#ffebee}
.hint{font-size:12px;color:#666;margin:-4px 0 8px 5px}
.hint.ok{color:#2e7d32;font-weight:bold}.hint.err{color:#f44336}
.btn{width:100%;padding:15px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;border-radius:12px;font-size:18px;font-weight:bold;cursor:pointer;margin-top:15px}
.success{background:#e8f5e9;color:#2e7d32;padding:15px;border-radius:12px;text-align:center;margin-bottom:15px;display:none}
.counter{text-align:center;color:white;margin-top:20px}
</style></head>
<body>
<div class="container">
<div class="header"><h1>📱 App Anjam Jani</h1><p>سیستەمی تۆمارکردنی دەنگدەران - ئۆتۆماتیکی</p></div>
<div class="cards">
<a href="/staff-login" class="card staff"><div style="font-size:40px">👨‍💼</div><h3>چوونە ژوورەوە بۆ کارمەند</h3><p>Staff</p></a>
<a href="/admin" class="card admin"><div style="font-size:40px">🔐</div><h3>چوونە ژوورەوە بۆ ئادمین سێرڤەر</h3><p>Admin Server</p></a>
</div>
<div class="form-section">
<h2 style="text-align:center;margin-bottom:10px">📝 تۆمارکردنی دەنگدەر</h2>
<p style="text-align:center;color:#666;font-size:13px;margin-bottom:15px">تەنها رقم الناخب بنووسە، ناو و شار خۆی دێت</p>
<div id="success" class="success">✅ تۆمارکرا!</div>
<form id="memberForm">
<label>ژمارەی دەنگدەر (رقم الناخب) - ٨ ژمارە *</label>
<input type="text" id="voterNumber" name="voterNumber" placeholder="مثال: 12345678" maxlength="8" required inputmode="numeric">
<div id="voterHint" class="hint">٨ ژمارە بنووسە...</div>
<label>ناوی تەواو (خۆی دێت)</label>
<input type="text" id="nameField" name="name" placeholder="دوای نووسینی ژمارە، ناو لێرە دێت" required readonly>
<div id="nameHint" class="hint">چاوەڕوانی ژمارەی دەنگدەر...</div>
<label>شار (خۆی دێت)</label>
<input type="text" id="cityField" name="city" placeholder="شار خۆی دێت" required readonly>
<label>ژمارەی مۆبایل</label>
<input type="tel" name="phone" placeholder="٠٧٧٠..." required>
<label>تێبینی</label>
<input type="text" name="note" placeholder="ئیختیاری">
<button type="submit" class="btn">تۆمارکردن ✅</button>
</form>
</div>
<div class="counter">👥 تۆمارکراو: <span id="count">${members.length}</span> | 📚 لیستی بنەڕەت: <span>${Object.keys(voterDB).length}</span> دەنگدەر</div>
</div>
<script>
const voterInput=document.getElementById('voterNumber');
const nameField=document.getElementById('nameField');
const cityField=document.getElementById('cityField');
const voterHint=document.getElementById('voterHint');
const nameHint=document.getElementById('nameHint');
voterInput.addEventListener('input', async function(){
  this.value=this.value.replace(/[^0-9]/g,'').slice(0,8);
  if(this.value.length===8){
    voterHint.textContent='⏳ دەگەڕێم...'; voterHint.className='hint';
    try{
      const res=await fetch('/lookup/'+this.value);
      const data=await res.json();
      if(data.found){
        nameField.value=data.name; cityField.value=data.city;
        nameField.classList.add('auto-filled'); cityField.classList.add('auto-filled');
        voterHint.textContent='✅ دۆزرایەوە'; voterHint.className='hint ok';
        nameHint.textContent='✅ ناو لە لیستەوە هێنرا'; nameHint.className='hint ok';
        this.classList.remove('invalid');
      } else {
        nameField.value=''; cityField.value='';
        nameField.classList.remove('auto-filled'); cityField.classList.remove('auto-filled');
        voterHint.textContent='❌ ئەم ژمارەیە لە لیستەکەدا نییە - تکایە لە ئادمینەوە لیست بار بکە'; voterHint.className='hint err';
        nameHint.textContent='ژمارەکە نەدۆزرایەوە'; nameHint.className='hint err';
        this.classList.add('invalid');
      }
    }catch(e){ voterHint.textContent='هەڵە لە گەڕان'; }
  } else {
    nameField.value=''; cityField.value='';
    nameField.classList.remove('auto-filled'); cityField.classList.remove('auto-filled');
    voterHint.textContent='پێویستە ٨ ژمارە بێت - ئێستا '+this.value.length+' نووسیوە'; voterHint.className='hint';
    nameHint.textContent='چاوەڕوانی ژمارەی دەنگدەر...'; nameHint.className='hint';
  }
});
document.getElementById('memberForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  if(voterInput.value.length!==8 || !nameField.value){ alert('تکایە ژمارەی دەنگدەری دروست بنووسە تا ناو بهێنێت'); return; }
  const fd=new FormData(e.target); const data=Object.fromEntries(fd);
  const res=await fetch('/add-member',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const result=await res.json();
  if(result.success){ document.getElementById('success').style.display='block'; document.getElementById('count').textContent=result.total; e.target.reset(); nameField.classList.remove('auto-filled'); cityField.classList.remove('auto-filled'); voterHint.textContent='٨ ژمارە بنووسە...'; voterHint.className='hint'; nameHint.textContent='چاوەڕوانی ژمارەی دەنگدەر...'; setTimeout(()=>{document.getElementById('success').style.display='none'},3000); }
  else alert(result.message);
});
</script></body></html>`);
});

// ===== LOOKUP =====
app.get('/lookup/:num',(req,res)=>{
  const rec=voterDB[req.params.num];
  if(rec) res.json({found:true,name:rec.name,city:rec.city});
  else res.json({found:false});
});

// ===== STAFF LOGIN PAGE (simple) =====
app.get('/staff-login',(req,res)=>{
  res.send(`<html dir="rtl"><body style="font-family:system-ui;padding:30px"><h2>Staff Login</h2><form method="POST" action="/staff-login"><input name="username" placeholder="username"><input name="password" type="password" placeholder="password"><button>Login</button></form></body></html>`);
});

// ===== ADMIN FULL SCREEN - بە ئاپدەیتی مانگانە =====
app.get('/admin',(req,res)=>{
  const rows=members.map((m,i)=>`<tr><td>${i+1}</td><td>${m.name}</td><td>${m.phone}</td><td>${m.voterNumber}</td><td>${m.city}</td><td>${m.note||''}</td><td><button onclick="del(${i})">🗑️</button></td></tr>`).join('');
  const voterEntries=Object.entries(voterDB).slice(0,500);
  const voterRows=voterEntries.map(([num,info],i)=>`<tr><td>${i+1}</td><td>${num}</td><td>${info.name}</td><td>${info.city}</td></tr>`).join('');
  const status=getUpdateStatus();
  let alertBox='';
  if(status.needsUpdate){
    alertBox=`<div style="background:#ff5252;color:white;padding:15px;border-radius:12px;margin:20px;text-align:center;font-weight:bold;font-size:16px;animation:blink 1s infinite">⚠️ ئاگاداری: پێویستت بە ئاپدەیتە! ${status.text}<br>تەنها ${status.daysLeft<=0?0:status.daysLeft} ڕۆژ ماوە - تکایە لیستە نوێیەکە بار بکە</div><style>@keyframes blink{50%{opacity:0.7}}</style>`;
  } else {
    alertBox=`<div style="background:#1e1e1e;color:#aaa;padding:12px;border-radius:8px;margin:20px;text-align:center">✅ ${status.text} | ${30-status.daysPassed} ڕۆژ ماوە بۆ ئاپدەیتی داهاتوو</div>`;
  }

  res.send(`<!DOCTYPE html>
<html dir="rtl" lang="ku"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>Admin</title>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<style>
body{margin:0;background:#121212;color:white;font-family:system-ui}
.header{padding:15px;background:#1e1e1e;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
.btn{padding:8px 14px;border:none;border-radius:8px;cursor:pointer;font-weight:bold}
.btn-green{background:#4CAF50;color:white}.btn-blue{background:#2196F3;color:white}.btn-red{background:#f44336;color:white}.btn-orange{background:#FF9800;color:white}.btn-purple{background:#9C27B0;color:white}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:15px;padding:20px}
.stat{background:#1e1e1e;padding:20px;border-radius:12px;text-align:center}
table{width:100%;background:#1e1e1e;border-collapse:collapse;margin:10px 20px;width:calc(100% - 40px);border-radius:12px;overflow:hidden}
th{background:#333;padding:12px;color:#aaa}td{padding:10px;border-bottom:1px solid #333;text-align:center}
.section{background:#1e1e1e;margin:20px;border-radius:12px;padding:20px}
textarea{width:100%;height:150px;background:#2a2a2a;color:white;border:1px solid #444;border-radius:8px;padding:12px;font-family:monospace}
input.search{width:calc(100% - 40px);margin:10px 20px;padding:12px;border-radius:8px;border:1px solid #333;background:#1e1e1e;color:white}
.upload-box{border:2px dashed #4CAF50;padding:20px;border-radius:12px;text-align:center;margin:15px 0}
</style></head><body>
<div class="header"><h2>🔐 ئادمین سێرڤەر - فول سکرین</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><button onclick="location.reload()" class="btn btn-orange">🔄 تازەکردنەوە</button><a href="/export" class="btn btn-green">📥 Excel</a><button onclick="if(confirm('هەموو بسڕمەوە؟')){fetch('/clear',{method:'POST'}).then(()=>location.reload())}" class="btn btn-red">🗑️ هەموو</button><a href="/" class="btn btn-blue">🏠 سەرەکی</a></div></div>

${alertBox}

<div class="stats">
  <div class="stat"><h3 style="color:#888">کۆی تۆمارکراو</h3><p style="font-size:26px;font-weight:bold">${members.length}</p></div>
  <div class="stat"><h3 style="color:#888">لیستی بنەڕەت (دەنگدەر)</h3><p style="font-size:26px;font-weight:bold;color:#4CAF50">${Object.keys(voterDB).length}</p></div>
  <div class="stat"><h3 style="color:#888">دوایین ئاپدەیت</h3><p style="font-size:14px;color:${status.needsUpdate?'#ff5252':'#4CAF50'}">${status.text}</p></div>
  <div class="stat"><h3 style="color:#888">سێرڤەر</h3><p style="color:#4CAF50">ONLINE ✅ - پاشەکەوتکراو</p></div>
</div>

<div class="section">
  <h3>📚 بارکردنی لیستی دەنگدەران (رقم + ناو + شار) - ئاپدەیتی مانگانە لێرەوە</h3>
  <p style="color:#aaa;font-size:13px;margin:10px 0">فۆرمات: هەر دێڕێک: <b>ژمارە,ناو,شار</b> بۆ نموونە:<br>12345678,احمد محمد,کەرکوک<br>87654321,سارا علی,هەولێر<br>یان فایلی Excel/CSV هەڵبژێرە - ئێستا Excel ی ڕاستەقینەش کاردەکات!</p>
  <div class="upload-box">
    <input type="file" id="csvFile" accept=".csv,.txt,.xlsx,.xls" style="margin-bottom:10px"><br>
    <button class="btn btn-purple" onclick="uploadFile()">📤 بارکردن لە فایل</button>
    <p id="fileInfo" style="color:#888;font-size:12px;margin-top:8px"></p>
  </div>
  <p style="text-align:center;color:#888;margin:10px">— یان —</p>
  <textarea id="bulkText" placeholder="لێرە پەیست بکە:&#10;12345678,احمد محمد,کەرکوک&#10;87654321,سارا علی,هەولێر"></textarea>
  <button class="btn btn-green" onclick="bulkUpload()" style="width:100%;margin-top:10px">✅ تۆمارکردنی لیست و ئاپدەیتکردنی بەروار</button>
  <p id="uploadStatus" style="margin-top:10px;text-align:center"></p>
</div>

<input class="search" id="search" placeholder="🔍 گەڕان بە ناو، رقم الناخب..." oninput="filterTable()">

<h3 style="margin:20px">📋 ئەندامە تۆمارکراوەکان (ئۆتۆماتیکی)</h3>
<table id="tbl"><tr><th>#</th><th>ناو (ئۆتۆ)</th><th>مۆبایل</th><th>رقم الناخب</th><th>شار (ئۆتۆ)</th><th>تێبینی</th><th>سڕینەوە</th></tr>${rows||'<tr><td colspan=7>هیچ نییە</td></tr>'}</table>

<div class="section">
  <h3>📚 لیستی بنەڕەت (500 یەکەم)</h3>
  <table><tr><th>#</th><th>رقم الناخب</th><th>ناو</th><th>شار</th></tr>${voterRows||'<tr><td colspan=4>لیست بەتاڵە - تکایە لیست بار بکە</td></tr>'}</table>
</div>

<script>
function del(i){if(confirm('بسڕمەوە؟')){fetch('/delete/'+i,{method:'POST'}).then(()=>location.reload())}}
function filterTable(){const q=document.getElementById('search').value.toLowerCase(); const rows=document.querySelectorAll('#tbl tr'); for(let j=1;j<rows.length;j++){rows[j].style.display=rows[j].textContent.toLowerCase().includes(q)?'':'none';}}

async function bulkUpload(){
  const text=document.getElementById('bulkText').value.trim();
  if(!text){alert('تکایە لیست بنووسە'); return;}
  document.getElementById('uploadStatus').innerHTML='⏳ خەریکە بار دەکرێت...';
  const res=await fetch('/upload-voters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
  const data=await res.json();
  document.getElementById('uploadStatus').innerHTML='✅ '+data.added+' دانە زیادکرا - کۆی گشتی: '+data.total+'<br>📅 بەرواری ئاپدەیت نوێکرایەوە';
  setTimeout(()=>location.reload(),1500);
}

async function uploadFile(){
  const file=document.getElementById('csvFile').files[0];
  if(!file){alert('فایل هەڵبژێرە'); return;}
  const info=document.getElementById('fileInfo');
  info.textContent='⏳ خوێندنەوەی '+file.name+'...';

  if(file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')){
    // Excel ڕاستەقینە
    const reader=new FileReader();
    reader.onload=function(e){
      const data=new Uint8Array(e.target.result);
      const workbook=XLSX.read(data,{type:'array'});
      const firstSheet=workbook.SheetNames[0];
      const sheet=workbook.Sheets[firstSheet];
      const rows=XLSX.utils.sheet_to_json(sheet,{header:1});
      // بگۆڕە بۆ فۆرماتی ژمارە,ناو,شار
      let textLines=[];
      rows.forEach(r=>{
        if(!r || r.length<2) return;
        let num=String(r[0]||'').replace(/[^0-9]/g,'');
        let name=String(r[1]||'').trim();
        let city=String(r[2]||'کەرکوک').trim();
        if(num.length===8 && name) textLines.push(num+','+name+','+city);
      });
      document.getElementById('bulkText').value=textLines.join('\\n');
      info.textContent='✅ '+textLines.length+' دانە لە Excel خوێندرایەوە - ئێستا تۆمارکردنی لیست لێبدە';
    };
    reader.readAsArrayBuffer(file);
  } else {
    const text=await file.text();
    document.getElementById('bulkText').value=text;
    info.textContent='✅ فایل خوێندرایەوە - ئێستا تۆمارکردنی لیست لێبدە';
  }
}
</script></body></html>`);
});

app.post('/upload-voters',(req,res)=>{
  const text=req.body.text||'';
  const lines=text.split(/\r?\n/);
  let added=0;
  lines.forEach(line=>{
    line=line.trim(); if(!line) return;
    const parts=line.split(/[,;\t]/).map(s=>s.trim());
    if(parts.length>=2){
      let num=parts[0].replace(/[^0-9]/g,'');
      if(num.length===8){
        let name=parts[1]||'';
        let city=parts[2]||'کەرکوک';
        if(name){ voterDB[num]={name, city}; added++; }
      }
    }
  });
  // پاشەکەوت و نوێکردنەوەی بەروار
  try{
    saveVoters();
    meta.lastUpdate=new Date().toISOString();
    saveMeta();
  }catch(e){ console.error('save error',e); }
  res.json({added, total:Object.keys(voterDB).length, lastUpdate: meta.lastUpdate});
});

app.post('/add-member',(req,res)=>{
  const {name,phone,voterNumber,city,note}=req.body;
  if(!voterNumber || voterNumber.length!==8) return res.json({success:false,message:'٨ ژمارە پێویستە'});
  if(!voterDB[voterNumber]) return res.json({success:false,message:'ئەم ژمارەیە لە لیستی بنەڕەتدا نییە! سەرەتا لە ئادمینەوە لیستەکە بار بکە'});
  if(members.find(m=>m.voterNumber===voterNumber)) return res.json({success:false,message:'پێشتر تۆمارکراوە!'});
  members.push({name: voterDB[voterNumber].name, phone, voterNumber, city: voterDB[voterNumber].city, note, date:new Date().toLocaleString()});
  try{ saveMembers(); }catch(e){}
  res.json({success:true,total:members.length});
});

app.post('/delete/:id',(req,res)=>{
  members.splice(req.params.id,1);
  try{ saveMembers(); }catch(e){}
  res.json({success:true});
});
app.post('/clear',(req,res)=>{
  members=[];
  try{ saveMembers(); }catch(e){}
  res.json({success:true});
});
app.get('/export',(req,res)=>{
  let csv='ID,Name,Phone,VoterNumber_8digits,City,Note,Date\n';
  members.forEach((m,i)=>{csv+=`${i+1},"${m.name}","${m.phone}","${m.voterNumber}","${m.city}","${m.note||''}","${m.date}"\n`;});
  res.header('Content-Type','text/csv; charset=utf-8'); res.attachment('App-Anjam-Jani-auto.csv'); res.send('\uFEFF'+csv);
});

// بۆ ئاگادارکردنەوەی ئۆتۆماتیک - API
app.get('/api/status',(req,res)=>{
  res.json(getUpdateStatus());
});

app.get('/manifest.json',(req,res)=>{res.json({name:"App Anjam Jani",short_name:"AnjamJani",start_url:"/",display:"standalone",background_color:"#667eea",theme_color:"#764ba2",icons:[{src:"https://cdn-icons-png.flaticon.com/512/3135/3135715.png",sizes:"512x512",type:"image/png"}]});});
app.listen(PORT,()=>{console.log('Server running - data persisted in ./data'); console.log('Last update:', meta.lastUpdate);});
