const express = require('express');
const app = express();
app.use(express.json({limit:'100mb'}));
let master={},green=[];
app.get('/',(q,r)=>r.send('ok <a href="/m">/m</a>'));
app.get('/m',(q,r)=>r.send('<h2>m ok</h2><form onsubmit="go(event)"><input id="v"><button>send</button></form><div id="o"></div><script>async function go(e){e.preventDefault();let v=document.getElementById("v").value;let x=await fetch("/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({voter:v})});document.getElementById("o").innerText=await x.text()}</script>'));
app.get('/stats',(q,r)=>r.json({m:Object.keys(master).length,g:green.length}));
app.post('/add',(q,r)=>{
 let v=(q.body.voter||'').replace(/\D/g,'');
 if(v.length!=8) return r.json({ok:false});
 if(green.find(z=>z.voter==v)) return r.json({ok:false,msg:'dup'});
 let f=master[v];
 if(!f) return r.json({ok:false,msg:'not in master'});
 green.push(f);
 r.json({ok:true,data:[STRIPPED]
});
app.post('/upload-master',(q,r)=>{
 let c=0;
 (q.body.text||'').split('\n').forEach(l=>{
  if(!l.trim()) return;
  let p=l.split(',');
  let v=(p[0]||'').replace(/\D/g,'').trim();
  if(v.length<6) return;
  master[v]={voter:v,name:(p[1]||'').trim()};
  c++;
 });
 r.json({ok:true,count:c});
});
app.listen(process.env.PORT||8080,'0.0.0.0',()=>console.log('up'));
