const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway")
    ? { rejectUnauthorized: false }
    : undefined,
});

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET;
const ADMIN = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!SECRET || !ADMIN || !ADMIN_PASSWORD) {
  throw new Error("Set JWT_SECRET, ADMIN_USERNAME and ADMIN_PASSWORD");
}

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 1024 * 1024 * 1024 },
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS voters (
      id BIGSERIAL PRIMARY KEY,
      list_id SMALLINT NOT NULL CHECK (list_id BETWEEN 1 AND 7),
      voter_number TEXT NOT NULL,
      voter_name TEXT DEFAULT '',
      birth_year TEXT DEFAULT '',
      family_number TEXT DEFAULT '',
      registration_center_number TEXT DEFAULT '',
      registration_center_name TEXT DEFAULT '',
      polling_center_number TEXT DEFAULT '',
      polling_center_name TEXT DEFAULT '',
      polling_center_address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      UNIQUE(list_id, voter_number)
    );

    CREATE INDEX IF NOT EXISTS voters_number_idx
      ON voters(voter_number);

    CREATE INDEX IF NOT EXISTS voters_family_idx
      ON voters(family_number);

    CREATE TABLE IF NOT EXISTS submissions (
      voter_number TEXT PRIMARY KEY,
      voter_name TEXT NOT NULL DEFAULT '',
      family_number TEXT NOT NULL DEFAULT '',
      source_list SMALLINT,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS submissions_family_idx
      ON submissions(family_number);
  `);
}

function normalizeNumber(value) {
  return String(value ?? "")
    .trim()
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/\s+/g, "");
}

function adminOnly(req, res, next) {
  try {
    const token = req.cookies.admin_token;
    if (!token) return res.status(401).json({ error: "Login required" });

    const payload = jwt.verify(token, SECRET);
    if (payload.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  } catch {
    res.status(401).json({ error: "Session expired; login again" });
  }
}

// Employee page: no username/password required.
app.get("/", (req, res) => {
  res.type("html").send(`
<!doctype html>
<html lang="ku" dir="rtl">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>سیستەمی دەنگدەران</title>
<style>
body{font-family:Arial;max-width:700px;margin:35px auto;padding:16px}
textarea,button{box-sizing:border-box;width:100%;padding:12px;margin:8px 0}
textarea{height:180px}button{cursor:pointer;background:#176b35;color:white;border:0}
pre{white-space:pre-wrap;background:#f2f2f2;padding:12px}
</style>
<h2>واجیهەی کارمەند</h2>
<p>ژمارەی دەنگدەران بنووسە؛ هەر ژمارەیەک لە هێڵێکی جیاواز.</p>
<textarea id="numbers" placeholder="١٣٩٦٠١&#10;١٣٩٦٠٢"></textarea>
<button onclick="sendNumbers()">ناردن بۆ سێرڤەر</button>
<pre id="result"></pre>
<script>
async function sendNumbers(){
 const numbers=document.getElementById('numbers').value
   .split(/[\\n,;\\s]+/).filter(Boolean);
 if(!numbers.length){alert('ژمارە بنووسە');return}
 const r=await fetch('/api/submit',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({numbers})
 });
 const data=await r.json();
 document.getElementById('result').textContent=
   JSON.stringify(data,null,2);
}
</script>
</html>`);
});

// Admin page.
app.get("/admin", (req, res) => {
  res.type("html").send(`
<!doctype html>
<html lang="ku" dir="rtl">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>بەڕێوەبەر</title>
<style>
body{font-family:Arial;max-width:1000px;margin:25px auto;padding:16px}
input,button,select{padding:10px;margin:5px;max-width:100%}
button{cursor:pointer}table{border-collapse:collapse;width:100%}
td,th{border:1px solid #ccc;padding:7px;text-align:right}
.green{background:#c8f2ce}.red{background:#ffd0d0}
</style>
<h2>واجیهەی ئەدمین</h2>
<section id="login">
<input id="username" placeholder="یوزەرنیم">
<input id="password" type="password" placeholder="پاسوورد">
<button onclick="login()">چوونەژوورەوە</button>
</section>
<section id="panel" hidden>
<button onclick="loadSubmissions()">نوێکردنەوەی لیست</button>
<p id="summary"></p>
<h3>بارکردنی یەکێک لە ٧ لیستەکان</h3>
<p>CSV بە ستوونەکانی ناوەڕۆکی ڕێکخراو باربکە.</p>
<select id="listId">
<option value="1">لیستی ١</option><option value="2">لیستی ٢</option>
<option value="3">لیستی ٣</option><option value="4">لیستی ٤</option>
<option value="5">لیستی ٥</option><option value="6">لیستی ٦</option>
<option value="7">لیستی ٧</option>
</select>
<input type="file" id="file" accept=".csv">
<button onclick="importList()">بارکردن</button>
<pre id="message"></pre>
<div id="table"></div>
</section>
<script>
async function login(){
 const r=await fetch('/api/admin/login',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({
   username:document.getElementById('username').value,
   password:document.getElementById('password').value
  })
 });
 const d=await r.json();
 if(!r.ok){alert(d.error||'هەڵە');return}
 document.getElementById('login').hidden=true;
 document.getElementById('panel').hidden=false;
 loadSubmissions();
}
async function loadSubmissions(){
 const r=await fetch('/api/admin/submissions');
 const d=await r.json();
 if(!r.ok){alert(d.error||'هەڵە');return}
 document.getElementById('summary').textContent=
   'ژمارەی نێردراوەکان: '+d.length;
 document.getElementById('table').innerHTML=
 '<table><tr><th>ژمارە</th><th>ناو</th><th>ژمارەی خێزان</th><th>لیست</th><th>کات</th></tr>'+
 d.map(x=>'<tr class="green"><td>'+esc(x.voter_number)+
 '</td><td>'+esc(x.voter_name)+'</td><td>'+esc(x.family_number)+
 '</td><td>'+esc(x.source_list)+'</td><td>'+esc(x.submitted_at)+
 '</td></tr>').join('')+'</table>';
}
function esc(v){
 return String(v??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
 }[c]));
}
async function importList(){
 const f=document.getElementById('file').files[0];
 if(!f){alert('فایلێک هەڵبژێرە');return}
 const form=new FormData();
 form.append('file',f);
 const r=await fetch('/api/admin/import/'+
   document.getElementById('listId').value,{
    method:'POST',body:form
   });
 const d=await r.json();
 document.getElementById('message').textContent=JSON.stringify(d,null,2);
 if(r.ok)loadSubmissions();
}
</script>
</html>`);
});

// Admin login.
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body || {};
  const validUser = username === ADMIN;
  const validPassword = typeof password === "string" &&
    password.length > 0 &&
    await bcrypt.compare(
      password,
      await bcrypt.hash(ADMIN_PASSWORD, 10)
    ).catch(() => false);

  // Constant-time password comparison is handled below.
  const crypto = require("crypto");
  const supplied = Buffer.from(String(password ?? ""));
  const expected = Buffer.from(ADMIN_PASSWORD);
  const samePassword = supplied.length === expected.length &&
    crypto.timingSafeEqual(supplied, expected);

  if (!validUser || !samePassword) {
    return res.status(401).json({ error: "یوزەرنیم یان پاسوورد هەڵەیە" });
  }

  const token = jwt.sign({ role: "admin" }, SECRET, { expiresIn: "8h" });
  res.cookie("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/"
  });
  res.json({ ok: true });
});

app.post("/api/admin/logout", adminOnly, (req, res) => {
  res.clearCookie("admin_token", { path: "/" });
  res.json({ ok: true });
});

// Employee sends one or many voter numbers.
app.post("/api/submit", async (req, res) => {
  try {
    const raw = Array.isArray(req.body?.numbers)
      ? req.body.numbers
      : [];

    const numbers = [...new Set(raw.map(normalizeNumber).filter(Boolean))];
    if (!numbers.length) {
      return res.status(400).json({ error: "ژمارە بنووسە" });
    }
    if (numbers.length > 5000) {
      return res.status(400).json({ error: "لە هەر جاردا زۆرترین ٥٠٠٠ ژمارە" });
    }

    const result = await pool.query(
      `SELECT DISTINCT ON (voter_number)
         voter_number, voter_name, family_number, list_id
       FROM voters
       WHERE voter_number = ANY($1::text[])
       ORDER BY voter_number, list_id`,
      [numbers]
    );

    const found = new Map(result.rows.map(r => [r.voter_number, r]));
    const missing = numbers.filter(n => !found.has(n));
    const client = await pool.connect();
    let accepted = [];

    try {
      await client.query("BEGIN");
      for (const number of numbers) {
        const v = found.get(number);
        if (!v) continue;

        const saved = await client.query(
          `INSERT INTO submissions
             (voter_number, voter_name, family_number, source_list)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (voter_number) DO NOTHING
           RETURNING voter_number`,
          [v.voter_number, v.voter_name, v.family_number, v.list_id]
        );

        accepted.push({
          voter_number: number,
          status: saved.rowCount ? "نوێ نێردرا" : "پێشتر نێردراوە"
        });
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    res.json({
      total: numbers.length,
      found: accepted.length,
      missing,
      accepted
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "هەڵە لە پشکنینی داتابەیس" });
  }
});

// Admin sees submitted voters.
app.get("/api/admin/submissions", adminOnly, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT voter_number, voter_name, family_number,
              source_list, submitted_at
       FROM submissions
       ORDER BY submitted_at DESC
       LIMIT 10000`
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

// Family list: green = submitted; red = not submitted.
app.get("/api/admin/families/:familyNumber", adminOnly, async (req, res) => {
  try {
    const familyNumber = normalizeNumber(req.params.familyNumber);
    const r = await pool.query(
      `SELECT DISTINCT ON (v.voter_number)
          v.voter_number, v.voter_name, v.birth_year,
          v.family_number, v.registration_center_number,
          v.registration_center_name, v.polling_center_number,
          v.polling_center_name, v.polling_center_address, v.phone,
          CASE WHEN s.voter_number IS NULL THEN 'red' ELSE 'green' END AS status
       FROM voters v
       LEFT JOIN submissions s ON s.voter_number = v.voter_number
       WHERE v.family_number = $1
       ORDER BY v.voter_number, v.list_id
       LIMIT 5000`,
      [familyNumber]
    );
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Database error" });
  }
});

// Import CSV into a selected list (1–7).
// Required headers are shown in the instructions below.
app.post(
  "/api/admin/import/:listId",
  adminOnly,
  upload.single("file"),
  async (req, res) => {
    const filePath = req.file?.path;
    const listId = Number(req.params.listId);

    if (!filePath || !Number.isInteger(listId) ||
        listId < 1 || listId > 7) {
      if (filePath) fs.unlink(filePath, () => {});
      return res.status(400).json({ error: "فایل یان ژمارەی لیست هەڵەیە" });
    }

    let inserted = 0;
    let failed = 0;
    let batch = [];
    let rowNumber = 0;

    const columns = [
      "voter_number", "voter_name", "birth_year", "family_number",
      "registration_center_number", "registration_center_name",
      "polling_center_number", "polling_center_name",
      "polling_center_address", "phone"
    ];

    async function flush() {
      if (!batch.length) return;
      const values = [];
      const placeholders = batch.map((row, i) => {
        const base = i * 11;
        values.push(listId, ...columns.map(c => String(row[c] ?? "").trim()));
        return "(" + Array.from({ length: 11 },
          (_, j) => "$" + (base + j + 1)).join(",") + ")";
      });

      const sql = `
        INSERT INTO voters
          (list_id, ${columns.join(",")})
        VALUES ${placeholders.join(",")}
        ON CONFLICT (list_id, voter_number)
        DO UPDATE SET ${columns.slice(1).map(c =>
          `${c}=EXCLUDED.${c}`).join(",")}
      `;
      try {
        const r = await pool.query(sql, values);
        inserted += batch.length;
      } catch (e) {
        failed += batch.length;
        console.error("Import batch failed:", e.message);
      }
      batch = [];
    }

    try {
      const stream = fs.createReadStream(filePath).pipe(
        csv({ mapHeaders: ({ header }) =>
          String(header || "").trim().toLowerCase() })
      );

      for await (const row of stream) {
        rowNumber++;
        if (!row.voter_number) {
          failed++;
          continue;
        }
        batch.push(row);
        if (batch.length >= 300) await flush();
      }
      await flush();

      res.json({
        ok: failed === 0,
        listId,
        rowsRead: rowNumber,
        rowsProcessed: inserted,
        failedRows: failed
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "CSV import failed" });
    } finally {
      fs.unlink(filePath, () => {});
    }
  }
);

app.get("/health", (req, res) => res.json({ status: "ok" }));

initDB()
  .then(() => app.listen(PORT, () =>
    console.log("Server running on port " + PORT)
  ))
  .catch(err => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });
