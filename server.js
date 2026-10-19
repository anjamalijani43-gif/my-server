const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

let sent = [];
let notFound = [];

function loadData(){
  try{
    const p = path.join(__dirname,'public','data.json');
    if(fs.existsSync(p)){
      const txt = fs.readFileSync(p,'utf8');
      const j = JSON.parse(txt);
      return Array.isArray(j) ? j : [];
    }
  }catch(e){ console.log(e.message); }
  return [];
}

app.post('/api/send',(req,res)=>{
  const data = loadData();
  const num = String(req.body.voterNumber||'').trim();
  const found = data.find(d=> String(d.voterNumber).trim()===num);
  if(found){
    sent.push({...found, time: new Date()});
    res.json({found:true, data:[STRIPPED]
  }else{
    notFound.push({voterNumber:num, time: new Date()});
    res.json({found:false});
  }
});

app.get('/api/list',(req,res)=>{
  const data = loadData();
  const families={};
  sent.forEach(s=>{
    const f=s.familyNumber||'unknown';
    if(!families[f]) families[f]=[];
    families[f].push(s);
  });
  res.json({sent, notFound, families, allCount: data.length});
});

app.delete('/api/clear',(req,res)=>{ sent=[]; notFound=[]; res.json({ok:true}); });
app.get('/health',(req,res)=>res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT,'0.0.0.0',()=>console.log('OK '+PORT));
