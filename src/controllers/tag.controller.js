const prisma = require('../config/prisma');

// --- RECUPERARE TUTTI I TAG DISPONIBILI (GET) ---
const getAllTags = async (req, res) => {
    try {
        const tags = await prisma.tag.findMany({
            orderBy: { name: 'asc' } // Ordine alfabetico
        });
        res.json(tags);
    } catch (error) {
        console.error("Errore nel recupero dei tag:", error);
        res.status(500).json({ error: "Errore interno del server nel recupero dei tag." });
    }
};

module.exports = {
    getAllTags
};