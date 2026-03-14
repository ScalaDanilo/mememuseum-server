const express = require('express');
const router = express.Router();

// Importiamo il controller dedicato ai tag
const tagController = require('../controllers/tag.controller');

// Rotta GET (Pubblica): Recuperare la lista di tutti i tag disponibili
// Risponderà all'URL: GET /api/tags/
router.get('/', tagController.getAllTags);

module.exports = router;