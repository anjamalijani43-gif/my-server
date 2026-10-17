const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.json({limit:'100mb'}));
app.use(express.urlencoded({extended:true, limit:'100mb'}));

let master = {};
let green = [];

app.get('/m', (req,res)=>{
 res.send(`<html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;background:#f0f2f5;padding:15px}.box{max-width:400px;margin:30px auto;background:white;border-radius:20px;padding:25px;box-shadow:0 4px 15px rgba(0,0,0,0.1)}input{width:100%;padding:16px;margin:10px 0;border:2px solid #ddd;border-radius:12px;font-size:20px;text-align:center;box-sizing:border-box}button{width:100%;padding:16px;background:#22c55e;color:white;border:none;border-radius:12px;font-size:20px;font-weight:bold;cursor:pointer}</style></head><body><div class="box"><h2 style="text-align:center;color:#1e3a8a">🗳️ تۆمارکردن</h2><input id="v" placeholder="٨ ژمارە" maxlength="8" inputmode="numeric"><button onclick="send()">✅ ناردن</button><div id="ok" style="background:#dcfce7;padding:15px;border-radius:10px;text-align:center;display:none;margin-top:15px;color:#166534;font-weight:bold"></div><div id="err" style="color:red;text-align:center;margin-top:10px;font-weight:bold"></div></div><script>async function send(){var v=document.getElementById("v").value.replace(/[^0-9]/g,"");var err=document.getElementById("err");var ok=document.getElementById("ok");err.innerText="";ok.style.display="none";if(v.length!=8){err.innerText="تکایە ٨ ژمارە بنووسە";return;}var r=await fetch("/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({voter:v})});var d=await r.json();if(d.ok){ok.innerText=d.data.name+" ✅ تۆمارکرای و بوویتە سەوز";ok.style.display="block";document.getElementById("v").value="";}else{err.innerText=d.msg;}}</script></body></html>`);
});

app.get('/', (req,res)=>{
 res.send(`<html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;background:#0a1931;padding:10px}.box{max-width:1000px;margin:0 auto;background:white;border-radius:20px;padding:15px;color:#0a1931}.c{display:flex;gap:10px}.c div{flex:1;padding:15px;border-radius:12px;color:white;text-align:center;font-weight:bold;font-size:18px}.g{background:#22c55e}.b{background:#1e3a8a}textarea{width:100%;height:100px;border:2px solid #1e3a8a;border-radius:10px;padding:8px;box-sizing:border-box}button{padding:10px 15px;background:#1e3a8a;color:white;border:none;border-radius:8px;margin:5px;cursor:pointer;font-weight:bold}table{width:100%;font-size:12px;border-collapse:collapse}th{background:#1e3a8a;color:white;padding:8px;position:sticky;top:0}td{padding:6px;border-bottom:1px solid #eee;text-align:center}</style></head><body><div class="box"><h2>🟢 ئەدەمینی ١ ملیۆن</h2><div class="c"><div class="b">سەرەکی<br><span id="master" style="font-size:24px">0</span></div><div class="g">سەوز<br><span id="green" style="font-size:24px">0</span></div></div><br><div style="border:2px dashed #1e3a8a;padding:15px;border-radius:15px"><b>📤 بارکردنی لیستی ١ ملیۆنەکە (CSV)</b><br>فۆرمات: ژمارە,ناو,تەمەن,خێزان,مەرکەز,بنکە,ناوی بنکە,ناونیشان,جۆر<br><textarea id="csv" placeholder="12345678,احمد محمد,35,123,45,67,مدرسة الوحدة,عنوان,عام"></textarea><br><button onclick="upload()">✅ بارکردن</button><span id="msg"></span></div><br><input id="q" placeholder="🔍 گەڕان بە ژمارە یان ناو..." oninput="search()" style="width:100%;padding:10px;border:2px solid gold;background:#fffde7;border-radius:15px;box-sizing:border-box"><div style="overflow:auto;max-height:500px;margin-top:10px;border:1px solid #ddd;border-radius:10px"><table><thead><tr><th>#</th><th>ژمارە</th><th>ناو</th><th>بنکە</th><th>ناونیشان</th><th>جۆر</th></tr></thead><tbody id="tb"></tbody></table></div><br><div style="text-align:center"><a href="/m" target="_blank" style="background:#22c55e;color:white;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:bold">لینکی ئەندام /m</a> <a href="/export-green" style="background:#1e3a8a;color:white;padding:10px 20px;border-radius:10px;text-decoration:none;font-weight:bold">📥 داگرتنی سەوز CSV</a></div></div><script>var all=[];async function load(){var r=await fetch("/stats");var s=await r.json();document.getElementById("master").innerText=s.master;document.getElementById("green").innerText=s.green;var r2=await fetch("/list-green");all=await r2.json();render(all);}function render(l){var tb=document.getElementById("tb");tb.innerHTML="";l.slice().reverse().slice(0,500).forEach(function(m,i){tb.innerHTML+="<tr style=background:#f0fdf4><td>"+(i+1)+"</td><td><b>"+m.voter+"</b></td><td>"+(m.name||"")+"</td><td>"+(m.binaka_name||"")+"</td><td>"+(m.address||"")+"</td><td>"+(m.type||"")+"</td></tr>";});}function search(){var q=document.getElementById("q").value.trim();if(!q)return render(all);render(all.filter(function(x){return x.voter.includes(q)||(x.name&&x.name.includes(q))}));}async function upload(){var text=document.getElementById("csv").value;var r=await fetch("/upload-master",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:text})});var d=await r.json();document.getElementById("msg").innerText=d.msg;load();}load();</script></body></html>`);
});

