const express = require('express');
const path = require('path');
const app = express();

app.use(express.json({limit: '500mb'}));
app.use(express.static(path.join(__dirname, 'public')));

let allVoters = [];
let sentVoters = [];
let notFoundList = [];

// هەوڵدەدەین data.json بخوێنینەوە، ئەگەر نەبوو ناکەوێت
try {
  const fs = require('fs');
  const filePath = path.join(__dirname, 'public', 'data.json');
  if(fs.existsSync(filePath)){
    const raw = fs.readFileSync(filePath, 'utf8');
    allVoters = JSON.parse(raw);
    console.log('Loaded '+allVoters.length+' voters');
  }
} catch(e){
  console.log('data.json error, using empty:', e.message);
  allVoters = [];
}

app.post('/api/send', (req,res)=>{
  try{
    const num = String(req.body.voterNumber||'').trim();
    if(!num) return res.json({found:false, number:num});
    const found = allVoters.find(v => String(v.voterNumber) === num || String(v.رقم_الناخب) === num);
    if(found){
      if(!sentVoters.find(s=>String(s.voterNumber)===num)) sentVoters.push(found);
      res.json({found:true, data:[STRIPPED]
    } else {
      notFoundList.push({number:num});
      res.json({found:false, number:num});
    }
  }catch(e){ res.json({found:false, error:e.message}); }
});

app.get('/api/list', (req,res)=>{
  try{
    const families = {};
    allVoters.forEach(v=>{
      const fam = v.familyNumber || 'FAM';
      if(!families[fam]) families[fam]=[];
      families[fam].push(v);
    });
    res.json({sent:sentVoters, notFound:notFoundList, families, allCount:allVoters.length});
  }catch(e){ res.json({sent:[], notFound:[], families:{}, allCount:0}); }
});

app.get('/api/download', (req,res)=>{
  let csv = "voterNumber,name\n";
  sentVoters.forEach(v=>{ csv+=`${v.voterNumber||''},${v.name||''}\n`; });
  res.header('Content-Type','text/csv');
  res.attachment('list.csv');
  res.send(csv);
});

app.delete('/api/clear', (req,res)=>{ sentVoters=[]; notFoundList=[]; res.json({ok:true}); });

app.get('/', (req,res)=> res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Running on '+PORT));
