const express = require('express');
const app = express();
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({ extended: true }));
let members = [];
let masterList = [];
let masterMap = {};
const ADMIN_PASSWORD = "kirkuk123";
const PORT = process.env.PORT || 8080;

app.get('/', (req,res)=>{
 res.send(`
<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>هەڵبژاردن - کەرکوک</title>
<style>
*{box-sizing:border-box;font-family:sans-serif}
body{margin:0;background:linear-gradient(135deg,#0a0e27,#1a237e);min-height:100vh;color:#fff;display:flex;align-items:center;justify-content:center;padding:20px}
.box{max-width:900px;width:100%;display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media(max-width:700px){.box{grid-template-columns:1fr}}
.left h1{font-size:42px;background:linear-gradient(90deg,#ffd700,#fff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1.2}
.card{background:rgba(255,255,255,0.1);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2);border-radius:20px;padding:25px;display:block;text-decoration:none;color:#fff;transition:0.3s}
.card:hover{transform:translateY(-5px);border-color:#ffd700}
.btn{display:inline-block;margin-top:12px;padding:10px 20px;border-radius:30px;font-weight:bold;text-decoration:none}
.gold{background:#ffd700;color:#000}.blue{background:#1a237e;color:#fff}
.stat{display:inline-block;background:rgba(0,0,0,0.4);padding:8px 15px;border-radius:30px;font-size:12px;margin:5px;border:1px solid rgba(255,255,255,0.1)}
</style></head><body>
<div class="box">
<div class="left">
<h1>هەڵبژاردنی<br>کەرکوک ٢٠٢٤</h1>
<p style="color:#a5b4fc;margin:15px 0;">سیستەمی تۆمارکردنی دەنگدەر - ١ ملیۆن - پارێزراو</p>
<div>
<div class="stat">📊 سەرەکی: <span id="m1">0</span></div>
<div class="stat">✅ تۆمار: <span id="m2">0</span></div>
<div class="stat">🟢 سەوز: <span id="m3">0</span></div>
</div>
</div>
<div>
<a href="/form" class="card"><div style="font-size:35px">🗳️</div><h3>تۆمارکردنی دەنگدەر</h3><p style="font-size:12px;color:#cbd5e1;">فۆڕمی فەرمی - ژمارەی دەنگدەر پێویستە</p><span class="btn gold">چوونە فۆڕم ➡️</span></a>
<a href="/admin?pass=kirkuk123" class="card" style="margin-top:15px"><div style="font-size:35px">🔐</div><h3>پانێڵی ئەدمین</h3><p style="font-size:12px;color:#cbd5e1;">بارکردن و داگرتن - تەنها بۆ تۆ</p><span class="btn blue">چوونە ژوورەوە 🔑</span></a>
</div>
</div>
<script>
async function s(){try{let r=await fetch('/api/counts?pass=kirkuk123');let d=await r.json();document.getElementById('m1').innerText=d.master||0;document.getElementById('m2').innerText=d.members||0;document.getElementById('m3').innerText=d.green||0}catch(e){}}
s();setInterval(s,5000);
</script>
</body></html>
`);
});

