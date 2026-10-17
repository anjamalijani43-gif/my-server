const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.json());

let members=[];

app.get('/', (req,res)=>{
 res.send(`<html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
 <style>body{font-family:sans-serif;background:#0a1931;padding:15px} .box{max-width:500px;margin:0 auto;background:white;border-radius:20px;padding:20px} .c{display:flex;gap:10px} .c div{flex:1;padding:15px;border-radius:15px;color:white;text-align:center;font-weight:bold} .g{background:#22c55e} .b{background:#1e3a8a} input,textarea{width:100%;padding:10px;margin:5px 0;border-radius:8px;border:1px solid #ccc} button{padding:10px 15px;background:#1e3a8a;color:white;border:none;border-radius:8px;font-weight:bold} table{width:100%;border-collapse:collapse;margin-top:10px} th{background:#1e3a8a;color:white;padding:6px} td{padding:6px;border-bottom:1px solid #eee;text-align:center}</style>
 </head><body><div class="box">
 <h3>🟢 ئەدەمین - سەوز = لە لیست هەیە</h3>
 <div class="c"><div class="g">سەوز<br><span id="s">0</span></div><div class="b">تۆمار<br><span id="t">0</span></div><div class="b">سەرەکی<br>0</div></div>
 <div style="border:2px dashed #1e3a8a;border-radius:15px;padding:10px;margin:10px 0;text-align:center">
 <b>بارکردنی لیست (CSV)</b><br><textarea id="csv" placeholder="12345678,ناو,شار&#10;87654321,ناو2,کەرکوک"></textarea><br><button onclick="upload()">بارکردن</button></div>
 <input id="voter" placeholder="ژمارەی دەنگدەر ٨ ژمارە" maxlength="8"><input id="name" placeholder="ناو"><button onclick="add()">+ زیادکردن</button>
 <input id="q" placeholder="🔍 گەڕان بە ژمارەی دەنگدەر" oninput="search()" style="background:#fffde7;border:2px solid gold;margin-top:15px">
 <table><thead><tr><th>#</th><th>ناو</th><th>ژ.دەنگدەر</th><th>دۆخ</th></tr></thead><tbody id="tb"></tbody></table>
 <br><button onclick="location.href='/export'">داگرتن CSV</button>
 </div>
 <script>
 let all=[];
 async function load(){ let r=await fetch('/list'); all=await r.json(); document.getElementById('t').innerText=all.length; document.getElementById('s').innerText=all.length; render(all); }
 function render(l){ let tb=document.getElementById('tb'); tb.innerHTML=''; l.slice().reverse().slice(0,200).forEach((m,i)=>{ tb.innerHTML+='<tr><td>'+(i+1)+'</td><td>'+(m.name||'-')+'</td><td style="direction:ltr;font-weight:bold">'+m.voter+'</td><td><span style="background:#22c55e;color:white;padding:2px 6px;border-radius:8px">سەوز</span></td></tr>'; }); }
 function search(){ let q=document.getElementById('q').value.trim(); if(!q) return render(all); render(all.filter(x=>x.voter.includes(q))); }
 async function add(){ let voter=document.getElementById('voter').value.trim().replace(/[^0-9]/g,''); let name=document.getElementById('name').value.trim(); if(voter.length!=8){ alert('دەبێت ٨ ژمارە بێت'); return; } let r=await fetch('/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voter,name})}); let d=await r.json(); alert(d.msg); load(); }
 async function upload(){ let text=document.getElementById('csv').value.trim(); if(!text) return; let r=await fetch('/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})}); let d=await r.json(); alert(d.msg); load(); }
 load();
 </script></body></html>`);
});
app.get('/list',(req,res)=>res.json(members));
app.post('/add',(req,res)=>{ let v=(req.body.voter||'').replace(/[^0-9]/g,''); if(v.length!=8) return res.json({msg:'دەبێت ٨ ژمارە بێت'}); if(members.find(x=>x.voter===v)) return res.json({msg:'پێشتر هەیە'}); members.push({voter:v,name:req.body.name||''}); res.json({msg:'تۆمارکرا'}); });
app.post('/upload',(req,res)=>{ let text=req.body.text||''; let c=0; text.split('\n').forEach(line=>{ let p=line.split(','); let v=(p[0]||'').replace(/[^0-9]/g,''); let name=(p[1]||'').trim(); if(v.length>=6 && v.length<=8 && !members.find(x=>x.voter===v)){ members.push({voter:v,name}); c++; } }); res.json({msg:c+' دانە بارکرا'}); });
app.get('/export',(req,res)=>{ let csv='voter,name\n'; members.forEach(m=>{ csv+=m.voter+','+m.name+'\n'; }); res.header('Content-Type','text/csv'); res.attachment('list.csv'); res.send(csv); });
app.listen(PORT,'0.0.0.0',()=>console.log('Running on '+PORT));
