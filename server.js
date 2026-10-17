const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_PASS = 'kirkuk123';

const upload = multer({ dest: 'uploads/' });
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'members.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
let members = [];
try { if (fs.existsSync(DATA_FILE)) members = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e){ members=[]; }
function save(){ fs.writeFileSync(DATA_FILE, JSON.stringify(members, null, 2)); }

function html(){
return `
<!DOCTYPE html><html dir="rtl" lang="ku"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ئەدەمین</title><style>
*{box-sizing:border-box;font-family:'Segoe UI',sans-serif}body{margin:0;background:#0a1931;color:#fff;padding:10px}
.box{max-width:500px;margin:0 auto;background:#fff;color:#0a1931;border-radius:25px;padding:15px}
.top{display:flex;justify-content:space-between;align-items:center;font-weight:bold;font-size:18px;color:#1e3a8a}
.cards{display:flex;gap:10px;margin:15px 0}.c{flex:1;text-align:center;padding:15px 5px;border-radius:15px;color:white;font-weight:bold}.c1{background:#22c55e}.c2{background:#1e3a8a}.c3{background:#1e3a8a}.c span{display:block;font-size:28px;margin-top:8px}
.csv{border:3px dashed #1e3a8a;border-radius:15px;padding:15px;text-align:center;margin:15px 0}
.btn{background:#1e3a8a;color:white;border:none;padding:10px 18px;border-radius:10px;font-weight:bold;cursor:pointer;margin:5px}
input[type="text"],input[type="file"]{width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;margin:8px 0}
table{width:100%;border-collapse:collapse;font-size:14px}th{background:#1e3a8a;color:white;padding:8px}td{padding:8px;border-bottom:1px solid #eee;text-align:center}
.search{position:fixed;bottom:10px;left:10px;right:10px;background:white;border-radius:30px;padding:5px;box-shadow:0 4px 15px rgba(0,0,0,0.3);display:flex} .search input{border:none;flex:1;outline:none}
</style></head><body><div class="box">
<div class="top">ئەدەمین - سەوز = لە لیست هەیە 🟢</div>
<div class="cards"><div class="c c1">سەوز<span id="sawz">0</span></div><div class="c c2">تۆمار<span id="tomar">0</span></div><div class="c c3">سەرەکی<span id="sareki">0</span></div></div>

<div class="csv">
<b>📤 بارکردنی لیستی ١ ملیۆن (CSV)</b><br><br>
<form id="csvForm" enctype="multipart/form-data"><input type="file" id="csvFile" accept=".csv" required><br>
<button class="btn" type="submit">بارکردن</button></form>
<div style="font-size:12px;margin-top:10px;color:#555">فۆرمات: voter,name,city<br>نموونە: 12345678,ئەنجام,کەرکوک</div>
</div>

<h3 style="text-align:right">دوایین تۆمار - سەوزەکان</h3>
<table><thead><tr><th>#</th><th>ناو</th><th>ژمارەی دەنگدەر</th><th>دۆخ</th><th>شار</th><th>کات</th></tr></thead><tbody id="tbody"></tbody></table>
<br>
<button class="btn" style="background:#22c55e" onclick="load()">🔄 نوێکردنەوە</button>
<button class="btn" onclick="location.href='/export'">📥 داگرتن CSV</button>
<button class="btn" style="background:#6b7280" onclick="location.href='/admin?pass=kirkuk123'">🏠 سەرەتا</button>
<br><br><br>
</div>
<div class="search"><input id="q" placeholder="گەڕان بە ژمارەی دەنگدەر - Enter" onkeypress="if(event.key==='Enter')search()"></div>

<script>
let all=[];
async function load(){
 const r=await fetch('/list'); all=await r.json();
 document.getElementById('tomar').innerText=all.length;
 document.getElementById('sawz').innerText=all.filter(m=>m.status==='sawz').length||all.length;
 document.getElementById('sareki').innerText=0;
 render(all);
}
function render(list){
 const tb=document.getElementById('tbody'); tb.innerHTML='';
 list.slice().reverse().slice(0,100).forEach((m,i)=>{
  tb.innerHTML+=\`<tr><td>\${i+1}</td><td>\${m.name||'-'}</td><td style="direction:ltr;font-weight:bold">\${m.voter}</td><td><span style="background:#22c55e;color:white;padding:2px 8px;border-radius:10px">سەوز</span></td><td>\${m.city||'-'}</td><td style="font-size:11px">\${m.time||''}</td></tr>\`;
 });
}
function search(){
 const q=document.getElementById('q').value.trim();
 if(!q) return render(all);
 const f=all.filter(m=>m.voter.includes(q));
 render(f);
}
document.getElementById('csvForm').addEventListener('submit', async(e)=>{
 e.preventDefault();
 const fd=new FormData(); fd.append('file', document.getElementById('csvFile').files[0]);
 const r=await fetch('/upload-csv',{method:'POST',body:fd}); const d=await r.json();
 alert(d.message); load();
});
// بۆ مۆبایل: ناردنی تاک
async function sendFromMobile(){
 const voter=prompt('ژمارەی دەنگدەر ٨ ژمارە:');
 if(!voter || !/^[0-9]{8}$/.test(voter)) return alert('دەبێت ٨ ژمارە بێت');
 const r=await fetch('/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voter,name:'',city:'',status:'sawz'})});
 const d=await r.json(); alert(d.message||'تۆمارکرا'); load();
}
load();
</script></body></html>
`;
}

app.get('/', (req,res)=>{ res.send(html()); });
app.get('/admin', (req,res)=>{
  if(req.query.pass!==ADMIN_PASS) return res.status(403).send('پاسۆرد هەڵەیە: /admin?pass=kirkuk123');
  res.send(html());
});

app.post('/add', (req,res)=>{
  let {voter,name,city}=req.body;
  if(!voter || !/^[0-9]{6,8}$/.test(voter)) return res.json({ok:false,message:'ژمارەی دەنگدەر هەڵەیە'});
  if(members.some(m=>m.voter===voter)) return res.json({ok:false,message:'ئەم ژمارەیە پێشتر هەیە'});
  members.push({id:Date.now(),voter,name:name||'',city:city||'',status:'sawz',time:new Date().toLocaleString('ku-IQ')});
  save(); res.json({ok:true,message:'تۆمارکرا'});
});

app.get('/list',(req,res)=>res.json(members));

app.post('/upload-csv', upload.single('file'), (req,res)=>{
  try{
    const text=fs.readFileSync(req.file.path,'utf8');
    const lines=text.split('\\n'); let count=0;
    lines.forEach(line=>{
      const parts=line.split(','); if(parts.length<1) return;
      const voter=parts[0].trim().replace(/[^0-9]/g,'');
      const name=(parts[1]||'').trim(); const city=(parts[2]||'').trim();
      if(/^[0-9]{6,8}$/.test(voter) && !members.some(m=>m.voter===voter)){
        members.push({id:Date.now()+count,voter,name,city,status:'sawz',time:new Date().toLocaleString('ku-IQ')}); count++;
      }
    });
    save(); fs.unlinkSync(req.file.path);
    res.json({ok:true,message: count+' دانە بارکرا'});
  }catch(e){ res.json({ok:false,message:'هەڵە لە فایلەکە'}); }
});

app.get('/export',(req,res)=>{
  let csv='voter,name,city,time\\n'; members.forEach(m=>{ csv+=\`\${m.voter},\${m.name},\${m.city},\${m.time}\\n\`; });
  res.header('Content-Type','text/csv'); res.attachment('list.csv'); res.send(csv);
});

app.listen(PORT,()=>console.log('Admin like image ready'));
