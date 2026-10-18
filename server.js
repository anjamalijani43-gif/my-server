const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// ===== ١. یوزەر و پاسوۆردی کارمەند - لێرە بیگۆڕە =====
const STAFF_USERS = {
  "admin": "Anjam1234",      // یوزەر: admin , پاسوۆرد: Anjam1234
  "anjam": "jiani123"        // یوزەر: anjam , پاسوۆرد: jiani123
};

// ===== ٢. چاککردنی کێشەی شار و مۆبایل =====
function normalizeData(data) {
  let city = data.city || data.shar || "";
  let mobile = data.mobile || data.phone || "";

  // ئەگەر بە هەڵە ژمارە مۆبایل چووبێتە ناو شاریەوە
  if (city && city.toString().match(/^9647/) || city.toString().match(/^\d{12,13}$/)) {
    if (!mobile) mobile = city;
    city = ""; // با بەتاڵ بێت تا لە فڕۆنت ئێند خۆی شارەکە وەربگرێت
  }

  // ڕێکخستنی ژمارە مۆبایل بۆ 077x
  if (mobile) {
    mobile = mobile.toString().replace(/\s/g, '');
    if (mobile.startsWith('964')) {
      mobile = '0' + mobile.substring(3);
    }
    if (!mobile.startsWith('07')) {
      // ئەگەر بە 77 دەست پێ بکات
      if(mobile.startsWith('77')) mobile = '0'+mobile;
    }
  }

  return { ...data, city, mobile };
}

app.post('/api/voter', (req, res) => {
  let data = normalizeData(req.body);
  // لێرەدا دەتوانی لە داتابەیس بپشکنی
  // بۆ نموونە: نسرین بشیر فوزی - 19503975
  res.json({
    success: true,
    name: data.name,
    city: data.city || "کەرکوک", // ئەگەر خاڵی بوو
    mobile: data.mobile
  });
});

// ===== ٣. لۆگینی کارمەند =====
app.post('/api/staff/login', (req, res) => {
  const { username, password } = req.body;
  if (STAFF_USERS[username] && STAFF_USERS[username] === password) {
    res.json({ success: true, message: "سەرکەوتوو بوو" });
  } else {
    res.status(401).json({ success: false, message: "یوزەر یان پاسوۆرد هەڵەیە" });
  }
});

// ===== ٤. چارەسەری لیستی ١ ملیۆن ناو - بە پارچە پارچە =====
// کۆنەکە هەمووی لە یەک جار بار دەکرد و Railway دەیوەستاند
let namesList = [];
let isLoading = false;

app.post('/api/upload-names', async (req, res) => {
  // بۆ لیستی گەورە، بە فایلی CSV یان JSON بنێرە
  const { names, chunk, isLast } = req.body;

  if (!isLoading) {
    namesList = [];
    isLoading = true;
  }

  if (names && Array.isArray(names)) {
    namesList.push(...names);
  }

  console.log(`بارکرا: ${namesList.length} ناو`);

  if (isLast) {
    isLoading = false;
    // لێرەدا لە فایلێک پاشەکەوت بکە بۆ ئەوەی لە بیر نەچێت
    fs.writeFileSync('names_backup.json', JSON.stringify(namesList.slice(0, 10000))); // تەنها نموونە
    res.json({ success: true, total: namesList.length, message: `تەواو بوو: ${namesList.length} ناو بارکرا` });
  } else {
    res.json({ success: true, total: namesList.length, message: `بارکرا ${namesList.length} - پارچەی داهاتوو بنێرە`, nextChunk: chunk ? chunk + 1 : 1 });
  }
});

app.get('/api/names/count', (req, res) => {
  res.json({ total: namesList.length });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
