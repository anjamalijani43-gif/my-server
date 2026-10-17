const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.json({limit:'100mb'}));
let master = {};
let green = [];

app.get('/', (req,res)=> res.send('admin is working - <a href="/m">/m</a>'));
app.get('/m', (req,res)=> res.send('<h2>m is working</h2><form onsubmit="send(event)"><input id="v" placeholder="8 jmara"><button>send</button></form><div id="r"></div><script>async function send(e){e.preventDefault();var v=document.getElementById("v").value;var r=await fetch("/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({voter:v})});var d=await r.json();document.getElementById("r").innerText=JSON.stringify(d);}</script>'));
app.get('/stats', (req,res)=> res.json({master:Object.keys(master).length, green:green.length}));
app.get('/list-green', (req,res)=> res.json(green));

app.post('/add', (req,res)=>{
 var v=(req.body.voter||'').toString().replace(/[^0-9]/g,'');
 if(v.length!=8) return res.json({ok:false,msg:'8 jmara'});
 if(green.find(x=>x.voter===v)) return res.json({ok:false,msg:'peshter saz buwa'});
 var f=master[v];
 if(!f) return res.json({ok:false,msg:'la 1m nia'});
 green.push(f);
 return res.json({ok:true,data:[STRIPPED]
});

app.post('/upload-master', (req,res)=>{
 var text=req.body.text||'';var c=0;
 text.split('\n').forEach(line=>{
  if(!line.trim()) return;
  var p=line.split(',');
  var voter=(p[0]||'').replace(/[^0-9]/g,'').trim();
  if(voter.length<6) return;
  master[voter]={voter:voter,name:(p[1]||'').trim(),binaka_name:(p[6]||'').trim(),address:(p[7]||'').trim(),type:(p[8]||'').trim()};
  c++;
 });
 res.json({msg:c+' dana bar kra'});
});

app.listen(PORT,'0.0.0.0',()=>console.log('OK on '+PORT));
