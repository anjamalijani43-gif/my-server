const express = require('express');
const app = express();
app.use(express.static('public'));
app.get('/health', (req,res)=>res.send('ok'));
app.get('/', (req,res)=>res.send('<h1>Server UP ✅</h1><a href="/admin.html">Admin</a>'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', ()=>console.log('UP '+PORT));
