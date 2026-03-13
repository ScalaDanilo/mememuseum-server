const express = require('express');
const router = express.Router();

const memeController = require('../controllers/meme.controller');
// Importiamo il "buttafuori" che controlla il Token
const authMiddleware = require('../middleware/auth.middleware');
// IMPORTIAMO MULTER
const upload = require('../middleware/upload.middleware');
const { route } = require('./auth.routes');

// Rotta GET (Pubblica): Permette a tutti di vedere i meme
router.get('/', memeController.getAllMemes);

// Rotta GET (Pubblica): Permette di cercare meme per data, popolarità o tag
router.get('/search', memeController.searchMemes);

// Rotta GET (Pubblica): Recuperare il Meme del Giorno
router.get('/daily', memeController.getDailyMeme);

// Rotta GET (Pubblica): Recupera tutti i tag unici usati nei meme
router.get('/tags', memeController.getAllTags);

// Rotta POST (Privata): Permette solo a chi ha il token di caricare un meme E UN'IMMAGINE
// "upload.single('image')" dice a Multer di cercare un file nel campo chiamato "image"
router.post('/', authMiddleware, upload.single('image'), memeController.createMeme);

// Rotta POST (Privata): Permette di votare un meme specifico (Mi Piace / Non Mi Piace)
router.post('/:id/vote', authMiddleware, memeController.voteMeme);

// Rotta GET (Pubblica): Vedere chi ha votato un meme e i totali
router.get('/:id/votes', memeController.getMemeVotes);

// Rotta POST (Privata): Aggiungere un commento
router.post('/:id/comments', authMiddleware, memeController.addComment);

// Rotta GET (Pubblica): Vedere tutti i commenti di un meme
router.get('/:id/comments', memeController.getMemeComments);

// Rotta GET (Pubblica): Recuperare i dettagli di un singolo meme tramite il suo ID
router.get('/:id', memeController.getMemeById);

// Rotta DELETE (Privata): Elimina un meme (solo se l'utente ne è il proprietario)
router.delete('/:id', authMiddleware, memeController.deleteMeme);

module.exports = router;