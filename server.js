const express = require('express');
const app = express();
app.use(express.json({limit:'100mb'}));
app.use(express.urlencoded({extended:true, limit:'100mb'}));

let master = {};
let green = [];

app.get('/', (req,res) => res.send('<h1>Server Online</h1><a href="/m">Go to /m</a> | <a href="/stats">Stats</a>'));

app.get('/m', (req,res) => {
  res.send(`
  <html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;padding:20px;max-width:600px;margin:auto}input{width:70%;padding:12px}button{padding:12px 20px}table{width:100%;margin-top:20px;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px}</style></head>
  <body><h2>گەڕان بە ژمارەی دەنگدەر</h2>
  <form onsubmit="search(event)"><input id="v" placeholder="ژمارەی دەنگدەر"><button>گەڕان</button></form>
  <div id="out"></div>
  <h3>لیستی سەوز: ${green.length}</h3>
  <table><tr><th>ژمارە</th><th>ناو</th></tr>${green.slice(-50).reverse().map(x=>`<tr><td>${x.voter}</td><td>${x.name||''}</td></tr>`).join('')}</table>
  <script>
  async function search(e){
    e.preventDefault();
    let v=document.getElementById('v').value;
    let r=await fetch('/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({voter:v})});
    let j=await r.json();
    document.getElementById('out').innerHTML=j.ok?'<p style="color:green">✅ زیادکرا: '+(j.data.name||v)+'</p>':'<p style="color:red">❌ '+ (j.msg||'نەدۆزرایەوە') +'</p>';
    if(j.ok) setTimeout(()=>location.reload(),800);
  }
  </script></body></html>
  `);
});

app.get('/stats', (req,res) => res.json({master:Object.keys(master).length, green:green.length, greenList:green.slice(-20)}));

app.post('/add', (req,res) => {
  let v=(req.body.voter||'').toString().replace(/\D/g,'');
  if(v.length<6) return res.json({ok:false,msg:'ژمارە هەڵەیە'});
  if(green.find(z=>z.voter==v)) return res.json({ok:false,msg:'پێشتر زیادکراوە'});
  let f=master[v];
  if(!f) return res.json({ok:false,msg:'لە master نییە'});
  green.push(f);
  res.json({ok:true,data:f});
});

app.post('/upload-master', (req,res) => {
  let text=req.body.text||'';
  let count=0;
  text.split('\n').forEach(line=>{
    if(!line.trim()) return;
    let parts=line.split(',');
    let v=(parts[0]||'').replace(/\D/g,'').trim();
    if(v.length<5) return;
    master[v]={voter:v,name:(parts[1]||'').trim(),extra:parts.slice(2).join(',')};
    count++;
  });
  res.json({ok:true,count:Object.keys(master).length,added:count});
});

app.get('/clear-green', (req,res)=>{ green
