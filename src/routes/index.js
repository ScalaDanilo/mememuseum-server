const express = require('express');
const router = express.Router();

// 1. Importiamo tutte le rotte specifiche
const authRoutes = require('./auth.routes');
const memeRoutes = require('./meme.routes');

// 2. Costruiamo l'albero di navigazione
// Tutto ciò che arriva qui, viene smistato al file corretto
router.use('/auth', authRoutes);
router.use('/memes', memeRoutes);

// Aggiungiamo anche la rotta di test qui dentro per tenere pulito il file principale
router.get('/test', (req, res) => {
  res.json({ message: "Il Main Router funziona perfettamente! 🚀" });
});

// Esportiamo il router aggregato
module.exports = router;