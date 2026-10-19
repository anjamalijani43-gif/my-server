const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('public')) fs.mkdirSync('public');

let sent = [];
let notFound = [];

function loadData() {
  try {
    const p = path.join(__dirname, 'public', 'data.json');
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    }
  } catch(e){ console.log('data.json error', e.message); }
  return [];
}

// Excel to JSON converter inside server
app.post('/api/upload', upload.single('file'), (req,res)=>{
  try{
    if(!req.file) return res.status(400).json({error:'no file'});
    const wb = XLSX.readFile(req.file.path);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, {defval:''});
    
    const mapped = rows.map(r=>{
      // auto detect columns
      const keys = Object.keys(r);
      const get = (names)=>{
        for(let n of names){
          for(let k of keys){
            if(k.toLowerCase().includes(n.toLowerCase())) return r[k];
          }
        }
        return '';
      };
      return {
        voterNumber: String(get(['رقم الناخب','voter','رقم'])||r[keys[0]]||'').trim(),
        name: String(get(['اسم الناخب','الاسم','name'])||r[keys[1]]||'').trim(),
        birth: String(get(['مواليد','birth','سنة'])||'').trim(),
        familyNumber: String(get(['العائلي','family'])||'').trim(),
        regCenterNumber: String(get(['مركز التسجيل','تسجيل'])||'').trim(),
        regCenterName: String(get(['اسم مركز التسجيل'])||'').trim(),
        pollCenterNumber: String(get(['مركز الاقتراع','اقتراع'])||'').trim(),
        pollCenterName: String(get(['اسم مركز الاقتراع'])||'').trim(),
        pollCenterAddress: String(get(['عنوان','address'])||'').trim(),
        phone: String(get(['هاتف','phone','موبايل'])||'').trim()
      };
    }).filter(x=>x.voterNumber);

    const dataPath = path.join(__dirname,'public','data.json');
    let existing = [];
    try{ existing = JSON.parse(fs.readFileSync(dataPath,'utf8')); }catch(e){}
    if(!Array.isArray(existing)) existing = [];
    
    // merge (avoid duplicates by voterNumber)
    const map = new Map();
    [...existing, ...mapped].forEach(o=> map.set(o.voterNumber, o));
    const finalData = Array.from(map.values());
    
    fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2), 'utf8');
    fs.unlinkSync(req.file.path);
    res.json({ok:true, added: mapped.length, total: finalData.length});
  }catch(e){
    console.error(e);
    res.status(500).json({error:e.message});
  }
});

app.post('/api/send', (req,res)=>{
  const data = loadData();
  const num = String(req.body.voterNumber||'').trim();
  const found = data.find(d=> String(d.voterNumber).trim()===num);
  if(found){
    sent.push({...found, time:new Date()});
    res.json({found:true, data:[STRIPPED]
  }else{
    notFound.push({voterNumber:num, time:new Date()});
    res.json({found:false});
  }
});

app.get('/api/list', (req,res)=>{
  const data = loadData();
  const families={};
  sent.forEach(s=>{
    const f=s.familyNumber||'unknown';
    if(!families[f]) families[f]=[];
    families[f].push(s);
  });
  res.json({sent, notFound, families, allCount: data.length});
});

app.delete('/api/clear', (req,res)=>{ sent=[]; notFound=[]; res.json({ok:true}); });
app.get('/health', (req,res)=>res.send('ok'));
app.get('/', (req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', ()=>console.log('Server OK on '+PORT));
