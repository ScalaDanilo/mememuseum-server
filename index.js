require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json()); 

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server in ascolto su http://localhost:${PORT}`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server in ascolto su http://0.0.0.0:${PORT}`);
});