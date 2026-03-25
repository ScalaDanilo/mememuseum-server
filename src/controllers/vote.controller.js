const prisma = require('../config/prisma');

const voteMeme = async (req, res) => {
    try {
        const memeId = parseInt(req.params.memeId);
        const { value } = req.body; 
        const userId = req.user.userId;

        if (isNaN(memeId)) return res.status(400).json({ error: "ID del meme non valido." });

        if (value !== 1 && value !== -1) {
            return res.status(400).json({ error: "Il voto deve essere 1 (Mi Piace) o -1 (Non Mi Piace)." });
        }

        const meme = await prisma.meme.findUnique({ where: { id: memeId } });
        if (!meme) {
            return res.status(404).json({ error: "Meme non trovato." });
        }

        const existingVote = await prisma.vote.findUnique({
            where: { userId_memeId: { userId, memeId } }
        });

        if (existingVote) {
            if (existingVote.value === value) {
                await prisma.vote.delete({ where: { id: existingVote.id } });
                return res.json({ message: "Voto rimosso." });
            } else {
                const updatedVote = await prisma.vote.update({
                    where: { id: existingVote.id },
                    data: { value: value }
                });
                return res.json({ message: "Voto aggiornato.", vote: updatedVote });
            }
        } else {
            const newVote = await prisma.vote.create({
                data: { value, memeId, userId }
            });
            return res.status(201).json({ message: "Voto aggiunto.", vote: newVote });
        }

    } catch (error) {
        console.error("Errore nel controller voteMeme:", error);
        res.status(500).json({ error: "Errore interno del server durante la votazione." });
    }
};

const getMemeVotes = async (req, res) => {
    try {
        const memeId = parseInt(req.params.memeId);
        
        if (isNaN(memeId)) return res.status(400).json({ error: "ID del meme non valido." });

        const meme = await prisma.meme.findUnique({ where: { id: memeId } });
        if (!meme) {
            return res.status(404).json({ error: "Meme non trovato." });
        }

        const votes = await prisma.vote.findMany({
            where: { memeId: memeId },
            include: { user: { select: { username: true, imageUrl: true } } }
        });

        const likedBy = votes.filter(v => v.value === 1).map(v => v.user.username);
        const dislikedBy = votes.filter(v => v.value === -1).map(v => v.user.username);

        const likedUsersData = votes.filter(v => v.value === 1).map(v => ({
            username: v.user.username,
            imageUrl: v.user.imageUrl
        }));

        res.json({
            likesCount: likedBy.length,
            dislikesCount: dislikedBy.length,
            likedBy,       
            dislikedBy,
            likedUsersData
        });

    } catch (error) {
        console.error("Errore nel controller getMemeVotes:", error);
        res.status(500).json({ error: "Errore interno del server nel recupero dei voti." });
    }
};

module.exports = {
    voteMeme,
    getMemeVotes
};