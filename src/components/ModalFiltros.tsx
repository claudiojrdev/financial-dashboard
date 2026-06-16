import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  Categoria,
  CampoFiltro,
  GrupoFiltro,
  ItemFiltro,
  Operador,
  Regra,
} from '../types';
import {
  ROTULO_CAMPO,
  ROTULO_OPERADOR,
  STATUS_OPCOES,
  TIPO_DO_CAMPO,
  type TipoCampo,
  atualizarNaArvore,
  inserirNaArvore,
  novaRegra,
  novoGrupo,
  operadoresDe,
  removerDaArvore,
} from '../lib/filtros';
import { META_STATUS } from '../lib/status';
import { IconFechar, IconLixeira, IconMais } from './icons';

interface Props {
  aberto: boolean;
  filtroAtual: GrupoFiltro | null;
  categorias: Categoria[];
  onFechar: () => void;
  onAplicar: (filtro: GrupoFiltro | null) => void;
}

const CAMPOS: CampoFiltro[] = [
  'categoria_id',
  'unidade',
  'status',
  'nome',
  'valor',
  'valor_pago',
  'pago',
  'data_vencimento',
  'data_pagamento',
];

/** Valor inicial coerente ao trocar de campo/operador. */
function valorPadrao(campo: CampoFiltro, operador: Operador): Regra['valor'] {
  const tipo = TIPO_DO_CAMPO[campo];
  if (operador === 'entre') return tipo === 'data' ? ['', ''] : [0, 0];
  if (tipo === 'numero') return 0;
  if (tipo === 'booleano') return true;
  return '';
}