app.get('/form',(req,res)=>{
 res.send(`
<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>فۆڕم</title>
<style>body{margin:0;padding:15px;background:linear-gradient(135deg,#0a0e27,#1a237e);min-height:100vh;font-family:sans-serif}
.card{background:#fff;max-width:500px;margin:30px auto;padding:25px;border-radius:20px}
input{width:100%;padding:14px;margin:8px 0;border:1px solid #ddd;border-radius:12px;box-sizing:border-box}
.btn{width:100%;padding:14px;border:none;border-radius:12px;background:#1a237e;color:#fff;font-weight:bold;cursor:pointer}
.voter{border:3px solid #22c55e !important;background:#f0fdf4 !important;font-weight:bold;text-align:center;font-size:18px}
.ok{background:#dcfce7;color:#166534;border:2px solid #22c55e;padding:12px;border-radius:12px;margin:8px 0;display:none;text-align:center;font-weight:bold}
.no{background:#fef3c7;color:#92400e;border:2px solid #f59e0b;padding:12px;border-radius:12px;margin:8px 0;display:none;text-align:center}
.success{background:#dcfce7;color:#166534;padding:15px;border-radius:12px;display:none;text-align:center;border:2px solid #22c55e;margin-top:10px}
</style></head><body>
<div class="card">
<h2 style="text-align:center;color:#1a237e">🗳️ تۆمارکردنی دەنگدەر</h2>
<input id="name" placeholder="ناوی تەواو">
<input id="voter" class="voter" placeholder="ژمارەی دەنگدەر (رقم الناخب) *" oninput="check()">
<div id="info" class="ok"></div>
<div id="info2" class="no"></div>
<input id="phone" placeholder="مۆبایل">
<input id="city" placeholder="شار">
<input id="note" placeholder="تێبینی">
<p id="loc" style="font-size:11px;color:#888;text-align:center">📍 شوێن: وەردەگیرێت...</p>
<button class="btn" onclick="add()">✅ ناردن</button>
<div id="ok" class="success">✅ بەڵێ لە لیستەکە هەیە - سەوز بوو لای ئەدمین!</div>
<a href="/" style="display:block;text-align:center;margin-top:12px;font-size:13px;color:#1a237e;text-decoration:none">⬅️ گەڕانەوە</a>
</div>
<script>
let loc="نەزانراو",lat="",lng="";
if(navigator.geolocation){navigator.geolocation.getCurrentPosition(p=>{lat=p.coords.latitude;lng=p.coords.longitude;loc=lat.toFixed(4)+","+lng.toFixed(4);document.getElementById('loc').innerHTML="📍 تۆمارکرا ✅";})}
async function check(){
 let v=document.getElementById('voter').value.trim();
 let a=document.getElementById('info');
 let b=document.getElementById('info2');
 if(!v){a.style.display='none';b.style.display='none';return;}
 let r=await fetch('/api/check?v='+encodeURIComponent(v));
 let d=await r.json();
 if(d.found){a.style.display='block';b.style.display='none';a.innerHTML="✅ بەڵێ لە لیستەکە هەیە<br>"+(d.info.name||'')+" - "+(d.info.city||''); if(d.info.name && !document.getElementById('name').value) document.getElementById('name').value=d.info.name; if(d.info.city && !document.getElementById('city').value) document.getElementById('city').value=d.info.city;}
 else { if(d.total>0){b.style.display='block';a.style.display='none';b.innerHTML="❌ لە لیست نیە";} }
}
async function add(){
 let name=document.getElementById('name').value.trim();
 let voter=document.getElementById('voter').value.trim();
 if(!name||!voter){alert('ناو و ژمارەی دەنگدەر');return;}
 let phone=document.getElementById('phone').value;
 let city=document.getElementById('city').value;
 let note=document.getElementById('note').value;
 let res=await fetch('/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,voter,phone,city,note,location:loc,lat,lng})});
 let d=await res.json();
 if(d.ok){document.getElementById('name').value='';document.getElementById('voter').value='';document.getElementById('phone').value='';document.getElementById('city').value='';document.getElementById('note').value='';document.getElementById('info').style.display='none';document.getElementById('info2').style.display='none';document.getElementById('ok').style.display='block';setTimeout(()=>document.getElementById('ok').style.display='none',4000);}
}
</script></body></html>
`);
});

