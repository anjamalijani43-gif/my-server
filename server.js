const express = require('express');
const app = express();
app.use(express.json({limit:'100mb'}));
let master = {};
let green = [];
app.get('/', (req,res) => res.send('Server is Online! Go to <a href="/m">/m</a>'));
app.get('/m', (req,res) => res.send('<h1>m is working</h1>'));
app.get('/stats', (req,res) => res.json({master:Object.keys(master).length, green:green.length}));
app.post('/add', (req,res) => {
  let v = (req.body.voter||'').toString().replace(/\D/g,'');
  if(!v) return res.json({ok:false});
  green.push({voter:v});
  res.json({ok:true});
});
app.post('/upload-master', (req,res) => {
  let c=0;
  (req.body.text||'').split('\n').forEach(l=>{
    let p=l.split(','); let v=(p[0]||'').replace(/\D/g,'');
    if(v.length<5) return;
    master[v]={voter:v,name:p[1]||''}; c++;
  });
  res.json({ok:true,count:c});
});
const PORT = process.env.PORT || 8080;
app.listen(PORT,'0.0.0.0',()=>console.log('up on '+PORT));
