const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

let sent = [];

function loadData(){
  try{
    const p = path.join(__dirname,'public','data.json');
    if(fs.existsSync(p)){
      const t = fs.readFileSync(p,'utf8');
      const j = JSON.parse(t);
      return Array.isArray(j) ? j : [];
    }
  }catch(e){}
  return [];
}

app.post('/api/send',(req,res)=>{
  const data = loadData();
  const num = String(req.body.voterNumber||'').trim();
  const f = data.find(d=> String(d.voterNumber).trim()===num);
  if(f){ sent.push(f); res.json({found:true,data:[STRIPPED] }
  else res.json({found:false});
});

app.get('/api/list',(req,res)=>{
  const data = loadData();
  res.json({sent, allCount: data.length});
});

app.delete('/api/clear',(req,res)=>{ sent=[]; res.json({ok:true}); });
app.get('/health',(req,res)=>res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT,'0.0.0.0',()=>console.log('Server UP '+PORT));
