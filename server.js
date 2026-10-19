const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json({limit:'500mb'}));
app.use(express.static('public'));
let sent=[];
function getFiles(){try{return fs.readdirSync('public').filter(f=>f.startsWith('data')&&f.endsWith('.json')).sort()}catch(e){return []}}
function findNum(n){n=String(n).trim();for(let f of getFiles()){try{let j=JSON.parse(fs.readFileSync(path.join('public',f),'utf8'));let fd=j.find(d=>String(d.voterNumber).trim()===n);if(fd)return fd}catch(e){}}return null}
function loadAll(){let a=[];for(let f of getFiles()){try{a=a.concat(JSON.parse(fs.readFileSync(path.join('public',f),'utf8')))}catch(e){}}return a}
app.post('/api/upload-json',(req,res)=>{try{let inc=req.body.data;if(!Array.isArray(inc))return res.status(400).json({error:'array'});let ex=loadAll();let m=new Map();[...ex,...inc].forEach(o=>{if(o.voterNumber)m.set(String(o.voterNumber).trim(),o)});let fin=Array.from(m.values());for(let f of getFiles()){try{fs.unlinkSync(path.join('public',f))}catch(e){}}let CH=150000;for(let i=0;i<fin.length;i+=CH){fs.writeFileSync(path.join('public',`data${Math.floor(i/CH)+1}.json`),JSON.stringify(fin.slice(i,i+CH)))}if(fin.length===0)fs.writeFileSync('public/data.json','[]');res.json({ok:true,added:inc.length,total:fin.length})}catch(e){res.status(500).json({error:e.message})}});
app.post('/api/send',(req,res)=>{let f=findNum(req.body.voterNumber);if(f){sent.push(f);res.json({found:true,data:f})}else res.json({found:false})});
app.get('/api/list',(req,res)=>{res.json({allCount:loadAll().length,sent})});
app.delete('/api/clear',(req,res)=>{sent=[];res.json({ok:true})});
app.get('/health',(req,res)=>res.send('ok'));
app.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('UP'));
