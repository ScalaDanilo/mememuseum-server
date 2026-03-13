const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Assicuriamoci che la cartella "uploads" esista
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. Configurazione dello Storage (dove e come salvare i file)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Salviamo i file nella cartella 'uploads' nella root del progetto
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Creiamo un nome univoco per evitare sovrascritture: timestamp + estensione originale
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 2. Configurazione del Filtro (accettiamo solo immagini)
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // File accettato
  } else {
    cb(new Error('Formato non supportato. Carica solo immagini (JPEG, PNG, GIF, WEBP).'), false); // File rifiutato
  }
};

// 3. Inizializziamo Multer
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite massimo 5MB per immagine
  }
});

module.exports = upload;