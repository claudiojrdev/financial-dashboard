import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Categoria, Conta } from '../types';
import { hojeISO } from '../lib/status';
import { corPorIndice } from '../lib/categorias';
import { IconFechar, IconLixeira, IconMais } from './icons';

interface Props {
  conta: Conta | null;
  novo: boolean;
  categorias: Categoria[];
  onFechar: () => void;
  onSalvar: (conta: Conta) => void;
  onExcluir: (id: string) => void;
  onCriarCategoria: (nome: string, cor: string) => Promise<Categoria>;
}

export function ModalEdicao({
  conta,
  novo,
  categorias,
  onFechar,
  onSalvar,
  onExcluir,
  onCriarCategoria,
}: Props) {
  const [rascunho, setRascunho] = useState<Conta | null>(conta);
  const [criandoCat, setCriandoCat] = useState(false);
  const [novaCatNome, setNovaCatNome] = useState('');

  useEffect(() => {
    setRascunho(conta);
    setCriandoCat(false);
    setNovaCatNome('');
  }, [conta]);

  // Fecha com ESC.
  useEffect(() => {
    if (!conta) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [conta, onFechar]);

  function set<K extends keyof Conta>(campo: K, valor: Conta[K]) {
    setRascunho((r) => (r ? { ...r, [campo]: valor } : r));
  }

  function togglePago(pago: boolean) {
    setRascunho((r) => {
      if (!r) return r;
      if (pago) {
        return {
          ...r,
          pago: true,
          data_pagamento: r.data_pagamento ?? hojeISO(),
          valor_pago: r.valor_pago ?? r.valor,
        };
      }
      return { ...r, pago: false, data_pagamento: null, valor_pago: null };
    });
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    if (!rascunho) return;
    onSalvar({ ...rascunho, nome: rascunho.nome.trim() || 'Sem nome' });
  }

  async function confirmarNovaCategoria() {
    const nome = novaCatNome.trim();
    if (!nome) {
      setCriandoCat(false);
      return;
    }
    const cat = await onCriarCategoria(nome, corPorIndice(categorias.length));
    set('categoria_id', cat.id);
    setCriandoCat(false);
    setNovaCatNome('');
  }

  return (
    <AnimatePresence>
      {conta && rascunho && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onFechar();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={novo ? 'Nova conta' : 'Editar conta'}
            className="card w-full max-w-lg overflow-hidden rounded-b-none sm:rounded-2xl"
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <h3 className="text-base font-semibold">{novo ? 'Nova conta' : 'Editar conta'}</h3>
              <button type="button" onClick={onFechar} className="btn-ghost px-1.5 py-1.5" aria-label="Fechar">
                <IconFechar />
              </button>
            </div>

            <form onSubmit={submeter} className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="f-nome">Nome / descrição</label>
                  <input
                    id="f-nome"
                    autoFocus
                    className="field-input"
                    value={rascunho.nome}
                    onChange={(e) => set('nome', e.target.value)}
                    placeholder="Ex.: Aluguel, Energia..."
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="f-cat">Categoria</label>
                  {criandoCat ? (
                    <div className="flex gap-1.5">
                      <input
                        autoFocus
                        className="field-input"
                        placeholder="Nome da categoria"
                        value={novaCatNome}
                        onChange={(e) => setNovaCatNome(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            confirmarNovaCategoria();
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            setCriandoCat(false);
                          }
                        }}
                      />
                      <button type="button" onClick={confirmarNovaCategoria} className="btn-primary px-2.5">
                        OK
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <select
                        id="f-cat"
                        className="field-input"
                        value={rascunho.categoria_id ?? ''}
                        onChange={(e) => set('categoria_id', e.target.value || null)}
                      >
                        <option value="">Sem categoria</option>
                        {categorias.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setCriandoCat(true)}
                        title="Nova categoria"
                        className="btn-outline px-2.5"
                      >
                        <IconMais width={16} height={16} />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="field-label" htmlFor="f-uni">Unidade</label>
                  <input
                    id="f-uni"
                    className="field-input"
                    value={rascunho.unidade}
                    onChange={(e) => set('unidade', e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="f-valor">Valor (R$)</label>
                  <input
                    id="f-valor"
                    type="number"
                    step="0.01"
                    className="field-input tabular-nums"
                    value={Number.isNaN(rascunho.valor) ? '' : rascunho.valor}
                    onChange={(e) => set('valor', e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="f-valorpago">Valor pago (R$)</label>
                  <input
                    id="f-valorpago"
                    type="number"
                    step="0.01"
                    className="field-input tabular-nums"
                    value={rascunho.valor_pago ?? ''}
                    onChange={(e) =>
                      set('valor_pago', e.target.value === '' ? null : Number(e.target.value))
                    }
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="f-venc">Vencimento</label>
                  <input
                    id="f-venc"
                    type="date"
                    className="field-input"
                    value={rascunho.data_vencimento}
                    onChange={(e) => set('data_vencimento', e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="f-pgto">Data de pagamento</label>
                  <input
                    id="f-pgto"
                    type="date"
                    className="field-input"
                    value={rascunho.data_pagamento ?? ''}
                    onChange={(e) => set('data_pagamento', e.target.value || null)}
                  />
                </div>

                <label className="mt-1 flex cursor-pointer items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    checked={rascunho.pago}
                    onChange={(e) => togglePago(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Conta paga
                  </span>
                </label>
              </div>

              <div className="mt-5 flex items-center justify-between gap-2">
                {!novo ? (
                  <button
                    type="button"
                    onClick={() => onExcluir(rascunho.id)}
                    className="btn text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <IconLixeira /> Excluir
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={onFechar} className="btn-outline">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary">
                    Salvar
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