app.get('/stats', (req,res)=>{res.json({master:Object.keys(master).length, green:green.length});});
app.get('/list-green', (req,res)=>{res.json(green);});
app.post('/add', (req,res)=>{
 var v=(req.body.voter||'').toString().replace(/[^0-9]/g,'');
 if(v.length!=8) return res.json({ok:false,msg:'٨ ژمارە بنووسە'});
 if(green.find(x=>x.voter===v)) return res.json({ok:false,msg:'ئەمە پێشتر تۆمارکراوە و سەوزە'});
 var f=master[v];
 if(!f) return res.json({ok:false,msg:'ئەم ژمارەیە لە لیستی ١ ملیۆنەکەدا نییە'});
 green.push(f);
 res.json({ok:true,data:[STRIPPED]
});
app.post('/upload-master', (req,res)=>{
 var text=req.body.text||'';var c=0;
 text.split('\n').forEach(line=>{
  if(!line.trim()) return;
  var p=line.split(',');var voter=(p[0]||'').replace(/[^0-9]/g,'').trim();
  if(voter.length<6) return;
  master[voter]={voter:voter,name:(p[1]||'').trim(),age:(p[2]||'').trim(),family:(p[3]||'').trim(),markaz_no:(p[4]||'').trim(),binaka_no:(p[5]||'').trim(),binaka_name:(p[6]||'').trim(),address:(p[7]||'').trim(),type:(p[8]||'').trim()};
  c++;
 });
 res.json({msg:c+' دانە بارکرا - ئێستا '+Object.keys(master).length+' لە سەرەکی هەیە'});
});
app.get('/export-green', (req,res)=>{
 var csv='voter,name,age,binaka_name,address,type\n';
 green.forEach(m=>{csv+=`"${m.voter}","${m.name}","${m.age}","${m.binaka_name}","${m.address}","${m.type}"\n`;});
 res.header('Content-Type','text/csv; charset=utf-8');res.attachment('green.csv');res.send('\ufeff'+csv);
});
app.listen(PORT,'0.0.0.0',()=>console.log('1M System OK on '+PORT));
