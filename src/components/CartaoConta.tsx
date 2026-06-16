import type { Categoria, Conta } from '../types';
import { formatarMoeda } from '../lib/format';
import { META_STATUS, statusDaConta } from '../lib/status';
import { corCategoria, nomeCategoria } from '../lib/categorias';

interface Props {
  conta: Conta;
  hoje: string;
  mapaCat: Map<string, Categoria>;
  detalhado?: boolean;
  arrastavel?: boolean;
  onClick: (conta: Conta) => void;
  onTogglePago: (conta: Conta) => void;
  onArrastarInicio?: (conta: Conta) => void;
  onArrastarFim?: () => void;
}

export function CartaoConta({
  conta,
  hoje,
  mapaCat,
  detalhado,
  arrastavel,
  onClick,
  onTogglePago,
  onArrastarInicio,
  onArrastarFim,
}: Props) {
  const status = statusDaConta(conta, hoje);
  const meta = META_STATUS[status];
  const cor = corCategoria(conta.categoria_id, mapaCat);
  const catNome = nomeCategoria(conta.categoria_id, mapaCat);

  return (
    <button
      type="button"
      draggable={arrastavel}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', conta.id);
        e.dataTransfer.effectAllowed = 'move';
        onArrastarInicio?.(conta);
      }}
      onDragEnd={() => onArrastarFim?.()}
      onClick={() => onClick(conta)}
      title={`${conta.nome} · ${meta.rotulo} · ${formatarMoeda(conta.valor)}`}
      className={`group w-full rounded-md border-l-4 bg-slate-50 px-2 py-1 text-left text-xs
        transition-colors hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800
        ${arrastavel ? 'cursor-grab active:cursor-grabbing' : ''} ${meta.barra}`}
    >
      <div className="flex items-center gap-1.5">
        <span
          role="checkbox"
          aria-checked={conta.pago}
          aria-label={conta.pago ? 'Marcar como não pago' : 'Marcar como pago'}
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePago(conta);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onTogglePago(conta);
            }
          }}
          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border
            transition-colors
            ${
              conta.pago
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900'
            }`}
        >
          {conta.pago && (
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3.5}>
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: cor }}
          title={catNome}
        />
        <span
          className={`flex-1 truncate font-medium ${
            conta.pago ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'
          }`}
        >
          {conta.nome}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between pl-7">
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          {formatarMoeda(conta.valor)}
        </span>
        {detalhado && (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.chip}`}>
            {meta.rotulo}
          </span>
        )}
      </div>
      {detalhado && (
        <div className="mt-0.5 truncate pl-7 text-[10px] text-slate-400 dark:text-slate-500">
          {catNome}
          {conta.unidade && conta.unidade !== '—' ? ` · ${conta.unidade}` : ''}
        </div>
      )}
    </button>
  );
}