export function ModalFiltros({ aberto, filtroAtual, categorias, onFechar, onAplicar }: Props) {
  const [raiz, setRaiz] = useState<GrupoFiltro>(filtroAtual ?? novoGrupo('E'));

  useEffect(() => {
    if (aberto) setRaiz(filtroAtual ?? novoGrupo('E'));
  }, [aberto, filtroAtual]);

  function aplicar() {
    onAplicar(raiz.itens.length ? raiz : null);
    onFechar();
  }

  function limpar() {
    setRaiz(novoGrupo('E'));
    onAplicar(null);
    onFechar();
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
            aria-label="Filtros"
            className="card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-b-none sm:rounded-2xl"
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <h3 className="text-base font-semibold">Filtros</h3>
              <button type="button" onClick={onFechar} className="btn-ghost px-1.5 py-1.5" aria-label="Fechar">
                <IconFechar />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="mb-3 text-sm text-slate-500">
                Combine condições com <strong>E</strong> / <strong>OU</strong>. Use grupos para
                aninhar regras, ex.: <em>(Categoria = X OU Valor &gt; 1000) E Status ≠ Pago</em>.
              </p>
              <EditorGrupo
                grupo={raiz}
                categorias={categorias}
                raiz
                onMudar={setRaiz}
              />
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
              <button type="button" onClick={limpar} className="btn text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                Limpar filtros
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={onFechar} className="btn-outline">
                  Cancelar
                </button>
                <button type="button" onClick={aplicar} className="btn-primary">
                  Aplicar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---- Editor de grupo (recursivo) ----

interface EditorGrupoProps {
  grupo: GrupoFiltro;
  categorias: Categoria[];
  raiz?: boolean;
  onMudar: (g: GrupoFiltro) => void;
  onRemover?: () => void;
}

function EditorGrupo({ grupo, categorias, raiz, onMudar, onRemover }: EditorGrupoProps) {
  function setComb(combinador: 'E' | 'OU') {
    onMudar({ ...grupo, combinador });
  }
  function addRegra() {
    onMudar(inserirNaArvore(grupo, grupo.id, novaRegra()));
  }
  function addGrupo() {
    onMudar(inserirNaArvore(grupo, grupo.id, novoGrupo('OU')));
  }
  function mudarItem(item: ItemFiltro) {
    onMudar(atualizarNaArvore(grupo, item.id, () => item));
  }
  function removerItem(id: string) {
    onMudar(removerDaArvore(grupo, id));
  }

  return (
    <div className={`rounded-xl border p-3 ${raiz ? 'border-slate-200 dark:border-slate-800' : 'border-dashed border-slate-300 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/30'}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Combinar com</span>
          <div className="flex overflow-hidden rounded-md border border-slate-200 text-xs dark:border-slate-700">
            {(['E', 'OU'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setComb(c)}
                className={`px-2.5 py-1 font-semibold ${
                  grupo.combinador === c
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-slate-500 dark:bg-slate-900'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        {!raiz && onRemover && (
          <button type="button" onClick={onRemover} className="btn-ghost px-1.5 py-1" aria-label="Remover grupo">
            <IconLixeira width={15} height={15} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {grupo.itens.length === 0 && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400 dark:bg-slate-800/40">
            Sem condições neste grupo.
          </p>
        )}
        {grupo.itens.map((item) =>
          item.tipo === 'regra' ? (
            <EditorRegra
              key={item.id}
              regra={item}
              categorias={categorias}
              onMudar={mudarItem}
              onRemover={() => removerItem(item.id)}
            />
          ) : (
            <EditorGrupo
              key={item.id}
              grupo={item}
              categorias={categorias}
              onMudar={mudarItem}
              onRemover={() => removerItem(item.id)}
            />
          )
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <button type="button" onClick={addRegra} className="btn-outline px-2.5 py-1 text-xs">
          <IconMais width={14} height={14} /> Condição
        </button>
        <button type="button" onClick={addGrupo} className="btn-outline px-2.5 py-1 text-xs">
          <IconMais width={14} height={14} /> Grupo
        </button>
      </div>
    </div>
  );
}

// ---- Editor de regra ----

interface EditorRegraProps {
  regra: Regra;
  categorias: Categoria[];
  onMudar: (r: Regra) => void;
  onRemover: () => void;
}

function EditorRegra({ regra, categorias, onMudar, onRemover }: EditorRegraProps) {
  const tipo = TIPO_DO_CAMPO[regra.campo];
  const ops = operadoresDe(tipo);

  function mudarCampo(campo: CampoFiltro) {
    const novoTipo = TIPO_DO_CAMPO[campo];
    const op = operadoresDe(novoTipo)[0];
    onMudar({ ...regra, campo, operador: op, valor: valorPadrao(campo, op) });
  }
  function mudarOperador(operador: Operador) {
    onMudar({ ...regra, operador, valor: valorPadrao(regra.campo, operador) });
  }
  function mudarValor(valor: Regra['valor']) {
    onMudar({ ...regra, valor });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900">
      <select
        className="field-input w-auto py-1 text-xs"
        value={regra.campo}
        onChange={(e) => mudarCampo(e.target.value as CampoFiltro)}
        aria-label="Campo"
      >
        {CAMPOS.map((c) => (
          <option key={c} value={c}>
            {ROTULO_CAMPO[c]}
          </option>
        ))}
      </select>

      <select
        className="field-input w-auto py-1 text-xs"
        value={regra.operador}
        onChange={(e) => mudarOperador(e.target.value as Operador)}
        aria-label="Operador"
      >
        {ops.map((o) => (
          <option key={o} value={o}>
            {ROTULO_OPERADOR[o]}
          </option>
        ))}
      </select>

      <ValorRegra regra={regra} tipo={tipo} categorias={categorias} onMudar={mudarValor} />

      <button type="button" onClick={onRemover} className="btn-ghost ml-auto px-1 py-1" aria-label="Remover condição">
        <IconLixeira width={14} height={14} />
      </button>
    </div>
  );
}

interface ValorRegraProps {
  regra: Regra;
  tipo: TipoCampo;
  categorias: Categoria[];
  onMudar: (v: Regra['valor']) => void;
}

function ValorRegra({ regra, tipo, categorias, onMudar }: ValorRegraProps) {
  const { operador, valor } = regra;
  const cls = 'field-input w-auto py-1 text-xs';

  if (operador === 'entre') {
    const par = Array.isArray(valor) ? valor : tipo === 'data' ? ['', ''] : [0, 0];
    const ehData = tipo === 'data';
    return (
      <div className="flex items-center gap-1">
        <input
          type={ehData ? 'date' : 'number'}
          className={cls}
          value={par[0] as string | number}
          onChange={(e) => onMudar([ehData ? e.target.value : Number(e.target.value), par[1]] as Regra['valor'])}
        />
        <span className="text-xs text-slate-400">e</span>
        <input
          type={ehData ? 'date' : 'number'}
          className={cls}
          value={par[1] as string | number}
          onChange={(e) => onMudar([par[0], ehData ? e.target.value : Number(e.target.value)] as Regra['valor'])}
        />
      </div>
    );
  }

  if (tipo === 'categoria') {
    return (
      <select className={cls} value={String(valor ?? '')} onChange={(e) => onMudar(e.target.value)} aria-label="Valor">
        <option value="">Sem categoria</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>
    );
  }

  if (tipo === 'status') {
    return (
      <select className={cls} value={String(valor ?? '')} onChange={(e) => onMudar(e.target.value)} aria-label="Valor">
        {STATUS_OPCOES.map((s) => (
          <option key={s} value={s}>
            {META_STATUS[s].rotulo}
          </option>
        ))}
      </select>
    );
  }

  if (tipo === 'booleano') {
    return (
      <select
        className={cls}
        value={valor === true || valor === 'true' ? 'true' : 'false'}
        onChange={(e) => onMudar(e.target.value === 'true')}
        aria-label="Valor"
      >
        <option value="true">Sim</option>
        <option value="false">Não</option>
      </select>
    );
  }

  if (tipo === 'numero') {
    return (
      <input
        type="number"
        className={cls}
        value={typeof valor === 'number' ? valor : ''}
        onChange={(e) => onMudar(Number(e.target.value))}
        aria-label="Valor"
      />
    );
  }

  if (tipo === 'data') {
    return (
      <input
        type="date"
        className={cls}
        value={typeof valor === 'string' ? valor : ''}
        onChange={(e) => onMudar(e.target.value)}
        aria-label="Valor"
      />
    );
  }

  // texto
  return (
    <input
      type="text"
      className={cls}
      placeholder="valor"
      value={typeof valor === 'string' ? valor : ''}
      onChange={(e) => onMudar(e.target.value)}
      aria-label="Valor"
    />
  );
}
