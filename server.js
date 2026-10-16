const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const DB_FILE = 'data.json';
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

app.get('/api/data', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_FILE));
  res.json(data);
});

app.post('/api/data', (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_FILE));
  const newItem = { id: Date.now(), ...req.body, time: new Date().toLocaleString() };
  data.push(newItem);
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  res.json({ success: true });
});

app.delete('/api/data/:id', (req, res) => {
  let data = JSON.parse(fs.readFileSync(DB_FILE));
  data = data.filter(item => item.id != req.params.id);
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  res.json({ success: true });
});

const PORT = process.env.PORT||3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});