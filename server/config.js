import { Router } from 'express';
import { getDB } from './db.js';

export const routerConfig = Router();

routerConfig.get('/config', (req, res) => {
  const db = getDB();
  const linhas = db.prepare('SELECT chave, valor FROM config_usuario WHERE user_id = ?').all(req.userId);
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
    'INSERT INTO config_usuario (user_id, chave, valor) VALUES (?, ?, ?) ON CONFLICT(user_id, chave) DO UPDATE SET valor = excluded.valor'
  );

  upsert.run(req.userId, 'meeventos_url', meeventos_url.replace(/\/+$/, ''));
  upsert.run(req.userId, 'meeventos_token', meeventos_token);

  res.json({ status: 'ok', message: 'Configuração salva.' });
});