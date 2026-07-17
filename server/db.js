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
  }
  return db;
}

function migrar() {
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

export function fechar() {
  if (db) {
    db.close();
    db = null;
  }
}
