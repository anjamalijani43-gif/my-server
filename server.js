const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({extended:true, limit:'50mb'}));

let votersDB = {};
let staffLogs = [];
const DB_FILE = 'voters_db.json';
const LOG_FILE = 'staff_logs.json';
const STAFF_USERS = {"admin":"Anjam1234","anjam":"jiani123","staff1":"staff123","kirkuk":"kirkuk123"};

try{ if(fs.existsSync(DB_FILE)){ votersDB=JSON.parse(fs.readFileSync(DB_FILE,'utf8')); } }catch(e){}
if(!votersDB["19503975"]) votersDB["19503975"]={name:"نسرین بشیر فوزی", city:"کەرکوک", phone:"", center:"٦٠٣", station:"١"};

function saveDB(){ try{ fs.writeFileSync(DB_FILE, JSON.stringify(votersDB)); }catch(e){} }
function logStaff(req,username){
  const log={username, time:new Date().toISOString(), timeLocal:new Date().toLocaleString('ar-EG',{timeZone:'Asia/Baghdad'}), ip:req.headers['x-forwarded-for']?.split(',')[0]||req.ip, userAgent:req.headers['user-agent'], lat:req.body.lat||null, lng:req.body.lng||null, mobile:req.body.mobileInfo||null};
  staffLogs.push(log);
  try{ fs.appendFileSync(LOG_FILE, JSON.stringify(log)+'\n'); }catch(e){}
}

app.post('/api/staff/login',(req,res)=>{
  const u=(req.body.username||"").toLowerCase().trim(), p=(req.body.password||"").trim();
  if(STAFF_USERS[u]&&STAFF_USERS[u]===p){ logStaff(req,u); res.json({success:true, role:u==='admin'?'admin':'staff', username:u}); }
  else res.status(401).json({success:false, message:"هەڵەیە"});
});
app.get('/api/voter/:id',(req,res)=>{
  const v=votersDB[req.params.id.trim()];
  if(v) res.json({success:true, voterNumber:req.params.id.trim(), ...v});
  else res.json({success:false});
});
app.post('/api/voters/add',(req,res)=>{
  const {voterNumber,name,city,phone,center,station}=req.body;
  if(!voterNumber||!name) return res.status(400).json({success:false});
  votersDB[String(voterNumber)]={name, city:city||"کەرکوک", phone:phone||"", center, station};
  saveDB(); res.json({success:true, total:Object.keys(votersDB).length});
});
app.post('/api/voters/bulk',(req,res)=>{
  const {voters, isLast}=req.body; let added=0;
  if(Array.isArray(voters)){ voters.forEach(v=>{ if(v.voterNumber&&v.name){ votersDB[String(v.voterNumber)]={name:v.name, city:v.city||"کەرکوک", phone:v.phone||"", center:v.center||"", station:v.station||""}; added++; } }); }
  if(isLast) saveDB(); res.json({success:true, added, total:Object.keys(votersDB).length});
});

// سڕینەوە - نوێ
app.delete('/api/admin/voter/:id',(req,res)=>{
  const id=req.params.id.trim();
  if(votersDB[id]){ delete votersDB[id]; saveDB(); res.json({success:true, total:Object.keys(votersDB).length}); }
  else res.json({success:false});
});
app.delete('/api/admin/clear',(req,res)=>{
  votersDB={}; saveDB(); try{ fs.unlinkSync(DB_FILE); }catch(e){}
  votersDB["19503975"]={name:"نسرین بشیر فوزی", city:"کەرکوک", phone:"", center:"٦٠٣", station:"١"};
  saveDB(); res.json({success:true, total:Object.keys(votersDB).length});
});

app.get('/api/admin/export',(req,res)=>{
  const format=req.query.format||'json'; const total=Object.keys(votersDB).length;
  if(format==='csv'){
    let csv="voterNumber,name,city,phone,center,station\n";
    for(const [num,data] of Object.entries(votersDB)){ csv+=`"${num}","${(data.name||"").replace(/"/g,'""')}","${data.city||""}","${data.phone||""}","${data.center||""}","${data.station||""}"\n`; }
    res.setHeader('Content-Type','text/csv; charset=utf-8'); res.setHeader('Content-Disposition','attachment; filename="voters_'+total+'.csv"'); res.send('\uFEFF'+csv);
  }else{ res.setHeader('Content-Disposition','attachment; filename="voters_'+total+'.json"'); res.json(votersDB); }
});
app.get('/api/admin/logs',(req,res)=>{ res.json({logs: staffLogs.slice(-100).reverse(), totalVoters: Object.keys(votersDB).length}); });

