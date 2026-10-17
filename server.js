const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.json());

let master = {};
let green = [];

app.get('/m', function(req,res){
 res.send('<html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;background:#f0f2f5;padding:15px} .box{max-width:400px;margin:30px auto;background:white;border-radius:20px;padding:25px} input{width:100%;padding:16px;margin:10px 0;border:2px solid #ddd;border-radius:12px;font-size:20px;text-align:center} button{width:100%;padding:16px;background:#22c55e;color:white;border:none;border-radius:12px;font-size:20px;font-weight:bold}</style></head><body><div class="box"><h2 style="text-align:center;color:#1e3a8a">🗳️ تۆمارکردن</h2><input id="v" placeholder="٨ ژمارە" maxlength="8" inputmode="numeric"><button onclick="send()">✅ ناردن</button><div id="ok" style="background:#dcfce7;padding:10px;border-radius:10px;text-align:center;display:none;margin-top:10px"></div><div id="err" style="color:red;text-align:center;margin-top:10px"></div></div><script>async function send(){ let v=document.getElementById("v").value.replace(/[^0-9]/g,""); let err=document.getElementById("err"); let ok=document.getElementById("ok"); err.innerText=""; ok.style.display="none"; if(v.length!=8){err.innerText="٨ ژمارە";return;} let r=await fetch("/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({voter:v})}); let d=await r.json(); if(d.ok){ok.innerText=d.data.name+" ✅ بوویتە سەوز"; ok.style.display="block";} else{err.innerText=d.msg;} }</script></body></html>');
});

app.get('/', function(req,res){
 res.send('<html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;background:#0a1931;padding:10px} .box{max-width:900px;margin:0 auto;background:white;border-radius:20px;padding:15px;color:#0a1931} .c{display:flex;gap:10px} .c div{flex:1;padding:12px;border-radius:12px;color:white;text-align:center;font-weight:bold} .g{background:#22c55e} .b{background:#1e3a8a} textarea{width:100%;height:80px} button{padding:8px;background:#1e3a8a;color:white;border:none;border-radius:6px;margin:3px} table{width:100%;font-size:11px;border-collapse:collapse} th{background:#1e3a8a;color:white;padding:5px} td{padding:5px;border-bottom:1px solid #eee;text-align:center}</style></head><body><div class="box"><h3>🟢 ئەدەمین - لیستی ١ ملیۆن</h3><div class="c"><div class="b">سەرەکی<br><span id="master">0</span></div><div class="g">سەوز<br><span id="green">0</span></div></div><div style="border:2px dashed #1e3a8a;padding:10px;border-radius:10px;text-align:center"><b>بارکردنی ١ ملیۆن</b><br><textarea id="csv" placeholder="12345678,احمد,35,123,45,67,مدرسة,عنوان,عام"></textarea><br><button onclick="upload()">بارکردن</button></div><input id="q" placeholder="گەڕان" oninput="search()" style="width:100%;padding:8px;border:2px solid gold;background:#fffde7;border-radius:15px;margin:8px 0"><div style="overflow:auto;max-height:400px"><table><thead><tr><th>#</th><th>ژمارە</th><th>ناو</th><th>بنکە</th></tr></thead><tbody id="tb"></tbody></table></div><br><a href="/m">لینکی ئەندام /m</a> | <a href="/export-green">داگرتنی سەوز</a></div><script>let all=[]; async function load(){ let r=await fetch("/stats"); let s=await r.json(); document.getElementById("master").innerText=s.master; document.getElementById("green").innerText=s.green; let r2=await fetch("/list-green"); all=await r2.json(); render(all);} function render(l){ let tb=document.getElementById("tb"); tb.innerHTML=""; l.slice().reverse().slice(0,200).forEach(function(m,i){ tb.innerHTML+="<tr style=background:#f0fdf4><td>"+(i+1)+"</td><td>"+m.voter+"</td><td>"+m.name+"</td><td>"+(m.binaka_name||"")+"</td></tr>";});} function search(){ let q=document.getElementById("q").value.trim(); if(!q) return render(all); render(all.filter(function(x){return x.voter.includes(q)||(x.name&&x.name.includes(q))}));} async function upload(){ let text=document.getElementById("csv").value; let r=await fetch("/upload-master",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:text})}); let d=await r.json(); alert(d.msg); load();} load();</script></body></html>');
});

app.get('/stats', function(req,res){ res.json({master:Object.keys(master).length, green:green.length}); });
app.get('/list-green', function(req,res){ res.json(green); });

app.post('/add', function(req,res){
 try{
  let v=(req.body.voter||'').toString().replace(/[^0-9]/g,'');
  if(v.length!=8) return res.json({ok:false,msg:'٨ ژمارە'});
  if(green.find(function(x){return x.voter===v})) return res.json({ok:false,msg:'پێشتر سەوزە'});
  let f=master[v];
  if(!f) return res.json({ok:false,msg:'لە لیستی ١ ملیۆن نییە'});
  green.push(f);
  res.json({ok:true,data:[STRIPPED]
 }catch(e){ res.json({ok:false,msg:'هەڵە'}); }
});

app.post('/upload-master', function(req,res){
 try{
  let text=req.body.text||''; let c=0;
  text.split('\n').forEach(function(line){
   if(!line.trim()) return;
   let p=line.split(','); let voter=(p[0]||'').replace(/[^0-9]/g,'').trim();
   if(voter.length<6) return;
   master[voter]={voter:voter,name:(p[1]||'').trim(),age:(p[2]||'').trim(),family:(p[3]||'').trim(),markaz_no:(p[4]||'').trim(),binaka_no:(p[5]||'').trim(),binaka_name:(p[6]||'').trim(),address:(p[7]||'').trim(),type:(p[8]||'').trim()};
   c++;
  });
  res.json({msg:c+' دانە بارکرا'});
 }catch(e){ res.json({msg:'هەڵە'}); }
});

app.get('/export-green', function(req,res){
 let csv='voter,name,binaka,address,type\n';
 green.forEach(function(m){ csv+=m.voter+','+m.name+','+m.binaka_name+','+m.address+','+m.type+'\n'; });
 res.header('Content-Type','text/csv'); res.attachment('green.csv'); res.send(csv);
});

app.listen(PORT,'0.0.0.0',function(){console.log('OK');});
