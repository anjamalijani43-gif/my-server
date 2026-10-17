const express = require('express');
const app = express();
app.use(express.json({limit:'100mb'}));
app.use(express.urlencoded({extended:true,limit:'100mb'}));
let master={},green=[];

function adminHTML(){
let m=Object.keys(master).length;
let g=green.length;
let last=green.slice(-10).reverse();
let rows="";
last.forEach((x,i)=>{
rows+="<tr><td>"+(i+1)+"</td><td>"+(x.name||"")+"</td><td>"+x.voter+"</td><td style='color:green'>سه وز</td><td>"+(x.city||"")+"</td><td>"+(new Date(x.time||Date.now()).toLocaleTimeString())+"</td></tr>";
});
return "<!DOCTYPE html><html dir='rtl' lang='ku'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Admin</title><style>body{background:#0f172a;color:#fff;font-family:sans-serif;padding:15px;max-width:900px;margin:auto}.card{display:inline-block;width:30%;margin:1%;padding:15px;border-radius:12px;text-align:center}.green{background:#16a34a}.blue{background:#1e3a8a}.box{border:2px dashed #38bdf8;padding:20px;border-radius:12px;margin:15px 0;text-align:center;background:#1e293b}button{padding:10px 18px;border:none;border-radius:8px;margin:5px;cursor:pointer}table{width:100%;border-collapse:collapse;margin-top:10px;background:#fff;color:#000;border-radius:8px;overflow:hidden}th{background:#1e3a8a;color:#fff;padding:8px}td{padding:6px;border-bottom:1px solid #ddd;text-align:center}input{width:100%;padding:12px;border-radius:8px;border:none;margin-top:10px}</style></head><body>"
+"<h2 style='text-align:center'>\uD83D\uDFE2 \u0626\u0647 \u062F\u0645\u064A\u0646 - \u0633\u0647 \u0648\u0632 = \u0644\u0647 \u0644\u064A\u0633\u062A \u0647\u0647 \u064A\u0647</h2>"
+"<div style='text-align:center'><div class='card green'><div>\u0633\u0647 \u0648\u0632</div><h1>"+g+"</h1></div><div class='card blue'><div>\u062A\u0648\u0645\u0627\u0631</div><h1>"+g+"</h1></div><div class='card blue'><div>\u0633\u0647 \u0631\u0647 \u0643\u0649</div><h1>"+m+"</h1></div></div>"
+"<div class='box'><h3>\uD83D\uDCC2 \u0628\u0627\u0631\u0643\u0631\u062F\u0646\u0649 \u0644\u064A\u0633\u062A\u0649 1 \u0645\u0644\u064A\u0648\u0646 (CSV)</h3><input type='file' id='file' accept='.csv,.txt'><br><br><button onclick='uploadFile()' style='background:#16a34a;color:#fff'>\u0628\u0627\u0631\u0643\u0631\u062F\u0646</button><p style='font-size:12px'>\u0641\u0648\u0631\u0645\u0627\u062A: voter,name,city<br>\u0646\u0645\u0648\u0648\u0646\u0647: 123456,\u0626\u0647 \u0646\u062C\u0627\u0645,\u0643\u0647 \u0631\u0643\u0648\u0643</p><div id='msg'></div></div>"
+"<h3>\u062F\u0648\u0627\u064A\u064A\u0646 \u062A\u0648\u0645\u0627\u0631 - \u0633\u0647 \u0648\u0632\u0647 \u0643\u0627\u0646</h3><table><tr><th>#</th><th>\u0646\u0627\u0648</th><th>\u0698\u0645\u0627\u0631\u0647 \u0649 \u062F\u0647 \u0646\u06AF\u062F\u0647 \u0631</th><th>\u062F\u0648\u062E</th><th>\u0634\u0627\u0631</th><th>\u0643\u0627\u062A</th></tr>"+rows+"</table>"
+"<div style='margin-top:15px;text-align:center'><button onclick='location.href=\"/\"' style='background:#475569;color:#fff'>\uD83C\uDFE0 \u0633\u0647 \u0631\u0647 \u062A\u0627</button><button onclick='downloadCSV()' style='background:#1e3a8a;color:#fff'>\uD83D\uDCE5 \u062F\u0627\u06AF\u0631\u062A\u0646\u0649 CSV</button><button onclick='location.reload()' style='background:#16a34a;color:#fff'>\uD83D\uDD04 \u0646\u0648\u0649 \u0643\u0631\u062F\u0646\u0647 \u0648\u0647</button></div>"
+"<input id='search' placeholder='\u06AF\u0647 \u0631\u0627\u0646 \u0628\u0647 \u0698\u0645\u0627\u0631\u0647 \u0649 \u062F\u0647 \u0646\u06AF\u062F\u0647 \u0631 - Enter' onkeypress='if(event.key==\"Enter\")doSearch()'>"
+"<script>async function uploadFile(){let f=document.getElementById('file').files[0];if(!f)return alert('فایل هه لبژیره');let t=await f.text();document.getElementById('msg').innerHTML='...چاوه ریبه';let r=await fetch('/upload-master',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:t})});let j=await r.json();document.getElementById('msg').innerHTML='ته واو بوو: '+j.count;setTimeout(()=>location.reload(),1000)}async function doSearch(){let v=document.getElementById('search').value;let r=await fetch('/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voter:v})});let j=await r.json();alert(j.ok?'زیادکرا':'نه دوزرایه وه: '+(j.msg||''));if(j.ok)location.reload()}function downloadCSV(){location.href='/download-green'}</script></body></html>";
}

