import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { getDB, fechar } from './db.js';
import { routerSync } from './sync.js';
import { routerMovements } from './movements.js';
import { routerConfig } from './config.js';
import { routerWebhooks } from './webhooks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Inicializa banco
getDB();

// Servir o build do frontend (dist/ na raiz do projeto)
app.use(express.static(path.join(__dirname, '../dist')));

// Rotas
app.use('/api', routerSync);
app.use('/api', routerMovements);
app.use('/api', routerConfig);
app.use('/api', routerWebhooks);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Fallback SPA: qualquer rota não /api serve o index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

function shutdown() {
  console.log('Encerrando...');
  fechar();
  server.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
