import { Router } from 'express';
import { getDB } from './db.js';

export const routerSync = Router();

function getConfig() {
  const db = getDB();
  const linhas = db.prepare('SELECT chave, valor FROM config').all();
  return Object.fromEntries(linhas.map((r) => [r.chave, r.valor]));
}

function mapearCategoria(db, nome, meeventos_id) {
  const ehValida = nome && nome !== 'Não Informado';

  // Se tem meeventos_id válido, tenta lookup primeiro
  const idInt = Number.isFinite(meeventos_id) ? meeventos_id : null;
  if (idInt !== null) {
    const existente = db.prepare('SELECT id FROM categorias WHERE meeventos_id = ?').get(idInt);
    if (existente) return existente.id;
  }

  if (!ehValida) return null;

  const porNome = db.prepare('SELECT id FROM categorias WHERE nome = ?').get(nome);
  if (porNome) return porNome.id;

  const id = crypto.randomUUID();
  const cores = [
    '#3478f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#0ea5e9', '#84cc16',
  ];
  const cor = cores[Math.floor(Math.random() * cores.length)];
  db.prepare('INSERT INTO categorias (id, nome, cor, meeventos_id) VALUES (?, ?, ?, ?)').run(id, nome, cor, idInt);
  return id;
}

function mapearMovimento(item) {
  return {
    id: `meev-${item.id}`,
    nome: item.descricao || 'Sem descrição',
    categoria_id: null,
    unidade: item.centrodecusto || item.informede || '',
    tipocobranca: item.tipocobranca === 'Receita' || item.tipocobranca === '1' ? 'receita' : 'despesa',
    valor: parseFloat(item.valor) || 0,
    valor_pago: item.pago === 'sim' ? parseFloat(item.valor) || 0 : null,
    data_vencimento: item.datapagamento || item.datacompetencia,
    data_pagamento: item.pago === 'sim' ? (item.datapagamento || null) : null,
    pago: item.pago === 'sim' ? 1 : 0,
    meeventos_id: parseInt(item.id, 10),
    meeventos_evento: item.evento || null,
  };
}

async function buscarMovimentos(url, token, page = 1) {
  const params = new URLSearchParams({ page, limit: '200', field_sort: 'id', sort: 'desc' });
  const response = await fetch(`${url}/api/v1/financial?${params}`, {
    headers: { Authorization: token },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Erro Meeventos: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

routerSync.post('/meeventos/sync', async (req, res) => {
  try {
    const config = getConfig();
    if (!config.meeventos_url || !config.meeventos_token) {
      return res.status(400).json({ erro: 'Meeventos não configurado. Use POST /api/config primeiro.' });
    }

    const db = getDB();
    let page = 1;
    let total = 0;
    let totalPaginas = 1;
    const idsSincronizados = [];

    db.prepare('DELETE FROM sync_meta WHERE chave = ?').run('sync_erro');

    do {
      const resultado = await buscarMovimentos(config.meeventos_url, config.meeventos_token, page);
      const movimentos = resultado.data || [];
      totalPaginas = resultado.pagination?.total_page || 1;

      const agoraSQL = new Date().toISOString();

      const upsertMov = db.prepare(`
        INSERT INTO movimentacoes (id, nome, categoria_id, unidade, tipocobranca, valor, valor_pago, data_vencimento, data_pagamento, pago, meeventos_id, meeventos_evento, updated_at)
        VALUES (@id, @nome, @categoria_id, @unidade, @tipocobranca, @valor, @valor_pago, @data_vencimento, @data_pagamento, @pago, @meeventos_id, @meeventos_evento, @agora)
        ON CONFLICT(id) DO UPDATE SET
          nome = excluded.nome,
          categoria_id = excluded.categoria_id,
          unidade = excluded.unidade,
          tipocobranca = excluded.tipocobranca,
          valor = excluded.valor,
          valor_pago = excluded.valor_pago,
          data_vencimento = excluded.data_vencimento,
          data_pagamento = excluded.data_pagamento,
          pago = excluded.pago,
          meeventos_evento = excluded.meeventos_evento,
          updated_at = excluded.updated_at
      `);

      const insertBatch = db.transaction((items) => {
        for (const item of items) {
          const mov = mapearMovimento(item);
          const idCat = item.idcategoria != null ? parseInt(item.idcategoria, 10) : null;
          mov.categoria_id = mapearCategoria(db, item.categoria, idCat);
          upsertMov.run({ ...mov, agora: agoraSQL });
          idsSincronizados.push(mov.id);
        }
      });

      insertBatch(movimentos);
      total += movimentos.length;
      page++;
    } while (page <= totalPaginas);

    if (idsSincronizados.length > 0) {
      const placeholders = idsSincronizados.map(() => '?').join(',');
      db.prepare(`DELETE FROM movimentacoes WHERE id LIKE 'meev-%' AND id NOT IN (${placeholders})`).run(...idsSincronizados);
    }

    const agora = new Date().toISOString();
    db.prepare('INSERT INTO sync_meta (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor')
      .run('ultima_sync', agora);

    res.json({ status: 'ok', movimentos_sincronizados: total, ultima_sync: agora });
  } catch (err) {
    const db = getDB();
    db.prepare('INSERT INTO sync_meta (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor')
      .run('sync_erro', err.message);
    res.status(500).json({ erro: err.message });
  }
});

routerSync.get('/meeventos/status', (_req, res) => {
  const db = getDB();
  const metas = db.prepare('SELECT chave, valor FROM sync_meta').all();
  const status = Object.fromEntries(metas.map((r) => [r.chave, r.valor]));

  const total = db.prepare('SELECT COUNT(*) as total FROM movimentacoes').get();

  res.json({
    configurado: !!getConfig().meeventos_url,
    ...status,
    total_movimentos: total.total,
  });
});
