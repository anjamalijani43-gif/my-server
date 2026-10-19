const express = require('express');
const { Pool } = require('pg');
const XLSX = require('xlsx');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.static('public'));

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// سەرەتا DB ئامادە بکە
app.get('/init-db', async (req,res)=>{
  try{
    await pool.query(`
      CREATE TABLE IF NOT EXISTS voters (
        voter_number BIGINT PRIMARY KEY,
        voter_name TEXT,
        birth_year TEXT,
        family_number TEXT,
        reg_center_num TEXT,
        reg_center_name TEXT,
        poll_center_num TEXT,
        poll_center_name TEXT,
        poll_center_address TEXT,
        mobile TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_family ON voters(family_number);
      CREATE INDEX IF NOT EXISTS idx_voter_num ON voters(voter_number);
    `);
    res.send('✅ DB ئامادەیە بۆ 4GB / 7 ملیۆن');
  }catch(e){ res.status(500).send(e.message) }
});

// بارکردنی فایلی 1 ملیۆنی - بە chunk
const upload = multer({dest:'uploads/'});
app.post('/api/import-big', upload.single('file'), async (req,res)=>{
  try{
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    
    let inserted = 0;
    for(let i=0; i<rows.length; i+=10000){
      const chunk = rows.slice(i, i+10000);
      const client = await pool.connect();
      try{
        await client.query('BEGIN');
        for(const r of chunk){
          await client.query(`
            INSERT INTO voters(voter_number,voter_name,birth_year,family_number,reg_center_num,reg_center_name,poll_center_num,poll_center_name,poll_center_address,mobile)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (voter_number) DO NOTHING
          `,[r['رقم الناخب']||r['رقم']||r.A, r['اسم الناخب']||r.B, r['مواليد']||r.C, r['رقم العائلي']||r.D, r['رقم مركز التسجيل']||r.E, r['اسم مركز التسجيل']||r.F, r['رقم مركز الاقتراع']||r.G, r['اسم مركز الاقتراع']||r.H, r['عنوان مركز الاقتراع']||r.I, r['رقم الهاتف']||r.J]);
        }
        await client.query('COMMIT');
        inserted += chunk.length;
      }catch(err){ await client.query('ROLLBACK'); throw err; }
      finally{ client.release(); }
    }
    fs.unlinkSync(req.file.path);
    const total = await pool.query('SELECT COUNT(*) FROM voters');
    res.json({message:`✅ ${inserted} بارکرا`, total: total.rows[0].count});
  }catch(e){ res.status(500).json({error:e.message}) }
});

// پشکنین - ئەوەی داوات کرد
app.post('/api/check', async (req,res)=>{
  const nums = req.body.numbers.map(n=>parseInt(n)).filter(Boolean);
  const found = await pool.query(`SELECT * FROM voters WHERE voter_number = ANY($1)`, [nums]);
  const foundNums = found.rows.map(r=>r.voter_number.toString());
  const notFound = nums.filter(n=>!foundNums.includes(n.toString()));
  
  const famNums = [...new Set(found.rows.map(r=>r.family_number))];
  const families = famNums.length ? await pool.query(`SELECT * FROM voters WHERE family_number = ANY($1)`, [famNums]) : {rows:[]};
  
  res.json({found: found.rows, notFound, families: families.rows});
});

app.get('/', (req,res)=> res.sendFile(__dirname+'/public/index.html'));

app.listen(process.env.PORT||3000, ()=> console.log('Server ready for 4GB'));
