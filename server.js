const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.json({limit:'100mb'}));
app.use(express.urlencoded({extended:true, limit:'100mb'}));

let masterList = {}; // 1 ملیۆنەکە - key = ژمارەی دەنگدەر
let greenList = [];  // ئەوانەی ئەندام ناردوویەتی - سەوز

// بۆ ئەندام - تەنها ٨ ژمارە - /m
app.get('/m', (req,res)=>{
 res.send(`<html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
 <style>body{font-family:sans-serif;background:#f0f2f5;padding:15px} .box{max-width:400px;margin:30px auto;background:white;border-radius:20px;padding:25px} h2{text-align:center;color:#1e3a8a} input{width:100%;padding:16px;margin:10px 0;border:2px solid #ddd;border-radius:12px;font-size:20px;text-align:center} button{width:100%;padding:16px;background:#22c55e;color:white;border:none;border-radius:12px;font-size:20px;font-weight:bold} .ok{background:#dcfce7;padding:12px;border-radius:10px;text-align:center;display:none}</style>
 </head><body><div class="box"><h2>🗳️ تۆمارکردن</h2><p style="text-align:center">ژمارەی دەنگدەر بنووسە</p>
 <input id="v" placeholder="٨ ژمارە" maxlength="8" inputmode="numeric"><button onclick="send()">✅ ناردن</button><div id="ok" class="ok"></div><div id="err" style="color:red;text-align:center;margin-top:10px"></div></div>
 <script>
 async function send(){
  let v=document.getElementById('v').value.replace(/[^0-9]/g,''); let err=document.getElementById('err'); let ok=document.getElementById('ok');
  err.innerText=''; ok.style.display='none';
  if(v.length!=8){ err.innerText='دەبێت ٨ ژمارە بێت'; return; }
  let r=await fetch('/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voter:v})});
  let d=await r.json();
  if(d.ok){ ok.innerText='سوپاس '+d.data.name+' ✅\\n'+d.data.station+' - تۆمارکرایت و بوویتە سەوز'; ok.style.display='block'; document.getElementById('v').value=''; }
  else{ err.innerText=d.msg; }
 }
 </script></body></html>`);
});

// بۆ ئەدەمین
app.get('/', (req,res)=>{
 res.send(`<html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
 <style>body{font-family:sans-serif;background:#0a1931;padding:10px} .box{max-width:900px;margin:0 auto;background:white;border-radius:20px;padding:15px;color:#0a1931} .c{display:flex;gap:10px;margin:10px 0} .c div{flex:1;padding:15px;border-radius:15px;color:white;text-align:center;font-weight:bold} .g{background:#22c55e} .b{background:#1e3a8a} .r{background:#ef4444} textarea{width:100%;height:100px;border-radius:8px} button{padding:8px 12px;background:#1e3a8a;color:white;border:none;border-radius:8px;margin:3px} table{width:100%;border-collapse:collapse;font-size:12px} th{background:#1e3a8a;color:white;padding:6px} td{padding:6px;border-bottom:1px solid #eee;text-align:center} .green{background:#f0fdf4}</style>
 </head><body><div class="box"><h3>🟢 ئەدەمین - لیستی ١ ملیۆن</h3>
 <div class="c"><div class="b">سەرەکی (١ ملیۆن)<br><span id="master">0</span></div><div class="g">سەوز (تۆمارکراو)<br><span id="green">0</span></div><div class="r">ماوە<br><span id="left">0</span></div></div>
 <div style="border:2px dashed #1e3a8a;padding:10px;border-radius:12px;text-align:center;margin:10px 0">
 <b>📤 بارکردنی لیستی ١ ملیۆن - هەموو زانیارییەکان</b><br><textarea id="csv" placeholder="voter,name,age,family,markaz_no,binaka_no,binaka_name,address,type&#10;12345678,احمد علي,35,123,45,67,مدرسة كركوك,كركوك - رحيم اوا,عام"></textarea><br><button onclick="upload()">بارکردنی ١ ملیۆن</button>
 <div style="font-size:10px;color:#555;margin-top:5px">فۆرمات: ژمارەی دەنگدەر,ناو,تەمەن,ژمارەی خێزان,ژمارەی ناوەند,ژمارەی بنکە,ناوی بنکە,ناونیشان,جۆر</div>
 </div>
 <input id="q" placeholder="🔍 گەڕان بە ژمارەی دەنگدەر یان ناو لە لیستی سەوز" oninput="search()" style="width:100%;padding:10px;border:2px solid gold;background:#fffde7;border-radius:20px;margin:10px 0">
 <div style="overflow:auto;max-height:500px"><table><thead><tr><th>#</th><th>ژ.دەنگدەر</th><th>ناو</th><th>تەمەن</th><th>خێزان</th><th>بنکە</th><th>ناوی بنکە</th><th>ناونیشان</th><th>جۆر</th></tr></thead><tbody id="tb"></tbody></table></div>
 <br><button onclick="location.href='/export-green'">📥 داگرتنی لیستی سەوز (Excel)</button> <button onclick="location.href='/export-all'">داگرتنی هەموو</button>
 <br><br><a href="/m">لینکی ئەندام /m</a>
 </div>
 <script>
 let all=[];
 async function load(){ let r=await fetch('/stats'); let s=await r.json(); document.getElementById('master').innerText=s.master; document.getElementById('green').innerText=s.green; document.getElementById('left').innerText=s.master-s.green;
  let r2=await fetch('/list-green'); all=await r2.json(); render(all); }
 function render(l){ let tb=document.getElementById('tb'); tb.innerHTML=''; l.slice().reverse().slice(0,300).forEach((m,i)=>{ tb.innerHTML+='<tr class=green><td>'+(i+1)+'</td><td style="font-weight:bold">'+m.voter+'</td><td>'+m.name+'</td><td>'+(m.age||'')+'</td><td>'+(m.family||'')+'</td><td>'+(m.binaka_no||'')+'</td><td>'+(m.binaka_name||'')+'</td><td>'+(m.address||'')+'</td><td>'+(m.type||'')+'</td></tr>'; }); }
 function search(){ let q=document.getElementById('q').value.trim(); if(!q) return render(all); render(all.filter(x=> x.voter.includes(q) || (x.name&&x.name.includes(q)) )); }
 async function upload(){ let text=document.getElementById('csv').value; if(!text) return alert('لیستەکە دابنێ'); let r=await fetch('/upload-master',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})}); let d=await r.json(); alert(d.msg); load(); }
 load();
 </script></body></html>`);
});

