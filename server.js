const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/m', function(req,res){
  res.send('m is working - linki andam isha dakat');
});

app.get('/', function(req,res){
  res.send('admin is working');
});

app.listen(PORT, '0.0.0.0', function(){
  console.log('Server running on ' + PORT);
});
