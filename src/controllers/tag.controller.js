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

module.exports = {
    getAllTags
};