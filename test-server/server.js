const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test.html'));
});

app.listen(PORT, () => {
  console.log(`Moveme server running at http://localhost:${PORT}`);
});