app.get('/stats',(req,res)=>res.json({master:Object.keys(masterList).length, green:greenList.length}));
app.get('/list-green',(req,res)=>res.json(greenList));

app.post('/add',(req,res)=>{
 let v=(req.body.voter||'').replace(/[^0-9]/g,'');
 if(v.length!=8) return res.json({ok:false,msg:'٨ ژمارە'});
 if(greenList.find(x=>x.voter===v)) return res.json({ok:false,msg:'پێشتر تۆمارکراوە و سەوزە'});
 let found = masterList[v];
 if(!found) return res.json({ok:false,msg:'ئەم ژمارەیە لە لیستی ١ ملیۆن نییە!'});
 greenList.push(found);
 res.json({ok:true, data:[STRIPPED]
});

app.post('/upload-master',(req,res)=>{
 let text=req.body.text||''; let c=0;
 text.split('\n').forEach(line=>{
  if(!line.trim()) return;
  let p=line.split(','); 
  let voter=(p[0]||'').replace(/[^0-9]/g,'').trim();
  if(voter.length<6) return;
  masterList[voter]={
   voter:voter,
   name:(p[1]||'').trim(),
   age:(p[2]||'').trim(),
   family:(p[3]||'').trim(),
   markaz_no:(p[4]||'').trim(),
   binaka_no:(p[5]||'').trim(),
   binaka_name:(p[6]||'').trim(),
   address:(p[7]||'').trim(),
   type:(p[8]||'').trim(),
   station:(p[6]||'').trim()
  }; c++;
 });
 res.json({msg:c+' دانە لە لیستی سەرەکی بارکرا - ئێستا ئامادەیە'});
});

app.get('/export-green',(req,res)=>{
 let csv='voter,name,age,family,markaz_no,binaka_no,binaka_name,address,type\n';
 greenList.forEach(m=>{ csv+=`${m.voter},${m.name},${m.age},${m.family},${m.markaz_no},${m.binaka_no},${m.binaka_name},${m.address},${m.type}\n`; });
 res.header('Content-Type','text/csv'); res.attachment('green_list.csv'); res.send(csv);
});

app.listen(PORT,'0.0.0.0',()=>console.log('Million voter system OK'));