app.get('/admin',(req,res)=>{
 if(req.query.pass!==ADMIN_PASSWORD){
  return res.send('<html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#0a0e27;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif}.c{background:#fff;padding:30px;border-radius:20px;max-width:350px;width:90%;text-align:center}input{width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:12px}.b{width:100%;padding:12px;background:#1a237e;color:#fff;border:none;border-radius:12px;font-weight:bold;cursor:pointer}</style></head><body><div class="c"><h2>🔐 ئەدمین</h2><input type="password" id="p" placeholder="kirkuk123"><button class="b" onclick="location.href=\'/admin?pass=\'+document.getElementById(\'p\').value">چوونەژوورەوە</button></div></body></html>');
 }
 res.send(`
<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin</title>
<style>body{margin:0;padding:15px;background:#0f172a;font-family:sans-serif}.card{background:#fff;max-width:900px;margin:15px auto;padding:20px;border-radius:20px;color:#000}
.stat{display:flex;gap:10px}.stat div{flex:1;background:#1a237e;color:#fff;padding:12px;border-radius:12px;text-align:center}
.btn{padding:10px 15px;border:none;border-radius:10px;color:#fff;font-weight:bold;cursor:pointer;margin:3px;font-size:12px}.green{background:#22c55e}.blue{background:#1a237e}.red{background:#ef4444}
table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px}th{background:#1a237e;color:#fff;padding:8px}td{padding:8px;border-bottom:1px solid #eee}
.green-row{background:#dcfce7 !important;border-right:5px solid #22c55e}
.badge{background:#22c55e;color:#fff;padding:4px 10px;border-radius:20px;font-size:11px}
.upload{border:3px dashed #1a237e;padding:15px;border-radius:15px;text-align:center;background:#f8fafc;margin:10px 0}
</style></head><body>
<div class="card">
<h2 style="text-align:center;color:#1a237e">🟢 ئەدمین - سەوز = لە لیست هەیە</h2>
<div class="stat"><div>سەرەکی<br><h2 id="a">0</h2></div><div>تۆمار<br><h2 id="b">0</h2></div><div style="background:#22c55e">سەوز<br><h2 id="c">0</h2></div></div>
<div class="upload"><b>📤 بارکردنی لیستی ١ ملیۆن (CSV)</b><br><input type="file" id="f" accept=".csv"><br><button class="btn blue" onclick="up()">بارکردن</button><div id="st" style="font-size:12px;margin-top:6px"></div><p style="font-size:11px;color:#666">فۆرمات: voter,name,city<br>نموونە: 123456,ئەنجام,کەرکوک</p></div>
<h3>دوایین تۆمار - سەوزەکان</h3>
<div style="max-height:400px;overflow:auto"><table><thead><tr><th>#</th><th>ناو</th><th>ژمارەی دەنگدەر</th><th>دۆخ</th><th>شار</th><th>کات</th></tr></thead><tbody id="tb"></tbody></table></div>
<div style="text-align:center;margin-top:12px"><button class="btn green" onclick="load()">🔄 نوێکردنەوە</button><button class="btn blue" onclick="location.href='/api/download?pass=kirkuk123'">📥 داگرتن CSV</button><a href="/" class="btn" style="background:#64748b;text-decoration:none">🏠 سەرەتا</a></div>
<input id="s" placeholder="گەڕان بە ژمارەی دەنگدەر - Enter" style="margin-top:12px;width:100%;padding:12px;border:2px solid #ddd;border-radius:10px">
<div id="sr"></div>
</div>
<script>
async function load(){
 let r=await fetch('/api/counts?pass=kirkuk123');
 let d=await r.json();
 document.getElementById('a').innerText=d.master.toLocaleString();
 document.getElementById('b').innerText=d.members.toLocaleString();
 document.getElementById('c').innerText=d.green.toLocaleString();
 let tb=document.getElementById('tb');tb.innerHTML='';
 d.recent.forEach((m,i)=>{
  let cls=m.inMaster?'green-row':'';
  let badge=m.inMaster?'<span class="badge">✅ سەوز</span>':'<span style="background:#fef3c7;padding:4px 10px;border-radius:20px;font-size:10px">نوێ</span>';
  tb.innerHTML+='<tr class="'+cls+'"><td>'+(i+1)+'</td><td><b>'+m.name+'</b></td><td><b>'+m.voter+'</b></td><td>'+badge+'</td><td>'+(m.city||'-')+'</td><td style="font-size:10px">'+m.date+'</td></tr>';
 });
}
async function up(){
 let file=document.getElementById('f').files[0];
 if(!file)return alert('فایل هەڵبژێرە');
 let st=document.getElementById('st');st.innerHTML='⏳ خوێندنەوە...';
 let text=await file.text();
 let lines=text.split('\\n').filter(l=>l.trim());
 let data=[];
 let start=lines[0].toLowerCase().includes('voter')?1:0;
 for(let i=start;i<lines.length;i++){
  let p=lines[i].split(',').map(x=>x.trim().replace(/^"|"$/g,''));
  if(p[0]) data.push({voter:p[0],name:p[1]||'',city:p[2]||''});
 }
 st.innerHTML='⏳ ناردن: '+data.length+'...';
 let res=await fetch('/api/upload?pass=kirkuk123',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({list:data})});
 let j=await res.json();
 st.innerHTML='✅ '+j.count.toLocaleString()+' بارکرا!';
 load();
}
document.getElementById('s').addEventListener('keypress',async(e)=>{
 if(e.key==='Enter'){
  let q=e.target.value.trim();if(!q)return;
  let r=await fetch('/api/search?pass=kirkuk123&q='+encodeURIComponent(q));
  let d=await r.json();
  document.getElementById('sr').innerHTML='<div style="background:'+(d.found?'#dcfce7':'#fef3c7')+';padding:12px;border-radius:12px;margin-top:10px;border:2px solid '+(d.found?'#22c55e':'#f59e0b')+'"> '+(d.found?'✅ بەڵێ سەوزە - '+d.info.name:'❌ نیە')+'</div>';
 }
});
load();setInterval(load,5000);
</script></body></html>
`);
});

