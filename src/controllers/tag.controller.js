const prisma = require('../config/prisma');

const getAllTags = async (req, res) => {
    try {
        const { search } = req.query;

        const queryOptions = {
            orderBy: { name: 'asc' } 
        };

        if (search) {
            queryOptions.where = {
                name: {
                    contains: search,
                    mode: 'insensitive'
                }
            };
        }

        const tags = await prisma.tag.findMany(queryOptions);
        
        res.json(tags);
    } catch (error) {
        console.error("Errore nel recupero dei tag:", error);
        res.status(500).json({ error: "Errore interno del server nel recupero dei tag." });
    }
};

// Crea un nuovo tag se non esiste già nel database (case-insensitive)
const createTag = async (req, res) => {
    try {
        const { name } = req.body;
        
        // Validazione dell'input
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Il nome del tag non può essere vuoto' });
        }

        // Normalizzazione: rimuoviamo gli spazi vuoti e convertiamo tutto in minuscolo
        const normalizedName = name.trim().toLowerCase();

        // Verifica se il tag esiste già nel database
        const existingTag = await prisma.tag.findUnique({
            where: { name: normalizedName }
        });

        if (existingTag) {
            // Se esiste già, restituiamo il tag esistente con stato 200 (evita la duplicazione)
            return res.status(200).json(existingTag);
        }

        // Se non esiste, creiamo il nuovo tag nel database
        const newTag = await prisma.tag.create({
            data: { name: normalizedName }
        });

        res.status(201).json(newTag);
    } catch (error) {
        res.status(500).json({ message: 'Errore durante la creazione del tag', error: error.message });
    }
};

module.exports = {
    getAllTags,
    createTag
};