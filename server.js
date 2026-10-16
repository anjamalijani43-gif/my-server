const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
let members = [];
const ADMIN_PASSWORD = "kirkuk123"; // پاسۆردی تۆ - دەتوانی بیگۆڕی

// لاپەڕەی ئەندامان - تەنها زیادکردن، بێ لیست
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>فۆڕمی دەنگدەر</title><style>
body{background:#f0f2f5;margin:0;padding:15px;font-family:sans-serif}
.card{background:#fff;max-width:500px;margin:30px auto;padding:25px;border-radius:15px;box-shadow:0 2px 15px rgba(0,0,0,0.1)}
h2{text-align:center;color:#1a237e}
input{width:100%;padding:14px;margin:10px 0;border:1px solid #ddd;border-radius:10px;font-size:16px;box-sizing:border-box}
.btn{width:100%;padding:14px;border:none;border-radius:10px;font-size:17px;font-weight:bold;cursor:pointer;color:#fff}
.blue{background:#1a237e}
.voter{border:3px solid #28a745 !important;background:#e8f5e9 !important;font-weight:bold;}
.success{background:#d4edda;color:#155724;padding:15px;border-radius:10px;text-align:center;margin-top:15px;display:none;}
</style></head><body>
<div class="card">
<h2>🗳️ فۆڕمی تۆمارکردنی دەنگدەر</h2>
<p style="text-align:center;color:#666;font-size:14px;">تکایە زانیارییەکانت بە دروستی داخل بکە</p>
<input id="name" placeholder="ناوی تەواو">
<input id="voter" class="voter" placeholder="ژمارەی دەنگدەر (رقم الناخب) * پێویستە">
<input id="phone" placeholder="ژمارەی مۆبایل - 0770...">
<input id="city" placeholder="شار - کەرکوک">
<input id="note" placeholder="تێبینی (ئارەزوومەندانە)">
<p id="locStatus" style="font-size:11px;color:#888;text-align:center;">📍 شوێن: وەردەگیرێت...</p>
<button class="btn blue" onclick="addMember()">✅ ناردن</button>
<div id="success" class="success">✅ سوپاس! زانیارییەکەت بە سەرکەوتوویی نێردرا</div>
</div>
<script>
let currentLocation="نەزانراو";let lat="";let lng="";
if(navigator.geolocation){navigator.geolocation.getCurrentPosition(p=>{lat=p.coords.latitude;lng=p.coords.longitude;currentLocation=lat.toFixed(4)+","+lng.toFixed(4);document.getElementById('locStatus').innerHTML="📍 شوێن: تۆمارکرا ✅";},e=>{document.getElementById('locStatus').innerHTML="";currentLocation="بێ شوێن";});}
async function addMember(){
  const name=document.getElementById('name').value.trim();
  const voter=document.getElementById('voter').value.trim();
  const phone=document.getElementById('phone').value.trim();
  const city=document.getElementById('city').value.trim();
  const note=document.getElementById('note').value.trim();
  if(!name){alert('ناو بنووسە');return;}
  if(!voter){alert('ژمارەی دەنگدەر بنووسە - زۆر گرنگە!');return;}
  const res=await fetch('/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,voter,phone,city,note,location:currentLocation,lat,lng})});
  const data=await res.json();
  if(data.ok){
    document.getElementById('name').value='';document.getElementById('voter').value='';document.getElementById('phone').value='';document.getElementById('city').value='';document.getElementById('note').value='';
    document.getElementById('success').style.display='block';
    setTimeout(()=>{document.getElementById('success').style.display='none';},3000);
  }
}
</script></body></html>
`);
});

// لاپەڕەی ئەدمین - تەنها بۆ تۆ بە پاسۆرد
app.get('/admin', (req, res) => {
  const pass = req.query.pass;
  if(pass !== ADMIN_PASSWORD){
    return res.send(`
<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Admin Login</title><style>
body{background:#1a237e;margin:0;padding:20px;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#fff;padding:30px;border-radius:15px;max-width:400px;width:100%;text-align:center}
input{width:100%;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:8px;box-sizing:border-box}
.btn{width:100%;padding:12px;background:#1a237e;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer}
</style></head><body>
<div class="card">
<h2>🔐 چوونە ژوورەوەی ئەدمین</h2>
<p>تەنها بۆ بەڕێوەبەر</p>
<input type="password" id="p" placeholder="پاسۆرد">
<button class="btn" onclick="login()">چوونە ژوورەوە</button>
<p id="err" style="color:red;display:none;">پاسۆرد هەڵەیە!</p>
<script>
function login(){
  const pass=document.getElementById('p').value;
  if(pass) window.location.href='/admin?pass='+encodeURIComponent(pass);
}
</script>
</div></body></html>
`);
  }

  // ئەگەر پاسۆرد ڕاست بوو - لیستەکە نیشان بدە
  res.send(`
<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>لیستی ئەدمین</title><style>
body{background:#f0f2f5;margin:0;padding:15px;font-family:sans-serif}
.card{background:#fff;max-width:900px;margin:15px auto;padding:20px;border-radius:15px;box-shadow:0 2px 10px rgba(0,0,0,0.1)}
h2{text-align:center;color:#1a237e}
table{width:100%;border-collapse:collapse;margin-top:15px}th,td{padding:10px 5px;border-bottom:1px solid #eee;text-align:right;font-size:11px}th{background:#1a237e;color:#fff}
.voter{background:#d4edda;color:#155724;padding:5px 10px;border-radius:8px;font-weight:bold;border:2px solid #28a745;display:inline-block}
.badge{background:#1a237e;color:#fff;padding:5px 15px;border-radius:20px}
.btn{padding:10px 15px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;color:#fff;margin:5px}
.blue{background:#1a237e}.green{background:#0f9d58}.red{background:#ea4335;padding:5px 10px;font-size:11px}
.gray{background:#666}
</style></head><body>
<div class="card">
<h2>🔐 لیستی نهێنی ئەدمین - تەنها بۆ تۆ</h2>
<p style="text-align:center;">کۆی گشتی: <span class="badge" id="count">0</span> دەنگدەر</p>
<div style="overflow-x:auto"><table><thead><tr><th>#</th><th>ناو</th><th>ژمارەی دەنگدەر</th><th>مۆبایل</th><th>شار</th><th>شوێن و کات</th><th>کردار</th></tr></thead><tbody id="tbody"></tbody></table></div>
<div style="text-align:center;margin-top:20px;">
<button class="btn green" onclick="loadMembers()">🔄 نوێکردنەوە</button>
<button class="btn blue" onclick="downloadExcel()">📥 داگرتن وەک Excel</button>
<button class="btn gray" onclick="window.location.href='/'">🏠 چوون بۆ فۆڕم</button>
</div>
</div>
<script>
async function loadMembers(){
  const res=await fetch('/list?pass=${ADMIN_PASSWORD}');
  const list=await res.json();
  document.getElementById('count').innerText=list.length;
  const tbody=document.getElementById('tbody');tbody.innerHTML='';
  for(let i=0;i<list.length;i++){
    const m=list[i];const mapLink=m.lat?'<br><a href="https://maps.google.com/?q='+m.lat+','+m.lng+'" target="_blank">📍 نەخشە</a>':'';
    tbody.innerHTML+='<tr><td>'+(i+1)+'</td><td><b>'+m.name+'</b></td><td><span class="voter">'+m.voter+'</span></td><td>'+(m.phone||'-')+'</td><td>'+(m.city||'-')+'</td><td style="font-size:10px">'+(m.location||'-')+mapLink+'<br>'+m.date+' '+m.time+'</td><td><button class="btn red" onclick="del('+m.id+')">سڕینەوە</button></td></tr>';
  }
}
async function del(id){if(!confirm('دڵنیای دەتەوێت بیسڕیتەوە؟'))return;await fetch('/delete/'+id+'?pass=${ADMIN_PASSWORD}',{method:'DELETE'});loadMembers();}
function downloadExcel(){
  fetch('/list?pass=${ADMIN_PASSWORD}').then(r=>r.json()).then(list=>{
    let csv="No,Name,Voter Number,Phone,City,Location,Date,Time,Note\\n";
    list.forEach((m,i)=>{csv+=(i+1)+","+m.name+","+m.voter+","+(m.phone||'')+","+(m.city||'')+","+(m.location||'')+","+m.date+" "+m.time+","+(m.note||'')+"\\n";});
    const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='dangdaran.csv';a.click();
  });
}
loadMembers();setInterval(loadMembers,10000);
</script></body></html>
`);
});

app.post('/add', (req, res) => {
  const { name, voter, phone, city, note, location, lat, lng } = req.body;
  const now = new Date();
  members.push({ id: Date.now(), name, voter, phone, city, note, location, lat, lng, time: now.toLocaleTimeString('en-GB'), date: now.toLocaleDateString('en-GB') });
  res.json({ ok: true });
});

app.get('/list', (req, res) => {
  const pass = req.query.pass;
  if(pass !== ADMIN_PASSWORD && req.headers.referer && req.headers.referer.includes('/admin')){}
  if(req.path === '/list' && !req.query.pass){
    // بۆ ئەدمین تەنها بە پاسۆرد
    if(req.headers.referer && req.headers.referer.includes('/admin?pass=')){
      return res.json(members.slice().reverse());
    }
    // ئەگەر لە ئەدمینەوە نەبوو، بەتاڵ بنێرە
    return res.json([]);
  }
  res.json(members.slice().reverse());
});

app.delete('/delete/:id', (req, res) => {
  if(req.query.pass !== ADMIN_PASSWORD) return res.json({ok:false});
  members = members.filter(m => m.id != req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log('Running'));
