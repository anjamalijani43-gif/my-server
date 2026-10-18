const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({extended:true, limit:'50mb'}));

let votersDB = {}; // 🔴 ماوە
let sentDB = {};   // 🟢 هەیە و نێردراوە
let notFoundDB = {}; // 🟠 نییە لە لیست و نێردراوە
let staffLogs = [];

const DB_FILE='voters_db.json';
const SENT_FILE='sent_voters.json';
const NOTFOUND_FILE='notfound_voters.json';
const STAFF_USERS={"admin":"Anjam1234","anjam":"jiani123","staff1":"staff123"};

try{ if(fs.existsSync(DB_FILE)) votersDB=JSON.parse(fs.readFileSync(DB_FILE,'utf8')); }catch(e){}
try{ if(fs.existsSync(SENT_FILE)) sentDB=JSON.parse(fs.readFileSync(SENT_FILE,'utf8')); }catch(e){}
try{ if(fs.existsSync(NOTFOUND_FILE)) notFoundDB=JSON.parse(fs.readFileSync(NOTFOUND_FILE,'utf8')); }catch(e){}
if(Object.keys(votersDB).length===0 && Object.keys(sentDB).length===0 && Object.keys(notFoundDB).length===0){
  votersDB["19503975"]={name:"نسرین بشیر فوزی", city:"کەرکوک"};
  votersDB["35382936"]={name:"نموونە 35382936", city:"کەرکوک"};
}

function saveAll(){
  try{ fs.writeFileSync(DB_FILE, JSON.stringify(votersDB)); fs.writeFileSync(SENT_FILE, JSON.stringify(sentDB)); fs.writeFileSync(NOTFOUND_FILE, JSON.stringify(notFoundDB)); }catch(e){}
}

app.post('/api/staff/login',(req,res)=>{
  const u=(req.body.username||"").toLowerCase().trim(), p=(req.body.password||"").trim();
  if(STAFF_USERS[u]&&STAFF_USERS[u]===p){ staffLogs.push({username:u, timeLocal:new Date().toLocaleString('ar-EG',{timeZone:'Asia/Baghdad'}), ip:req.headers['x-forwarded-for']?.split(',')[0]||req.ip}); res.json({success:true, role:u==='admin'?'admin':'staff', username:u}); }
  else res.status(401).json({success:false});
});

// لۆجیکی نوێ - هەردووکی دەچێتە سێرڤەر
app.post('/api/voter/submit',(req,res)=>{
  let raw=String(req.body.voterNumber||"").trim();
  let num=raw.replace(/[^0-9]/g,'');
  const staff=req.body.staffUsername||"نادیار";
  if(!num) return res.json({success:false, message:"ژمارە نییە"});

  // ئەگەر پێشتر نێردراوە لە هەر کام لە لیستەکان
  if(sentDB[num]) return res.json({success:false, alreadySent:true, status:"sent", message:"پێشتر نێردراوە - لە لیستی سەوزە", voter:sentDB[num]});
  if(notFoundDB[num]) return res.json({success:false, alreadySent:true, status:"notfound", message:"پێشتر نێردراوە - لە لیستی پرتەقاڵیە", voter:notFoundDB[num]});

  // گەڕان
  let foundKey=null, foundData=null;
  if(votersDB[num]){ foundKey=num; foundData=votersDB[num]; }
  else {
    const withoutZero=num.replace(/^0+/,'');
    if(votersDB[withoutZero]){ foundKey=withoutZero; foundData=votersDB[withoutZero]; }
    else {
      for(const k in votersDB){ if(k.replace(/[^0-9]/g,'')===num){ foundKey=k; foundData=votersDB[k]; break; } }
    }
  }

  const baseEntry={
    voterNumber:num,
    sentBy:staff,
    sentTimeLocal:new Date().toLocaleString('ar-EG',{timeZone:'Asia/Baghdad'}),
    ip:req.headers['x-forwarded-for']?.split(',')[0]||req.ip,
    lat:req.body.lat||null, lng:req.body.lng||null,
    rawInput:raw
  };

  if(foundData){
    // هەیە - دەچێتە سەوز
    const entry={...foundData, ...baseEntry, originalKey:foundKey};
    sentDB[num]=entry;
    if(foundKey && votersDB[foundKey]) delete votersDB[foundKey];
    if(votersDB[num]) delete votersDB[num];
    saveAll();
    res.json({success:true, status:"sent", exists:true, message:"هەیە - نێردرا بۆ لیستی سەوز", voter:entry, stats:{remaining:Object.keys(votersDB).length, sent:Object.keys(sentDB).length, notfound:Object.keys(notFoundDB).length}});
  }else{
    // نییە - دەچێتە پرتەقاڵی
    const entry={name:"نییە لە لیست", city:"نادیار", ...baseEntry};
    notFoundDB[num]=entry;
    saveAll();
    res.json({success:true, status:"notfound", exists:false, message:"نییە - نێردرا بۆ لیستی پرتەقاڵی (ئەوانەی لە لیست نییە)", voter:entry, stats:{remaining:Object.keys(votersDB).length, sent:Object.keys(sentDB).length, notfound:Object.keys(notFoundDB).length}});
  }
});

