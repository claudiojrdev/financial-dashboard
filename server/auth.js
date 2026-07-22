import crypto from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB, getJwtSecret, atribuirDadosAoPrimeiroUsuario } from './db.js';

export const routerAuth = Router();

routerAuth.post('/auth/register', (req, res) => {
  const db = getDB();
  const { username, password } = req.body;

  if (!username || username.trim().length < 2) {
    return res.status(400).json({ erro: 'O usuário deve ter no mínimo 2 caracteres.' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ erro: 'A senha deve ter no mínimo 4 caracteres.' });
  }

  const usernameNormalized = username.trim().toLowerCase();
  const existente = db.prepare('SELECT id FROM usuarios WHERE username = ?').get(usernameNormalized);
  if (existente) {
    return res.status(409).json({ erro: 'Nome de usuário já existe.' });
  }

  const id = crypto.randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  const webhookToken = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO usuarios (id, username, password_hash, webhook_token) VALUES (?, ?, ?, ?)').run(id, usernameNormalized, hash, webhookToken);

  atribuirDadosAoPrimeiroUsuario(id);

  const secret = getJwtSecret();
  const token = jwt.sign({ userId: id, username: usernameNormalized }, secret, { expiresIn: '7d' });
  res.json({ token, user: { id, username: usernameNormalized, webhook_token: webhookToken } });
});

routerAuth.get('/auth/status', (_req, res) => {
  const db = getDB();
  const total = db.prepare('SELECT COUNT(*) as total FROM usuarios').get().total;
  res.json({ configurada: total > 0 });
});

routerAuth.post('/auth/login', (req, res) => {
  const db = getDB();
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ erro: 'Usuário e senha são obrigatórios.' });
  }

  const usernameNormalized = username.trim().toLowerCase();
  const usuario = db.prepare('SELECT id, username, password_hash FROM usuarios WHERE username = ?').get(usernameNormalized);
  if (!usuario) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  }

  if (!bcrypt.compareSync(password, usuario.password_hash)) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  }

  const secret = getJwtSecret();
  const token = jwt.sign({ userId: usuario.id, username: usuario.username }, secret, { expiresIn: '7d' });
  res.json({ token, user: { id: usuario.id, username: usuario.username } });
});

routerAuth.get('/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido.' });
  }

  const secret = getJwtSecret();
  try {
    const payload = jwt.verify(authHeader.slice(7), secret);
    res.json({ autenticado: true, user: { id: payload.userId, username: payload.username } });
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
});

export function autenticar(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    _res.status(401).json({ erro: 'Token não fornecido.' });
    return;
  }

  const secret = getJwtSecret();
  try {
    const payload = jwt.verify(authHeader.slice(7), secret);
    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch {
    _res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}