app.get('/api/check',(req,res)=>{
 let v=req.query.v;
 res.json({found:!!masterMap[v],info:masterMap[v]||null,total:masterList.length});
});
app.post('/add',(req,res)=>{
 let {name,voter,phone,city,note,location,lat,lng}=req.body;
 let now=new Date();
 let info=masterMap[voter];
 members.push({name,voter,phone,city,note,location,lat,lng,date:now.toLocaleDateString('en-GB'),time:now.toLocaleTimeString('en-GB'),inMaster:!!info,masterName:info?info.name:''});
 res.json({ok:true});
});
app.get('/api/counts',(req,res)=>{
 if(req.query.pass!==ADMIN_PASSWORD) return res.json({master:0,members:0,green:0,recent:[]});
 let green=members.filter(m=>m.inMaster).length;
 res.json({master:masterList.length,members:members.length,green,recent:members.slice(-100).reverse()});
});
app.post('/api/upload',(req,res)=>{
 if(req.query.pass!==ADMIN_PASSWORD) return res.json({ok:false});
 let list=req.body.list||[];
 masterList=list;
 masterMap={};
 list.forEach(o=>{if(o.voter) masterMap[o.voter]=o;});
 res.json({ok:true,count:masterList.length});
});
app.get('/api/download',(req,res)=>{
 if(req.query.pass!==ADMIN_PASSWORD) return res.status(401).send('no');
 let csv="No,Voter,Name,City,Phone,InMaster,Date,Time\\n";
 members.forEach((m,i)=>{csv+=(i+1)+','+m.voter+',"'+(m.name||'')+'","'+(m.city||'')+'","'+(m.phone||'')+'",'+(m.inMaster?'YES':'NO')+','+m.date+','+m.time+'\\n';});
 res.setHeader('Content-Disposition','attachment; filename=SEWZ-'+members.length+'.csv');
 res.setHeader('Content-Type','text/csv; charset=utf-8');
 res.send("\\uFEFF"+csv);
});
app.get('/api/search',(req,res)=>{
 if(req.query.pass!==ADMIN_PASSWORD) return res.json({});
 let q=req.query.q||'';
 res.json({found:!!masterMap[q],info:masterMap[q]||null});
});
app.listen(PORT,()=>console.log('OK '+PORT));
