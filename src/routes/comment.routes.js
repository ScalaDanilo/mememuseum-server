const express = require('express');
const router = express.Router();

// Importiamo il controller dedicato ai commenti
const commentController = require('../controllers/comment.controller');
// Importiamo il "buttafuori" che controlla il Token
const authMiddleware = require('../middleware/auth.middleware');

// Rotta POST (Privata): Permette di aggiungere un commento a un meme specifico
router.post('/:memeId', authMiddleware, commentController.addComment);

// Rotta GET (Pubblica): Permette di vedere tutti i commenti di un meme specifico
router.get('/:memeId', commentController.getMemeComments);

module.exports = router;