app.get('/api/admin/stats',(req,res)=>{
  res.json({remaining:Object.keys(votersDB).length, sent:Object.keys(sentDB).length, notfound:Object.keys(notFoundDB).length, remainingList:votersDB, sentList:sentDB, notFoundList:notFoundDB, logs:staffLogs.slice(-20).reverse()});
});

app.post('/api/voters/bulk',(req,res)=>{
  const {voters, isLast}=req.body; let added=0;
  if(Array.isArray(voters)){
    voters.forEach(v=>{
      let num=String(v.voterNumber||"").replace(/[^0-9]/g,'');
      if(num && v.name && !sentDB[num] && !votersDB[num] && !notFoundDB[num]){ votersDB[num]={name:v.name, city:v.city||"کەرکوک"}; added++; }
    });
  }
  if(isLast) saveAll();
  res.json({success:true, added, remaining:Object.keys(votersDB).length, sent:Object.keys(sentDB).length, notfound:Object.keys(notFoundDB).length});
});

app.post('/api/voters/add',(req,res)=>{
  let num=String(req.body.voterNumber||"").replace(/[^0-9]/g,'');
  if(!num||!req.body.name) return res.status(400).json({success:false});
  if(!sentDB[num] && !notFoundDB[num]){ votersDB[num]={name:req.body.name, city:req.body.city||"کەرکوک"}; saveAll(); }
  res.json({success:true, remaining:Object.keys(votersDB).length});
});

app.get('/api/admin/export',(req,res)=>{
  const type=req.query.type||'remaining'; const format=req.query.format||'json';
  let data= type==='sent'? sentDB : type==='notfound'? notFoundDB : votersDB;
  let fileName= type==='sent'? 'green_sent_'+Object.keys(data).length : type==='notfound'? 'orange_notfound_'+Object.keys(data).length : 'red_remaining_'+Object.keys(data).length;
  if(format==='csv'){
    let csv="voterNumber,name,city,sentBy,sentTimeLocal,ip,lat,lng,rawInput\n";
    for(const [k,v] of Object.entries(data)){ csv+=`"${k}","${(v.name||"").replace(/"/g,'""')}","${v.city||""}","${v.sentBy||""}","${v.sentTimeLocal||""}","${v.ip||""}","${v.lat||""}","${v.lng||""}","${v.rawInput||""}"\n`; }
    res.setHeader('Content-Type','text/csv; charset=utf-8'); res.setHeader('Content-Disposition',`attachment; filename="${fileName}.csv"`); res.send('\uFEFF'+csv);
  }else{ res.setHeader('Content-Disposition',`attachment; filename="${fileName}.json"`); res.json(data); }
});

app.delete('/api/admin/clear/:type',(req,res)=>{
  const t=req.params.type;
  if(t==='remaining') votersDB={};
  if(t==='sent') sentDB={};
  if(t==='notfound') notFoundDB={};
  if(t==='all'){ votersDB={}; sentDB={}; notFoundDB={}; votersDB["19503975"]={name:"نسرین بشیر فوزی", city:"کەرکوک"}; }
  saveAll();
  res.json({success:true, remaining:Object.keys(votersDB).length, sent:Object.keys(sentDB).length, notfound:Object.keys(notFoundDB).length});
});

