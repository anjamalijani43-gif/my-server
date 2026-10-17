const express = require('express');
const app = express();
app.use(express.json({limit:'100mb'}));
let master={},green=[];
app.get('/',(q,r)=>r.send('ok <a href="/m">/m</a>'));
app.get('/m',(q,r)=>r.send('m is working - <a href="/stats">stats</a>'));
app.get('/stats',(q,r)=>r.json({m:Object.keys(master).length,g:green.length}));
app.post('/add',(q,r)=>{
let v=(q.body.voter||'').toString().replace(/\D/g,'');
if(!v)return r.json({ok:false});
green.push({voter:v});
r.json({ok:true});
});
app.listen(process.env.PORT||8080,'0.0.0.0',()=>console.log('up'));
