// server.js - بۆ 7 ملیۆن / 4GB
const express = require('express');
const { Pool } = require('pg');
const XLSX = require('xlsx');
const multer = require('multer');
const app = express();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20 
});

// خشتە + Index بۆ خێرایی لە 7 ملیۆندا
app.get('/init-db', async (req,res)=>{
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
      mobile TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX idx_family ON voters(family_number);
  `);
  res.send('DB Ready for 4GB');
});

// بارکردنی 1 ملیۆن بە 10 هەزار 10 هەزار - بۆ ئەوەی 4GB تێک نەچێت
app.post('/api/import-big', multer({dest:'uploads/'}).single('file'), async (req,res)=>{
  const workbook = XLSX.readFile(req.file.path);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  
  let count = 0;
  for(let i=0; i<rows.length; i+=10000){
    const chunk = rows.slice(i, i+10000);
    const values = chunk.map(r => `(${r['رقم الناخب']},'${r['اسم الناخب']}',...)`).join(',');
    await pool.query(`INSERT INTO voters VALUES ${values} ON CONFLICT DO NOTHING`);
    count += chunk.length;
    console.log(`${count} / ${rows.length} inserted`);
  }
  res.json({message: `تەواو بوو: ${count} دانە بارکرا`});
});

// پشکنینی خێرا لە ناو 7 ملیۆن
app.post('/api/check', express.json(), async (req,res)=>{
  const nums = req.body.numbers;
  const found = await pool.query(`SELECT * FROM voters WHERE voter_number = ANY($1)`, [nums]);
  const notFound = nums.filter(n => !found.rows.find(x=>x.voter_number==n));
  
  const famNums = [...new Set(found.rows.map(r=>r.family_number))];
  const families = famNums.length ? await pool.query(`SELECT * FROM voters WHERE family_number = ANY($1)`, [famNums]) : {rows:[]};
  
  res.json({found: found.rows, notFound, families: families.rows});
});

app.listen(process.env.PORT || 3000);
