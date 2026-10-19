const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));
app.use(express.static(__dirname));

// ئەمە گرنگە بۆ Not Found
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  res.send('OK - Server is working');
});

// ئەگەر data.json هەبێت
let members = [];
try{
  members = require('./data.json');
}catch(e){}

app.get('/api/members', (req,res)=> res.json(members));
app.post('/api/members', (req,res)=>{
  members.push(req.body);
  res.json({ok:true});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Server running on '+PORT));
