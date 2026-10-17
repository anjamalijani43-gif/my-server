const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'members.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
let members = [];
try { if (fs.existsSync(DATA_FILE)) members = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e){ members=[]; }
function saveMembers(){ fs.writeFileSync(DATA_FILE, JSON.stringify(members, null, 2)); }

app.get('/', (req,res)=>{
res.send(`
<!DOCTYPE html>
<html dir="rtl" lang="ku">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>لیستی ئەندامان</title>
<style>
*{box-sizing:border-box;font-family:'Segoe UI',Tahoma,sans-serif}
body{background:#f0f2f5;margin:0;padding:15px}
.card{background:white;max-width:700px;margin:15px auto;padding:20px;border-radius:15px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
h2{text-align:center;margin:0 0 15px;color:#1a73e8}
input{width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;font-size:16px}
.search-box{background:#fffde7;border:2px solid #ffd600}
.btn{width:100%;padding:13px;border:none;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;color:white}
.btn-blue{background:#1a73e8}
.btn-green{background:#0f9d58;margin-top:10px}
.btn-red{background:#ea4335;padding:6px 10px;font-size:13px;width:auto}
table{width:100%;border-collapse:collapse;margin-top:15px}
th,td{padding:10px 8px;border-bottom:1px solid #eee;text-align:right;font-size:14px}
th{background:#f8f9fa}
.badge{background:#e8f0fe;color:#1a73e8;padding:2px 8px;border-radius:10px;font-size:12px}
.error{color:#d93025;font-size:13px;display:none}
</style>
</head>
<body>
<div class="card">
<h2>🚀 زیادکردنی ئەندامی نوێ</h2>
<input id="name" placeholder="ناوی ئەندام *">
<input id="voter" placeholder="ژمارەی دەنگدەر - ٨ ژمارە * - 12345678" maxlength="8" type="text" inputmode="numeric">
<div id="voterError" class="error">دەبێت تەنها ٨ ژمارە بێت!</div>
<input id="phone" placeholder="ژمارەی مۆبایل">
<input id="city" placeholder="شار">
<input id="note" placeholder="تێبینی">
<button class="btn btn-blue" onclick="addMember()">➕ زیادکردن بۆ داتابەیس</button>
</div>

<div class="card">
<h2>📋 لیستی هەموو ئەندامەکان: <span class="badge" id="count">0</span></h2>
<input id="search" class="search-box" placeholder="🔍 گەڕان بە ناو یان ژمارەی دەنگدەر..." oninput="filterList()">
<div style="overflow-x:auto">
<table><thead><tr><th>#</th><th>ناو</th><th>ژ.دەنگدەر</th><th>مۆبایل</th><th>شار</th><th>تێبینی</th><th>کات</th><th>سڕینەوە</th></tr></thead><tbody id="tbody"></tbody></table>
</div>
<button class="btn btn-green" onclick="loadMembers()">🔄 نوێکردنەوە</button>
<button class="btn" style="background:#5f6368;margin-top:8px" onclick="exportCSV()">📥 داگرتن وەک Excel</button>
</div>

<script>
let allMembers = [];
const voterInput=document.getElementById('voter');
voterInput.addEventListener('input', function(){
  this.value=this.value.replace(/[^0-9]/g,'');
  if(this.value.length>8) this.value=this.value.slice(0,8);
  const err=document.getElementById('voterError');
  if(this.value.length>0 && this.value.length!==8) err.style.display='block'; else err.style.display='none';
});

async function addMember(){
const name=document.getElementById('name').value.trim();
const voter=document.getElementById('voter').value.trim();
const phone=document.getElementById('phone').value.trim();
const city=document.getElementById('city').value.trim();
const note=document.getElementById('note').value.trim();
if(!name){alert('تکایە ناو بنووسە');return;}
if(!voter || !/^[0-9]{8}$/.test(voter)){ alert('ژمارەی دەنگدەر دەبێت تەواو ٨ ژمارە بێت!'); return; }
const res=await fetch('/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,voter,phone,city,note})});
const data=await res.json();
if(data.ok){
document.getElementById('name').value='';document.getElementById('voter').value='';document.getElementById('phone').value='';document.getElementById('city').value='';document.getElementById('note').value='';
document.getElementById('voterError').style.display='none';
loadMembers();
}else{ alert(data.error); }
}

function renderList(list){
document.getElementById('count').innerText=list.length;
const tbody=document.getElementById('tbody');
tbody.innerHTML='';
list.forEach((m,i)=>{
tbody.innerHTML+=\`<tr><td>\${i+1}</td><td><b>\${m.name}</b></td><td style="direction:ltr;font-weight:bold;color:#1a73e8">\${m.voter||'-'}</td><td>\${m.phone||'-'}</td><td>\${m.city||'-'}</td><td>\${m.note||'-'}</td><td style="font-size:11px">\${m.time}</td><td><button class="btn btn-red" onclick="del(\${m.id})">X</button></td></tr>\`;
});
}

function filterList(){
  const q = document.getElementById('search').value.trim().toLowerCase();
  if(!q){ renderList(allMembers); return; }
  const filtered = allMembers.filter(m => 
    (m.name && m.name.toLowerCase().includes(q)) || 
    (m.voter && m.voter.includes(q)) ||
    (m.phone && m.phone.includes(q))
  );
  renderList(filtered);
}

async function loadMembers(){
const res=await fetch('/list');
allMembers=await res.json();
allMembers = allMembers.slice().reverse();
renderList(allMembers);
}
async function del(id){ if(!confirm('دڵنیای بیسڕیتەوە؟'))return; await fetch('/delete/'+id,{method:'DELETE'}); loadMembers(); }
function exportCSV(){ window.location='/export'; }
loadMembers();
</script>
</body>
</html>
`);
});

app.post('/add',(req,res)=>{
  const {name,voter,phone,city,note}=req.body;
  if(!voter || !/^[0-9]{8}$/.test(voter)) return res.json({ok:false,error:'ژمارەی دەنگدەر دەبێت ٨ ژمارە بێت'});
  if(members.some(m=>m.voter===voter)) return res.json({ok:false,error:'ئەم ژمارە دەنگدەرە پێشتر تۆمارکراوە!'});
  members.push({id:Date.now(),name,voter,phone,city,note,time:new Date().toLocaleString('ku-IQ')});
  saveMembers(); res.json({ok:true});
});
app.get('/list',(req,res)=>{ res.json(members); });
app.delete('/delete/:id',(req,res)=>{ members=members.filter(m=>m.id!=req.params.id); saveMembers(); res.json({ok:true}); });
app.get('/export',(req,res)=>{
  let csv='ID,Name,VoterNumber,Phone,City,Note,Time\n';
  members.forEach(m=>{ csv+=`${m.id},"${m.name}","${m.voter||''}","${m.phone}","${m.city}","${m.note}","${m.time}"\n`; });
  res.header('Content-Type','text/csv'); res.attachment('members-list.csv'); res.send(csv);
});
app.listen(PORT,()=>console.log('Running'));
