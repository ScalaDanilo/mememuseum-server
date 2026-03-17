const prisma = require('../config/prisma');

// --- RECUPERARE TUTTI I TAG DISPONIBILI (GET) ---
const getAllTags = async (req, res) => {
    try {
        // Estraiamo il parametro di ricerca dalla query string (es. /api/tags?search=humor)
        const { search } = req.query;

        // Prepariamo l'oggetto base per la query (ordine alfabetico)
        const queryOptions = {
            orderBy: { name: 'asc' } 
        };

        // Se l'utente ha digitato qualcosa, aggiungiamo il filtro "where"
        if (search) {
            queryOptions.where = {
                name: {
                    contains: search,       // Cerca i tag che contengono la parola digitata
                    mode: 'insensitive'     // Rende la ricerca non sensibile alle maiuscole/minuscole
                }
            };
        }

        // Eseguiamo la query con Prisma
        const tags = await prisma.tag.findMany(queryOptions);
        
        res.json(tags);
    } catch (error) {
        console.error("Errore nel recupero dei tag:", error);
        res.status(500).json({ error: "Errore interno del server nel recupero dei tag." });
    }
};

module.exports = {
    getAllTags
};