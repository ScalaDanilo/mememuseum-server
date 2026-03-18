const prisma = require('../config/prisma');

// --- AGGIUNGERE UN COMMENTO (POST) ---
const addComment = async (req, res) => {
    try {
        const memeId = parseInt(req.params.memeId);
        const { text } = req.body;
        const userId = req.user.userId;

        if (!text || text.trim() === '') {
            return res.status(400).json({ error: "Il testo del commento non può essere vuoto." });
        }

        const meme = await prisma.meme.findUnique({ where: { id: memeId } });
        if (!meme) {
            return res.status(404).json({ error: "Meme non trovato." });
        }

        const newComment = await prisma.comment.create({
            data: { text, memeId, userId },
            include: { user: { select: { username: true, imageUrl: true } } }
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
        const memeId = parseInt(req.params.memeId);

        const meme = await prisma.meme.findUnique({ where: { id: memeId } });
        if (!meme) {
            return res.status(404).json({ error: "Meme non trovato." });
        }

        const comments = await prisma.comment.findMany({
            where: { memeId: memeId },
            orderBy: { date: 'desc' }, 
            include: { user: { select: { username: true, imageUrl: true } } } 
        });

        res.json(comments);

    } catch (error) {
        console.error("Errore nel controller getMemeComments:", error);
        res.status(500).json({ error: "Errore interno del server nel recupero dei commenti." });
    }
};

module.exports = {
    addComment,
    getMemeComments
};