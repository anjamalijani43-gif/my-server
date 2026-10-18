const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({extended:true, limit:'50mb'}));

let votersDB = {}; // لیستی ماوە - سور
let sentDB = {};   // لیستی نێردراو - سەوز
let staffLogs = [];

const DB_FILE='voters_db.json';
const SENT_FILE='sent_voters.json';
const LOG_FILE='staff_logs.json';
const STAFF_USERS={"admin":"Anjam1234","anjam":"jiani123","staff1":"staff123","kirkuk":"kirkuk123"};

try{ if(fs.existsSync(DB_FILE)) votersDB=JSON.parse(fs.readFileSync(DB_FILE,'utf8')); }catch(e){}
try{ if(fs.existsSync(SENT_FILE)) sentDB=JSON.parse(fs.readFileSync(SENT_FILE,'utf8')); }catch(e){}
if(Object.keys(votersDB).length===0 && Object.keys(sentDB).length===0){
  votersDB["19503975"]={name:"نسرین بشیر فوزی", city:"کەرکوک", center:"٦٠٣", station:"١", phone:""};
  votersDB["38419088"]={name:"تاقیکردنەوە", city:"کەرکوک", center:"٦٠٢", station:"٢", phone:""};
}

function saveAll(){
  try{ fs.writeFileSync(DB_FILE, JSON.stringify(votersDB)); }catch(e){}
  try{ fs.writeFileSync(SENT_FILE, JSON.stringify(sentDB)); }catch(e){}
}
function logStaff(req,username){
  const log={username, time:new Date().toISOString(), timeLocal:new Date().toLocaleString('ar-EG',{timeZone:'Asia/Baghdad'}), ip:req.headers['x-forwarded-for']?.split(',')[0]||req.ip, userAgent:req.headers['user-agent'], lat:req.body.lat||null, lng:req.body.lng||null, mobile:req.body.mobileInfo||null};
  staffLogs.push(log);
}

app.post('/api/staff/login',(req,res)=>{
  const u=(req.body.username||"").toLowerCase().trim(), p=(req.body.password||"").trim();
  if(STAFF_USERS[u]&&STAFF_USERS[u]===p){ logStaff(req,u); res.json({success:true, role:u==='admin'?'admin':'staff', username:u}); }
  else res.status(401).json({success:false, message:"یوزەر یان پاسوۆرد هەڵەیە"});
});

// ناردنی ژمارەی دەنگدەر بۆ سێرڤەر - لۆجیکی نوێ
app.post('/api/voter/submit',(req,res)=>{
  const {voterNumber, staffUsername, lat, lng, mobileInfo} = req.body;
  const num=String(voterNumber||"").trim();
  if(!num) return res.status(400).json({success:false, message:"ژمارە پێویستە"});
  
  // 1. ئەگەر پێشتر نێردراوە (لە لیستی سەوز)
  if(sentDB[num]){
    return res.json({success:false, alreadySent:true, message:"پێشتر نێردراوە", voter:sentDB[num]});
  }
  
  // 2. ئەگەر لە لیستدا نییە
  if(!votersDB[num]){
    return res.json({success:false, exists:false, message:"نییە - ئەم ژمارەیە لە لیستی سێرڤەر نییە"});
  }
  
  // 3. ئەگەر هەیە - لە لیستی سور دەردەچێت و دەچێتە سەوز
  const voterData = votersDB[num];
  const sentEntry={
    ...voterData,
    voterNumber:num,
    sentBy: staffUsername||"نادیار",
    sentTime: new Date().toISOString(),
    sentTimeLocal: new Date().toLocaleString('ar-EG',{timeZone:'Asia/Baghdad'}),
    ip: req.headers['x-forwarded-for']?.split(',')[0]||req.ip,
    lat: lat||null,
    lng: lng||null,
    mobileInfo: mobileInfo||null
  };
  
  sentDB[num]=sentEntry;
  delete votersDB[num];
  saveAll();
  
  res.json({success:true, message:"نێردرا بۆ لیستی سەوز", voter:sentEntry, remaining:Object.keys(votersDB).length, sent:Object.keys(sentDB).length});
});

