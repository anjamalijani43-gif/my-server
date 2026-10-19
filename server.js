const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let sentVoters = []; // لێرە هەڵدەگیرێت

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/send', (req, res) => {
  sentVoters.push(req.body);
  console.log('نێردرا:', req.body);
  res.json({ok:true});
});

app.get('/api/list', (req, res) => {
  res.json(sentVoters);
});

app.delete('/api/clear', (req,res)=>{
  sentVoters=[];
  res.json({ok:true});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Server on '+PORT));
