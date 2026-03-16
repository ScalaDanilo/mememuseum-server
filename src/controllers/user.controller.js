const prisma = require('../config/prisma');

// --- MODIFICA USERNAME ---
const updateUsername = async (req, res) => {
  try {
    const userId = req.user.userId; // Preso dal Token
    const { newUsername } = req.body;

    if (!newUsername || newUsername.trim() === '') {
      return res.status(400).json({ error: "Il nuovo username non può essere vuoto." });
    }

    // Controlliamo se qualcuno ha già preso questo nuovo username
    const existingUser = await prisma.user.findUnique({
      where: { username: newUsername }
    });

    if (existingUser) {
      return res.status(400).json({ error: "Questo username è già in uso da un altro utente." });
    }

    // Aggiorniamo l'utente
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { username: newUsername },
      select: { id: true, username: true } // Restituiamo solo dati sicuri (NO password)
    });

    res.json({ 
      message: "Username aggiornato con successo!", 
      user: updatedUser 
    });

  } catch (error) {
    console.error("Errore nell'aggiornamento username:", error);
    res.status(500).json({ error: "Errore interno del server durante la modifica del profilo." });
  }
};

// --- ELIMINAZIONE ACCOUNT ---
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Per evitare errori di Database, dobbiamo cancellare le cose in un ordine preciso:
    // 1. Troviamo tutti i meme creati da questo utente
    const userMemes = await prisma.meme.findMany({
      where: { userId: userId },
      select: { id: true }
    });
    
    // Estraiamo solo gli ID in un array
    const memeIds = userMemes.map(meme => meme.id);

    // 2. Cancelliamo tutti i Voti e i Commenti fatti DA ALTRI sui meme di questo utente
    if (memeIds.length > 0) {
      await prisma.vote.deleteMany({ where: { memeId: { in: memeIds } } });
      await prisma.comment.deleteMany({ where: { memeId: { in: memeIds } } });
    }

    // 3. Cancelliamo i meme di questo utente
    await prisma.meme.deleteMany({ where: { userId: userId } });

    // 4. Cancelliamo tutti i Voti e i Commenti che QUESTO utente ha lasciato in giro per il sito
    await prisma.vote.deleteMany({ where: { userId: userId } });
    await prisma.comment.deleteMany({ where: { userId: userId } });

    // 5. INFINE, cancelliamo l'utente stesso
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
  updateUsername,
  deleteAccount
};