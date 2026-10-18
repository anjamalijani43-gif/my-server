const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('.'));

const STAFF = { "admin":"Anjam1234", "anjam":"jiani123" };

app.post('/api/staff/login', (req,res)=>{
  const {username,password}=req.body;
  if(STAFF[username]===password) res.json({success:true});
  else res.status(401).json({success:false});
});

app.post('/api/voter', (req,res)=>{
  let {city,mobile,name,voterNumber}=req.body;
  city = city||"کەرکوک";
  if(String(city).match(/^9647/)||String(city).match(/^\d{12,}$/)){
    mobile=city; city="کەرکوک";
  }
  if(mobile){ mobile=String(mobile).replace(/\s/g,''); if(mobile.startsWith('964')) mobile='0'+mobile.slice(3); if(mobile.startsWith('77')) mobile='0'+mobile; }
  res.json({success:true,name,city,mobile});
});

app.get('/api/names/count',(req,res)=>res.json({total:0}));

app.get('/', (req,res)=>{
  res.send(`<!DOCTYPE html><html dir="rtl" lang="ku"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>دەنگدەر</title><style>body{font-family:Tahoma;background:#eef2f7;padding:10px}.card{background:#fff;padding:18px;border-radius:14px;max-width:500px;margin:20px auto}input{width:100%;padding:13px;margin:6px 0;border:1.5px solid #ccc;border-radius:10px}button{width:100%;padding:13px;background:#0a7cff;color:#fff;border:none;border-radius:10px;font-size:17px;font-weight:700}</style></head><body>
<div id="l" class="card"><h2>🔐 کارمەند</h2><div id="m"></div><input id="u" value="admin" placeholder="یوزەر"><input id="p" type="password" value="Anjam1234" placeholder="پاسوۆرد"><button onclick="login()">چوونە ژوورەوە</button><p style="text-align:center;font-size:12px">admin / Anjam1234<br>anjam / jiani123</p></div>
<div id="f" class="card" style="display:none"><h2>📋 فۆڕمی دەنگدەر - کەرکوک</h2><div id="mm"></div><input id="vn" placeholder="ژمارەی دەنگدەر" value="19503975"><input id="vname" placeholder="ناوی سیانی" value="نسرین بشیر فوزی"><input id="city" value="کەرکوک"><input id="mob" placeholder="0770..."><button onclick="sub()">تۆمارکردن</button></div>
<script>
async function login(){const u=document.getElementById('u').value,p=document.getElementById('p').value;const r=await fetch('/api/staff/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});const d=await r.json();if(d.success){document.getElementById('l').style.display='none';document.getElementById('f').style.display='block';}else{document.getElementById('m').innerHTML='هەڵەیە';}}
async function sub(){let c=document.getElementById('city').value,m=document.getElementById('mob').value;if(c.match(/^9647/)||c.match(/^\\d{12,}$/)){m=c;c='کەرکوک';document.getElementById('city').value=c;}m=m.replace(/\\s/g,'');if(m.startsWith('964'))m='0'+m.slice(3);if(m.startsWith('77'))m='0'+m;document.getElementById('mob').value=m;const r=await fetch('/api/voter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('vname').value,city:c,mobile:m,voterNumber:document.getElementById('vn').value})});const d=await r.json();document.getElementById('mm').innerHTML='✅ '+d.city+' - '+d.mobile;}
</script></body></html>`);
});

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log('Running '+PORT));
