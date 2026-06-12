const express = require('express');
const router = express.Router();

// Importiamo il controller dedicato ai tag
const tagController = require('../controllers/tag.controller');

// Importiamo il "buttafuori" che controlla il Token
const authMiddleware = require('../middleware/auth.middleware');

// Rotta GET (Pubblica): Recuperare la lista di tutti i tag disponibili
// Risponderà all'URL: GET /api/tags/
router.get('/', tagController.getAllTags);

// Crea un nuovo tag (richiede autenticazione, in concomitanza con la creazione del meme)
router.post('/', authMiddleware, tagController.createTag);

module.exports = router;