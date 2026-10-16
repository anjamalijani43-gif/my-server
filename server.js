const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;
app.use(express.json());
app.use(express.static(__dirname));
let members = [];
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>كومسيون</title><style>
body{background:#f0f2f5;margin:0;padding:15px;font-family:sans-serif;position:relative;min-height:100vh;}
body::before{content:"";position:fixed;top:0;left:0;width:100%;height:100%;background-image:url('logo.jpg');background-repeat:no-repeat;background-position:center;background-size:380px;opacity:0.09;z-index:-1;}
.card{background:rgba(255,255,255,0.96);max-width:700px;margin:15px auto;padding:20px;border-radius:15px;box-shadow:0 2px 10px rgba(0,0,0,0.1);}
h2{text-align:center;color:#1a237e}input{width:100%;padding:12px;margin:8px 0;border:1px solid #ddd;border-radius:8px;font-size:16px}.btn{width:100%;padding:13px;border:none;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;color:#fff}.blue{background:#1a237e}.green{background:#0f9d58;margin-top:10px}.red{background:#ea4335;padding:5px 10px;font-size:12px;width:auto}table{width:100%;border-collapse:collapse;margin-top:15px}th,td{padding:10px 6px;border-bottom:1px solid #eee;text-align:right;font-size:13px}th{background:#f8f9fa}.voter{background:#d4edda;color:#155724;padding:5px 12px;border-radius:8px;font-weight:bold;border:2px solid #28a745;display:inline-block}.badge{background:#e8f0fe;color:#1a237e;padding:3px 10px;border-radius:12px}.logo{text-align:center;margin-bottom:10px}.logo img{width:130px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.2);}
</style></head><body>
<div class="card">
<div class="logo"><img src="logo.jpg"><div style="font-size:11px;color:#1a237e;font-weight:bold;margin-top:5px;">کۆمیسیۆنی باڵای سەربەخۆی هەڵبژاردنەکان<br>IHEC - The Independent High Electoral Commission</div></div>
<h2>🗳️ زيادكردنى ده نكده رى نوى</h2>
<input id="name" placeholder="ناوى ئه ندام">
<input id="voter" placeholder="ژماره ى ده نكده ر (رقم الناخب)" style="border:2px solid #28a745;background:#f0fff4;">
<input id="phone" placeholder="ژماره ى موبايل"><input id="city" placeholder="شار"><input id="note" placeholder="تيبينى">
<p id="locStatus" style="font-size:12px;color:#666;">📍 شوين: وه رده كيريت...</p>
<button class="btn blue" onclick="addMember()">➕ زيادكردن</button>
</div>
<div class="card"><h2>📋 ليستى ده نكده ران: <span class="badge" id="count">0</span></h2><div style="overflow-x:auto"><table><thead><tr><th>#</th><th>ناو</th><th>ژماره ى ده نكده ر</th><th>موبايل</th><th>شار</th><th>شوين و كات</th><th>X</th></tr></thead><tbody id="tbody"></tbody></table></div><button class="btn green" onclick="loadMembers()">🔄 نوى كردنه وه</button></div>
<script>
let currentLocation="نه زانراو";let lat="";let lng="";
if(navigator.geolocation){navigator.geolocation.getCurrentPosition(p=>{lat=p.coords.latitude;lng=p.coords.longitude;currentLocation=lat.toFixed(4)+","+lng.toFixed(4);document.getElementById('locStatus').innerHTML="📍 شوين: "+currentLocation+" ✅";},e=>{document.getElementById('locStatus').innerHTML="📍 شوين: بى شوين";currentLocation="بى شوين";});}
async function addMember(){const name=document.getElementById('name').value.trim();const voter=document.getElementById('voter').value.trim();const phone=document.getElementById('phone').value.trim();const city=document.getElementById('city').value.trim();const note=document.getElementById('note').value.trim();if(!name){alert('ناو بنووسه');return;}if(!voter){alert('ژماره ى ده نكده ر بنووسه');return;}const res=await fetch('/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,voter,phone,city,note,location:currentLocation,lat,lng})});const data=await res.json();if(data.ok){document.getElementById('name').value='';document.getElementById('voter').value='';document.getElementById('phone').value='';document.getElementById('city').value='';document.getElementById('note').value='';loadMembers();}}
async function loadMembers(){const res=await fetch('/list');const list=await res.json();document.getElementById('count').innerText=list.length;const tbody=document.getElementById('tbody');tbody.innerHTML='';for(let i=0;i<list.length;i++){const m=list[i];const mapLink=m.lat?'<br><a href="https://maps.google.com/?q='+m.lat+','+m.lng+'" target="_blank">📍 نه خشه</a>':'';tbody.innerHTML+='<tr><td>'+(i+1)+'</td><td><b>'+m.name+'</b></td><td><span class="voter">'+m.voter+'</span></td><td>'+(m.phone||'-')+'</td><td>'+(m.city||'-')+'</td><td style="font-size:11px">'+(m.location||'-')+mapLink+'<br>'+m.date+' '+m.time+'</td><td><button class="btn red" onclick="del('+m.id+')">X</button></td></tr>';}}
async function del(id){if(!confirm('دڵنياي؟'))return;await fetch('/delete/'+id,{method:'DELETE'});loadMembers();}
loadMembers();setInterval(loadMembers,5000);
</script></body></html>
`);
});
app.post('/add', (req, res) => {
  const { name, voter, phone, city, note, location, lat, lng } = req.body;
  const now = new Date();
  members.push({ id: Date.now(), name, voter, phone, city, note, location, lat, lng, time: now.toLocaleTimeString('en-GB'), date: now.toLocaleDateString('en-GB') });
  res.json({ ok: true });
});
app.get('/list', (req, res) => { res.json(members.slice().reverse()); });
app.delete('/delete/:id', (req, res) => { members = members.filter(m => m.id != req.params.id); res.json({ ok: true }); });
app.listen(PORT);
