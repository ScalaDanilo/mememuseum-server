const prisma = require('../config/prisma');
const { get } = require('../routes/meme.routes');

// --- RECUPERO DI TUTTI I MEME (CON FILTRI E PAGINAZIONE, ORDINATI PER DATA) ---
const getAllMemes = async (req, res) => {
    try {
        // 1. Estraiamo i parametri dalla query string (es: ?page=1&tag=Gatto)
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Massimo 10 meme per pagina (come da traccia)
        const skip = (page - 1) * limit;

        const tagFilter = req.query.tag;

        // 2. Costruiamo le condizioni di ricerca (WHERE)
        let whereCondition = {};
        if (tagFilter) {
            whereCondition = {
                tags: {
                    some: {
                        name: {
                            equals: tagFilter,
                            mode: 'insensitive' // Ignora maiuscole/minuscole
                        }
                    }
                }
            };
        }

        // 3. Chiediamo a Prisma di trovare i meme con le nuove regole
        const memes = await prisma.meme.findMany({
            skip: skip,
            take: limit,
            where: whereCondition,
            orderBy: { uploadDate: 'desc' }, // Sempre ordinati dal più recente
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

        // 4. Contiamo i meme totali (utile al frontend per sapere quante pagine ci sono in totale)
        const totalMemes = await prisma.meme.count({ where: whereCondition });
        const totalPages = Math.ceil(totalMemes / limit);

        // Restituiamo un oggetto strutturato con i dati e i metadati della paginazione
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

// --- RICERCA AVANZATA DEI MEME (FILTRI E ORDINAMENTO) ---
const searchMemes = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const tagFilter = req.query.tag;
        // Aggiorniamo le opzioni di ordinamento per usare la nuova logica
        const sortBy = req.query.sortBy; // 'date_asc', 'date_desc', 'most_upvoted', 'most_downvoted'

        // 1. Costruiamo la condizione WHERE per i tag (Questo esclude tutti i meme senza questo tag!)
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

        // 2. Se l'ordinamento è per DATA, Prisma può farlo da solo
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

        // 3. Se l'ordinamento è per VOTI, sfruttiamo la tua meccanica (likes vs dislikes)
        if (sortBy === 'most_upvoted' || sortBy === 'most_downvoted') {
            // Prendiamo tutti i meme che rispettano l'eventuale filtro tag
            const allMemes = await prisma.meme.findMany({
                where: whereCondition,
                include: {
                    user: { select: { username: true } },
                    tags: true,
                    votes: true, // Includiamo i voti per contarli in JS
                    _count: { select: { comments: true } }
                }
            });

            // Applichiamo la stessa identica meccanica di getMemeVotes
            const memesWithScores = allMemes.map(meme => {
                const likesCount = meme.votes.filter(v => v.value === 1).length;
                const dislikesCount = meme.votes.filter(v => v.value === -1).length;

                // Rimuoviamo l'array 'votes' pesante e aggiungiamo i conteggi puliti
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

            // Ordiniamo l'array in base a cosa ci ha chiesto l'utente
            memesWithScores.sort((a, b) => {
                if (sortBy === 'most_upvoted') {
                    return b.likesCount - a.likesCount; // Il numero più alto di Upvote va per primo
                } else if (sortBy === 'most_downvoted') {
                    return b.dislikesCount - a.dislikesCount; // Il numero più alto di Downvote va per primo
                }
            });

            // Applichiamo la paginazione manualmente estraendo solo i 10 elementi della pagina corrente
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

// --- MEME DEL GIORNO (GET) ---
const getDailyMeme = async (req, res) => {
  try {
    // 1. Otteniamo il numero totale di meme nel database
    const totalMemes = await prisma.meme.count();

    // Se non ci sono meme, restituiamo un errore 404
    if (totalMemes === 0) {
      return res.status(404).json({ error: "Nessun meme presente nel database per il meme del giorno." });
    }

    // 2. Calcoliamo un "indice del giorno" basato sulla data attuale.
    // Usiamo il numero di giorni trascorsi dall'inizio dell'anno (Epoch).
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now - start) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    // 3. Calcoliamo quale meme prendere usando il modulo.
    // L'indice cambierà ogni giorno, ma se ci sono meno meme dei giorni dell'anno, ricomincerà da capo.
    const memeIndex = dayOfYear % totalMemes;

    // 4. Recuperiamo il meme specifico usando 'skip'
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

// --- CREAZIONE DI UN NUOVO MEME (AGGIORNATO: MULTER, TAG E DESCRIZIONE) ---
const createMeme = async (req, res) => {
  try {
    // Aggiunta 'description' all'estrazione dal body
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

    const newMeme = await prisma.meme.create({
      data: {
        title: title,
        // Se non viene passata, description sarà undefined o passata come stringa vuota, 
        // nel database diventerà null (grazie al '?' nello schema Prisma)
        description: description || null, 
        imageUrl: imageUrl,
        userId: userId,
        tags: { connect: tagsConnect }
      },
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

// Esportiamo anche la nuova funzione getAllTags
module.exports = {
    getAllMemes,
    searchMemes,
    getDailyMeme,
    createMeme,
    voteMeme,
    addComment,
    getMemeComments,
    getMemeVotes,
    getMemeById,
    deleteMeme,
    getAllTags
};