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
      className={`group w-full rounded-md border border-l-4 px-2 py-1 text-left text-xs
        transition-colors hover:brightness-[0.97] dark:hover:brightness-125
        ${arrastavel ? 'cursor-grab active:cursor-grabbing' : ''} ${meta.barra} ${meta.borda} ${meta.fundo}`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: cor }}
          title={catNome}
        />
        <span
          className={`min-w-0 flex-1 break-words font-medium ${
            conta.pago ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'
          }`}
        >
          {conta.nome}
        </span>
      </div>
      {detalhado && (
        <div className="mt-0.5 truncate pl-7 text-[10px] text-slate-400 dark:text-slate-500">
          {catNome}
          {conta.unidade && conta.unidade !== '—' ? ` · ${conta.unidade}` : ''}
        </div>
      )}
      <div className="mt-0.5 flex items-center gap-x-1 pl-7">
        <span className="tabular-nums font-semibold text-slate-600 dark:text-slate-300">
          total - {formatarMoeda(conta.valor)}
        </span>
      </div>
    </button>
  );
}
