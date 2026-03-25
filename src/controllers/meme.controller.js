const prisma = require('../config/prisma');

const getAllMemes = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const tagFilter = req.query.tag;

        let whereCondition = {};
        if (tagFilter) {
            whereCondition = {
                tags: {
                    some: {
                        name: {
                            equals: tagFilter,
                            mode: 'insensitive'
                        }
                    }
                }
            };
        }

        const memes = await prisma.meme.findMany({
            skip: skip,
            take: limit,
            where: whereCondition,
            orderBy: { uploadDate: 'desc' },
            include: {
                user: {
                    select: { username: true }
                },
                tags: true,
                _count: {
                    select: { comments: true, votes: true }
                }
            }
        });

        const totalMemes = await prisma.meme.count({ where: whereCondition });
        const totalPages = Math.ceil(totalMemes / limit);

        res.json({
            data: memes,
            meta: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: totalMemes
            }
        });

    } catch (error) {
        console.error("Errore nel controller getAllMemes:", error);
        res.status(500).json({ error: "Errore interno del server durante il recupero dei meme." });
    }
};

const searchMemes = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const tagFilter = req.query.tag;
        const sortBy = req.query.sortBy;

        let whereCondition = {};
        if (tagFilter) {
            whereCondition = {
                tags: {
                    some: {
                        name: {
                            equals: tagFilter,
                            mode: 'insensitive'
                        }
                    }
                }
            };
        }

        if (sortBy === 'date_asc' || sortBy === 'date_desc' || !sortBy) {
            const orderByCondition = sortBy === 'date_asc' ? { uploadDate: 'asc' } : { uploadDate: 'desc' };

            const memes = await prisma.meme.findMany({
                skip: skip,
                take: limit,
                where: whereCondition,
                orderBy: orderByCondition,
                include: {
                    user: { select: { username: true } },
                    tags: true,
                    _count: { select: { comments: true, votes: true } }
                }
            });

            const totalMemes = await prisma.meme.count({ where: whereCondition });

            return res.json({
                data: memes,
                meta: {
                    currentPage: page,
                    totalPages: Math.ceil(totalMemes / limit),
                    totalItems: totalMemes
                }
            });
        }

        if (sortBy === 'most_upvoted' || sortBy === 'most_downvoted') {
            const allMemes = await prisma.meme.findMany({
                where: whereCondition,
                include: {
                    user: { select: { username: true } },
                    tags: true,
                    votes: true,
                    _count: { select: { comments: true } }
                }
            });

            const memesWithScores = allMemes.map(meme => {
                const likesCount = meme.votes.filter(v => v.value === 1).length;
                const dislikesCount = meme.votes.filter(v => v.value === -1).length;

                const { votes, ...memeData } = meme;
                return {
                    ...memeData,
                    likesCount,
                    dislikesCount,
                    _count: {
                        comments: meme._count.comments,
                        votes: votes.length
                    }
                };
            });

            memesWithScores.sort((a, b) => {
                if (sortBy === 'most_upvoted') {
                    return b.likesCount - a.likesCount;
                } else if (sortBy === 'most_downvoted') {
                    return b.dislikesCount - a.dislikesCount;
                }
            });

            const paginatedMemes = memesWithScores.slice(skip, skip + limit);

            return res.json({
                data: paginatedMemes,
                meta: {
                    currentPage: page,
                    totalPages: Math.ceil(memesWithScores.length / limit),
                    totalItems: memesWithScores.length
                }
            });
        }

    } catch (error) {
        console.error("Errore nel controller searchMemes:", error);
        res.status(500).json({ error: "Errore interno del server durante la ricerca dei meme." });
    }
};

const getDailyMeme = async (req, res) => {
  try {
    const totalMemes = await prisma.meme.count();

    if (totalMemes === 0) {
      return res.status(404).json({ error: "Nessun meme presente nel database per il meme del giorno." });
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const memeIndex = dayOfYear % totalMemes;

    const dailyMeme = await prisma.meme.findFirst({
      skip: memeIndex,
      include: {
        user: { select: { username: true } },
        tags: true,
        _count: { select: { comments: true, votes: true } }
      }
    });

    res.json(dailyMeme);

  } catch (error) {
    console.error("Errore nel controller getDailyMeme:", error);
    res.status(500).json({ error: "Errore interno del server durante il recupero del meme del giorno." });
  }
};

const createMeme = async (req, res) => {
  try {
    const { title, description } = req.body;
    let { tagIds } = req.body;
    const userId = req.user.userId;

    if (!title) {
      return res.status(400).json({ error: "Il titolo è obbligatorio." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "L'immagine è obbligatoria." });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    let tagsConnect = [];
    if (tagIds) {
      if (typeof tagIds === 'string') {
        tagIds = tagIds.replace(/[\[\]]/g, '').split(',');
      }
      if (Array.isArray(tagIds) && tagIds.length > 0) {
        tagsConnect = tagIds
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id))
          .map(id => ({ id }));
      }
    }

    const memeData = {
      title: title,
      description: description || null, 
      imageUrl: imageUrl,
      userId: userId
    };

    if (tagsConnect.length > 0) {
      memeData.tags = { connect: tagsConnect };
    }

    const newMeme = await prisma.meme.create({
      data: memeData,
      include: { tags: true }
    });

    res.status(201).json({
      message: "Meme caricato con successo!",
      meme: newMeme
    });

  } catch (error) {
    console.error("Errore nel controller createMeme:", error);
    res.status(500).json({ error: "Errore interno del server durante la creazione." });
  }
};

const getMemeById = async (req, res) => {
    try {
        const memeId = parseInt(req.params.id);

        const meme = await prisma.meme.findUnique({
            where: { id: memeId },
            include: {
                user: { select: { username: true, imageUrl: true } }, 
                tags: true,
                comments: {
                    orderBy: { date: 'desc' },
                    include: {
                        user: { select: { username: true, imageUrl: true } }
                    }
                },
                _count: { select: { comments: true, votes: true } }
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

const deleteMeme = async (req, res) => {
    try {
        const memeId = parseInt(req.params.id);
        const userId = req.user.userId;

        const meme = await prisma.meme.findUnique({
            where: { id: memeId }
        });

        if (!meme) {
            return res.status(404).json({ error: "Meme non trovato." });
        }

        if (meme.userId !== userId) {
            return res.status(403).json({ error: "Azione negata. Puoi eliminare solo i meme creatati da te." });
        }

        await prisma.vote.deleteMany({ where: { memeId: memeId } });
        await prisma.comment.deleteMany({ where: { memeId: memeId } });

        await prisma.meme.delete({
            where: { id: memeId }
        });

        res.json({ message: "Meme e tutti i relativi dati eliminati con successo!" });

    } catch (error) {
        console.error("Errore nel controller deleteMeme:", error);
        res.status(500).json({ error: "Errore interno del server durante l'eliminazione del meme." });
    }
};

module.exports = {
    getAllMemes,
    searchMemes,
    getDailyMeme,
    createMeme,
    getMemeById,
    deleteMeme
};