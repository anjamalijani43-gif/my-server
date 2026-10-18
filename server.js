const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let members = [];
const ADMIN_PASS = "Anjam123";
let lastRenew = new Date().toLocaleString('en-GB');

app.get('/manifest.json', (req,res)=>{
  res.json({
    name:"App Anjam Jani",
    short_name:"Anjam Jani",
    start_url:"/",
    display:"standalone",
    background_color:"#0a0a0f",
    theme_color:"#6366f1",
    icons:[{src:"https://cdn-icons-png.flaticon.com/512/3135/3135715.png",sizes:"512x512",type:"image/png"}]
  })
});

app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html><html lang="ku" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>App Anjam Jani</title><link rel="manifest" href="/manifest.json"><script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet"><style>*{font-family:Inter,system-ui} body{height:100vh; overflow:hidden}</style></head>
<body class="bg-[#0a0a0f] flex items-center justify-center p-4">
<div class="w-full max-w-[520px] bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden">
<div class="bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] p-7 text-white text-center"><h1 class="text-[28px] font-black tracking-tight">App Anjam Jani</h1><p class="opacity-80 text-[14px] mt-1">سیستەمی تۆمارکردنی ئەندامان</p></div>
<div class="p-7 space-y-4">
<input id="name" class="w-full p-4 rounded-xl border border-gray-200 focus:border-[#6366f1] focus:ring-4 focus:ring-violet-100 outline-none transition text-[15px]" placeholder="ناوی تەواو *">
<input id="phone" class="w-full p-4 rounded-xl border border-gray-200 focus:border-[#6366f1] focus:ring-4 focus:ring-violet-100 outline-none transition text-[15px]" placeholder="ژمارەی مۆبایل">
<input id="city" class="w-full p-4 rounded-xl border border-gray-200 focus:border-[#6366f1] focus:ring-4 focus:ring-violet-100 outline-none transition text-[15px]" placeholder="شار - کەرکوک">
<input id="note" class="w-full p-4 rounded-xl border border-gray-200 focus:border-[#6366f1] focus:ring-4 focus:ring-violet-100 outline-none transition text-[15px]" placeholder="تێبینی">
<button onclick="add()" class="w-full bg-[#0a0a0f] text-white p-4 rounded-xl font-bold text-[16px] hover:bg-black transition active:scale-[0.98]">➕ ناردنی زانیاری</button>
<div id="ok" class="hidden bg-emerald-50 text-emerald-700 p-4 rounded-xl text-center font-bold">✅ نێردرا! سوپاس</div>
<a href="/admin" class="block text-center text-[13px] text-gray-400 mt-2">چوونە ژوورەوەی ئادمین →</a>
</div></div>
<script>
async function add(){
 const name=document.getElementById('name').value.trim();
 if(!name){alert('تکایە ناو بنووسە');return}
 const body={name,phone:phone.value, city:city.value, note:note.value};
 const r=await fetch('/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(r.ok){['name','phone','city','note'].forEach(id=>document.getElementById(id).value=''); const o=document.getElementById('ok');o.classList.remove('hidden'); setTimeout(()=>o.classList.add('hidden'),2500)}
}
<\/script></body></html>`);
});

app.get('/admin', (req,res)=>{
res.send(`<!DOCTYPE html><html dir="rtl" lang="ku"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>App Anjam Jani - Admin</title><link rel="manifest" href="/manifest.json"><script src="https://cdn.tailwindcss.com"></script><style>body{height:100vh; overflow:hidden} *{scrollbar-width:thin}</style></head>
<body class="bg-[#f6f6f9] text-[#0a0a0f] flex h-screen">
<div id="login" class="m-auto w-full max-w-[420px] bg-white rounded-[20px] p-8 shadow-xl"><h1 class="text-2xl font-black text-center">App Anjam Jani</h1><p class="text-center text-gray-500 text-sm mt-1 mb-6">پانێڵی ئادمین</p><input id="pass" type="password" placeholder="پاسۆرد: Anjam123" class="w-full p-4 rounded-xl border border-gray-200 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"><button onclick="login()" class="w-full mt-4 bg-[#0a0a0f] text-white p-4 rounded-xl font-bold hover:bg-black">چوونە ژوورەوە</button></div>

<div id="panel" class="hidden w-full h-screen flex">
<!-- SIDEBAR -->
<div class="w-[300px] bg-[#0a0a0f] text-white flex flex-col p-6 shrink-0">
<h1 class="text-[22px] font-black">App Anjam Jani</h1><p class="text-white/50 text-[12px] mt-1">ADMIN PANEL</p>
<div class="mt-8 space-y-3">
<div class="bg-white/10 rounded-xl p-4"><p class="text-[11px] text-white/50">کۆی ئەندامان</p><p id="count" class="text-[28px] font-black">0</p></div>
<div class="bg-white/10 rounded-xl p-4"><p class="text-[11px] text-white/50">دوایین تازەکردنەوە</p><p id="renewTime" class="text-[12px] font-bold mt-1">${lastRenew}</p></div>
<button onclick="renew()" class="w-full bg-gradient-to-br from-violet-600 to-indigo-600 p-4 rounded-xl font-bold text-[13px] hover:opacity-90">🔄 سێرڤەر تازە بکەرەوە<br><span class="text-[10px] opacity-70">مانگانە 1 کلیک - بۆ ئەوەی نەوەستێت</span></button>
<button onclick="delSelected()" class="w-full bg-white/10 p-3 rounded-xl text-[13px] font-bold">🗑️ سڕینەوەی هەڵبژێردراوەکان</button>
<button onclick="exportCSV()" class="w-full bg-white/10 p-3 rounded-xl text-[13px] font-bold">📥 داگرتنی Excel</button>
</div>
<div class="mt-auto flex gap-2"><a href="/" class="flex-1 bg-white/10 p-3 rounded-xl text-center text-[13px]">ئەندام</a><button onclick="logout()" class="flex-1 bg-white/10 p-3 rounded-xl text-[13px]">دەرچوون</button></div>
</div>
<!-- MAIN -->
<div class="flex-1 flex flex-col h-screen">
<div class="p-5 bg-white border-b flex gap-3 items-center"><input id="search" oninput="render()" placeholder="🔍 گەڕان بە ناو، مۆبایل، شار..." class="flex-1 p-3 rounded-xl border border-gray-200 bg-[#f6f6f9] outline-none focus:border-violet-500"><button onclick="load()" class="bg-[#0a0a0f] text-white px-5 py-3 rounded-xl text-[13px] font-bold">نوێکردنەوە</button></div>
<div id="list" class="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 content-start"></div>
</div>
</div>
<script>
let all=[];
function login(){if(document.getElementById('pass').value==='${ADMIN_PASS}'){localStorage.setItem('admin','ok'); show()} else alert('هەڵەیە')}
function show(){document.getElementById('login').classList.add('hidden');document.getElementById('panel').classList.remove('hidden');document.getElementById('panel').classList.add('flex');load()}
function logout(){localStorage.removeItem('admin');location.reload()}
if(localStorage.getItem('admin')=='ok') show();
async function load(){const r=await fetch('/list'); all=await r.json(); document.getElementById('count').innerText=all.length; render()}
function render(){
 const q=document.getElementById('search').value.toLowerCase();
 const f=all.filter(m=> (m.name+m.phone+m.city).toLowerCase().includes(q));
 const box=document.getElementById('list'); box.innerHTML='';
 f.forEach(m=>{
  box.innerHTML+=\`<div class="bg-white rounded-[18px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col">
   <div class="flex justify-between items-start"><div class="flex gap-3"><input type="checkbox" value="\${m.id}" class="chk w-5 h-5 rounded mt-1"><div><p class="font-black text-[15px]">\${m.name}</p><p class="text-[12px] text-gray-500">\${m.phone||'-'} • \${m.city||'-'}</p></div></div><button onclick="del(\${m.id})" class="bg-[#0a0a0f] text-white w-8 h-8 rounded-full text-[14px]">✕</button></div>
   <div class="mt-3 bg-[#f6f6f9] rounded-xl p-3 text-[12px] text-gray-600">\${m.note||'بێ تێبینی'}<div class="text-[10px] text-gray-400 mt-1">\${m.time}</div></div>
  </div>\`;
 });
}
async function del(id){if(!confirm('دڵنیای لە سڕینەوە؟'))return; await fetch('/delete/'+id,{method:'DELETE'}); load()}
async function delSelected(){const ids=[...document.querySelectorAll('.chk:checked')].map(c=>c.value); if(!ids.length){alert('هیچت هەڵنەبژاردووە');return} if(!confirm(ids.length+' دانە بسڕمەوە؟'))return; for(let id of ids){await fetch('/delete/'+id,{method:'DELETE'})} load()}
function exportCSV(){window.location='/export'}
async function renew(){const r=await fetch('/renew',{method:'POST'}); const d=await r.json(); document.getElementById('renewTime').innerText=d.time; alert('✅ بۆ 30 ڕۆژی تر تازە کرایەوە: '+d.time)}
setInterval(()=>fetch('/ping'),600000);
<\/script></body></html>`);
});

app.post('/add',(req,res)=>{ const {name,phone,city,note}=req.body; members.push({id:Date.now(),name,phone,city,note,time:new Date().toLocaleString('en-GB')}); res.json({ok:true}) });
app.get('/list',(req,res)=>res.json(members.slice().reverse()));
app.delete('/delete/:id',(req,res)=>{ members=members.filter(m=>m.id!=req.params.id); res.json({ok:true}) });
app.post('/renew',(req,res)=>{ lastRenew=new Date().toLocaleString('en-GB'); res.json({ok:true,time:lastRenew}) });
app.get('/ping',(req,res)=>res.json({ok:true}));
app.get('/export',(req,res)=>{ let csv='ID,Name,Phone,City,Note,Time\\n'; members.forEach(m=>csv+=\`\${m.id},"\${m.name}","\${m.phone}","\${m.city}","\${m.note}","\${m.time}"\\n\`); res.header('Content-Type','text/csv'); res.attachment('App-Anjam-Jani.csv'); res.send(csv) });

app.listen(PORT,()=>console.log('App Anjam Jani running '+PORT));
