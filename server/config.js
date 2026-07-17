import { Router } from 'express';
import { getDB } from './db.js';

export const routerConfig = Router();

routerConfig.get('/config', (_req, res) => {
  const db = getDB();
  const linhas = db.prepare('SELECT chave, valor FROM config').all();
  const config = Object.fromEntries(linhas.map((r) => [r.chave, r.valor]));
  res.json({
    meeventos_url: config.meeventos_url || '',
    meeventos_token: config.meeventos_token ? '********' : '',
    configurado: !!config.meeventos_url && !!config.meeventos_token,
  });
});

routerConfig.post('/config', (req, res) => {
  const { meeventos_url, meeventos_token } = req.body;
  if (!meeventos_url || !meeventos_token) {
    return res.status(400).json({ erro: 'meeventos_url e meeventos_token são obrigatórios' });
  }

  const db = getDB();
  const upsert = db.prepare(
    'INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor'
  );

  upsert.run('meeventos_url', meeventos_url.replace(/\/+$/, ''));
  upsert.run('meeventos_token', meeventos_token);

  res.json({ status: 'ok', message: 'Configuração salva.' });
});
