import { useEffect, useMemo, useState } from 'react';
import type { Categoria, Conta } from '../types';
import { agruparPorMes } from '../lib/calendar';
import { calcularTotais } from '../lib/totais';
import { formatarMoeda } from '../lib/format';
import { META_STATUS, statusDaConta } from '../lib/status';
import { corCategoria } from '../lib/categorias';
import { IconLixeira } from './icons';

interface Props {
  contas: Conta[];
  categorias: Categoria[];
  mapaCat: Map<string, Categoria>;
  hoje: string;
  onUpsert: (conta: Conta) => void;
  onTogglePago: (conta: Conta) => void;
  onExcluir: (id: string) => void;
}

export function TabelaContas({
  contas,
  categorias,
  mapaCat,
  hoje,
  onUpsert,
  onTogglePago,
  onExcluir,
}: Props) {
  const grupos = useMemo(() => agruparPorMes(contas), [contas]);

  if (contas.length === 0) {
    return (
      <div className="flex h-full items-center justify-center py-16 text-center text-sm text-slate-400">
        Nenhuma conta para os filtros atuais.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full min-w-[920px] border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800">
          <tr>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Nome</th>
            <th className="px-3 py-2 font-semibold">Categoria</th>
            <th className="px-3 py-2 font-semibold">C. Custo</th>
            <th className="px-3 py-2 text-right font-semibold">Valor</th>
            <th className="px-3 py-2 text-right font-semibold">Pago</th>
            <th className="px-3 py-2 font-semibold">Vencimento</th>
            <th className="px-3 py-2 font-semibold">Pagamento</th>
            <th className="px-3 py-2 text-center font-semibold">Pago?</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((g) => {
            const t = calcularTotais(g.contas, hoje);
            return (
              <FragmentoMes
                key={g.chave}
                titulo={g.titulo}
                subtotal={t}
                contas={g.contas}
                categorias={categorias}
                mapaCat={mapaCat}
                hoje={hoje}
                onUpsert={onUpsert}
                onTogglePago={onTogglePago}
                onExcluir={onExcluir}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface FragmentoProps {
  titulo: string;
  subtotal: ReturnType<typeof calcularTotais>;
  contas: Conta[];
  categorias: Categoria[];
  mapaCat: Map<string, Categoria>;
  hoje: string;
  onUpsert: (c: Conta) => void;
  onTogglePago: (c: Conta) => void;
  onExcluir: (id: string) => void;
}

function FragmentoMes({
  titulo,
  subtotal,
  contas,
  categorias,
  mapaCat,
  hoje,
  onUpsert,
  onTogglePago,
  onExcluir,
}: FragmentoProps) {
  return (
    <>
      <tr className="bg-slate-50 dark:bg-slate-900/60">
        <td colSpan={4} className="px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
          {titulo} · {contas.length} conta(s)
        </td>
        <td colSpan={6} className="px-3 py-1.5 text-right text-xs text-slate-500">
          Previsto <strong className="tabular-nums">{formatarMoeda(subtotal.previsto)}</strong> ·{' '}
          <span className="text-emerald-600 dark:text-emerald-400">Pago {formatarMoeda(subtotal.pago)}</span> ·{' '}
          <span className="text-amber-600 dark:text-amber-400">Pendente {formatarMoeda(subtotal.pendente)}</span>
        </td>
      </tr>
      {contas.map((c) => (
        <LinhaTabela
          key={c.id}
          conta={c}
          categorias={categorias}
          mapaCat={mapaCat}
          hoje={hoje}
          onUpsert={onUpsert}
          onTogglePago={onTogglePago}
          onExcluir={onExcluir}
        />
      ))}
    </>
  );
}

interface LinhaProps {
  conta: Conta;
  categorias: Categoria[];
  mapaCat: Map<string, Categoria>;
  hoje: string;
  onUpsert: (c: Conta) => void;
  onTogglePago: (c: Conta) => void;
  onExcluir: (id: string) => void;
}

function LinhaTabela({ conta, categorias, mapaCat, hoje, onUpsert, onTogglePago, onExcluir }: LinhaProps) {
  const [draft, setDraft] = useState<Conta>(conta);
  useEffect(() => setDraft(conta), [conta]);

  const status = statusDaConta(conta, hoje);
  const meta = META_STATUS[status];
  const cls = 'w-full bg-transparent px-1 py-1 rounded focus:bg-white focus:ring-1 focus:ring-brand-500 focus:outline-none dark:focus:bg-slate-950';

  function commit(parcial: Partial<Conta>) {
    const atualizada = { ...conta, ...parcial };
    onUpsert(atualizada);
  }

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
      <td className="px-3 py-1">
        <span className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${meta.chip}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.ponto}`} />
          {meta.rotulo}
        </span>
      </td>
      <td className="px-2 py-1">
        <input
          className={cls}
          value={draft.nome}
          onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
          onBlur={() => draft.nome !== conta.nome && commit({ nome: draft.nome.trim() || 'Sem nome' })}
        />
      </td>
      <td className="px-2 py-1">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: corCategoria(conta.categoria_id, mapaCat) }} />
          <select
            className={cls}
            value={conta.categoria_id ?? ''}
            onChange={(e) => commit({ categoria_id: e.target.value || null })}
          >
            <option value="">Sem categoria</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="px-2 py-1">
        <input
          className={cls}
          value={draft.unidade}
          onChange={(e) => setDraft({ ...draft, unidade: e.target.value })}
          onBlur={() => draft.unidade !== conta.unidade && commit({ unidade: draft.unidade })}
        />
      </td>
      <td className="px-2 py-1 text-right">
        <input
          type="number"
          step="0.01"
          className={`${cls} text-right tabular-nums`}
          value={Number.isNaN(draft.valor) ? '' : draft.valor}
          onChange={(e) => setDraft({ ...draft, valor: e.target.value === '' ? 0 : Number(e.target.value) })}
          onBlur={() => draft.valor !== conta.valor && commit({ valor: draft.valor })}
        />
      </td>
      <td className="px-2 py-1 text-right">
        <input
          type="number"
          step="0.01"
          className={`${cls} text-right tabular-nums`}
          value={draft.valor_pago ?? ''}
          onChange={(e) => setDraft({ ...draft, valor_pago: e.target.value === '' ? null : Number(e.target.value) })}
          onBlur={() => draft.valor_pago !== conta.valor_pago && commit({ valor_pago: draft.valor_pago })}
        />
      </td>
      <td className="px-2 py-1">
        <input
          type="date"
          className={cls}
          value={draft.data_vencimento}
          onChange={(e) => setDraft({ ...draft, data_vencimento: e.target.value })}
          onBlur={() =>
            draft.data_vencimento &&
            draft.data_vencimento !== conta.data_vencimento &&
            commit({ data_vencimento: draft.data_vencimento })
          }
        />
      </td>
      <td className="px-2 py-1">
        <input
          type="date"
          className={cls}
          value={draft.data_pagamento ?? ''}
          onChange={(e) => setDraft({ ...draft, data_pagamento: e.target.value || null })}
          onBlur={() => draft.data_pagamento !== conta.data_pagamento && commit({ data_pagamento: draft.data_pagamento })}
        />
      </td>
      <td className="px-3 py-1 text-center">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          checked={conta.pago}
          onChange={() => onTogglePago(conta)}
          aria-label="Pago"
        />
      </td>
      <td className="px-2 py-1 text-right">
        <button
          type="button"
          onClick={() => onExcluir(conta.id)}
          className="btn-ghost px-1.5 py-1.5 text-slate-400 hover:text-red-600"
          aria-label="Excluir conta"
        >
          <IconLixeira width={15} height={15} />
        </button>
      </td>
    </tr>
  );
}
