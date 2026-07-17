import { Router } from 'express';
import { getDB } from './db.js';

export const routerMovements = Router();

routerMovements.get('/movements', (req, res) => {
  const db = getDB();
  const { since, pago, tipocobranca, page = 1, limit = '500' } = req.query;

  let sql = 'SELECT * FROM movimentacoes WHERE 1=1';
  const params = [];

  if (since) {
    sql += ' AND updated_at > ?';
    params.push(since);
  }
  if (pago !== undefined) {
    sql += ' AND pago = ?';
    params.push(pago === 'true' || pago === '1' ? 1 : 0);
  }
  if (tipocobranca) {
    sql += ' AND tipocobranca = ?';
    params.push(tipocobranca);
  }

  sql += ' ORDER BY data_vencimento DESC';

  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
  sql += ` LIMIT ? OFFSET ?`;
  params.push(parseInt(limit, 10), offset);

  const movimentos = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as total FROM movimentacoes').get().total;

  res.json({
    data: movimentos.map(normalizar),
    pagination: { page: parseInt(page, 10), page_size: parseInt(limit, 10), total },
  });
});

routerMovements.get('/categories', (_req, res) => {
  const db = getDB();
  const categorias = db.prepare('SELECT id, nome, cor FROM categorias').all();
  res.json(categorias);
});

routerMovements.put('/movements/:id/toggle-pago', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  const mov = db.prepare('SELECT * FROM movimentacoes WHERE id = ?').get(id);
  if (!mov) return res.status(404).json({ erro: 'Movimentação não encontrada' });

  const novoPago = mov.pago ? 0 : 1;
  const hoje = new Date().toISOString().slice(0, 10);

  db.prepare(`
    UPDATE movimentacoes
    SET pago = ?, data_pagamento = ?, valor_pago = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(novoPago, novoPago ? hoje : null, novoPago ? mov.valor : null, id);

  const atualizada = db.prepare('SELECT * FROM movimentacoes WHERE id = ?').get(id);
  res.json(normalizar(atualizada));
});

function normalizar(mov) {
  return {
    ...mov,
    pago: mov.pago === 1,
    valor_pago: mov.valor_pago ?? null,
  };
}
