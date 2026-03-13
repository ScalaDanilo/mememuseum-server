const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // 1. Cerchiamo il token nell'header della richiesta
  const authHeader = req.header('Authorization');

  // Se non c'è l'header, l'utente non è loggato
  if (!authHeader) {
    return res.status(401).json({ error: "Accesso negato. Nessun token fornito." });
  }

  // Il token di solito arriva nel formato "Bearer <token>"
  const token = authHeader.replace('Bearer ', '');

  try {
    // 2. Verifichiamo se il token è valido usando la nostra password segreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Salviamo i dati decodificati (userId e username) nella richiesta
    // Così il controller saprà esattamente CHI sta caricando il meme!
    req.user = decoded;
    
    // 4. "Via libera!": passiamo la palla al controller
    next();
  } catch (error) {
    res.status(401).json({ error: "Token non valido o scaduto." });
  }
};

module.exports = authMiddleware;