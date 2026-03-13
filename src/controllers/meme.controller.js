const prisma = require('../config/prisma');
const { get } = require('../routes');

// --- RECUPERO DI TUTTI I MEME ---
const getAllMemes = async (req, res) => {
  try {
    // Chiediamo a Prisma di trovare tutti i meme
    const memes = await prisma.meme.findMany({
      // Li ordiniamo dal più recente al più vecchio
      orderBy: {
        uploadDate: 'desc' 
      },
      // Questa è la vera magia: includiamo le relazioni!
      include: {
        user: {
          select: { username: true } // Vogliamo solo l'username, non la password!
        },
        tags: true, // Includiamo l'elenco dei tag associati
        _count: {
          select: { comments: true, votes: true } // Facciamo contare a Prisma i commenti e i voti
        }
      }
    });

    // Restituiamo l'array di meme al front-end
    res.json(memes);

  } catch (error) {
    console.error("Errore nel controller getAllMemes:", error);
    res.status(500).json({ error: "Errore interno del server durante il recupero dei meme." });
  }
};

// --- CREAZIONE DI UN NUOVO MEME (POST) ---
const createMeme = async (req, res) => {
  try {
    // 1. Prendiamo i dati inviati dal front-end (assumiamo titolo e immagine)
    const { title, imageUrl } = req.body;
    
    // 2. Magia del Middleware: prendiamo l'ID dell'utente loggato!
    const userId = req.user.userId;

    if (!title || !imageUrl) {
      return res.status(400).json({ error: "Titolo e URL dell'immagine sono obbligatori." });
    }

    // 3. Salviamo il meme nel database collegandolo all'utente
    const newMeme = await prisma.meme.create({
      data: {
        title: title,
        imageUrl: imageUrl,
        userId: userId // La relazione con l'autore!
      }
    });

    res.status(201).json({
      message: "Meme caricato con successo!",
      meme: newMeme
    });

  } catch (error) {
    console.error("Errore nel controller createMeme:", error);
    res.status(500).json({ error: "Errore interno del server durante la creazione del meme." });
  }
};

// --- VOTARE UN MEME (LIKE / DISLIKE) ---
const voteMeme = async (req, res) => {
  try {
    const memeId = parseInt(req.params.id);
    const { value } = req.body; // Dal front-end arriverà 1 (Like) o -1 (Dislike)
    const userId = req.user.userId;

    if (value !== 1 && value !== -1) {
      return res.status(400).json({ error: "Il voto deve essere 1 (Mi Piace) o -1 (Non Mi Piace)." });
    }

    // Controlliamo che il meme esista
    const meme = await prisma.meme.findUnique({ where: { id: memeId } });
    if (!meme) {
      return res.status(404).json({ error: "Meme non trovato." });
    }

    // Sfruttiamo il tuo @@unique([userId, memeId]) per cercare velocemente!
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_memeId: {
          userId: userId,
          memeId: memeId
        }
      }
    });

    if (existingVote) {
      // L'utente ha già votato in passato. Vediamo cosa ha cliccato:
      if (existingVote.value === value) {
        // Scenario A: Ha cliccato di nuovo lo stesso tasto (es. toglie il Like). Eliminiamo il voto.
        await prisma.vote.delete({ where: { id: existingVote.id } });
        return res.json({ message: "Voto rimosso." });
      } else {
        // Scenario B: Ha cambiato idea (es. da Dislike a Like). Aggiorniamo il voto.
        const updatedVote = await prisma.vote.update({
          where: { id: existingVote.id },
          data: { value: value }
        });
        return res.json({ message: "Voto aggiornato.", vote: updatedVote });
      }
    } else {
      // Scenario C: Non ha mai votato. Creiamo un nuovo record.
      const newVote = await prisma.vote.create({
        data: {
          value: value,
          memeId: memeId,
          userId: userId
        }
      });
      return res.status(201).json({ message: "Voto aggiunto.", vote: newVote });
    }

  } catch (error) {
    console.error("Errore nel controller voteMeme:", error);
    res.status(500).json({ error: "Errore interno del server durante la votazione." });
  }
};

// --- RECUPERARE I DETTAGLI DEI VOTI DI UN MEME (GET) ---
const getMemeVotes = async (req, res) => {
  try {
    const memeId = parseInt(req.params.id);

    // Controlliamo che il meme esista
    const meme = await prisma.meme.findUnique({ where: { id: memeId } });
    if (!meme) {
      return res.status(404).json({ error: "Meme non trovato." });
    }

    // Troviamo tutti i voti associati a questo meme, includendo l'username dell'utente
    const votes = await prisma.vote.findMany({
      where: { memeId: memeId },
      include: {
        user: { select: { username: true } }
      }
    });

    // Dividiamo i voti in "Mi piace" (1) e "Non mi piace" (-1)
    // Estraendo direttamente gli username per creare un array pulito come su Instagram
    const likedBy = votes.filter(v => v.value === 1).map(v => v.user.username);
    const dislikedBy = votes.filter(v => v.value === -1).map(v => v.user.username);

    // Restituiamo un oggetto comodissimo per il front-end
    res.json({
      likesCount: likedBy.length,
      dislikesCount: dislikedBy.length,
      likedBy: likedBy,       // Array di username che hanno messo "Mi piace"
      dislikedBy: dislikedBy  // Array di username che hanno messo "Non mi piace"
    });

  } catch (error) {
    console.error("Errore nel controller getMemeVotes:", error);
    res.status(500).json({ error: "Errore interno del server nel recupero dei voti." });
  }
};