app.get('/',(req,res)=>{
res.send(`<!DOCTYPE html><html lang="ku" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>کەرکوک - دەنگدەر</title>
<style>
*{box-sizing:border-box;font-family:Tahoma,system-ui}body{margin:0;background:linear-gradient(135deg,#0f172a,#1e3a8a 50%,#0f766e);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:14px}
.card{background:rgba(255,255,255,.97);border-radius:24px;padding:26px;max-width:560px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.35);margin:10px}
.logo{width:64px;height:64px;background:linear-gradient(135deg,#0a7cff,#00d1b2);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 12px;color:#fff}
h2{margin:8px 0 4px;text-align:center;color:#0f172a;font-weight:800;font-size:21px}.sub{text-align:center;color:#64748b;font-size:12px;margin-bottom:14px}
label{font-size:12px;font-weight:700;color:#334155;margin:10px 0 4px;display:block}
input{width:100%;padding:13px 16px;border:1.8px solid #e2e8f0;border-radius:12px;font-size:14px;background:#f8fafc;outline:none}
input:focus{border-color:#0a7cff;background:#fff}button{width:100%;padding:13px;background:linear-gradient(135deg,#0a7cff,#0052cc);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;margin-top:8px}
button.green{background:linear-gradient(135deg,#059669,#047857)}button.purple{background:linear-gradient(135deg,#7c3aed,#4f46e5)}button.gray{background:#f1f5f9;color:#334155;box-shadow:none;border:1px solid #e2e8f0}button.red{background:linear-gradient(135deg,#dc2626,#991b1b)}
.resultBox{margin-top:12px;padding:12px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:12px;display:none}.resultBox.show{display:block}
.kv{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #bbf7d0;font-size:13px}.kv b{color:#0f172a}.kv span{color:#065f46;font-weight:700}
.error{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:10px;border-radius:10px;text-align:center;margin:8px 0;font-size:12px}.hidden{display:none}
.badge{display:inline-block;padding:4px 10px;border-radius:20px;background:#dbeafe;color:#1e40af;font-size:10px;font-weight:700;margin:2px}
.panel{background:#f8fafc;border-radius:12px;padding:12px;margin-top:8px;max-height:320px;overflow:auto;font-size:12px}
.progress{height:8px;background:#e2e8f0;border-radius:10px;overflow:hidden;margin:8px 0;display:none}.progress div{height:100%;background:linear-gradient(90deg,#0a7cff,#00d1b2);width:0%;transition:.3s}
</style></head><body>

<div id="loginCard" class="card">
<div class="logo">🗳️</div><h2>سیستەمی دەنگدەر - کەرکوک</h2><p class="sub">چوونەژوورەوەی کارمەند</p><div id="loginMsg"></div>
<label>یوزەر</label><input id="username" value="admin"><label>پاسوۆرد</label><input id="password" type="password" value="Anjam1234">
<button onclick="login()">چوونە ژوورەوە 🔐</button>
<p class="sub"><span class="badge">admin / Anjam1234</span> <span class="badge">anjam / jiani123</span></p>
</div>

<div id="staffCard" class="card hidden">
<div class="logo">🔍</div><h2>گەڕان بە ژمارەی دەنگدەر</h2><p class="sub">تەنها ژمارە بنووسە</p><div id="staffMsg"></div>
<input id="voterSearch" type="tel" placeholder="19503975" onkeydown="if(event.key==='Enter') searchVoter()">
<button onclick="searchVoter()">🔍 پشکنین</button>
<div id="resultBox" class="resultBox"><div style="text-align:center;font-weight:800;color:#065f46;margin-bottom:6px">✅ دۆزرایەوە</div>
<div class="kv"><b>ژمارە:</b><span id="rNumber"></span></div><div class="kv"><b>ناو:</b><span id="rName"></span></div><div class="kv"><b>شار:</b><span id="rCity"></span></div><div class="kv"><b>ناوەند:</b><span id="rCenter"></span></div><div class="kv"><b>وێستگە:</b><span id="rStation"></span></div><div class="kv"><b>مۆبایل:</b><span id="rPhone"></span></div>
<button class="green" onclick="clearSearch()">نوێ 🔄</button></div>
<button class="gray" onclick="logout()">دەرچوون</button>
</div>

<div id="adminCard" class="card hidden">
<div class="logo">👑</div><h2>پانێڵی ئادمین</h2><p class="sub" id="adminInfo"></p>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
<button onclick="showSec('search')" style="margin:0">🔍 گەڕان</button>
<button onclick="showSec('bulk')" style="margin:0" class="green">📁 بارکردن</button>
<button onclick="showSec('logs')" style="margin:0" class="purple">📍 لۆگ</button>
</div>

<div id="secSearch">
<label>زیادکردنی تاک</label><input id="aNumber" placeholder="ژمارەی دەنگدەر"><input id="aName" placeholder="ناو"><input id="aCity" value="کەرکوک"><button onclick="addVoter()">➕ زیادکردن</button><div id="adminMsg"></div>
<hr style="margin:12px 0;border:none;border-top:1px solid #e2e8f0">
<label>گەڕان و سڕینەوە</label><input id="aSearch" placeholder="ژمارەی دەنگدەر" onkeydown="if(event.key==='Enter') adminSearch()"><button onclick="adminSearch()">گەڕان</button><div id="adminResult" class="resultBox"></div>
</div>

<div id="secBulk" class="hidden">
<label>📁 بارکردنی لیستی گەورە (TXT/CSV/JSON)</label><input type="file" id="fileInput" accept=".txt,.csv,.json">
<div style="font-size:11px;color:#64748b;margin:6px 0">هەر دێڕێک: voterNumber,name,city  - بە پارچە 2000-2000 - لە داتابەیس پاشەکەوت دەبێت</div>
<button class="green" onclick="uploadBulk()">📤 بارکردن بۆ سێرڤەر</button>
<div class="progress" id="progBar"><div id="progFill"></div></div><div id="bulkMsg" class="panel">چاوەڕوان...</div>
<hr style="margin:12px 0;border:none;border-top:1px solid #e2e8f0">
<label>📥 داگرتن / 🗑️ سڕینەوە</label>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
<button onclick="downloadList('json')" class="purple" style="margin:0">داگرتن JSON</button>
<button onclick="downloadList('csv')" class="gray" style="margin:0">داگرتن CSV</button>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">
<button onclick="deleteSingle()" class="gray" style="margin:0;border-color:#fecaca;color:#991b1b">🗑️ سڕینەوەی تاک</button>
<button onclick="clearAll()" class="red" style="margin:0">⚠️ سڕینەوەی هەموو لیست</button>
</div>
<input id="delNumber" placeholder="ژمارە بۆ سڕینەوە" style="margin-top:8px">
<div id="countBox" style="text-align:center;margin-top:8px;font-weight:700;color:#059669"></div>
</div>

<div id="secLogs" class="hidden">
<label>لۆگی کارمەندان - IP + لوکەیشن + کات</label><div id="logsBox" class="panel">چاوەڕوان...</div><button class="gray" onclick="loadLogs()">نوێکردنەوە 🔄</button>
</div>

<button class="gray" onclick="logout()">دەرچوون</button>
</div>

<script>
let loc=null, mobInfo=null;
try{if(navigator.geolocation)navigator.geolocation.getCurrentPosition(p=>{loc={lat:p.coords.latitude,lng:p.coords.longitude}});}catch(e){}
mobInfo={ua:navigator.userAgent, plat:navigator.platform, lang:navigator.language, screen:screen.width+'x'+screen.height, tz:Intl.DateTimeFormat().resolvedOptions().timeZone};

async function login(){
 const u=document.getElementById('username').value.trim(), p=document.getElementById('password').value.trim(), m=document.getElementById('loginMsg');
 if(!u||!p){m.innerHTML='<div class="error">بنووسە</div>';return;}
 m.innerHTML='<div style="text-align:center;color:#0a7cff">⏳</div>';
 try{
  const r=await fetch('/api/staff/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p,lat:loc?.lat,lng:loc?.lng,mobileInfo:mobInfo})});
  const d=await r.json();
  if(d.success){
   localStorage.setItem('staffAuth', JSON.stringify({username:d.username, role:d.role}));
   document.getElementById('loginCard').classList.add('hidden');
   if(d.role==='admin'){document.getElementById('adminCard').classList.remove('hidden');document.getElementById('adminInfo').innerText='بەخێربێیت '+d.username+' - '+new Date().toLocaleString('ar-EG');loadLogs();updateCount();}else{document.getElementById('staffCard').classList.remove('hidden');}
  }else m.innerHTML='<div class="error">'+d.message+'</div>';
 }catch(e){m.innerHTML='<div class="error">'+e.message+'</div>';}
}
async function searchVoter(){
 const num=document.getElementById('voterSearch').value.trim(), box=document.getElementById('resultBox'), msg=document.getElementById('staffMsg');
 if(!num){msg.innerHTML='<div class="error">بنووسە</div>';return;}
 msg.innerHTML='<div style="text-align:center;color:#0a7cff">⏳</div>';box.classList.remove('show');
 const r=await fetch('/api/voter/'+encodeURIComponent(num)); const d=await r.json(); msg.innerHTML='';
 if(d.success){document.getElementById('rNumber').innerText=d.voterNumber;document.getElementById('rName').innerText=d.name;document.getElementById('rCity').innerText=d.city;document.getElementById('rCenter').innerText=d.center||'-';document.getElementById('rStation').innerText=d.station||'-';document.getElementById('rPhone').innerText=d.phone||'-';box.classList.add('show');}else msg.innerHTML='<div class="error">❌ نەدۆزرایەوە: '+num+'</div>';
}
function clearSearch(){document.getElementById('voterSearch').value='';document.getElementById('resultBox').classList.remove('show');document.getElementById('staffMsg').innerHTML='';}
async function addVoter(){
 const n=document.getElementById('aNumber').value.trim(), name=document.getElementById('aName').value.trim(), city=document.getElementById('aCity').value.trim()||'کەرکوک', msg=document.getElementById('adminMsg');
 if(!n||!name){msg.innerHTML='<div class="error">پێویستە</div>';return;}
 const r=await fetch('/api/voters/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voterNumber:n,name,city})}); const d=await r.json();
 if(d.success){msg.innerHTML='<div style="color:green;text-align:center">✅ زیادکرا - کۆ: '+d.total+'</div>';updateCount();}
}
async function adminSearch(){
 const num=document.getElementById('aSearch').value.trim(); if(!num) return;
 const r=await fetch('/api/voter/'+encodeURIComponent(num)); const d=await r.json(); const box=document.getElementById('adminResult');
 if(d.success){box.innerHTML='<div class="kv"><b>ژمارە:</b><span>'+d.voterNumber+'</span></div><div class="kv"><b>ناو:</b><span>'+d.name+'</span></div><div class="kv"><b>شار:</b><span>'+d.city+'</span></div><button class="red" onclick="deleteVoter(\\''+d.voterNumber+'\\')">🗑️ سڕینەوەی ئەم دەنگدەرە</button>';box.classList.add('show');}else{box.innerHTML='<div class="error">نەدۆزرایەوە</div>';box.classList.add('show');}
}
function showSec(s){
 document.getElementById('secSearch').classList.add('hidden');document.getElementById('secBulk').classList.add('hidden');document.getElementById('secLogs').classList.add('hidden');
 if(s==='search')document.getElementById('secSearch').classList.remove('hidden');
 if(s==='bulk'){document.getElementById('secBulk').classList.remove('hidden');updateCount();}
 if(s==='logs'){document.getElementById('secLogs').classList.remove('hidden');loadLogs();}
}
async function updateCount(){try{const r=await fetch('/api/admin/logs');const d=await r.json();document.getElementById('countBox').innerText='کۆی دەنگدەر لە داتابەیس: '+(d.totalVoters||0);}catch(e){}}
async function loadLogs(){
 const r=await fetch('/api/admin/logs'); const d=await r.json(); const box=document.getElementById('logsBox');
 if(!d.logs.length){box.innerHTML='هیچ نیە';return;}
 box.innerHTML=d.logs.map(l=>'<div style="border-bottom:1px solid #e2e8f0;padding:6px 0"><b>'+l.username+'</b> - '+l.timeLocal+'<br>🌍 IP: '+(l.ip||'-')+' | 📍 '+(l.lat? l.lat.toFixed(4)+','+l.lng.toFixed(4):'-')+'<br>📱 '+(l.mobile? l.mobile.plat+' '+l.mobile.screen:'')+'</div>').join('');
}
async function uploadBulk(){
 const file=document.getElementById('fileInput').files[0]; if(!file) return alert('فایل هەڵبژێرە');
 const text=await file.text(); let lines=text.split(/\\r?\\n/).map(s=>s.trim()).filter(x=>x); let voters=[];
 lines.forEach(line=>{ if(line.includes(',')){ const parts=line.split(',').map(s=>s.trim().replace(/^"|"$/g,'')); if(parts.length>=2){ const num=parts[0].replace(/\\D/g,''); if(num) voters.push({voterNumber:num, name:parts[1], city:parts[2]||'کەرکوک', phone:parts[3]||'', center:parts[4]||'', station:parts[5]||''}); } }else{ const num=line.replace(/\\D/g,''); if(num.length>=5) voters.push({voterNumber:num, name:'نادیار '+num, city:'کەرکوک'}); } });
 if(!voters.length) return alert('هیچ داتایەک نیە'); const msg=document.getElementById('bulkMsg'); const bar=document.getElementById('progBar'); const fill=document.getElementById('progFill'); bar.style.display='block'; msg.innerHTML='دۆزرایەوە: '+voters.length;
 const chunkSize=2000; for(let i=0;i<voters.length;i+=chunkSize){ const chunk=voters.slice(i,i+chunkSize); const isLast=(i+chunkSize)>=voters.length; await fetch('/api/voters/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voters:chunk, isLast})}); const pct=Math.round(Math.min(i+chunkSize,voters.length)/voters.length*100); fill.style.width=pct+'%'; msg.innerHTML='بارکرا: '+(Math.min(i+chunkSize,voters.length))+' / '+voters.length+' ('+pct+'%)'; }
 msg.innerHTML='✅ تەواو بوو: '+voters.length+' - پاشەکەوت کرا'; updateCount();
}
function downloadList(format){ window.location='/api/admin/export?format='+format; }
async function deleteVoter(num){
 if(!confirm('دڵنیایت بیسڕیتەوە؟ '+num)) return;
 const r=await fetch('/api/admin/voter/'+encodeURIComponent(num),{method:'DELETE'}); const d=await r.json();
 if(d.success){ alert('سڕایەوە - کۆ: '+d.total); document.getElementById('adminResult').classList.remove('show'); updateCount(); }
}
async function deleteSingle(){
 const num=document.getElementById('delNumber').value.trim()||document.getElementById('aSearch').value.trim(); if(!num) return alert('ژمارە بنووسە');
 if(!confirm('سڕینەوەی '+num+' ?')) return;
 const r=await fetch('/api/admin/voter/'+encodeURIComponent(num),{method:'DELETE'}); const d=await r.json();
 if(d.success){ alert('✅ سڕایەوە'); updateCount(); }else alert('نەدۆزرایەوە');
}
async function clearAll(){
 if(!confirm('⚠️ دڵنیایت دەتەوێت هەموو لیستی '+ (await (await fetch('/api/admin/logs')).json()).totalVoters +' دەنگدەر بسڕیتەوە؟ ئەمە ناگەڕێتەوە!')) return;
 if(!confirm('دووەم جار - بەڕاستی هەمووی بسڕمەوە؟')) return;
 const r=await fetch('/api/admin/clear',{method:'DELETE'}); const d=await r.json();
 if(d.success){ alert('🗑️ هەموو لیست سڕایەوە'); updateCount(); document.getElementById('bulkMsg').innerHTML='سڕایەوە'; }
}
function logout(){localStorage.removeItem('staffAuth');location.reload();}
</script>
</body>
</html>`);
});
app.get('/admin',(req,res)=>res.redirect('/'));
const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log('Running '+PORT));