app.get('/',(req,res)=>{
res.send(`<!DOCTYPE html><html lang="ku" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>کەرکوک - ناردن</title>
<style>
*{box-sizing:border-box;font-family:Tahoma}body{margin:0;background:linear-gradient(135deg,#0f172a,#1e3a8a 50%,#0f766e);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:12px}
.card{background:rgba(255,255,255,.97);border-radius:22px;padding:22px;max-width:600px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.logo{width:56px;height:56px;background:linear-gradient(135deg,#0a7cff,#00d1b2);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 8px;color:#fff}
h2{margin:6px 0 2px;text-align:center;color:#0f172a;font-weight:800;font-size:19px}.sub{text-align:center;color:#64748b;font-size:11px;margin-bottom:10px}
label{font-size:11px;font-weight:700;color:#334155;margin:8px 0 3px;display:block}
input{width:100%;padding:11px 14px;border:1.7px solid #e2e8f0;border-radius:10px;font-size:13px;background:#f8fafc;outline:none}
input:focus{border-color:#0a7cff;background:#fff}button{width:100%;padding:11px;background:linear-gradient(135deg,#0a7cff,#0052cc);color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;margin-top:5px}
button.green{background:linear-gradient(135deg,#059669,#047857)}button.orange{background:linear-gradient(135deg,#f59e0b,#d97706)}button.purple{background:linear-gradient(135deg,#7c3aed,#4f46e5)}button.gray{background:#f1f5f9;color:#334155;box-shadow:none;border:1px solid #e2e8f0}button.red{background:linear-gradient(135deg,#dc2626,#991b1b)}
.resultBox{margin-top:10px;padding:12px;border-radius:10px;display:none}.resultBox.show{display:block}
.greenBox{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #22c55e}.orangeBox{background:linear-gradient(135deg,#fffbeb,#fde68a);border:2px solid #f59e0b}.redBox{background:linear-gradient(135deg,#fef2f2,#fecaca);border:2px solid #ef4444}.blueBox{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd}
.hidden{display:none}.panel{background:#f8fafc;border-radius:10px;padding:8px;margin-top:6px;max-height:260px;overflow:auto;font-size:10px}
.stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin:8px 0}.stat{padding:8px;border-radius:10px;text-align:center}.statRed{background:#fef2f2;border:1px solid #fecaca}.statGreen{background:#f0fdf4;border:1px solid #bbf7d0}.statOrange{background:#fffbeb;border:1px solid #fde68a}.stat b{font-size:16px;display:block}
.progress{height:6px;background:#e2e8f0;border-radius:10px;overflow:hidden;margin:6px 0;display:none}.progress div{height:100%;background:linear-gradient(90deg,#0a7cff,#00d1b2);width:0%;transition:.3s}
</style></head><body>

<div id="loginCard" class="card">
<div class="logo">🗳️</div><h2>کەرکوک - دەنگدەر</h2><p class="sub">چوونەژوورەوە</p><div id="loginMsg"></div>
<input id="username" value="admin"><input id="password" type="password" value="Anjam1234" style="margin-top:5px"><button onclick="login()">چوونە ژوورەوە 🔐</button>
</div>

<div id="staffCard" class="card hidden">
<div class="logo">📤</div><h2>ناردنی ژمارەی دەنگدەر</h2><p class="sub">هەیە و نییە هەردووکی دەچێتە سێرڤەر</p>
<div class="stats">
<div class="stat statRed"><b id="stRemain">0</b><span>🔴 ماوە</span></div>
<div class="stat statGreen"><b id="stSent">0</b><span>🟢 هەیە</span></div>
<div class="stat statOrange"><b id="stNotFound">0</b><span>🟠 نییە</span></div>
</div>
<div id="staffMsg"></div>
<input id="voterSend" type="tel" inputmode="numeric" placeholder="ژمارەی دەنگدەر - 35382936" onkeydown="if(event.key==='Enter') sendToServer()">
<button onclick="sendToServer()">📤 ناردن بۆ سێرڤەر</button>
<div id="sendResult" class="resultBox"></div>
<button class="gray" onclick="logout()">دەرچوون</button>
</div>

<div id="adminCard" class="card hidden">
<div class="logo">👑</div><h2>ئادمین - کەرکوک</h2><p class="sub" id="adminInfo"></p>
<div class="stats">
<div class="stat statRed"><b id="adRemain">0</b><span>🔴 ماوە</span></div>
<div class="stat statGreen"><b id="adSent">0</b><span>🟢 هەیە</span></div>
<div class="stat statOrange"><b id="adNotFound">0</b><span>🟠 نییە</span></div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px">
<button onclick="showSec('send')" style="margin:0" class="green">📤 ناردن</button>
<button onclick="showSec('lists')" style="margin:0" class="purple">📋 لیست</button>
<button onclick="showSec('bulk')" style="margin:0">📁 بارکردن</button>
<button onclick="showSec('stats')" style="margin:0" class="gray">📊 وردەکاری</button>
</div>

<div id="secSend">
<input id="adminSendNum" placeholder="ژمارەی دەنگدەر" style="margin-top:8px" onkeydown="if(event.key==='Enter') adminSend()"><button class="green" onclick="adminSend()">📤 ناردن</button><div id="adminSendResult" class="resultBox"></div>
</div>

<div id="secLists" class="hidden">
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:8px">
<button onclick="downloadList('remaining','csv')" class="gray" style="margin:0;font-size:10px">🔴 ماوە CSV</button>
<button onclick="downloadList('sent','csv')" class="green" style="margin:0;font-size:10px">🟢 هەیە CSV</button>
<button onclick="downloadList('notfound','csv')" class="orange" style="margin:0;font-size:10px">🟠 نییە CSV</button>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:4px">
<button onclick="downloadList('remaining','json')" class="gray" style="margin:0;font-size:10px">🔴 JSON</button>
<button onclick="downloadList('sent','json')" class="green" style="margin:0;font-size:10px">🟢 JSON</button>
<button onclick="downloadList('notfound','json')" class="orange" style="margin:0;font-size:10px">🟠 JSON</button>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;margin-top:6px">
<button onclick="clearList('remaining')" class="gray" style="margin:0;font-size:9px">🗑️ سوور</button>
<button onclick="clearList('sent')" class="gray" style="margin:0;font-size:9px">🗑️ سەوز</button>
<button onclick="clearList('notfound')" class="gray" style="margin:0;font-size:9px">🗑️ پرتەقاڵی</button>
<button onclick="clearList('all')" class="red" style="margin:0;font-size:9px">⚠️ هەموو</button>
</div>
<div class="panel" id="listsPreview">چاوەڕوان...</div>
</div>

<div id="secBulk" class="hidden">
<label>📁 بارکردنی لیست - سەیڤ دەبێت</label><input type="file" id="fileInput" accept=".txt,.csv,.json"><button class="green" onclick="uploadBulk()">📤 بارکردن</button><div class="progress" id="progBar"><div id="progFill"></div></div><div id="bulkMsg" class="panel">چاوەڕوان...</div>
</div>

<div id="secStats" class="hidden">
<div class="panel" id="statsBox">چاوەڕوان...</div>
</div>

<button class="gray" onclick="logout()">دەرچوون</button>
</div>

<script>
let loc=null, mobInfo=null, staffName=null;
try{if(navigator.geolocation)navigator.geolocation.getCurrentPosition(p=>{loc={lat:p.coords.latitude,lng:p.coords.longitude}});}catch(e){}
mobInfo={ua:navigator.userAgent, plat:navigator.platform};

async function login(){
 const u=document.getElementById('username').value.trim(), p=document.getElementById('password').value.trim(), m=document.getElementById('loginMsg');
 try{
  const r=await fetch('/api/staff/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p,lat:loc?.lat,lng:loc?.lng,mobileInfo:mobInfo})});
  const d=await r.json();
  if(d.success){ staffName=d.username; localStorage.setItem('staffAuth', JSON.stringify(d)); document.getElementById('loginCard').classList.add('hidden'); if(d.role==='admin'){document.getElementById('adminCard').classList.remove('hidden');document.getElementById('adminInfo').innerText='بەخێربێیت '+d.username; loadStats();}else{document.getElementById('staffCard').classList.remove('hidden'); loadStats();} }
  else m.innerHTML='<div style="color:red;text-align:center">هەڵەیە</div>';
 }catch(e){m.innerHTML='<div style="color:red">هەڵەی سێرڤەر</div>';}
}

async function loadStats(){
 try{ const r=await fetch('/api/admin/stats'); const d=await r.json();
  ['stRemain','adRemain'].forEach(id=>{const el=document.getElementById(id); if(el) el.innerText=d.remaining;});
  ['stSent','adSent'].forEach(id=>{const el=document.getElementById(id); if(el) el.innerText=d.sent;});
  ['stNotFound','adNotFound'].forEach(id=>{const el=document.getElementById(id); if(el) el.innerText=d.notfound;});
  const prev=document.getElementById('listsPreview');
  if(prev){
   let html='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px"><div><b style="color:#991b1b">🔴 ماوە ('+d.remaining+')</b><br>';
   const rem=Object.keys(d.remainingList||{}).slice(0,15);
   html+=rem.map(k=>'<div style="border-bottom:1px solid #fecaca;padding:2px 0;font-size:9px">'+k+'</div>').join('')||'هیچ';
   html+='</div><div><b style="color:#065f46">🟢 هەیە ('+d.sent+')</b><br>';
   const sent=Object.keys(d.sentList||{}).slice(0,15);
   html+=sent.map(k=>'<div style="border-bottom:1px solid #bbf7d0;padding:2px 0;font-size:9px">'+k+' - '+d.sentList[k].sentBy+'</div>').join('')||'هیچ';
   html+='</div><div><b style="color:#d97706">🟠 نییە ('+d.notfound+')</b><br>';
   const nf=Object.keys(d.notFoundList||{}).slice(0,15);
   html+=nf.map(k=>'<div style="border-bottom:1px solid #fde68a;padding:2px 0;font-size:9px">'+k+' - '+d.notFoundList[k].sentBy+'</div>').join('')||'هیچ';
   html+='</div></div>';
   prev.innerHTML=html;
  }
  const sbox=document.getElementById('statsBox');
  if(sbox){
   sbox.innerHTML='🔴 ماوە: '+d.remaining+'<br>🟢 هەیە و نێردراوە: '+d.sent+'<br>🟠 نییە لە لیست و نێردراوە: '+d.notfound+'<br><br>کۆی گشتی سێرڤەر: '+(d.remaining+d.sent+d.notfound);
  }
 }catch(e){}
}

async function sendToServer(){
 const num=document.getElementById('voterSend').value.trim(), msg=document.getElementById('staffMsg'), box=document.getElementById('sendResult');
 if(!num){msg.innerHTML='<div style="color:red;text-align:center">ژمارە بنووسە</div>';return;}
 msg.innerHTML='<div style="text-align:center;color:#0a7cff">⏳</div>'; box.classList.remove('show');
 try{
  const r=await fetch('/api/voter/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voterNumber:num, staffUsername:staffName, lat:loc?.lat, lng:loc?.lng, mobileInfo:mobInfo})});
  const d=await r.json(); msg.innerHTML='';
  if(d.success && d.status==='sent'){
   box.className='resultBox show greenBox';
   box.innerHTML='<div style="text-align:center;font-weight:800;color:#065f46">✅ هەیە - نێردرا بۆ سەوز</div><div style="text-align:center;font-size:11px">'+d.voter.voterNumber+' - '+(d.voter.name||'')+'<br>👤 '+d.voter.sentBy+'</div>';
   document.getElementById('voterSend').value='';
  }else if(d.success && d.status==='notfound'){
   box.className='resultBox show orangeBox';
   box.innerHTML='<div style="text-align:center;font-weight:800;color:#92400e">🟠 نییە لە لیست - نێردرا بۆ پرتەقاڵی</div><div style="text-align:center;font-size:11px">ژمارە: '+d.voter.voterNumber+'<br>ئەمە لە لیستی سەرەکی نەبوو بەڵام نێردرا بۆ سێرڤەر<br>👤 '+d.voter.sentBy+'</div>';
   document.getElementById('voterSend').value='';
  }else if(d.alreadySent){
   box.className='resultBox show blueBox';
   box.innerHTML='<div style="text-align:center;font-weight:800">⚠️ پێشتر نێردراوە</div><div style="text-align:center;font-size:11px">'+d.voter.voterNumber+' - '+(d.status==='sent'?'سەوز':'پرتەقاڵی')+'</div>';
  }else{ box.className='resultBox show redBox'; box.innerHTML=d.message; }
  box.classList.add('show'); loadStats();
 }catch(e){msg.innerHTML='<div style="color:red">'+e.message+'</div>';}
}

async function adminSend(){
 const num=document.getElementById('adminSendNum').value.trim(), box=document.getElementById('adminSendResult');
 if(!num) return;
 const r=await fetch('/api/voter/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voterNumber:num, staffUsername:staffName, lat:loc?.lat, lng:loc?.lng, mobileInfo:mobInfo})});
 const d=await r.json();
 if(d.success && d.status==='sent'){ box.className='resultBox show greenBox'; box.innerHTML='✅ هەیە - چووە سەوز: '+d.voter.voterNumber; }
 else if(d.success && d.status==='notfound'){ box.className='resultBox show orangeBox'; box.innerHTML='🟠 نییە لە لیست - چووە پرتەقاڵی: '+d.voter.voterNumber; }
 else if(d.alreadySent){ box.className='resultBox show blueBox'; box.innerHTML='⚠️ پێشتر نێردراوە'; }
 box.classList.add('show'); document.getElementById('adminSendNum').value=''; loadStats();
}

function showSec(s){
 ['secSend','secLists','secBulk','secStats'].forEach(id=>document.getElementById(id).classList.add('hidden'));
 if(s==='send') document.getElementById('secSend').classList.remove('hidden');
 if(s==='lists'){ document.getElementById('secLists').classList.remove('hidden'); loadStats(); }
 if(s==='bulk') document.getElementById('secBulk').classList.remove('hidden');
 if(s==='stats'){ document.getElementById('secStats').classList.remove('hidden'); loadStats(); }
}

async function uploadBulk(){
 const file=document.getElementById('fileInput').files[0]; if(!file) return alert('فایل هەڵبژێرە');
 const text=await file.text(); let lines=text.split(/\\r?\\n/).map(s=>s.trim()).filter(x=>x); let voters=[];
 lines.forEach(line=>{ if(line.includes(',')){ const parts=line.split(',').map(s=>s.trim().replace(/^"|"$/g,'')); if(parts.length>=2){ const num=parts[0].replace(/[^0-9]/g,''); if(num) voters.push({voterNumber:num, name:parts[1], city:parts[2]||"کەرکوک"}); } }else{ const num=line.replace(/[^0-9]/g,''); if(num.length>=5) voters.push({voterNumber:num, name:'نادیار '+num}); } });
 if(!voters.length) return alert('هیچ نیە');
 const msg=document.getElementById('bulkMsg'); const bar=document.getElementById('progBar'); const fill=document.getElementById('progFill');
 bar.style.display='block'; msg.innerHTML='دۆزرایەوە: '+voters.length;
 const chunkSize=2000;
 for(let i=0;i<voters.length;i+=chunkSize){ const chunk=voters.slice(i,i+chunkSize); const isLast=(i+chunkSize)>=voters.length; await fetch('/api/voters/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voters:chunk, isLast})}); const pct=Math.round(Math.min(i+chunkSize,voters.length)/voters.length*100); fill.style.width=pct+'%'; msg.innerHTML='بارکرا: '+(Math.min(i+chunkSize,voters.length))+' / '+voters.length; }
 msg.innerHTML='✅ سەیڤ کرا: '+voters.length; loadStats();
}

function downloadList(type,format){ window.location='/api/admin/export?type='+type+'&format='+format; }
async function clearList(type){ if(!confirm('سڕینەوەی '+type+' ?')) return; if(type==='all' && !confirm('هەموو؟')) return; const r=await fetch('/api/admin/clear/'+type,{method:'DELETE'}); const d=await r.json(); if(d.success){ alert('سڕایەوە'); loadStats(); } }
function logout(){localStorage.removeItem('staffAuth');location.reload();}
</script>
</body>
</html>`);
});
app.get('/admin',(req,res)=>res.redirect('/'));
const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log('Running'));