// --- AGGIUNGERE UN COMMENTO (POST) ---
const addComment = async (req, res) => {
  try {
    const memeId = parseInt(req.params.id);
    const { text } = req.body;
    const userId = req.user.userId; // Dal nostro fido middleware!

    // Controllo che il commento non sia vuoto
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: "Il testo del commento non può essere vuoto." });
    }

    // Controlliamo che il meme esista ancora (magari qualcuno lo ha cancellato nel frattempo)
    const meme = await prisma.meme.findUnique({ where: { id: memeId } });
    if (!meme) {
      return res.status(404).json({ error: "Meme non trovato." });
    }

    // Creiamo il commento
    const newComment = await prisma.comment.create({
      data: {
        text: text,
        memeId: memeId,
        userId: userId
      },
      // Chiediamo a Prisma di restituirci anche l'username di chi ha commentato, 
      // sarà comodissimo per il front-end!
      include: {
        user: {
          select: { username: true }
        }
      }
    });

    res.status(201).json({ message: "Commento aggiunto!", comment: newComment });

  } catch (error) {
    console.error("Errore nel controller addComment:", error);
    res.status(500).json({ error: "Errore interno del server durante l'aggiunta del commento." });
  }
};

// --- RECUPERARE I COMMENTI DI UN MEME (GET) ---
const getMemeComments = async (req, res) => {
  try {
    const memeId = parseInt(req.params.id);

    const meme = await prisma.meme.findUnique({ where: { id: memeId } });
    if (!meme) {
      return res.status(404).json({ error: "Meme non trovato." });
    }

    // Troviamo tutti i commenti associati a questo meme
    const comments = await prisma.comment.findMany({
      where: { memeId: memeId },
      orderBy: { date: 'desc' }, // I più recenti per primi!
      include: {
        user: { select: { username: true } } // Includiamo sempre chi lo ha scritto
      }
    });

    res.json(comments);

  } catch (error) {
    console.error("Errore nel controller getMemeComments:", error);
    res.status(500).json({ error: "Errore interno del server nel recupero dei commenti." });
  }
};

// --- RECUPERARE I DETTAGLI DI UN SINGOLO MEME (GET) ---
const getMemeById = async (req, res) => {
  try {
    const memeId = parseInt(req.params.id);

    // Cerchiamo il meme specifico e includiamo i dati utili
    const meme = await prisma.meme.findUnique({
      where: { id: memeId },
      include: {
        user: { select: { username: true } }, // Chi lo ha postato
        tags: true,                           // I tag associati
        comments: {                           // <-- NUOVO: Includiamo la lista dei commenti
          orderBy: { date: 'desc' },          // Ordinati dal più recente
          include: { 
            user: { select: { username: true } } // Includiamo chi ha scritto il commento
          }
        },
        _count: { select: { comments: true, votes: true } } // Numeri totali
      }
    });

    if (!meme) {
      return res.status(404).json({ error: "Meme non trovato." });
    }

    res.json(meme);

  } catch (error) {
    console.error("Errore nel controller getMemeById:", error);
    res.status(500).json({ error: "Errore interno del server durante il recupero del meme." });
  }
};

// --- ELIMINARE UN MEME (DELETE) ---
const deleteMeme = async (req, res) => {
  try {
    const memeId = parseInt(req.params.id);
    const userId = req.user.userId; // Preso dal Token JWT tramite middleware

    // 1. Cerchiamo il meme
    const meme = await prisma.meme.findUnique({
      where: { id: memeId }
    });

    // Esiste?
    if (!meme) {
      return res.status(404).json({ error: "Meme non trovato." });
    }

    // 2. Controllo Autore: L'utente che fa la richiesta è quello che l'ha creato?
    if (meme.userId !== userId) {
      return res.status(403).json({ error: "Azione negata. Puoi eliminare solo i meme creatati da te." });
    }

    // 3. Eliminiamo i record dipendenti per primi (altrimenti avremmo errori di foreign key)
    // Cancelliamo tutti i voti e i commenti legati a questo specifico meme
    await prisma.vote.deleteMany({ where: { memeId: memeId } });
    await prisma.comment.deleteMany({ where: { memeId: memeId } });

    // 4. Infine, eliminiamo il meme vero e proprio
    await prisma.meme.delete({
      where: { id: memeId }
    });

    res.json({ message: "Meme e tutti i relativi dati eliminati con successo!" });

  } catch (error) {
    console.error("Errore nel controller deleteMeme:", error);
    res.status(500).json({ error: "Errore interno del server durante l'eliminazione del meme." });
  }
};

// Esportiamo anche la nuova funzione
module.exports = {
  getAllMemes,
  createMeme,
  voteMeme,
  addComment,
  getMemeComments,
  getMemeVotes,
  getMemeById,
  deleteMeme
};