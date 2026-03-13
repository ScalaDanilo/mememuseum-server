const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Importiamo la connessione al database che hai nel file src/config/prisma.js
const prisma = require('../config/prisma');

// --- REGISTRAZIONE ---
const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { username: username }
    });

    if (existingUser) {
      return res.status(400).json({ error: "Questo username è già in uso!" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        username: username,
        password: hashedPassword
      }
    });

    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ 
      message: "Utente registrato e loggato con successo!", 
      user: { id: newUser.id, username: newUser.username },
      token: token
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Errore interno del server durante la registrazione." });
  }
};

// --- LOGIN ---
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { username: username }
    });

    if (!user) {
      return res.status(401).json({ error: "Credenziali non valide." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Credenziali non valide." });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } 
    );

    res.json({
      message: "Login effettuato con successo!",
      token: token
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Errore interno del server durante il login." });
  }
};

// Esportiamo le funzioni per usarle nelle rotte
module.exports = {
  register,
  login
};