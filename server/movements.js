import { Router } from 'express';
import { getDB } from './db.js';

export const routerMovements = Router();

routerMovements.get('/movements', (req, res) => {
  const db = getDB();
  const { since, pago, tipocobranca, page = 1, limit = '10000' } = req.query;

  let sql = 'SELECT * FROM movimentacoes WHERE user_id = ?';
  const params = [req.userId];

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
  sql += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), offset);

  const movimentos = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as total FROM movimentacoes WHERE user_id = ?').get(req.userId).total;

  res.json({
    data: movimentos.map(normalizar),
    pagination: { page: parseInt(page, 10), page_size: parseInt(limit, 10), total },
  });
});

routerMovements.get('/categories', (req, res) => {
  const db = getDB();
  const categorias = db.prepare('SELECT id, nome, cor FROM categorias WHERE user_id = ?').all(req.userId);
  res.json(categorias);
});

routerMovements.put('/movements/:id/toggle-pago', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  const mov = db.prepare('SELECT * FROM movimentacoes WHERE id = ? AND user_id = ?').get(id, req.userId);
  if (!mov) return res.status(404).json({ erro: 'Movimentação não encontrada' });

  const novoPago = mov.pago ? 0 : 1;
  const hoje = new Date().toISOString().slice(0, 10);

  db.prepare(`
    UPDATE movimentacoes
    SET pago = ?, data_pagamento = ?, valor_pago = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(novoPago, novoPago ? hoje : null, novoPago ? mov.valor : null, new Date().toISOString(), id, req.userId);

  const atualizada = db.prepare('SELECT * FROM movimentacoes WHERE id = ? AND user_id = ?').get(id, req.userId);
  res.json(normalizar(atualizada));
});

routerMovements.post('/movements', (req, res) => {
  const db = getDB();
  const { id, nome, categoria_id, unidade, tipocobranca, valor, valor_pago, data_vencimento, data_pagamento, pago } = req.body;

  if (!id || !nome || !data_vencimento) {
    return res.status(400).json({ erro: 'Campos obrigatórios: id, nome, data_vencimento' });
  }

  const existente = db.prepare('SELECT id FROM movimentacoes WHERE id = ? AND user_id = ?').get(id, req.userId);

  const mov = {
    id,
    nome,
    categoria_id: categoria_id || null,
    unidade: unidade || '',
    tipocobranca: tipocobranca === 'receita' ? 'receita' : 'despesa',
    valor: parseFloat(valor) || 0,
    valor_pago: valor_pago != null ? parseFloat(valor_pago) : null,
    data_vencimento,
    data_pagamento: data_pagamento || null,
    pago: pago ? 1 : 0,
    meeventos_id: null,
    meeventos_evento: null,
    user_id: req.userId,
    updated_at: new Date().toISOString(),
  };

  if (existente) {
    db.prepare(`
      UPDATE movimentacoes SET
        nome = @nome, categoria_id = @categoria_id, unidade = @unidade,
        tipocobranca = @tipocobranca, valor = @valor, valor_pago = @valor_pago,
        data_vencimento = @data_vencimento, data_pagamento = @data_pagamento,
        pago = @pago, updated_at = @updated_at
      WHERE id = @id AND user_id = @user_id
    `).run(mov);
  } else {
    db.prepare(`
      INSERT INTO movimentacoes (id, nome, categoria_id, unidade, tipocobranca, valor, valor_pago, data_vencimento, data_pagamento, pago, meeventos_id, meeventos_evento, user_id, created_at, updated_at)
      VALUES (@id, @nome, @categoria_id, @unidade, @tipocobranca, @valor, @valor_pago, @data_vencimento, @data_pagamento, @pago, @meeventos_id, @meeventos_evento, @user_id, @updated_at, @updated_at)
    `).run(mov);
  }

  const atualizada = db.prepare('SELECT * FROM movimentacoes WHERE id = ? AND user_id = ?').get(id, req.userId);
  res.status(existente ? 200 : 201).json(normalizar(atualizada));
});

routerMovements.delete('/movements/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  const mov = db.prepare('SELECT id FROM movimentacoes WHERE id = ? AND user_id = ?').get(id, req.userId);
  if (!mov) return res.status(404).json({ erro: 'Movimentação não encontrada' });

  db.prepare('DELETE FROM movimentacoes WHERE id = ? AND user_id = ?').run(id, req.userId);
  res.json({ status: 'ok' });
});

routerMovements.post('/movements/bulk', (req, res) => {
  const db = getDB();
  const { movimentacoes, categorias } = req.body;

  const upsertMov = db.prepare(`
    INSERT INTO movimentacoes (id, nome, categoria_id, unidade, tipocobranca, valor, valor_pago, data_vencimento, data_pagamento, pago, meeventos_id, meeventos_evento, user_id, created_at, updated_at)
    VALUES (@id, @nome, @categoria_id, @unidade, @tipocobranca, @valor, @valor_pago, @data_vencimento, @data_pagamento, @pago, @meeventos_id, @meeventos_evento, @user_id, @updated_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      nome = excluded.nome, categoria_id = excluded.categoria_id, unidade = excluded.unidade,
      tipocobranca = excluded.tipocobranca, valor = excluded.valor, valor_pago = excluded.valor_pago,
      data_vencimento = excluded.data_vencimento, data_pagamento = excluded.data_pagamento,
      pago = excluded.pago, meeventos_evento = excluded.meeventos_evento,
      user_id = excluded.user_id, updated_at = excluded.updated_at
  `);

  const upsertCat = db.prepare(`
    INSERT INTO categorias (id, nome, cor, user_id) VALUES (@id, @nome, @cor, @user_id)
    ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, cor = excluded.cor, user_id = excluded.user_id
  `);

  const transaction = db.transaction(() => {
    // Remove todos os dados atuais do usuário
    db.prepare('DELETE FROM movimentacoes WHERE user_id = ? AND id NOT LIKE ?').run(req.userId, 'meev-%');
    db.prepare('DELETE FROM categorias WHERE user_id = ?').run(req.userId);

    const agora = new Date().toISOString();
    const cats = Array.isArray(categorias) ? categorias : [];
    for (const cat of cats) {
      upsertCat.run({ ...cat, user_id: req.userId });
    }

    const movs = Array.isArray(movimentacoes) ? movimentacoes : [];
    for (const m of movs) {
      upsertMov.run({
        id: m.id,
        nome: m.nome,
        categoria_id: m.categoria_id || null,
        unidade: m.unidade || '',
        tipocobranca: m.tipocobranca === 'receita' ? 'receita' : 'despesa',
        valor: parseFloat(m.valor) || 0,
        valor_pago: m.valor_pago != null ? parseFloat(m.valor_pago) : null,
        data_vencimento: m.data_vencimento,
        data_pagamento: m.data_pagamento || null,
        pago: m.pago ? 1 : 0,
        meeventos_id: m.meeventos_id || null,
        meeventos_evento: m.meeventos_evento || null,
        user_id: req.userId,
        updated_at: agora,
      });
    }
  });

  transaction();
  res.json({ status: 'ok', movimentos: (movimentacoes || []).length, categorias: (categorias || []).length });
});

// ---- Categorias ----

routerMovements.post('/categories', (req, res) => {
  const db = getDB();
  const { id, nome, cor } = req.body;

  if (!id || !nome) {
    return res.status(400).json({ erro: 'Campos obrigatórios: id, nome' });
  }

  const catId = id;
  db.prepare('INSERT INTO categorias (id, nome, cor, user_id) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, cor = excluded.cor').run(catId, nome.trim(), cor || '#94a3b8', req.userId);

  const categoria = db.prepare('SELECT id, nome, cor FROM categorias WHERE id = ? AND user_id = ?').get(catId, req.userId);
  res.status(201).json(categoria);
});

routerMovements.put('/categories/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { nome, cor } = req.body;

  const existente = db.prepare('SELECT id FROM categorias WHERE id = ? AND user_id = ?').get(id, req.userId);
  if (!existente) return res.status(404).json({ erro: 'Categoria não encontrada' });

  db.prepare('UPDATE categorias SET nome = ?, cor = ? WHERE id = ? AND user_id = ?').run(nome || 'Sem nome', cor || '#94a3b8', id, req.userId);

  const categoria = db.prepare('SELECT id, nome, cor FROM categorias WHERE id = ? AND user_id = ?').get(id, req.userId);
  res.json(categoria);
});

routerMovements.delete('/categories/:id', (req, res) => {
  const db = getDB();
  const { id } = req.params;

  const existente = db.prepare('SELECT id FROM categorias WHERE id = ? AND user_id = ?').get(id, req.userId);
  if (!existente) return res.status(404).json({ erro: 'Categoria não encontrada' });

  // Desassocia das contas
  db.prepare('UPDATE movimentacoes SET categoria_id = NULL WHERE categoria_id = ? AND user_id = ?').run(id, req.userId);
  db.prepare('DELETE FROM categorias WHERE id = ? AND user_id = ?').run(id, req.userId);

  res.json({ status: 'ok' });
});

function normalizar(mov) {
  return {
    ...mov,
    pago: mov.pago === 1,
    valor_pago: mov.valor_pago ?? null,
  };
}