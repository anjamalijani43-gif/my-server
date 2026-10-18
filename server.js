const express = require('express');
const fs = require('fs');
const app = express();
app.use(express.json({limit:'20mb'}));
app.use(express.urlencoded({extended:true}));

let votersDB = {};
let staffLogs = [];
const STAFF_USERS = {
  "admin": "Anjam1234",
  "anjam": "jiani123",
  "staff1": "staff123",
  "kirkuk": "kirkuk123"
};

votersDB["19503975"] = {name:"نسرین بشیر فوزی", city:"کەرکوک", phone:"", center:"٦٠٣", station:"١"};
votersDB["12345678"] = {name:"احمد محمد", city:"کەرکوک", phone:"07701234567", center:"٦٠٢", station:"٢"};

function logStaff(req, username){
  const log = {
    username,
    time: new Date().toISOString(),
    timeLocal: new Date().toLocaleString('ar-EG', {timeZone:'Asia/Baghdad'}),
    ip: req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
    location: req.body.location || null,
    lat: req.body.lat || null,
    lng: req.body.lng || null,
    mobile: req.body.mobileInfo || null
  };
  staffLogs.push(log);
  console.log('STAFF LOG:', log);
  try{ fs.appendFileSync('staff_logs.json', JSON.stringify(log)+'\n'); }catch(e){}
}

app.post('/api/staff/login', (req,res)=>{
  const {username,password} = req.body;
  const u = (username||"").toLowerCase().trim();
  const p = (password||"").trim();
  if(STAFF_USERS[u] && STAFF_USERS[u]===p){
    logStaff(req, u);
    res.json({success:true, role: u==='admin'?'admin':'staff', username:u});
  }else{
    res.status(401).json({success:false, message:"یوزەر یان پاسوۆرد هەڵەیە"});
  }
});

app.get('/api/voter/:id', (req,res)=>{
  const id = req.params.id.trim();
  const voter = votersDB[id];
  if(voter) res.json({success:true, voterNumber:id, ...voter});
  else res.json({success:false, message:"نەدۆزرایەوە", voterNumber:id});
});

app.post('/api/voter/search', (req,res)=>{
  const {voterNumber} = req.body;
  const id = String(voterNumber||"").trim();
  const voter = votersDB[id];
  if(voter) res.json({success:true, voterNumber:id, ...voter});
  else res.json({success:false, message:"ژمارەی دەنگدەر نەدۆزرایەوە"});
});

app.post('/api/voters/add', (req,res)=>{
  const {voterNumber, name, city, phone, center, station} = req.body;
  if(!voterNumber || !name) return res.status(400).json({success:false});
  votersDB[String(voterNumber)] = {name, city:city||"کەرکوک", phone:phone||"", center, station};
  res.json({success:true, total:Object.keys(votersDB).length});
});

app.post('/api/voters/bulk', (req,res)=>{
  const {voters} = req.body;
  if(Array.isArray(voters)){
    voters.forEach(v=>{
      if(v.voterNumber && v.name) votersDB[String(v.voterNumber)]={name:v.name, city:v.city||"کەرکوک", phone:v.phone||"", center:v.center, station:v.station};
    });
  }
  res.json({success:true, total:Object.keys(votersDB).length});
});

app.get('/api/admin/logs', (req,res)=>{
  res.json({logs: staffLogs.slice(-100).reverse(), totalVoters: Object.keys(votersDB).length});
});

