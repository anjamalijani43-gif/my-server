const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));
app.use(express.static(__dirname)); // بۆ ئەوەی ئەگەر index.html لە ڕووت بوو هەر کار بکات

const STAFF_USERS = {
  "admin": "Anjam1234",
  "anjam": "jiani123"
};

function normalizeData(data) {
  let city = data.city || data.shar || data.cityName || "";
  let mobile = data.mobile || data.phone || "";
  if (city && (String(city).match(/^9647/) || String(city).match(/^\d{12,13}$/))) {
    if (!mobile) mobile = city;
    city = "کەرکوک";
  }
  if (mobile) {
    mobile = String(mobile).replace(/\s/g, '');
    if (mobile.startsWith('964')) mobile = '0' + mobile.substring(3);
    if (mobile.startsWith('77')) mobile = '0' + mobile;
  }
  return { ...data, city: city || "کەرکوک", mobile };
}

app.post('/api/voter', (req, res) => {
  let data = normalizeData(req.body);
  res.json({ success: true, name: data.name || data.voterName, city: data.city, mobile: data.mobile });
});

app.post('/api/staff/login', (req, res) => {
  const { username, password } = req.body;
  if (STAFF_USERS[username] && STAFF_USERS[username] === password) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "یوزەر یان پاسوۆرد هەڵەیە" });
  }
});

let namesList = [];
let isLoading = false;

app.post('/api/upload-names', async (req, res) => {
  const { names, isLast } = req.body;
  if (!isLoading) { namesList = []; isLoading = true; }
  if (names && Array.isArray(names)) namesList.push(...names);
  console.log(`بارکرا: ${namesList.length}`);
  if (isLast) {
    isLoading = false;
    try { fs.writeFileSync('names_backup.json', JSON.stringify(namesList.slice(0,5000))); } catch(e){}
    res.json({ success: true, total: namesList.length, message: `تەواو بوو: ${namesList.length}` });
  } else {
    res.json({ success: true, total: namesList.length });
  }
});

app.get('/api/names/count', (req, res) => {
  res.json({ total: namesList.length });
});

// ئەمە چارەسەری کێشەی Not Found ەکەیە
app.get('/', (req, res) => {
  const publicPath = path.join(__dirname, 'public', 'index.html');
  const rootPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(publicPath)) {
    res.sendFile(publicPath);
  } else if (fs.existsSync(rootPath)) {
    res.sendFile(rootPath);
  } else {
    res.send(`
      <h1 style="text-align:center">سێرڤەر کار دەکات بەڵام index.html نیە</h1>
      <p style="text-align:center">تکایە فایلی public/index.html دروست بکە</p>
      <p style="text-align:center">یوزەر: admin / پاسوۆرد: Anjam1234</p>
    `);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