function memberHTML(){
let rows="";
green.slice(-20).reverse().forEach(x=>{
rows+="<tr><td>"+x.voter+"</td><td>"+(x.name||"")+"</td></tr>";
});
return "<!DOCTYPE html><html dir='rtl' lang='ku'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Member</title><style>body{font-family:sans-serif;padding:20px;max-width:600px;margin:auto;background:#f8fafc}input{width:70%;padding:14px;border-radius:8px;border:1px solid #ccc}button{padding:14px 20px;background:#16a34a;color:#fff;border:none;border-radius:8px}table{width:100%;border-collapse:collapse;margin-top:15px;background:#fff}td,th{border:1px solid #ddd;padding:8px;text-align:center}</style></head><body><h2>\u0641\u0648\u0631\u0645\u0649 \u0626\u0647 \u0646\u062F\u0627\u0645 - \u06AF\u0647 \u0631\u0627\u0646 \u0628\u0647 \u0698\u0645\u0627\u0631\u0647 \u0649 \u062F\u0647 \u0646\u06AF\u062F\u0647 \u0631</h2><input id='v' placeholder='\u0698\u0645\u0627\u0631\u0647 \u0649 \u062F\u0647 \u0646\u06AF\u062F\u0647 \u0631'><button onclick='go()'>\u06AF\u0647 \u0631\u0627\u0646</button><div id='o' style='margin-top:15px'></div><h3>\u0644\u064A\u0633\u062A\u0649 \u0633\u0647 \u0648\u0632: "+green.length+"</h3><table><tr><th>\u0698\u0645\u0627\u0631\u0647</th><th>\u0646\u0627\u0648</th></tr>"+rows+"</table><script>async function go(){let v=document.getElementById('v').value;let r=await fetch('/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voter:v})});let j=await r.json();document.getElementById('o').innerHTML=j.ok?'<b style=color:green>\u2705 \u0632\u064A\u0627\u062F\u0643\u0631\u0627: '+(j.data.name||v)+'</b>':'<b style=color:red>\u274C '+(j.msg||'')+'</b>';if(j.ok)setTimeout(()=>location.reload(),800)}<\/script></body></html>";
}

app.get('/',(q,r)=>r.redirect('/admin'));
app.get('/m',(q,r)=>r.send(memberHTML()));
app.get('/admin',(q,r)=>r.send(adminHTML()));
app.get('/stats',(q,r)=>r.json({master:Object.keys(master).length,green:green.length}));
app.get('/clear-green',(q,r)=>{green=[];r.json({ok:true})});
app.get('/download-green',(q,r)=>{
let csv="voter,name,city\n";
green.forEach(x=>{csv+=x.voter+","+(x.name||"")+","+(x.city||"")+"\n"});
r.setHeader('Content-Type','text/csv');
r.setHeader('Content-Disposition','attachment; filename=green.csv');
r.send(csv);
});
app.post('/add',(q,r)=>{
let v=(q.body.voter||'').toString().replace(/\D/g,'');
if(v.length<5)return r.json({ok:false,msg:'ژماره هه له یه'});
if(green.find(z=>z.voter==v))return r.json({ok:false,msg:'پیشتر زیادکراوه'});
let f=master[v];
if(!f)return r.json({ok:false,msg:'له مه سته ر نییه'});
green.push({...f,time:Date.now()});
r.json({ok:true,data:f});
});
app.post('/upload-master',(q,r)=>{
let c=0;
(q.body.text||'').split('\n').forEach(l=>{
if(!l.trim())return;
let p=l.split(',');
let v=(p[0]||'').replace(/\D/g,'').trim();
if(v.length<5)return;
master[v]={voter:v,name:(p[1]||'').trim(),city:(p[2]||'').trim()};
c++;
});
r.json({ok:true,count:Object.keys(master).length,added:c});
});
app.listen(process.env.PORT||8080,'0.0.0.0',()=>console.log('up'));
