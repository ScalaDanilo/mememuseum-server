require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importiamo le nostre rotte divise per categoria
const authRoutes = require('./src/routes/auth.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE GLOBALI ---
app.use(cors()); 
app.use(express.json()); 

// --- ROTTE PRINCIPALI ---
// Rotta di test
app.get('/api/test', (req, res) => {
  res.json({ message: "Benvenuto nell'API di MemeMuseum! 🚀 Architettura a strati attiva." });
});

// Tutte le richieste che iniziano con /api/auth le mandiamo al file auth.routes.js
app.use('/api/auth', authRoutes);

// --- AVVIO DEL SERVER ---
app.listen(PORT, () => {
  console.log(`✅ Server in ascolto su http://localhost:${PORT}`);
});