const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.get('/personamotionstyles.css', (req, res) => {
  res.sendFile(path.join(__dirname, '../', 'persona', 'view', '/personamotionstyles.css'));
});
app.get('/personamotionbundle.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../', 'share', '/personamotionbundle.js'));
});
app.get('/worker.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../', 'compute', '/worker.js'));
});
app.use('/lib', express.static(path.join(__dirname, '../', 'lib')));
app.use('/models', express.static(path.join(__dirname, '../', 'models')));
app.use('/', express.static(path.join(__dirname, '../', 'configurator')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../', 'configurator', 'welcome.html'));
});

app.listen(PORT, () => {
  console.log(`personamotion test server running at http://localhost:${PORT}`);
});
