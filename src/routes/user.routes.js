const express = require('express');
const router = express.Router();

// Importiamo il controller dedicato agli utenti
const userController = require('../controllers/user.controller');
// Importiamo il "buttafuori" che controlla il Token
const authMiddleware = require('../middleware/auth.middleware');

// Rotta PUT (Privata): Permette di aggiornare lo username dell'utente loggato
router.put('/update-username', authMiddleware, userController.updateUsername);
// Rotta DELETE (Privata): Permette di eliminare l'account dell'utente loggato
router.delete('/delete-account', authMiddleware, userController.deleteAccount);

module.exports = router;