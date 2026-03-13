require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // Aggiunto: Modulo nativo di Node.js per gestire i percorsi dei file

// Importiamo SOLO il Main Router (la nostra "Navigation")
// NOTA: Node.js cerca automaticamente un file 'index.js' se gli passi solo il nome della cartella!
const apiRoutes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE GLOBALI ---
app.use(cors()); 
app.use(express.json()); 

// AGGIUNTO: Rendiamo pubblica la cartella "uploads"
// In questo modo, se un utente visita http://localhost:3000/uploads/immagine.jpg
// Express restituirà effettivamente il file immagine invece di cercare una rotta
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROTTE PRINCIPALI ---
// Diciamo a Express che TUTTE le richieste che iniziano con /api 
// devono essere passate al nostro gestore di navigazione
app.use('/api', apiRoutes);

// --- AVVIO DEL SERVER ---
app.listen(PORT, () => {
  console.log(`✅ Server in ascolto su http://localhost:${PORT}`);
});