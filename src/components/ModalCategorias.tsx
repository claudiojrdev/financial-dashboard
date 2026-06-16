import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Categoria, Conta } from '../types';
import { PALETA, corPorIndice } from '../lib/categorias';
import { IconFechar, IconLixeira, IconMais } from './icons';

interface Props {
  aberto: boolean;
  categorias: Categoria[];
  contas: Conta[];
  onFechar: () => void;
  onCriar: (nome: string, cor: string) => Promise<unknown>;
  onAtualizar: (categoria: Categoria) => Promise<unknown>;
  onExcluir: (id: string) => Promise<unknown>;
}

export function ModalCategorias({
  aberto,
  categorias,
  contas,
  onFechar,
  onCriar,
  onAtualizar,
  onExcluir,
}: Props) {
  const [novoNome, setNovoNome] = useState('');

  // Quantas contas usam cada categoria.
  const uso = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of contas) {
      if (c.categoria_id) m.set(c.categoria_id, (m.get(c.categoria_id) ?? 0) + 1);
    }
    return m;
  }, [contas]);

  async function criar() {
    const nome = novoNome.trim();
    if (!nome) return;
    await onCriar(nome, corPorIndice(categorias.length));
    setNovoNome('');
  }

  async function excluir(cat: Categoria) {
    const n = uso.get(cat.id) ?? 0;
    const msg =
      n > 0
        ? `Excluir "${cat.nome}"? ${n} conta(s) ficarão sem categoria.`
        : `Excluir "${cat.nome}"?`;
    if (window.confirm(msg)) await onExcluir(cat.id);
  }

  return (
    <AnimatePresence>
      {aberto && (
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
            aria-label="Categorias"
            className="card flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-b-none sm:rounded-2xl"
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <h3 className="text-base font-semibold">Categorias</h3>
              <button type="button" onClick={onFechar} className="btn-ghost px-1.5 py-1.5" aria-label="Fechar">
                <IconFechar />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Nova categoria */}
              <div className="mb-4 flex gap-2">
                <input
                  className="field-input"
                  placeholder="Nova categoria…"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      criar();
                    }
                  }}
                />
                <button type="button" onClick={criar} className="btn-primary" disabled={!novoNome.trim()}>
                  <IconMais width={16} height={16} /> Adicionar
                </button>
              </div>

              {categorias.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">Nenhuma categoria ainda.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {categorias.map((cat) => (
                    <LinhaCategoria
                      key={cat.id}
                      categoria={cat}
                      usos={uso.get(cat.id) ?? 0}
                      onAtualizar={onAtualizar}
                      onExcluir={() => excluir(cat)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface LinhaProps {
  categoria: Categoria;
  usos: number;
  onAtualizar: (c: Categoria) => Promise<unknown>;
  onExcluir: () => void;
}

function LinhaCategoria({ categoria, usos, onAtualizar, onExcluir }: LinhaProps) {
  const [nome, setNome] = useState(categoria.nome);
  const [abrirCores, setAbrirCores] = useState(false);

  function salvarNome() {
    const limpo = nome.trim();
    if (limpo && limpo !== categoria.nome) onAtualizar({ ...categoria, nome: limpo });
    else setNome(categoria.nome);
  }

  return (
    <li className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 dark:border-slate-700">
      <div className="relative">
        <button
          type="button"
          onClick={() => setAbrirCores((v) => !v)}
          className="h-6 w-6 rounded-full border border-black/10"
          style={{ backgroundColor: categoria.cor }}
          aria-label="Mudar cor"
          title="Mudar cor"
        />
        {abrirCores && (
          <div className="absolute left-0 top-8 z-10 grid grid-cols-6 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {PALETA.map((cor) => (
              <button
                key={cor}
                type="button"
                onClick={() => {
                  onAtualizar({ ...categoria, cor });
                  setAbrirCores(false);
                }}
                className="h-5 w-5 rounded-full border border-black/10"
                style={{ backgroundColor: cor }}
                aria-label={`Cor ${cor}`}
              />
            ))}
          </div>
        )}
      </div>

      <input
        className="field-input flex-1 py-1.5"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onBlur={salvarNome}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />

      <span className="w-16 shrink-0 text-right text-xs text-slate-400">
        {usos} {usos === 1 ? 'conta' : 'contas'}
      </span>

      <button type="button" onClick={onExcluir} className="btn-ghost px-1.5 py-1.5" aria-label="Excluir categoria">
        <IconLixeira width={16} height={16} />
      </button>
    </li>
  );
}
