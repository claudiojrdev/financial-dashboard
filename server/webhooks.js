import { Router } from 'express';
import { getDB } from './db.js';

export const routerWebhooks = Router();

const CORES = [
  '#3478f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#0ea5e9', '#84cc16',
];

function garantirCategoria(db, idcategoria, nome) {
  const idInt = idcategoria != null ? parseInt(idcategoria, 10) : null;
  const idValido = idInt !== null && Number.isFinite(idInt);
  const ehValida = nome && nome !== 'Não Informado';

  if (idValido) {
    const existente = db.prepare('SELECT id FROM categorias WHERE meeventos_id = ?').get(idInt);
    if (existente) return existente.id;
  }

  if (!ehValida) return null;

  const porNome = db.prepare('SELECT id FROM categorias WHERE nome = ?').get(nome);
  if (porNome) return porNome.id;

  const id = crypto.randomUUID();
  const cor = CORES[Math.floor(Math.random() * CORES.length)];
  db.prepare('INSERT INTO categorias (id, nome, cor, meeventos_id) VALUES (?, ?, ?, ?)').run(id, nome, cor, idInt);
  return id;
}

function upsertMovimento(db, dados) {
  const id = `meev-${dados.id}`;
  const existente = db.prepare('SELECT id FROM movimentacoes WHERE id = ?').get(id);

  const categoria_id = garantirCategoria(db, dados.idcategoria, dados.categoria);

  const mov = {
    id,
    nome: dados.descricao || 'Sem descrição',
    categoria_id,
    unidade: dados.centrodecusto || dados.informede || '',
    tipocobranca: dados.tipocobranca === 'Receita' || dados.tipocobranca === '1' ? 'receita' : 'despesa',
    valor: parseFloat(dados.valor) || 0,
    valor_pago: dados.pago === 'sim' ? parseFloat(dados.valor) || 0 : null,
    data_vencimento: dados.datapagamento || dados.datacompetencia,
    data_pagamento: dados.pago === 'sim' ? (dados.datapagamento || null) : null,
    pago: dados.pago === 'sim' ? 1 : 0,
    meeventos_id: parseInt(dados.id, 10),
    meeventos_evento: dados.evento || null,
  };

  if (existente) {
    db.prepare(`
      UPDATE movimentacoes SET
        nome = @nome, categoria_id = @categoria_id, unidade = @unidade,
        tipocobranca = @tipocobranca, valor = @valor, valor_pago = @valor_pago,
        data_vencimento = @data_vencimento, data_pagamento = @data_pagamento,
        pago = @pago, meeventos_evento = @meeventos_evento,
        updated_at = datetime('now')
      WHERE id = @id
    `).run(mov);
  } else {
    db.prepare(`
      INSERT INTO movimentacoes (id, nome, categoria_id, unidade, tipocobranca, valor, valor_pago, data_vencimento, data_pagamento, pago, meeventos_id, meeventos_evento)
      VALUES (@id, @nome, @categoria_id, @unidade, @tipocobranca, @valor, @valor_pago, @data_vencimento, @data_pagamento, @pago, @meeventos_id, @meeventos_evento)
    `).run(mov);
  }
}

function deletarMovimento(db, id) {
  const localId = `meev-${id}`;
  db.prepare('DELETE FROM movimentacoes WHERE id = ?').run(localId);
}

routerWebhooks.post('/webhooks/meeventos', (req, res) => {
  const db = getDB();
  const payload = req.body;

  if (!payload || !payload.event || !payload.data) {
    return res.status(400).json({ erro: 'Payload inválido' });
  }

  const { event, data } = payload;
  const registros = Array.isArray(data) ? data : [data];

  try {
    for (const item of registros) {
      switch (event) {
        case 'transaction_created':
          upsertMovimento(db, item);
          break;
        case 'transaction_updated':
          upsertMovimento(db, item);
          break;
        case 'transaction_deleted':
          deletarMovimento(db, item.id);
          break;
        default:
          // eventos não financeiros são ignorados
          break;
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Erro ao processar webhook:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});