app.get('/api/voter/:id',(req,res)=>{
  const id=req.params.id.trim();
  if(sentDB[id]) res.json({success:true, status:"sent", voterNumber:id, ...sentDB[id]});
  else if(votersDB[id]) res.json({success:true, status:"remaining", voterNumber:id, ...votersDB[id]});
  else res.json({success:false, exists:false});
});

app.post('/api/voters/add',(req,res)=>{
  const {voterNumber,name,city,phone,center,station}=req.body;
  if(!voterNumber||!name) return res.status(400).json({success:false});
  const num=String(voterNumber);
  if(!sentDB[num]){ votersDB[num]={name, city:city||"کەرکوک", phone:phone||"", center, station}; saveAll(); }
  res.json({success:true, total:Object.keys(votersDB).length, sent:Object.keys(sentDB).length});
});

app.post('/api/voters/bulk',(req,res)=>{
  const {voters, isLast}=req.body; let added=0;
  if(Array.isArray(voters)){
    voters.forEach(v=>{
      if(v.voterNumber&&v.name){
        const num=String(v.voterNumber);
        if(!sentDB[num] && !votersDB[num]){ votersDB[num]={name:v.name, city:v.city||"کەرکوک", phone:v.phone||"", center:v.center||"", station:v.station||""}; added++; }
      }
    });
  }
  if(isLast) saveAll();
  res.json({success:true, added, total:Object.keys(votersDB).length, sent:Object.keys(sentDB).length});
});

app.get('/api/admin/stats',(req,res)=>{
  res.json({remaining:Object.keys(votersDB).length, sent:Object.keys(sentDB).length, logs:staffLogs.slice(-20).reverse(), remainingList:votersDB, sentList:sentDB});
});

app.get('/api/admin/export',(req,res)=>{
  const type=req.query.type||'remaining';
  const format=req.query.format||'json';
  
  let dataToExport = type==='sent' ? sentDB : votersDB;
  let fileName = type==='sent' ? 'sent_green' : 'remaining_red';
  const total=Object.keys(dataToExport).length;
  
  if(format==='csv'){
    let csv="voterNumber,name,city,phone,center,station,sentBy,sentTimeLocal,ip,lat,lng\n";
    for(const [num,data] of Object.entries(dataToExport)){
      csv+=`"${num}","${(data.name||"").replace(/"/g,'""')}","${data.city||""}","${data.phone||""}","${data.center||""}","${data.station||""}","${data.sentBy||""}","${data.sentTimeLocal||""}","${data.ip||""}","${data.lat||""}","${data.lng||""}"\n`;
    }
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition',`attachment; filename="${fileName}_${total}.csv"`);
    res.send('\uFEFF'+csv);
  }else{
    res.setHeader('Content-Disposition',`attachment; filename="${fileName}_${total}.json"`);
    res.json(dataToExport);
  }
});

app.delete('/api/admin/voter/:id',(req,res)=>{
  const id=req.params.id.trim();
  if(votersDB[id]){ delete votersDB[id]; saveAll(); res.json({success:true, remaining:Object.keys(votersDB).length, sent:Object.keys(sentDB).length}); }
  else if(sentDB[id]){ delete sentDB[id]; saveAll(); res.json({success:true, remaining:Object.keys(votersDB).length, sent:Object.keys(sentDB).length}); }
  else res.json({success:false});
});

app.post('/api/admin/restore/:id',(req,res)=>{
  const id=req.params.id.trim();
  if(sentDB[id]){ votersDB[id]={name:sentDB[id].name, city:sentDB[id].city, phone:sentDB[id].phone, center:sentDB[id].center, station:sentDB[id].station}; delete sentDB[id]; saveAll(); res.json({success:true}); }
  else res.json({success:false});
});

app.delete('/api/admin/clear/:type',(req,res)=>{
  const type=req.params.type;
  if(type==='remaining'){ votersDB={}; saveAll(); }
  if(type==='sent'){ sentDB={}; saveAll(); }
  if(type==='all'){ votersDB={}; sentDB={}; votersDB["19503975"]={name:"نسرین بشیر فوزی", city:"کەرکوک"}; saveAll(); }
  res.json({success:true, remaining:Object.keys(votersDB).length, sent:Object.keys(sentDB).length});
});

