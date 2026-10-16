const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.json({limit: '100mb'}));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
let members = [];
let masterList = [];
let masterMap = new Map();
const ADMIN_PASSWORD = "kirkuk123";

// ===== واجیهەی سەرەکی جوانی هەڵبژاردن =====
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html dir="rtl" lang="ku">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>هەڵبژاردن - کەرکوک | Kirkuk Election</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Noto Kufi Arabic', sans-serif;}
body{background:#0a0e27;overflow-x:hidden;color:#fff;}
.hero{
  min-height:100vh;
  background: linear-gradient(135deg, #0a0e27 0%, #1a237e 50%, #0f172a 100%);
  position:relative;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
}
.hero::before{
  content:'';
  position:absolute;
  top:0;left:0;right:0;bottom:0;
  background: url('https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=1200') center/cover;
  opacity:0.15;
}
.hero-content{
  position:relative;
  z-index:2;
  max-width:1100px;
  width:100%;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:40px;
  align-items:center;
}
@media(max-width:768px){.hero-content{grid-template-columns:1fr;text-align:center;}}
.logo-area h1{
  font-size:48px;
  font-weight:700;
  background: linear-gradient(90deg, #ffd700, #fff);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  line-height:1.2;
  margin-bottom:15px;
}
.logo-area .subtitle{
  font-size:22px;
  color:#a5b4fc;
  margin-bottom:10px;
}
.logo-area .desc{
  font-size:15px;
  color:#94a3b8;
  line-height:1.8;
  margin-bottom:30px;
}
.ballot-box{
  font-size:120px;
  text-align:center;
  animation: float 3s ease-in-out infinite;
}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-15px)}}
.cards{display:grid;gap:20px;}
.card{
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(20px);
  border:1px solid rgba(255,255,255,0.15);
  border-radius:20px;
  padding:25px;
  transition: all 0.3s;
  cursor:pointer;
  text-decoration:none;
  display:block;
}
.card:hover{
  transform:translateY(-5px);
  background: rgba(255,255,255,0.12);
  border-color: #ffd700;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}
.card .icon{font-size:40px;margin-bottom:15px;}
.card h3{font-size:20px;margin-bottom:8px;color:#fff;}
.card p{font-size:13px;color:#cbd5e1;line-height:1.6;}
.card .btn{
  margin-top:15px;
  display:inline-block;
  padding:12px 25px;
  border-radius:50px;
  font-weight:bold;
  font-size:14px;
  text-decoration:none;
}
.btn-gold{background: linear-gradient(90deg, #ffd700, #ffed4e);color:#000;}
.btn-blue{background: linear-gradient(90deg, #1a237e, #3949ab);color:#fff;}
.btn-green{background: linear-gradient(90deg, #0f9d58, #34d399);color:#fff;}
.stats{
  display:flex;
  gap:15px;
  margin-top:25px;
  flex-wrap:wrap;
}
.stat{
  background: rgba(0,0,0,0.3);
  padding:12px 20px;
  border-radius:50px;
  font-size:13px;
  border:1px solid rgba(255,255,255,0.1);
}
.stat span{color:#ffd700;font-weight:bold;}
.footer{
  position:absolute;
  bottom:15px;
  left:0;right:0;
  text-align:center;
  font-size:11px;
  color:#64748b;
  z-index:2;
}
.pulse{
  display:inline-block;
  width:10px;height:10px;
  background:#22c55e;
  border-radius:50%;
  animation: pulse 2s infinite;
  margin-left:8px;
}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,0.7)}70%{box-shadow:0 0 0 10px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
</style>
</head>
<body>
<div class="hero">
  <div class="hero-content">
    <div class="logo-area">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <div class="pulse"></div>
        <span style="font-size:13px;color:#22c55e;">سیستەم چالاکە - Live System</span>
      </div>
      <h1>هەڵبژاردنی<br>کەرکوک ٢٠٢٤</h1>
      <div class="subtitle">Kirkuk Election System</div>
      <div class="desc">
        سیستەمی تۆمارکردنی دەنگدەرانی پارێزگای کەرکوک<br>
        بە شێوەیەکی پارێزراو و نهێنی - ١ ملیۆن دەنگدەر<br>
        ژمارەی دەنگدەر (رقم الناخب) بنەمای سەرەکییە
      </div>
      <div class="stats">
        <div class="stat">📊 لیستی سەرەکی: <span id="m1">0</span></div>
        <div class="stat">✅ تۆمارکراو: <span id="m2">0</span></div>
        <div class="stat">🟢 لە لیست: <span id="m3">0</span></div>
      </div>
    </div>
    
    <div class="cards">
      <a href="/form" class="card">
        <div class="icon">🗳️</div>
        <h3>تۆمارکردنی دەنگدەر</h3>
        <p>فۆڕمی فەرمی تۆمارکردن - ژمارەی دەنگدەر (رقم الناخب) پێویستە، خۆکار دەڵێت لە لیستەکە هەیە یان نا</p>
        <div class="btn btn-gold">➡️ چوونە فۆڕم</div>
      </a>
      
      <a href="/admin?pass=kirkuk123" class="card">
        <div class="icon">🔐</div>
        <h3>پانێڵی ئەدمین</h3>
        <p>تەنها بۆ بەڕێوەبەر - بارکردنی لیستی ١ ملیۆن، بینینی سەوزەکان، داگرتن وەک Excel</p>
        <div class="btn btn-blue">🔑 چوونە ژوورەوە</div>
      </a>
      
      <div class="card" style="background: rgba(15,157,88,0.15); border-color: rgba(34,197,94,0.3);">
        <div class="icon">📍</div>
        <h3>سیستەمی پارێزراو</h3>
        <p>✅ شوێن و کات تۆمار دەکرێت ✅ ژمارەی دەنگدەر بە سەوزی ✅ ١ ملیۆن هەڵدەگرێت ✅ نهێنی</p>
        <div style="margin-top:10px; font-size:12px; color:#86efac;">🟢 سیستەم ئامادەیە بۆ هەڵبژاردن</div>
      </div>
    </div>
  </div>
  <div class="footer">© 2024 هەڵبژاردنی کەرکوک - پارێزراو و نهێنی | Kirkuk Election System</div>
</div>

<script>
async function loadStats(){
  try{
    const res=await fetch('/api/counts?pass=kirkuk123');
    const data=await res.json();
    document.getElementById('m1').innerText=data.master?.toLocaleString()||'0';
    document.getElementById('m2').innerText=data.members?.toLocaleString()||'0';
    document.getElementById('m3').innerText=data.green?.toLocaleString()||'0';
  }catch(e){}
}
loadStats();
setInterval(loadStats,5000);
</script>
</body>
</html>
`);
});

// فۆڕمەکە - ئێستا لە /form
app.get('/form', (req, res) => {
  res.send(`
<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>فۆڕم</title><style>
body{background: linear-gradient(135deg, #0a0e27, #1a237e);margin:0;padding:15px;font-family:sans-serif;min-height:100vh}
.card{background:#fff;max-width:500px;margin:30px auto;padding:25px;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.4)}
h2{text-align:center;color:#1a237e}input{width:100%;padding:14px;margin:10px 0;border:1px solid #ddd;border-radius:12px;font-size:16px;box-sizing:border-box}
.btn{width:100%;padding:14px;border:none;border-radius:12px;font-size:17px;font-weight:bold;cursor:pointer;color:#fff;background:linear-gradient(90deg,#1a237e,#3949ab)}
.voter{border:3px solid #22c55e !important;background:#f0fdf4 !important;font-weight:bold;font-size:18px !important;text-align:center}
.success{background:#dcfce7;color:#166534;padding:15px;border-radius:12px;text-align:center;margin-top:15px;display
