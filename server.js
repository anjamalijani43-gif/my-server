const express = require('express');
const app = express();
app.use(express.json({limit:'100mb'}));
app.use(express.urlencoded({extended:true,limit:'100mb'}));
let master={},green=[];

app.get('/',(q,r)=>r.send('Online - <a href="/m">/m</a> - <a href="/admin">/admin</a> - <a href="/stats">/stats</a>'));

app.get('/m',(q,r)=>{
let h='<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;padding:20px;max-width:600px;margin:auto}input{width:65%;padding:12px}button{padding:12px}table{width:100%;border-collapse:collapse;margin-top:15px}td,th{border:1px solid #ccc;padding:6px}</style></head><body>';
h+='<h2>فورمی ئه ندام - گه ران به ژماره ی ده نگده ر</h2><input id="v" placeholder="ژماره ی ده نگده ر"><button onclick="go()">گه ران</button><div id="o" style="margin-top:15px"></div>';
h+='<h3>لیستی سه وز: '+green.length+'</h3><table><tr><th>ژماره</th><th>ناو</th></tr>';
for(let i=green.length-1;i>=0&&i>green.length-50;i--){let x=green[i];h+='<tr><td>'+x.voter+'</td><td>'+(x.name||'')+'</td></tr>'}
h+='</table><script>async function go(){let v=document.getElementById("v").value;let r=await fetch("/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({voter:v})});let j=await r.json();document.getElementById("o").innerHTML=j.ok?"<b style=color:green>✅ زیادکرا: "+(j.data.name||v)+"</b>":"<b style=color:red>❌ "+(j.msg||"نه دوزرایه وه")+"</b>";if(j.ok)setTimeout(()=>location.reload(),900)}<\/script></body></html>';
r.send(h);
});

app.get('/admin',(q,r)=>{
let h='<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;padding:20px;max-width:800px;margin:auto}textarea{width:100%;height:120px}button{padding:10px;margin:5px}table{width:100%;border-collapse:collapse}td{border:1px solid #ccc;padding:5px;font-size:13px}</style></head><body>';
h+='<h2>فورمی ئادمن</h2><p>Master: '+Object.keys(master).length+' | Green: '+green.length+'</p>';
h+='<h3>1- ئاپلود کردنی مه سته ر (1 ملیون)</h3><textarea id="t" placeholder="voter,name... هه ر دیریک له سه ر دیریک"></textarea><br><button onclick="up()">ئاپلود بکه</button> <button onclick="if(confirm(\'دلیای؟\')){fetch(\'/clear-green\').then(()=>location.reload())}">سریندوه ی سه وز</button><div id="o2"></div>';
h+='<h3>2- لیستی سه وز (دوایین 200)</h3><table><tr><th>ژماره</th><th>ناو</th></tr>';
for(let i=green.length-1;i>=0&&i>green.length-200;i--){let x=green[i];h+='<tr><td>'+x.voter+'</td><td>'+(x.name||'')+'</td></tr>'}
h+='</table><script>async function up(){let txt=document.getElementById("t").value;if(!txt)return alert("تکسته که بنوسه");document.getElementById("o2").innerHTML="چاوه ریبه...";let r=await fetch("/upload-master",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:txt})});let j=await r.json();document.getElementById("o2").innerHTML="✅ ته واو بوو - کوی گشتی: "+j.count+" - ئه م جاره: "+j.added;setTimeout(()=>location.reload(),1000)}<\/script></body></html>';
r.send(h);
});

app.get('/stats',(q,r)=>r.json({master:Object.keys(master).length,green:green.length}));
app.get('/clear-green',(q,r)=>{green=[];r.json({ok:true})});
app.post('/add',(q,r)=>{
let v=(q.body.voter||'').toString().replace(/\D/g,'');
if(v.length<5)return r.json({ok:false,msg:'ژماره هه له یه'});
if(green.find(z=>z.voter==v))return r.json({ok:false,msg:'پیشتر زیادکراوه'});
let f=master[v];
if(!f)return r.json({ok:false,msg:'له مه سته ر نییه'});
green.push(f);
r.json({ok:true,data:[STRIPPED]
});
app.post('/upload-master',(q,r)=>{
let c=0;
(q.body.text||'').split('\n').forEach(l=>{
if(!l.trim())return;
let p=l.split(',');
let v=(p[0]||'').replace(/\D/g,'').trim();
if(v.length<5)return;
master[v]={voter:v,name:(p[1]||'').trim()};
c++;
});
r.json({ok:true,count:Object.keys(master).length,added:c});
});
app.listen(process.env.PORT||8080,'0.0.0.0',()=>console.log('up'));
