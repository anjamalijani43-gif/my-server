const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

let sent = [];
let notFound = [];

app.post('/api/send', (req,res)=>{
  const num = String(req.body.voterNumber||'').trim();
  // بۆ ئێستا هەر ژمارەیەک وەک دۆزراو قبول دەکەین تا سێرڤەر هەستێتەوە
  sent.push({voterNumber:num, name:'دەنگدەر '+num, familyNumber:'FAM-001', time:new Date()});
  res.json({found:true, data:{voterNumber:num, name:'دەنگدەر '+num, familyNumber:'FAM-001'}});
});

app.get('/api/list', (req,res)=>{
  res.json({sent, notFound, families:{'FAM-001': sent}, allCount: 3});
});

app.delete('/api/clear', (req,res)=>{ sent=[]; notFound=[]; res.json({ok:true}); });

app.get('/api/download', (req,res)=>{
  res.header('Content-Type','text/csv');
  res.send('voterNumber,name\n'+sent.map(s=>s.voterNumber+','+s.name).join('\n'));
});

app.get('/health', (req,res)=>res.send('ok'));

app.get('/', (req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', ()=>console.log('OK on '+PORT));