app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html>
<html lang="ku" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>سیستەمی دەنگدەر - کەرکوک</title>
<style>
*{box-sizing:border-box;font-family:Tahoma,system-ui}
body{margin:0;background:linear-gradient(135deg,#0f172a,#1e3a8a 50%,#0f766e);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
.card{background:rgba(255,255,255,0.97);border-radius:24px;padding:28px;max-width:460px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.logo{width:64px;height:64px;background:linear-gradient(135deg,#0a7cff,#00d1b2);border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:30px;margin:0 auto 12px;color:#fff}
h2{margin:8px 0 4px;text-align:center;color:#0f172a;font-weight:800;font-size:22px}
.sub{text-align:center;color:#64748b;font-size:13px;margin-bottom:18px}
label{font-size:13px;font-weight:700;color:#334155;margin:10px 0 4px;display:block}
input{width:100%;padding:14px 16px;border:1.8px solid #e2e8f0;border-radius:12px;font-size:16px;background:#f8fafc;outline:none}
input:focus{border-color:#0a7cff;background:#fff}
button{width:100%;padding:14px;background:linear-gradient(135deg,#0a7cff,#0052cc);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;margin-top:12px;box-shadow:0 8px 20px rgba(10,124,255,.35)}
button.green{background:linear-gradient(135deg,#059669,#047857)}
.resultBox{margin-top:16px;padding:16px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #bbf7d0;border-radius:14px;display:none}
.resultBox.show{display:block}
.kv{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed #bbf7d0;font-size:14px}
.kv b{color:#0f172a}.kv span{color:#065f46;font-weight:700}
.error{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px;border-radius:10px;text-align:center;margin:10px 0;font-size:13px}
.hidden{display:none}
.badge{display:inline-block;padding:4px 10px;border-radius:20px;background:#dbeafe;color:#1e40af;font-size:11px;font-weight:700;margin:2px}
.adminPanel{background:#f8fafc;border-radius:14px;padding:12px;margin-top:12px;max-height:300px;overflow:auto}
</style>
</head>
<body>
<div id="loginCard" class="card">
<div class="logo">🗳️</div>
<h2>سیستەمی بەڕێوەبردنی دەنگدەر</h2>
<p class="sub">پارێزگای کەرکوک - چوونەژوورەوەی کارمەند</p>
<div id="loginMsg"></div>
<label>یوزەرنێم</label>
<input id="username" placeholder="admin" value="admin">
<label>پاسوۆرد</label>
<input id="password" type="password" placeholder="••••••••" value="Anjam1234">
<button onclick="login()">چوونە ژوورەوە 🔐</button>
<p class="sub" style="margin-top:12px">تاقیکردنەوە: <span class="badge">admin / Anjam1234</span> <span class="badge">anjam / jiani123</span></p>
</div>

<div id="staffCard" class="card hidden">
<div class="logo">🔍</div>
<h2>گەڕان بە ژمارەی دەنگدەر</h2>
<p class="sub">تەنها ژمارەی دەنگدەر بنووسە، هەموو زانیارییەکانی دەنگدەر لە سێرڤەر دەردەچێت</p>
<div id="staffMsg"></div>
<label>ژمارەی دەنگدەر *</label>
<input id="voterSearch" type="tel" placeholder="مثال: 19503975" onkeydown="if(event.key==='Enter') searchVoter()">
<button onclick="searchVoter()">🔍 پشکنین</button>
<div id="resultBox" class="resultBox">
<div style="text-align:center;font-weight:800;color:#065f46;margin-bottom:8px">✅ دەنگدەر دۆزرایەوە</div>
<div class="kv"><b>ژمارە:</b><span id="rNumber"></span></div>
<div class="kv"><b>ناو:</b><span id="rName"></span></div>
<div class="kv"><b>شار:</b><span id="rCity"></span></div>
<div class="kv"><b>ناوەند:</b><span id="rCenter"></span></div>
<div class="kv"><b>وێستگە:</b><span id="rStation"></span></div>
<div class="kv"><b>مۆبایل:</b><span id="rPhone"></span></div>
<button class="green" onclick="clearSearch()">گەڕانێکی نوێ 🔄</button>
</div>
<button style="background:#f1f5f9;color:#334155;box-shadow:none;border:1px solid #e2e8f0" onclick="logout()">چوونە دەرەوە</button>
</div>

<div id="adminCard" class="card hidden" style="max-width:600px">
<div class="logo">👑</div>
<h2>پانێڵی ئادمین</h2>
<p class="sub" id="adminInfo"></p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
<button onclick="showSection('search')" style="margin:0">🔍 گەڕان</button>
<button onclick="showSection('logs')" style="margin:0;background:linear-gradient(135deg,#7c3aed,#4f46e5)">📍 لۆگی کارمەندان</button>
</div>
<div id="adminSearchSec">
<label>زیادکردنی دەنگدەر</label>
<input id="aNumber" placeholder="ژمارەی دەنگدەر">
<input id="aName" placeholder="ناوی تەواو">
<input id="aCity" placeholder="شار" value="کەرکوک">
<button onclick="addVoter()">➕ زیادکردن</button>
<div id="adminMsg"></div>
<hr style="margin:16px 0;border:none;border-top:1px solid #e2e8f0">
<label>گەڕان</label>
<input id="aSearch" placeholder="ژمارەی دەنگدەر" onkeydown="if(event.key==='Enter') adminSearch()">
<button onclick="adminSearch()">گەڕان</button>
<div id="adminResult" class="resultBox"></div>
</div>
<div id="adminLogsSec" class="hidden">
<label>چالاکی کارمەندان - لوکەیشن + کات + IP</label>
<div id="logsBox" class="adminPanel">چاوەڕوان بە...</div>
<button onclick="loadLogs()" style="background:#f1f5f9;color:#334155;box-shadow:none;border:1px solid #e2e8f0">🔄 نوێکردنەوە</button>
</div>
<button style="background:#f1f5f9;color:#334155;box-shadow:none;border:1px solid #e2e8f0" onclick="logout()">چوونە دەرەوە</button>
</div>

<script>
let currentLocation=null;
let currentMobileInfo=null;
async function captureDeviceInfo(){
  try{
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(pos=>{
        currentLocation = {lat:pos.coords.latitude, lng:pos.coords.longitude};
      });
    }
  }catch(e){}
  currentMobileInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screen: window.screen.width+'x'+window.screen.height,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}
captureDeviceInfo();
async function login(){
  const username=document.getElementById('username').value.trim();
  const password=document.getElementById('password').value.trim();
  const msg=document.getElementById('loginMsg');
  if(!username||!password){msg.innerHTML='<div class="error">یوزەر و پاسوۆرد بنووسە</div>';return;}
  msg.innerHTML='<div style="text-align:center;color:#0a7cff">⏳ چاوەڕوان بە...</div>';
  try{
    const res=await fetch('/api/staff/login',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username, password, location: currentLocation? currentLocation.lat+','+currentLocation.lng : null, lat: currentLocation? currentLocation.lat : null, lng: currentLocation? currentLocation.lng : null, mobileInfo: currentMobileInfo})
    });
    const data=await res.json();
    if(data.success){
      localStorage.setItem('staffAuth', JSON.stringify({username:data.username, role:data.role}));
      msg.innerHTML='';
      if(data.role==='admin'){
        document.getElementById('loginCard').classList.add('hidden');
        document.getElementById('adminCard').classList.remove('hidden');
        document.getElementById('adminInfo').innerText='بەخێربێیت '+data.username+' (ئادمین) - '+new Date().toLocaleString('ar-EG');
        loadLogs();
      }else{
        document.getElementById('loginCard').classList.add('hidden');
        document.getElementById('staffCard').classList.remove('hidden');
      }
    }else{msg.innerHTML='<div class="error">'+data.message+'</div>';}
  }catch(e){msg.innerHTML='<div class="error">هەڵەی سێرڤەر: '+e.message+'</div>';}
}
async function searchVoter(){
  const num=document.getElementById('voterSearch').value.trim();
  const box=document.getElementById('resultBox');
  const msg=document.getElementById('staffMsg');
  if(!num){msg.innerHTML='<div class="error">ژمارەی دەنگدەر بنووسە</div>';return;}
  msg.innerHTML='<div style="text-align:center;color:#0a7cff">⏳ گەڕان...</div>';
  box.classList.remove('show');
  try{
    const res=await fetch('/api/voter/'+encodeURIComponent(num));
    const data=await res.json();
    msg.innerHTML='';
    if(data.success){
      document.getElementById('rNumber').innerText=data.voterNumber;
      document.getElementById('rName').innerText=data.name||'نادیار';
      document.getElementById('rCity').innerText=data.city||'کەرکوک';
      document.getElementById('rCenter').innerText=data.center||'-';
      document.getElementById('rStation').innerText=data.station||'-';
      document.getElementById('rPhone').innerText=data.phone||'نیە';
      box.classList.add('show');
    }else{msg.innerHTML='<div class="error">❌ نەدۆزرایەوە: '+num+'</div>';}
  }catch(e){msg.innerHTML='<div class="error">'+e.message+'</div>';}
}
function clearSearch(){document.getElementById('voterSearch').value='';document.getElementById('resultBox').classList.remove('show');document.getElementById('staffMsg').innerHTML='';document.getElementById('voterSearch').focus();}
async function addVoter(){
  const voterNumber=document.getElementById('aNumber').value.trim();
  const name=document.getElementById('aName').value.trim();
  const city=document.getElementById('aCity').value.trim()||'کەرکوک';
  const msg=document.getElementById('adminMsg');
  if(!voterNumber||!name){msg.innerHTML='<div class="error">ژمارە و ناو پێویستە</div>';return;}
  const res=await fetch('/api/voters/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voterNumber,name,city})});
  const data=await res.json();
  if(data.success){msg.innerHTML='<div style="color:green;text-align:center">✅ زیادکرا - کۆی گشتی: '+data.total+'</div>';}
}
async function adminSearch(){
  const num=document.getElementById('aSearch').value.trim();
  if(!num) return;
  const res=await fetch('/api/voter/'+encodeURIComponent(num));
  const data=await res.json();
  const box=document.getElementById('adminResult');
  if(data.success){
    box.innerHTML='<div class="kv"><b>ژمارە:</b><span>'+data.voterNumber+'</span></div><div class="kv"><b>ناو:</b><span>'+data.name+'</span></div><div class="kv"><b>شار:</b><span>'+data.city+'</span></div>';
    box.classList.add('show');
  }else{box.innerHTML='<div class="error">نەدۆزرایەوە</div>';box.classList.add('show');}
}
function showSection(s){
  if(s==='logs'){document.getElementById('adminSearchSec').classList.add('hidden');document.getElementById('adminLogsSec').classList.remove('hidden');loadLogs();}
  else{document.getElementById('adminLogsSec').classList.add('hidden');document.getElementById('adminSearchSec').classList.remove('hidden');}
}
async function loadLogs(){
  const res=await fetch('/api/admin/logs');
  const data=await res.json();
  const box=document.getElementById('logsBox');
  if(!data.logs.length){box.innerHTML='هیچ لۆگێک نیە';return;}
  box.innerHTML=data.logs.map(l=>'<div style="border-bottom:1px solid #e2e8f0;padding:8px 0;font-size:12px"><b>'+l.username+'</b> - '+l.timeLocal+'<br>🌍 IP: '+(l.ip||'-')+' | 📍 '+(l.lat? l.lat.toFixed(4)+','+l.lng.toFixed(4) : (l.location||'-'))+'<br>📱 '+(l.mobile? (l.mobile.platform+' - '+l.mobile.screen) : '')+'<br><span style="color:#64748b;font-size:10px">'+(l.userAgent||'').substring(0,80)+'</span></div>').join('')+'<div style="text-align:center;margin-top:8px;color:#059669;font-weight:700">کۆی دەنگدەر: '+(data.totalVoters||0)+'</div>';
}
function logout(){localStorage.removeItem('staffAuth');location.reload();}
</script>
</body>
</html>`);
});

app.get('/admin',(req,res)=>res.redirect('/'));
app.get('/staff',(req,res)=>res.redirect('/'));

const PORT = process.env.PORT||3000;
app.listen(PORT, ()=> console.log('Server running '+PORT));
