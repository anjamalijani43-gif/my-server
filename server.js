const express = require('express');
const app = express();
app.use(express.json({limit:'100mb'}));
let master={},green=[];
app.get('/',(q,r)=>r.send('ok <a href="/m">/m</a>'));
app.get('/m',(q,r)=>{
let h='<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;padding:20px}input{padding:10px;width:60%}button{padding:10px}table{width:100%;border-collapse:collapse}td{border:1px solid #ccc;padding:6px}</style></head><body><h2>Search</h2><form onsubmit="go(event)"><input id="v" placeholder="voter number"><button>search</button></form><div id="o"></div><h3>Green: '+green.length+'</h3><table>';
for(let i=green.length-1;i>=0&&i>green.length-50;i--){let x=green[i];h+='<tr><td>'+x.voter+'</td><td>'+(x.name||'')+'</td></tr>'}
h+='</table><script>async function go(e){e.preventDefault();let v=document.getElementById("v").value;let r=await fetch("/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({voter:v})});let j=await r.json();document.getElementById("o").innerHTML=j.ok?"<p style=color:green>added "+(j.data.name||v)+"</p>":"<p style=color:red>"+(j.msg||"not found")+"</p>";if(j.ok)setTimeout(()=>location.reload(),700)}</script></body></html>';
r.send(h);
});
app.get('/stats',(q,r)=>r.json({m:Object.keys(master).length,g:green.length}));
app.post('/add',(q,r)=>{
let v=(q.body.voter||'').toString().replace(/\D/g,'');
if(v.length<5)return r.json({ok:false,msg:'bad number'});
if(green.find(z=>z.voter==v))return r.json({ok:false,msg:'already added'});
let f=master[v];
if(!f)return r.json({ok:false,msg:'not in master'});
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
