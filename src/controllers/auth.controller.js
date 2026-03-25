const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_?+-]).{8,}$/;
    
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        error: "La password deve avere almeno 8 caratteri, una lettera maiuscola, un numero e un carattere speciale (!@#$%^&*_?+-)." 
      });
    }

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
    console.error("Errore registrazione:", error);
    res.status(500).json({ error: "Errore interno del server durante la registrazione." });
  }
};

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
    console.error("Errore login:", error);
    res.status(500).json({ error: "Errore interno del server durante il login." });
  }
};

module.exports = { register, login };