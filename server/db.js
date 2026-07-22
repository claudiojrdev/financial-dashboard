import crypto from 'crypto';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data.sqlite');

let db;

export function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrar();
    garantirJwtSecret();
  }
  return db;
}

function garantirJwtSecret() {
  const linha = db.prepare("SELECT valor FROM config WHERE chave = 'jwt_secret'").get();
  if (!linha) {
    const secret = crypto.randomBytes(32).toString('hex');
    db.prepare("INSERT INTO config (chave, valor) VALUES ('jwt_secret', ?)").run(secret);
  }
}

function migrar() {
  let versao = '0';
  try {
    versao = db.prepare("SELECT valor FROM config WHERE chave = 'db_version'").get()?.valor || '0';
  } catch {}

  if (versao === '0') {
    db.exec(`
      CREATE TABLE IF NOT EXISTS categorias (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        cor TEXT NOT NULL,
        meeventos_id INTEGER
      );

      CREATE TABLE IF NOT EXISTS movimentacoes (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        categoria_id TEXT REFERENCES categorias(id),
        unidade TEXT NOT NULL DEFAULT '',
        tipocobranca TEXT NOT NULL CHECK(tipocobranca IN ('receita', 'despesa')) DEFAULT 'despesa',
        valor REAL NOT NULL,
        valor_pago REAL,
        data_vencimento TEXT NOT NULL,
        data_pagamento TEXT,
        pago INTEGER NOT NULL DEFAULT 0,
        meeventos_id INTEGER,
        meeventos_evento TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_mov_vencimento ON movimentacoes(data_vencimento);
      CREATE INDEX IF NOT EXISTS idx_mov_meeventos ON movimentacoes(meeventos_id);
      CREATE INDEX IF NOT EXISTS idx_mov_categoria ON movimentacoes(categoria_id);
      CREATE INDEX IF NOT EXISTS idx_mov_pago ON movimentacoes(pago);

      CREATE TABLE IF NOT EXISTS sync_meta (
        chave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS config (
        chave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      );
    `);
  }

  // Migração 2: multi-usuário
  if (versao === '0' || versao === '1') {
    db.exec(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        webhook_token TEXT UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS config_usuario (
        user_id TEXT NOT NULL REFERENCES usuarios(id),
        chave TEXT NOT NULL,
        valor TEXT NOT NULL,
        PRIMARY KEY (user_id, chave)
      );
    `);

    // Adiciona coluna user_id nas tabelas existentes (se não existir)
    try { db.exec("ALTER TABLE movimentacoes ADD COLUMN user_id TEXT REFERENCES usuarios(id)"); } catch {}
    try { db.exec("ALTER TABLE categorias ADD COLUMN user_id TEXT REFERENCES usuarios(id)"); } catch {}

    db.prepare("INSERT OR REPLACE INTO config (chave, valor) VALUES ('db_version', '2')").run();
  }

  // Migração 3: webhook_token
  if (versao === '0' || versao === '1' || versao === '2') {
    try { db.exec("ALTER TABLE usuarios ADD COLUMN webhook_token TEXT UNIQUE"); } catch {}
    db.prepare("INSERT OR REPLACE INTO config (chave, valor) VALUES ('db_version', '3')").run();
  }
}

export function atribuirDadosAoPrimeiroUsuario(userId) {
  const semDono = db.prepare("SELECT COUNT(*) as total FROM movimentacoes WHERE user_id IS NULL").get();
  if (semDono.total === 0) return;

  db.prepare("UPDATE movimentacoes SET user_id = ? WHERE user_id IS NULL").run(userId);
  db.prepare("UPDATE categorias SET user_id = ? WHERE user_id IS NULL").run(userId);
}

export function getJwtSecret() {
  const linha = db.prepare("SELECT valor FROM config WHERE chave = 'jwt_secret'").get();
  return linha ? linha.valor : '';
}

export function fechar() {
  if (db) {
    db.close();
    db = null;
  }
}
