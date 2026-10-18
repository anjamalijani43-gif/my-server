const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===== یوزەر و پاسوۆردی کارمەند =====
const STAFF_USERS = {
  "admin": "Anjam1234",
  "anjam": "jiani123"
};

function normalizeData(data) {
  let city = data.city || data.shar || "";
  let mobile = data.mobile || data.phone || "";
  if (city && (city.toString().match(/^9647/) || city.toString().match(/^\d{12,13}$/))) {
    if (!mobile) mobile = city;
    city = "";
  }
  if (mobile) {
    mobile = mobile.toString().replace(/\s/g, '');
    if (mobile.startsWith('964')) mobile = '0' + mobile.substring(3);
    if (mobile.startsWith('77')) mobile = '0'+mobile;
  }
  return { ...data, city, mobile };
}

// Public folder - if not exists, create
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

app.use(express.static(publicDir));
app.use(express.static(__dirname)); // fallback

app.post('/api/voter', (req, res) => {
  let data = normalizeData(req.body);
  res.json({ success: true, name: data.name, city: data.city || "کەرکوک", mobile: data.mobile });
});

app.post('/api/staff/login', (req, res) => {
  const { username, password } = req.body;
  if (STAFF_USERS[username] && STAFF_USERS[username] === password) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "یوزەر یان پاسوۆرد هەڵەیە - admin / Anjam1234 تاقی بکەرەوە" });
  }
});

let namesList = [];
app.post('/api/upload-names', (req, res) => {
  const { names, isLast } = req.body;
  if (names && Array.isArray(names)) namesList.push(...names);
  if (isLast) {
    res.json({ success: true, total: namesList.length, message: `تەواو بوو: ${namesList.length} ناو بارکرا` });
  } else {
    res.json({ success: true, total: namesList.length });
  }
});

app.get('/api/names/count', (req, res) => res.json({ total: namesList.length }));

// ===== ئەمە چارەسەری Not Found =====
app.get('*', (req, res) => {
  const indexInPublic = path.join(publicDir, 'index.html');
  const indexInRoot = path.join(__dirname, 'index.html');
  const indexHtml = path.join(__dirname, 'public', 'index.html');
  
  if (fs.existsSync(indexInPublic)) return res.sendFile(indexInPublic);
  if (fs.existsSync(indexInRoot)) return res.sendFile(indexInRoot);
  if (fs.existsSync(indexHtml)) return res.sendFile(indexHtml);
  
  // ئەگەر هیچ فایلێک نەبوو، ئەم پەیجە سادەیە پیشان بدە تا Not Found نەدات
  res.send(`
    <h1>سێرڤەر کار دەکات - Anjam Jani App</h1>
    <p>فایلی public/index.html نیە. تکایە دروستی بکە.</p>
    <p>Admin: admin / Anjam1234</p>
    <p><a href="/api/names/count">API کار دەکات</a></p>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
