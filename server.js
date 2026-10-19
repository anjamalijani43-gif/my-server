const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(express.json({limit: '500mb'}));
app.use(express.static(path.join(__dirname, 'public')));

let allVoters = [];
let sentVoters = [];
let notFoundList = [];

// بارکردنی data.json
try {
  const data = fs.readFileSync(path.join(__dirname, 'public', 'data.json'), 'utf8');
  allVoters = JSON.parse(data);
  console.log('Loaded', allVoters.length, 'voters');
} catch(e){ console.log('data.json not found, will be empty'); }

app.post('/api/send', (req, res) => {
  const num = String(req.body.voterNumber || req.body.number || '').trim();
  if(!num) return res.json({ok:false});

  const found = allVoters.find(v => String(v.voterNumber||v.رقم_الناخب) === num);
  
  if(found){
    if(!sentVoters.find(s=>String(s.voterNumber)===num)){
      sentVoters.push({...found, sentAt: new Date()});
    }
    res.json({found:true, data:found});
  } else {
    notFoundList.push({number:num, date: new Date()});
    res.json({found:false, number:num, note: "ئەم ژمارەیە لەو لیستەی تۆ نییە کە لە سێرڤەرەکە هەتە"});
  }
});

app.get('/api/list', (req,res)=>{
  // گروپکردنی خێزان
  const families = {};
  allVoters.forEach(v=>{
    const fam = v.familyNumber || v.رقم_العائلي || 'unknown';
    if(!families[fam]) families[fam]=[];
    families[fam].push(v);
  });
  res.json({sent: sentVoters, notFound: notFoundList, families, allCount: allVoters.length});
});

app.get('/api/download', (req,res)=>{
  const csv = ["رقم الناخب,اسم الناخب,مواليد,رقم العائلي,رقم مركز التسجيل,اسم مركز التسجيل,رقم مركز الاقتراع,اسم مركز الاقتراع,عنوان مركز الاقتراع,رقم الهاتف"];
  sentVoters.forEach(v=>{
    csv.push([v.voterNumber||v.رقم_الناخب, v.name||v.اسم_الناخب, v.birth||v.مواليد, v.familyNumber||v.رقم_العائلي, v.regCenterNumber||v.رقم_مركز_التسجيل, v.regCenterName||v.اسم_مركز_التسجيل, v.pollCenterNumber||v.رقم_مركز_
