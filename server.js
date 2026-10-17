const express = require('express');
const app = express();
app.use(express.json({limit:'100mb'}));
app.use(express.urlencoded({extended:true,limit:'100mb'}));
let master={},green=[];

app.get('/',(q,r)=>r.send('<a href="/m">Member Form /m</a> | <a href="/admin">Admin Form /admin</a> | <a href="/stats">Stats</a>'));

app.get('/m',(q,r)=>{
let html="<html><head><meta name=viewport content='width=device-width,initial-scale=1'><style>body{font-family:sans-serif;padding:20px;max-width:600px;margin:auto}input{width:65%;padding:12px}button{padding:12px}table{width:100%;border-collapse:collapse;margin-top:15px}td{border:1px solid #ccc;padding:6px}</style></head><body><h2>Member - Voter Search</h2><input id=v placeholder='voter number'><button onclick='searchV()'>Search</button><div id=o style='margin-top:15px'></div><script>async function searchV(){let v=document.getElementById('v').value;let r=await fetch('/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voter:v})});let j=await r.json();document.getElementById('o').innerHTML=j.ok?'<b style=color:green>Added: '+(j.data.name||v)+'</b>':'<b style=color:red>Error: '+(j.msg||'not found')+'</b>';if(j.ok)setTimeout(()=>location.reload(),800)}<\/script></body></html>";
r.send(html);
});

app.get('/admin',(q,r)=>{
let html="<html><head><meta name=viewport content='width=device-width,initial-scale=1'><style>body{font-family:sans-serif;padding:20px;max-width:800px;margin:auto}textarea{width:100%;height:120px}button{padding:10px;margin:5px}table{width:100%;border-collapse:collapse;margin-top:15px}td{border:1px solid #ccc;padding:5px}</style></head><body><h2>Admin Panel</h2><p>Master: "+Object.keys(master).length+" | Green: "+green.length+"</p><h3>Upload Master List</h3><textarea id=t placeholder='voter,name - one per line'></textarea><br><button onclick='uploadM()'>Upload</button><button onclick='clearG()'>Clear Green</button><div id=o2 style='margin-top:10px'></div><script>async function uploadM(){let txt=document.getElementById('t').value;if(!txt)return alert('empty');document.getElementById('o2').innerHTML='uploading...';let r=await fetch('/upload-master',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:txt})});let j=await r.json();document.getElementById('o2').innerHTML='Done - Total: '+j.count+' Added: '+j.added}async function clearG(){if(!confirm('Are you sure?'))return;await fetch('/clear-green');location.reload()}<\/script></body></html>";
r.send(html);
});

app.get('/stats',(q,r)=>r.json({master:Object.keys(master).length,green:green.length,greenList:green.slice(-20)}));
app.get('/clear-green',(q,r)=>{green=[];r.json({ok:true})});
app.post('/add',(q,r)=>{
let v=(q.body.voter||'').toString().replace(/\D/g,'');
if(v.length<5)return r.json({ok:false,msg:'bad number'});
if(green.find(z=>z.voter==v))return r.json({ok:false,msg:'already exists'});
let f=master[v];
if(!f)return r.json({ok:false,msg:'not in master'});
green.push(f);
r.json({ok:true,data:f});
});
app.post('/upload-master',(q,r)=>{
let added=0;
(q.body.text||'').split('\n').forEach(l=>{
if(!l.trim())return;
let p=l.split(',');
let v=(p[0]||'').replace(/\D/g,'').trim();
if(v.length<5)return;
master[v]={voter:v,name:(p[1]||'').trim()};
added++;
});
r.json({ok:true,count:Object.keys(master).length,added:added});
});
app.listen(process.env.PORT||8080,'0.0.0.0',()=>console.log('up'));
