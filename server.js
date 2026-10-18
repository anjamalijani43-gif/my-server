const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let members = [];
let staffUsers = [{ username: 'staff', password: 'staff123' }];

// ====== HOME - دوو بەشی چوونە ژوورەوە ======
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html dir="rtl" lang="ku">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>App Anjam Jani</title>
<link rel="manifest" href="/manifest.json">
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:system-ui}
body{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;padding:20px}
.container{max-width:900px;margin:auto}
.header{text-align:center;color:white;margin:30px 0}
.header h1{font-size:32px;margin-bottom:10px}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:30px 0}
@media(max-width:600px){.cards{grid-template-columns:1fr}}
.card{background:white;border-radius:20px;padding:30px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.2);cursor:pointer;transition:0.3s;text-decoration:none;color:#333;display:block}
.card:hover{transform:translateY(-5px);box-shadow:0 15px 40px rgba(0,0,0,0.3)}
.card .icon{font-size:50px;margin-bottom:15px}
.card h2{margin-bottom:10px}
.card p{color:#666;font-size:14px}
.card.staff{border-top:5px solid #4CAF50}
.card.admin{border-top:5px solid #f44336}
.form-section{background:white;border-radius:20px;padding:30px;margin-top:30px;box-shadow:0 10px 30px rgba(0,0,0,0.2)}
.form-section h2{text-align:center;margin-bottom:20px;color:#333}
input,select{width:100%;padding:14px;margin:8px 0;border:2px solid #e0e0e0;border-radius:12px;font-size:16px;outline:none;transition:0.3s}
input:focus,select:focus{border-color:#667eea}
input.invalid{border-color:#f44336;background:#ffebee}
.error-msg{color:#f44336;font-size:12px;margin:-5px 0 5px 5px;display:none}
.error-msg.show{display:block}
.btn{width:100%;padding:15px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;border-radius:12px;font-size:18px;font-weight:bold;cursor:pointer;margin-top:15px}
.btn:hover{opacity:0.9}
.success{background:#e8f5e9;color:#2e7d32;padding:15px;border-radius:12px;text-align:center;margin-bottom:15px;display:none}
.counter{text-align:center;color:white;margin-top:20px;font-size:18px}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>📱 App Anjam Jani</h1>
    <p>سیستەمی تۆمارکردنی دەنگدەران</p>
  </div>

  <div class="cards">
    <a href="/staff-login" class="card staff">
      <div class="icon">👨‍💼</div>
      <h2>چوونە ژوورەوە بۆ کارمەند</h2>
      <p>Staff Login - بۆ کارمەندانی ئاسایی</p>
    </a>
    <a href="/admin" class="card admin">
      <div class="icon">🔐</div>
      <h2>چوونە ژوورەوە بۆ ئادمین سێرڤەر</h2>
      <p>Admin Server - کۆنترۆڵی تەواو</p>
    </a>
  </div>

  <div class="form-section">
    <h2>📝 فۆرمی تۆمارکردنی دەنگدەر</h2>
    <div id="success" class="success">✅ بە سەرکەوتوویی تۆمارکرا!</div>
    <form id="memberForm">
      <label>ناوی تەواو</label>
      <input type="text" name="name" placeholder="ناوی تەواو بنووسە" required>

      <label>ژمارەی مۆبایل</label>
      <input type="tel" name="phone" placeholder="٠٧٧٠..." required>

      <label>ژمارەی دەنگدەر (رقم الناخب) - ٨ ژمارە *</label>
      <input type="text" id="voterNumber" name="voterNumber" placeholder="مثال: 12345678" maxlength="8" pattern="\\d{8}" required inputmode="numeric">
      <div id="voterError" class="error-msg">تکایە ٨ ژمارە بنووسە - تەنها ژمارە</div>

      <label>شار</label>
      <select name="city" required>
        <option value="">شار هەڵبژێرە</option>
        <option value="کەرکوک">کەرکوک</option>
        <option value="هەولێر">هەولێر</option>
        <option value="سلێمانی">سلێمانی</option>
        <option value="دهۆک">دهۆک</option>
        <option value="بەغدا">بەغدا</option>
        <option value="مووسڵ">مووسڵ</option>
        <option value="هەڵەبجە">هەڵەبجە</option>
      </select>

      <label>تێبینی</label>
      <input type="text" name="note" placeholder="تێبینی (ئیختیاری)">

      <button type="submit" class="btn">تۆمارکردن ✅</button>
    </form>
  </div>

  <div class="counter">👥 کۆی گشتی تۆمارکراو: <span id="count">${members.length}</span></div>
</div>

<script>
const voterInput = document.getElementById('voterNumber');
const voterError = document.getElementById('voterError');

voterInput.addEventListener('input', function(){
  this.value = this.value.replace(/[^0-9]/g,'').slice(0,8);
  if(this.value.length > 0 && this.value.length !== 8){
    this.classList.add('invalid');
    voterError.classList.add('show');
    voterError.textContent = 'پێویستە ٨ ژمارە بێت - ئێستا ' + this.value.length + ' ژمارەت نووسیوە';
  } else {
    this.classList.remove('invalid');
    voterError.classList.remove('show');
  }
});

document.getElementById('memberForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const voter = voterInput.value;
  if(voter.length !== 8 || !/^\\d{8}$/.test(voter)){
    voterInput.classList.add('invalid');
    voterError.classList.add('show');
    voterError.textContent = 'تکایە ٨ ژمارەی دەنگدەر بنووسە!';
    voterInput.focus();
    return;
  }
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  const res = await fetch('/add-member',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(data)
  });
  const result = await res.json();
  if(result.success){
    document.getElementById('success').style.display='block';
    document.getElementById('count').textContent = result.total;
    e.target.reset();
    setTimeout(()=>{document.getElementById('success').style.display='none'},3000);
  } else {
    alert(result.message);
  }
});
</script>
</body>
</html>
  `);
});

// ====== STAFF LOGIN ======
app.get('/staff-login', (req, res) => {
  res.send(`
  <html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>چوونە ژوورەوە بۆ کارمەند</title>
  <style>*{box-sizing:border-box;font-family:system-ui}body{background:#e8f5e9;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
  .box{background:white;padding:40px;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.2);width:90%;max-width:400px;text-align:center}
  input{width:100%;padding:14px;margin:10px 0;border:2px solid #e0e0e0;border-radius:12px;font-size:16px}
  .btn{width:100%;padding:14px;background:#4CAF50;color:white;border:none;border-radius:12px;font-size:18px;cursor:pointer;margin-top:10px}
  a{color:#666;text-decoration:none;display:block;margin-top:15px}</style></head>
  <body><div class="box"><h2>👨‍💼 چوونە ژوورەوە بۆ کارمەند</h2>
  <form action="/staff-login" method="POST">
  <input name="username" placeholder="ناوی بەکارهێنەر: staff" required>
  <input name="password" type="password" placeholder="پاسۆرد: staff123" required>
  <button class="btn">چوونە ژوورەوە</button>
  </form><a href="/">⬅️ گەڕانەوە بۆ سەرەکی</a></div></body></html>`);
});

app.post('/staff-login', (req,res)=>{
  const {username,password} = req.body;
  const found = staffUsers.find(u=>u.username===username && u.password===password);
  if(found) res.redirect('/staff-panel');
  else res.send('<h2 style="text-align:center;margin-top:50px">❌ ناو یان پاسۆرد هەڵەیە <br><br><a href="/staff-login">گەڕانەوە</a></h2>');
});

app.get('/staff-panel', (req,res)=>{
  const rows = members.map((m,i)=>`<tr><td>${i+1}</td><td>${m.name}</td><td>${m.phone}</td><td style="font-weight:bold;letter-spacing:1px;background:#fff3e0">${m.voterNumber}</td><td>${m.city}</td><td>${m.note||''}</td></tr>`).join('');
  res.send(`
  <html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>پانێڵی کارمەند</title>
  <style>*{box-sizing:border-box;font-family:system-ui}body{margin:0;background:#f5f5f5}
  .header{background:#4CAF50;color:white;padding:20px;text-align:center}
  .container{padding:20px;max-width:1000px;margin:auto}
  table{width:100%;background:white;border-radius:12px;overflow:hidden;border-collapse:collapse;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
  th{background:#4CAF50;color:white;padding:12px}td{padding:10px;border-bottom:1px solid #eee;text-align:center}
  .btn{padding:10px 20px;background:#667eea;color:white;border-radius:8px;text-decoration:none;display:inline-block;margin:10px 5px}
  </style></head><body>
  <div class="header"><h2>👨‍💼 پانێڵی کارمەند - بینینی ئەندامان</h2><p>تەنها بینین - سڕینەوە و داگرتن نییە</p></div>
  <div class="container">
  <a href="/" class="btn">🏠 سەرەکی</a> <span>کۆی گشتی: ${members.length}</span>
  <table><tr><th>#</th><th>ناو</th><th>مۆبایل</th><th>رقم الناخب (٨ ژمارە)</th><th>شار</th><th>تێبینی</th></tr>${rows || '<tr><td colspan=6>هیچ ئەندامێک نییە</td></tr>'}</table>
  </div></body></html>`);
});

// ====== ADMIN LOGIN ======
app.get('/admin', (req,res)=>{
  res.send(`
  <html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>چوونە ژوورەوە بۆ ئادمین سێرڤەر</title>
  <style>*{box-sizing:border-box;font-family:system-ui}body{background:#ffebee;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
  .box{background:white;padding:40px;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.2);width:90%;max-width:400px;text-align:center}
  input{width:100%;padding:14px;margin:10px 0;border:2px solid #e0e0e0;border-radius:12px;font-size:16px}
  .btn{width:100%;padding:14px;background:#f44336;color:white;border:none;border-radius:12px;font-size:18px;cursor:pointer;margin-top:10px}
  a{color:#666;text-decoration:none;display:block;margin-top:15px}</style></head>
  <body><div class="box"><h2>🔐 چوونە ژوورەوە بۆ ئادمین سێرڤەر</h2><p style="color:#666;font-size:13px">تەنها بۆ بەڕێوەبەری سێرڤەر</p>
  <form action="/admin-login" method="POST">
  <input name="username" placeholder="ناوی بەکارهێنەر: Anjam" required>
  <input name="password" type="password" placeholder="پاسۆرد: Anjam123" required>
  <button class="btn">چوونە ژوورەوە بۆ سێرڤەر</button>
  </form><a href="/">⬅️ گەڕانەوە بۆ سەرەکی</a></div></body></html>`);
});

app.post('/admin-login', (req,res)=>{
  const {username,password}=req.body;
  if(username==='Anjam' && password==='Anjam123') res.redirect('/admin-panel');
  else res.send('<h2 style="text-align:center;margin-top:50px">❌ ناو یان پاسۆرد هەڵەیە <br><br><a href="/admin">گەڕانەوە</a></h2>');
});

app.get('/admin-panel', (req,res)=>{
  const rows = members.map((m,i)=>`<tr><td>${i+1}</td><td>${m.name}</td><td>${m.phone}</td><td style="font-weight:bold;background:#ffebee;color:#c62828;letter-spacing:2px;font-size:18px">${m.voterNumber}</td><td>${m.city}</td><td>${m.note||''}</td><td><button onclick="del(${i})" style="background:#f44336;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer">❌</button></td></tr>`).join('');
  res.send(`
  <html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>ئادمین سێرڤەر - فول سکرین</title>
  <style>*{box-sizing:border-box;font-family:system-ui}body{margin:0;background:#121212;color:white}
  .header{background:#1e1e1e;padding:15px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;position:sticky;top:0;z-index:10}
  .header h2{margin:0}
  .actions{display:flex;gap:10px;flex-wrap:wrap}
  .btn{padding:10px 16px;border:none;border-radius:8px;cursor:pointer;font-weight:bold;text-decoration:none;display:inline-block}
  .btn-green{background:#4CAF50;color:white}.btn-blue{background:#2196F3;color:white}.btn-red{background:#f44336;color:white}.btn-orange{background:#FF9800;color:white}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;padding:20px}
  .stat{background:#1e1e1e;padding:20px;border-radius:12px;text-align:center}
  .stat h3{color:#888;font-size:14px}.stat p{font-size:28px;font-weight:bold;margin:10px 0}
  table{width:100%;background:#1e1e1e;border-collapse:collapse;margin:0 20px;width:calc(100% - 40px);border-radius:12px;overflow:hidden}
  th{background:#333;padding:14px;color:#aaa}td{padding:12px;border-bottom:1px solid #333;text-align:center}
  input.search{width:calc(100% - 40px);margin:0 20px 20px;padding:12px;border-radius:8px;border:1px solid #333;background:#1e1e1e;color:white}
  </style></head><body>
  <div class="header">
    <h2>🔐 ئادمین سێرڤەر - فول سکرین</h2>
    <div class="actions">
      <button onclick="location.reload()" class="btn btn-orange">🔄 تازەکردنەوەی سێرڤەر</button>
      <a href="/export" class="btn btn-green">📥 داگرتنی Excel</a>
      <button onclick="if(confirm('دڵنیای هەموو داتا دەسڕیتەوە؟')){fetch('/clear',{method:'POST'}).then(()=>location.reload())}" class="btn btn-red">🗑️ سڕینەوەی هەموو</button>
      <a href="/" class="btn btn-blue">🏠 سەرەکی</a>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><h3>کۆی ئەندامان</h3><p>${members.length}</p></div>
    <div class="stat"><h3>ژمارەی دەنگدەر تۆمارکراو</h3><p style="color:#4CAF50">${members.filter(m=>m.voterNumber).length}</p></div>
    <div class="stat"><h3>سێرڤەر</h3><p style="color:#4CAF50;font-size:16px">ONLINE ✅<br><small style="font-size:12px;color:#888">29 days / $4.93</small></p></div>
  </div>
  <input class="search" id="search" placeholder="🔍 گەڕان بە ناو، مۆبایل، رقم الناخب ٨ ژمارەیی..." oninput="filterTable()">
  <table id="tbl"><tr><th>#</th><th>ناو</th><th>مۆبایل</th><th>رقم الناخب (٨ ژمارە)</th><th>شار</th><th>تێبینی</th><th>سڕینەوە</th></tr>${rows || '<tr><td colspan=7>هیچ ئەندامێک نییە</td></tr>'}</table>
  <script>
  function del(i){if(confirm('دڵنیای دەیسڕیتەوە؟')){fetch('/delete/'+i,{method:'POST'}).then(()=>location.reload())}}
  function filterTable(){
    const q=document.getElementById('search').value.toLowerCase();
    const rows=document.querySelectorAll('#tbl tr');
    for(let j=1;j<rows.length;j++){
      rows[j].style.display=rows[j].textContent.toLowerCase().includes(q)?'':'none';
    }
  }
  </script>
  </body></html>`);
});

// ====== API ======
app.post('/add-member', (req,res)=>{
  const {name,phone,voterNumber,city,note}=req.body;
  if(!voterNumber || !/^\\d{8}$/.test(voterNumber)){
    return res.json({success:false,message:'رقم الناخب دەبێت ٨ ژمارە بێت!'});
  }
  if(members.find(m=>m.voterNumber===voterNumber)){
    return res.json({success:false,message:'ئەم ژمارە دەنگدەرە پێشتر تۆمارکراوە!'});
  }
  members.push({name,phone,voterNumber,city,note,date:new Date().toLocaleString('ku')});
  res.json({success:true,total:members.length});
});

app.post('/delete/:id', (req,res)=>{ members.splice(req.params.id,1); res.json({success:true}); });
app.post('/clear', (req,res)=>{ members=[]; res.json({success:true}); });

app.get('/export', (req,res)=>{
  let csv = 'ID,Name,Phone,VoterNumber_8digits,City,Note,Date\\n';
  members.forEach((m,i)=>{ csv += \`\${i+1},"\${m.name}","\${m.phone}","\${m.voterNumber}","\${m.city}","\${m.note||''}","\${m.date}"\\n\`; });
  res.header('Content-Type','text/csv; charset=utf-8');
  res.attachment('App-Anjam-Jani-voter-8digits.csv');
  res.send('\\uFEFF'+csv);
});

app.get('/manifest.json',(req,res)=>{ res.json({name:"App Anjam Jani",short_name:"AnjamJani",start_url:"/",display:"standalone",background_color:"#667eea",theme_color:"#764ba2",icons:[{src:"https://cdn-icons-png.flaticon.com/512/3135/3135715.png",sizes:"512x512",type:"image/png"}]}); });

app.listen(PORT, ()=> console.log('Server running on '+PORT));
