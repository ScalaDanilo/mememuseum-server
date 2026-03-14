const express = require('express');
const router = express.Router();

// Importiamo il controller dedicato ai commenti
const voteController = require('../controllers/vote.controller');
// Importiamo il "buttafuori" che controlla il Token
const authMiddleware = require('../middleware/auth.middleware');

// Rotta POST (Privata): Permette di aggiungere un commento a un meme specifico
router.post('/:memeId', authMiddleware, voteController.addVote);

// Rotta GET (Pubblica): Permette di vedere tutti i commenti di un meme specifico
router.get('/:memeId', voteController.getVotesByMeme);

module.exports = router;