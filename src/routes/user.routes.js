const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

// IMPORTA IL MIDDLEWARE PER L'UPLOAD DELLE IMMAGINI!
const uploadMiddleware = require('../middleware/upload.middleware');

router.get('/profile', authMiddleware, userController.getUserProfile);

// AGGIUNTO uploadMiddleware.single('image') QUI
router.put('/update-profile', authMiddleware, uploadMiddleware.single('image'), userController.updateProfile);

router.delete('/delete-account', authMiddleware, userController.deleteAccount);

module.exports = router;