app.get('/api/admin/logs',(req,res)=>{
  res.json({logs:staffLogs.slice(-50).reverse(), remaining:Object.keys(votersDB).length, sent:Object.keys(sentDB).length});
});

app.get('/',(req,res)=>{
res.send(`<!DOCTYPE html><html lang="ku" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>کەرکوک - ناردن</title>
<style>
*{box-sizing:border-box;font-family:Tahoma,system-ui}body{margin:0;background:linear-gradient(135deg,#0f172a,#1e3a8a 50%,#0f766e);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:14px}
.card{background:rgba(255,255,255,.97);border-radius:24px;padding:26px;max-width:580px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.35);margin:10px}
.logo{width:64px;height:64px;background:linear-gradient(135deg,#0a7cff,#00d1b2);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 12px;color:#fff}
h2{margin:8px 0 4px;text-align:center;color:#0f172a;font-weight:800;font-size:21px}.sub{text-align:center;color:#64748b;font-size:12px;margin-bottom:14px}
label{font-size:12px;font-weight:700;color:#334155;margin:10px 0 4px;display:block}
input{width:100%;padding:13px 16px;border:1.8px solid #e2e8f0;border-radius:12px;font-size:15px;background:#f8fafc;outline:none}
input:focus{border-color:#0a7cff;background:#fff}button{width:100%;padding:12px;background:linear-gradient(135deg,#0a7cff,#0052cc);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:800;cursor:pointer;margin-top:6px}
button.green{background:linear-gradient(135deg,#059669,#047857)}button.purple{background:linear-gradient(135deg,#7c3aed,#4f46e5)}button.gray{background:#f1f5f9;color:#334155;box-shadow:none;border:1px solid #e2e8f0}button.red{background:linear-gradient(135deg,#dc2626,#991b1b)}
.resultBox{margin-top:12px;padding:14px;border-radius:12px;display:none}.resultBox.show{display:block}
.resultBox.greenBox{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #22c55e}
.resultBox.redBox{background:linear-gradient(135deg,#fef2f2,#fecaca);border:2px solid #ef4444}
.resultBox.blueBox{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd}
.kv{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed rgba(0,0,0,.1);font-size:12px}.kv b{color:#0f172a}.kv span{font-weight:700}
.error{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:10px;border-radius:10px;text-align:center;margin:8px 0;font-size:12px}
.success{background:#f0fdf4;border:1px solid #bbf7d0;color:#065f46;padding:10px;border-radius:10px;text-align:center;margin:8px 0;font-size:13px;font-weight:700}
.hidden{display:none}.badge{display:inline-block;padding:4px 10px;border-radius:20px;font-size:10px;font-weight:700;margin:2px}
.badgeRed{background:#fecaca;color:#991b1b}.badgeGreen{background:#bbf7d0;color:#065f46}.badgeBlue{background:#dbeafe;color:#1e40af}
.panel{background:#f8fafc;border-radius:12px;padding:10px;margin-top:8px;max-height:300px;overflow:auto;font-size:11px}
.progress{height:8px;background:#e2e8f0;border-radius:10px;overflow:hidden;margin:8px 0;display:none}.progress div{height:100%;background:linear-gradient(90deg,#0a7cff,#00d1b2);width:0%;transition:.3s}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
.stat{padding:12px;border-radius:12px;text-align:center}
.statRed{background:#fef2f2;border:1px solid #fecaca}.statGreen{background:#f0fdf4;border:1px solid #bbf7d0}
.stat b{font-size:20px;display:block}.stat span{font-size:11px;color:#64748b}
</style></head><body>

<div id="loginCard" class="card">
<div class="logo">🗳️</div><h2>سیستەمی دەنگدەر - کەرکوک</h2><p class="sub">چوونەژوورەوەی کارمەند</p><div id="loginMsg"></div>
<label>یوزەر</label><input id="username" value="admin"><label>پاسوۆرد</label><input id="password" type="password" value="Anjam1234">
<button onclick="login()">چوونە ژوورەوە 🔐</button>
<p class="sub"><span class="badge badgeBlue">admin / Anjam1234</span> <span class="badge badgeBlue">anjam / jiani123</span></p>
</div>

<div id="staffCard" class="card hidden">
<div class="logo">📤</div><h2>ناردنی ژمارەی دەنگدەر بۆ سێرڤەر</h2><p class="sub">ژمارە بنووسە - ئەگەر هەبوو دەچێتە لیستی سەوز، ئەگەر نەبوو دەڵێت نییە</p>
<div class="stats">
<div class="stat statRed"><b id="stRemain">0</b><span>🔴 ماوە لە لیست</span></div>
<div class="stat statGreen"><b id="stSent">0</b><span>🟢 نێردراوە</span></div>
</div>
<div id="staffMsg"></div>
<label>ژمارەی دەنگدەر *</label><input id="voterSend" type="tel" inputmode="numeric" placeholder="مثال: 19503975 - 38419088" onkeydown="if(event.key==='Enter') sendToServer()">
<button onclick="sendToServer()">📤 ناردن بۆ سێرڤەر</button>
<div id="sendResult" class="resultBox"></div>
<div style="font-size:10px;color:#64748b;text-align:center;margin-top:8px" id="lastLoc">📍 لوکەیشن وەردەگیرێت...</div>
<button class="gray" onclick="logout()">دەرچوون</button>
</div>

<div id="adminCard" class="card hidden">
<div class="logo">👑</div><h2>پانێڵی ئادمین - کەرکوک</h2><p class="sub" id="adminInfo"></p>

<div class="stats">
<div class="stat statRed"><b id="adRemain">0</b><span>🔴 ماوە</span></div>
<div class="stat statGreen"><b id="adSent">0</b><span>🟢 نێردراو</span></div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:5px">
<button onclick="showSec('send')" style="margin:0" class="green">📤 ناردن</button>
<button onclick="showSec('lists')" style="margin:0" class="purple">📋 لیستەکان</button>
<button onclick="showSec('bulk')" style="margin:0">📁 بارکردن</button>
<button onclick="showSec('logs')" style="margin:0" class="gray">📍 لۆگ</button>
</div>

<div id="secSend">
<h3 style="text-align:center;font-size:13px">ناردنی ژمارەی دەنگدەر</h3>
<input id="adminSendNum" placeholder="ژمارەی دەنگدەر" onkeydown="if(event.key==='Enter') adminSend()">
<button class="green" onclick="adminSend()">📤 ناردن بۆ لیستی سەوز</button>
<div id="adminSendResult" class="resultBox"></div>
</div>

<div id="secLists" class="hidden">
<h3 style="text-align:center;font-size:13px">📋 هەردوو لیستەکە - سوور و سەوز</h3>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
<button onclick="downloadList('remaining','json')" class="gray" style="margin:0">🔴 داگرتن ماوە JSON</button>
<button onclick="downloadList('remaining','csv')" class="gray" style="margin:0">🔴 داگرتن ماوە CSV</button>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px">
<button onclick="downloadList('sent','json')" class="green" style="margin:0">🟢 داگرتن نێردراو JSON</button>
<button onclick="downloadList('sent','csv')" class="green" style="margin:0">🟢 داگرتن نێردراو CSV</button>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-top:10px">
<button onclick="clearList('remaining')" class="gray" style="margin:0;border-color:#fecaca;color:#991b1b;font-size:11px">🗑️ سڕینەوەی سوور</button>
<button onclick="clearList('sent')" class="gray" style="margin:0;border-color:#bbf7d0;color:#065f46;font-size:11px">🗑️ سڕینەوەی سەوز</button>
<button onclick="clearList('all')" class="red" style="margin:0;font-size:11px">⚠️ هەموو</button>
</div>
<div class="panel" id="listsPreview" style="margin-top:10px">چاوەڕوان...</div>
</div>

<div id="secBulk" class="hidden">
<label>📁 بارکردنی لیست بۆ سێرڤەر (سەیڤ دەبێت)</label><input type="file" id="fileInput" accept=".txt,.csv,.json">
<div style="font-size:10px;color:#64748b">فۆرمات: voterNumber,name,city  - بە پارچە 2000 - لە voters_db.json پاشەکەوت دەبێت</div>
<button class="green" onclick="uploadBulk()">📤 بارکردن و سەیڤ کردن</button>
<div class="progress" id="progBar"><div id="progFill"></div></div><div id="bulkMsg" class="panel">چاوەڕوان...</div>
<label>زیادکردنی تاک</label><input id="aNumber" placeholder="ژمارەی دەنگدەر"><input id="aName" placeholder="ناو"><input id="aCity" value="کەرکوک"><button onclick="addVoter()">➕ زیادکردن بۆ لیستی سوور</button><div id="adminMsg"></div>
</div>

<div id="secLogs" class="hidden">
<div id="logsBox" class="panel">چاوەڕوان...</div><button class="gray" onclick="loadLogs()">نوێکردنەوە 🔄</button>
</div>

<button class="gray" onclick="logout()">دەرچوون</button>
</div>

<script>
let loc=null, mobInfo=null, staffName=null;
try{if(navigator.geolocation)navigator.geolocation.getCurrentPosition(p=>{loc={lat:p.coords.latitude,lng:p.coords.longitude}; document.getElementById('lastLoc').innerText='📍 لوکەیشن: '+loc.lat.toFixed(5)+','+loc.lng.toFixed(5);}, err=>{document.getElementById('lastLoc').innerText='📍 لوکەیشن: ڕێگە نەدرا';});}catch(e){}
mobInfo={ua:navigator.userAgent, plat:navigator.platform, lang:navigator.language, screen:screen.width+'x'+screen.height, tz:Intl.DateTimeFormat().resolvedOptions().timeZone};

async function login(){
 const u=document.getElementById('username').value.trim(), p=document.getElementById('password').value.trim(), m=document.getElementById('loginMsg');
 if(!u||!p){m.innerHTML='<div class="error">بنووسە</div>';return;}
 m.innerHTML='<div style="text-align:center;color:#0a7cff">⏳</div>';
 try{
  const r=await fetch('/api/staff/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p,lat:loc?.lat,lng:loc?.lng,mobileInfo:mobInfo})});
  const d=await r.json();
  if(d.success){
   staffName=d.username; localStorage.setItem('staffAuth', JSON.stringify({username:d.username, role:d.role}));
   document.getElementById('loginCard').classList.add('hidden');
   if(d.role==='admin'){document.getElementById('adminCard').classList.remove('hidden');document.getElementById('adminInfo').innerText='بەخێربێیت '+d.username+' - '+new Date().toLocaleString('ar-EG'); loadStats(); loadListsPreview();}else{document.getElementById('staffCard').classList.remove('hidden'); loadStats();}
  }else m.innerHTML='<div class="error">'+d.message+'</div>';
 }catch(e){m.innerHTML='<div class="error">'+e.message+'</div>';}
}

async function loadStats(){
 try{
  const r=await fetch('/api/admin/stats'); const d=await r.json();
  document.getElementById('stRemain') && (document.getElementById('stRemain').innerText=d.remaining);
  document.getElementById('stSent') && (document.getElementById('stSent').innerText=d.sent);
  document.getElementById('adRemain') && (document.getElementById('adRemain').innerText=d.remaining);
  document.getElementById('adSent') && (document.getElementById('adSent').innerText=d.sent);
 }catch(e){}
}

async function sendToServer(){
 const num=document.getElementById('voterSend').value.trim(), msg=document.getElementById('staffMsg'), box=document.getElementById('sendResult');
 if(!num){msg.innerHTML='<div class="error">ژمارە بنووسە</div>';return;}
 msg.innerHTML='<div style="text-align:center;color:#0a7cff">⏳ ناردن...</div>'; box.classList.remove('show');
 try{
  const r=await fetch('/api/voter/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voterNumber:num, staffUsername:staffName, lat:loc?.lat, lng:loc?.lng, mobileInfo:mobInfo})});
  const d=await r.json(); msg.innerHTML='';
  if(d.success){
   box.className='resultBox show greenBox';
   box.innerHTML='<div style="text-align:center;font-weight:800;color:#065f46">✅ نێردرا - چووە لیستی سەوز</div><div class="kv"><b>ژمارە:</b><span>'+d.voter.voterNumber+'</span></div><div class="kv"><b>ناو:</b><span>'+(d.voter.name||'')+'</span></div><div class="kv"><b>کات:</b><span>'+d.voter.sentTimeLocal+'</span></div><div class="kv"><b>کارمەند:</b><span>'+d.voter.sentBy+'</span></div>';
   document.getElementById('voterSend').value=''; loadStats();
  }else{
   if(d.exists===false){
    box.className='resultBox show redBox';
    box.innerHTML='<div style="text-align:center;font-weight:800;color:#991b1b">❌ نییە - لە سێرڤەر نییە</div><div style="text-align:center;font-size:12px;margin-top:6px">ژمارە: '+num+' لە لیستی سێرڤەر بوونی نییە</div>';
   }else if(d.alreadySent){
    box.className='resultBox show blueBox';
    box.innerHTML='<div style="text-align:center;font-weight:800;color:#1e40af">⚠️ پێشتر نێردراوە - لە لیستی سەوزە</div><div class="kv"><b>ژمارە:</b><span>'+d.voter.voterNumber+'</span></div><div class="kv"><b>ناو:</b><span>'+d.voter.name+'</span></div><div class="kv"><b>نێردراوە لە:</b><span>'+d.voter.sentTimeLocal+'</span></div>';
   }else{
    box.className='resultBox show redBox'; box.innerHTML='<div class="error">'+d.message+'</div>';
   }
  }
  box.classList.add('show');
 }catch(e){msg.innerHTML='<div class="error">'+e.message+'</div>';}
}

async function adminSend(){
 const num=document.getElementById('adminSendNum').value.trim(), box=document.getElementById('adminSendResult');
 if(!num) return;
 const r=await fetch('/api/voter/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voterNumber:num, staffUsername:staffName, lat:loc?.lat, lng:loc?.lng, mobileInfo:mobInfo})});
 const d=await r.json();
 if(d.success){ box.className='resultBox show greenBox'; box.innerHTML='✅ نێردرا بۆ سەوز: '+d.voter.voterNumber; box.classList.add('show'); document.getElementById('adminSendNum').value=''; loadStats(); loadListsPreview(); }
 else if(d.exists===false){ box.className='resultBox show redBox'; box.innerHTML='❌ نییە: '+num; box.classList.add('show'); }
 else if(d.alreadySent){ box.className='resultBox show blueBox'; box.innerHTML='⚠️ پێشتر نێردراوە'; box.classList.add('show'); }
}

function showSec(s){
 ['secSend','secLists','secBulk','secLogs'].forEach(id=>document.getElementById(id).classList.add('hidden'));
 if(s==='send') document.getElementById('secSend').classList.remove('hidden');
 if(s==='lists'){ document.getElementById('secLists').classList.remove('hidden'); loadListsPreview(); loadStats(); }
 if(s==='bulk') document.getElementById('secBulk').classList.remove('hidden');
 if(s==='logs'){ document.getElementById('secLogs').classList.remove('hidden'); loadLogs(); }
}

async function loadListsPreview(){
 try{
  const r=await fetch('/api/admin/stats'); const d=await r.json();
  let html='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><b style="color:#991b1b">🔴 ماوە ('+d.remaining+')</b><br>';
  const remKeys=Object.keys(d.remainingList||{}).slice(0,20);
  html+=remKeys.map(k=>'<div style="border-bottom:1px solid #fecaca;padding:3px 0;font-size:10px">'+k+' - '+(d.remainingList[k].name||'')+'</div>').join('') || '<div style="font-size:10px;color:#999">هیچ نیە</div>';
  html+='</div><div><b style="color:#065f46">🟢 نێردراو ('+d.sent+')</b><br>';
  const sentKeys=Object.keys(d.sentList||{}).slice(0,20);
  html+=sentKeys.map(k=>'<div style="border-bottom:1px solid #bbf7d0;padding:3px 0;font-size:10px">'+k+' - '+(d.sentList[k].name||'')+' - 👤 '+ (d.sentList[k].sentBy||'') +'</div>').join('') || '<div style="font-size:10px;color:#999">هیچ نیە</div>';
  html+='</div></div>';
  document.getElementById('listsPreview').innerHTML=html;
 }catch(e){}
}

async function addVoter(){ const n=document.getElementById('aNumber').value.trim(), name=document.getElementById('aName').value.trim(), city=document.getElementById('aCity').value.trim()||'کەرکوک', msg=document.getElementById('adminMsg'); if(!n||!name){msg.innerHTML='<div class="error">پێویستە</div>';return;} const r=await fetch('/api/voters/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voterNumber:n,name,city})}); const d=await r.json(); if(d.success){msg.innerHTML='<div style="color:green;text-align:center">✅ زیادکرا بۆ سوور - کۆ: '+d.total+'</div>'; loadStats(); loadListsPreview();} }
async function uploadBulk(){ const file=document.getElementById('fileInput').files[0]; if(!file) return alert('فایل هەڵبژێرە'); const text=await file.text(); let lines=text.split(/\\r?\\n/).map(s=>s.trim()).filter(x=>x); let voters=[]; lines.forEach(line=>{ if(line.includes(',')){ const parts=line.split(',').map(s=>s.trim().replace(/^"|"$/g,'')); if(parts.length>=2){ const num=parts[0].replace(/\\D/g,''); if(num) voters.push({voterNumber:num, name:parts[1], city:parts[2]||'کەرکوک'}); } }else{ const num=line.replace(/\\D/g,''); if(num.length>=5) voters.push({voterNumber:num, name:'نادیار '+num, city:'کەرکوک'}); } }); if(!voters.length) return alert('هیچ نیە'); const msg=document.getElementById('bulkMsg'); const bar=document.getElementById('progBar'); const fill=document.getElementById('progFill'); bar.style.display='block'; msg.innerHTML='دۆزرایەوە: '+voters.length; const chunkSize=2000; for(let i=0;i<voters.length;i+=chunkSize){ const chunk=voters.slice(i,i+chunkSize); const isLast=(i+chunkSize)>=voters.length; await fetch('/api/voters/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voters:chunk, isLast})}); const pct=Math.round(Math.min(i+chunkSize,voters.length)/voters.length*100); fill.style.width=pct+'%'; msg.innerHTML='بارکرا: '+(Math.min(i+chunkSize,voters.length))+' / '+voters.length+' ('+pct+'%)'; } msg.innerHTML='✅ سەیڤ کرا: '+voters.length+' بۆ داتابەیس'; loadStats(); loadListsPreview(); }
function downloadList(type,format){ window.location='/api/admin/export?type='+type+'&format='+format; }
async function clearList(type){ if(!confirm('سڕینەوەی '+(type==='remaining'?'سوور':type==='sent'?'سەوز':'هەموو')+' ?')) return; if(type==='all' && !confirm('دڵنیایت هەموو؟')) return; const r=await fetch('/api/admin/clear/'+type,{method:'DELETE'}); const d=await r.json(); if(d.success){ alert('سڕایەوە'); loadStats(); loadListsPreview(); } }
async function loadLogs(){ const r=await fetch('/api/admin/logs'); const d=await r.json(); const box=document.getElementById('logsBox'); box.innerHTML=d.logs.map(l=>'<div style="border-bottom:1px solid #e2e8f0;padding:4px 0;font-size:10px">'+l.username+' - '+l.timeLocal+' - IP:'+(l.ip||'-')+'</div>').join('')||'هیچ نیە'; }
function logout(){localStorage.removeItem('staffAuth');location.reload();}
</script>
</body>
</html>`);
});
app.get('/admin',(req,res)=>res.redirect('/'));
const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log('Running '+PORT));
