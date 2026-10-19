const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let allVoters = [];
let sentVoters = [];
let notFoundList = [];

try {
  const fs = require('fs');
  const fp = path.join(__dirname, 'public', 'data.json');
  if (fs.existsSync(fp)) {
    allVoters = JSON.parse(fs.readFileSync(fp, 'utf8'));
  }
} catch(e){ allVoters = []; }

app.get('/health', (req,res)=>res.send('ok'));

app.post('/api/send', (req,res)=>{
  const num = String(req.body.voterNumber||'').trim();
  const found = allVoters.find(v=>String(v.voterNumber)===num);
  if(found){
    if(!sentVoters.find(s=>String(s.voterNumber)===num)) sentVoters.push(found);
    res.json({found:true, data:[STRIPPED]
  } else {
    notFoundList.push({number:num});
    res.json({found:false, number:num, note:"ئەم ژمارەیە لەو لیستەی تۆ نییە کە لە سێرڤەرەکە هەتە"});
  }
});

app.get('/api/list', (req,res)=>{
  const families = {};
  allVoters.forEach(v=>{
    const fam = v.familyNumber || 'FAM';
    if(!families[fam]) families[fam]=[];
    families[fam].push(v);
  });
  res.json({sent:sentVoters, notFound:notFoundList, families, allCount: allVoters.length});
});

app.get('/api/download', (req,res)=>{
  let csv="voterNumber,name,familyNumber\n";
  sentVoters.forEach(v=>csv+=`${v.voterNumber},${v.name},${v.familyNumber}\n`);
  res.header('Content-Type','text/csv');
  res.attachment('list.csv');
  res.send(csv);
});

app.delete('/api/clear', (req,res)=>{ sentVoters=[]; notFoundList=[]; res.json({ok:true}); });

app.get('/', (req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

// گرنگ: دەبێت لەسەر 0.0.0.0 گوێ بگرێت بۆ Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', ()=>console.log('Running on '+PORT));
