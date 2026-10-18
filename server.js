const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.get('/', (req,res)=>{
res.send('<html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>دەنگدەر</title><style>body{font-family:Tahoma;background:#eef2f7;padding:10px}.card{background:#fff;padding:20px;border-radius:14px;max-width:480px;margin:30px auto}input{width:100%;padding:13px;margin:6px 0;border:1.5px solid #ccc;border-radius:10px}button{width:100%;padding:13px;background:#0a7cff;color:#fff;border:none;border-radius:10px;font-size:17px;font-weight:700}</style></head><body><div id="l" class="card"><h2>🔐 تسجيل دخول الموظف</h2><div id="msg"></div><input id="u" value="admin"><input id="p" type="password" value="Anjam1234"><button onclick="login()">تسجيل الدخول</button><p style="text-align:center;font-size:12px">admin / Anjam1234<br>anjam / jiani123</p></div><div id="f" class="card" style="display:none"><h2>📋 فۆڕمی دەنگدەر</h2><input id="vn" value="19503975"><input id="vname" value="نسرین بشیر فوزی"><input id="city" value="کەرکوک"><input id="mob" placeholder="0770..."><button onclick="sub()">تۆمارکردن</button><div id="mm"></div></div><script>function login(){var u=document.getElementById("u").value.trim().toLowerCase();var p=document.getElementById("p").value.trim().toLowerCase();if((u=="admin"||u=="anjam")&&(p=="anjam1234"||p=="jiani123")){document.getElementById("l").style.display="none";document.getElementById("f").style.display="block";}else{document.getElementById("msg").innerHTML="هەڵەیە - admin / Anjam1234";}}function sub(){var c=document.getElementById("city").value,m=document.getElementById("mob").value;if(c.match(/^9647/)||c.match(/^\\d{12,}$/)){m=c;c="کەرکوک";document.getElementById("city").value=c;}m=m.replace(/\\s/g,"");if(m.startsWith("964"))m="0"+m.slice(3);if(m.startsWith("77"))m="0"+m;document.getElementById("mob").value=m;document.getElementById("mm").innerHTML="✅ "+c+" - "+m;}</script></body></html>');
});

app.listen(process.env.PORT||3000,()=>console.log("Running"));
app.get('/admin', (req,res)=> res.redirect('/'));
app.get('*', (req,res)=> res.redirect('/'));
