const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// 1. Diciamo a Postgres dove collegarsi (legge dal file .env)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 2. Creiamo l'adattatore
const adapter = new PrismaPg(pool);

// 3. Inizializziamo Prisma passandogli l'adattatore
const prisma = new PrismaClient({ adapter });

// Esportiamo questa singola istanza per usarla in tutto il progetto
module.exports = prisma;