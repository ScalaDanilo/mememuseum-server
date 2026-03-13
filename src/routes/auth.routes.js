const express = require('express');
const router = express.Router();

// Importiamo il controller che contiene la logica
const authController = require('../controllers/auth.controller');

// Quando arriva una richiesta POST su /register, esegui la funzione authController.register
router.post('/register', authController.register);

// Quando arriva una richiesta POST su /login, esegui la funzione authController.login
router.post('/login', authController.login);

// Esportiamo il router configurato
module.exports = router;