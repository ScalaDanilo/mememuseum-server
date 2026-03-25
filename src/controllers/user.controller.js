const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memes: {
          orderBy: { uploadDate: 'desc' },
          include: {
            user: { select: { username: true } },
            tags: true,
            _count: { select: { comments: true, votes: true } }
          }
        }
      }
    });

    if (!user) return res.status(404).json({ error: "Utente non trovato." });

    const { password, ...safeUser } = user;
    res.json(safeUser);

  } catch (error) {
    console.error("Errore recupero profilo:", error);
    res.status(500).json({ error: "Errore interno del server." });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const { username, password } = req.body;
    let dataToUpdate = {};

    if (username && username.trim() !== '') {
      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "Username già in uso da un altro utente." });
      }
      dataToUpdate.username = username;
    }

    if (password && password.trim() !== '') {
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*_?+-]).{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({ error: "Password non conforme ai requisiti di sicurezza." });
      }
      const salt = await bcrypt.genSalt(10);
      dataToUpdate.password = await bcrypt.hash(password, salt);
    }

    if (req.file) {
      dataToUpdate.imageUrl = `/uploads/${req.file.filename}`;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: { id: true, username: true, imageUrl: true } 
    });

    res.json({ message: "Profilo aggiornato con successo!", user: updatedUser });

  } catch (error) {
    console.error("Errore aggiornamento profilo:", error);
    res.status(500).json({ error: "Errore interno del server durante la modifica." });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userMemes = await prisma.meme.findMany({
      where: { userId: userId },
      select: { id: true }
    });
    
    const memeIds = userMemes.map(meme => meme.id);

    if (memeIds.length > 0) {
      await prisma.vote.deleteMany({ where: { memeId: { in: memeIds } } });
      await prisma.comment.deleteMany({ where: { memeId: { in: memeIds } } });
    }

    await prisma.meme.deleteMany({ where: { userId: userId } });
    await prisma.vote.deleteMany({ where: { userId: userId } });
    await prisma.comment.deleteMany({ where: { userId: userId } });
    
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: "Account e tutti i dati associati eliminati definitivamente." });

  } catch (error) {
    console.error("Errore nell'eliminazione account:", error);
    res.status(500).json({ error: "Errore interno del server durante l'eliminazione del profilo." });
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  deleteAccount
};