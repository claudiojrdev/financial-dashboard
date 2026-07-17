import type { Categoria, Conta, GrupoConta } from '../types';
import { formatarMoeda } from '../lib/format';
import { META_STATUS } from '../lib/status';
import { CartaoConta } from './CartaoConta';
import { IconChevronBaixo } from './icons';

interface Props {
  grupo: GrupoConta;
  expandido: boolean;
  onToggle: () => void;
  hoje: string;
  mapaCat: Map<string, Categoria>;
  detalhado?: boolean;
  onClick: (conta: Conta) => void;
  onArrastarInicio?: (conta: Conta) => void;
  onArrastarFim?: () => void;
}

export function CartaoGrupo({
  grupo,
  expandido,
  onToggle,
  hoje,
  mapaCat,
  detalhado,
  onClick,
  onArrastarInicio,
  onArrastarFim,
}: Props) {
  const meta = META_STATUS[grupo.status];
  const todoPago = grupo.status === 'pago';

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expandido}
        className={`group w-full rounded-md border border-l-4 px-2 py-1 text-left text-xs
          transition-colors hover:brightness-[0.97] dark:hover:brightness-125 ${meta.barra} ${meta.borda} ${meta.fundo}`}
      >
        <div className="flex flex-col gap-y-0.5">
          <div className="flex items-center gap-x-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: grupo.catCor }}
            />
            <span
              className={`break-words font-medium ${
                todoPago
                  ? 'text-slate-400 line-through dark:text-slate-500'
                  : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              {grupo.catNome}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 pl-[18px]">
            <span className="shrink-0 text-[10px] text-slate-400">
              {grupo.contas.length} {grupo.contas.length === 1 ? 'mov.' : 'mov.'}
            </span>
            <span
              className={`shrink-0 text-slate-400 transition-transform ${expandido ? 'rotate-180' : ''}`}
            >
              <IconChevronBaixo width={12} height={12} />
            </span>
          </div>
        </div>
        {detalhado && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1 pl-[18px]">
            <span className="tabular-nums font-semibold text-slate-600 dark:text-slate-300">
              aberto {formatarMoeda(grupo.emAberto)}
            </span>
          </div>
        )}
        <div className="mt-0.5 flex items-center gap-x-1 pl-[18px]">
          <span className="tabular-nums font-semibold text-slate-600 dark:text-slate-300">
            total - {formatarMoeda(grupo.soma)}
          </span>
        </div>
      </button>

      {expandido && (
        <div className="ml-3 mt-1 flex flex-col gap-1 border-l-2 border-slate-200 pl-2 dark:border-slate-700">
          {grupo.contas.map((c) => (
            <CartaoConta
              key={c.id}
              conta={c}
              hoje={hoje}
              mapaCat={mapaCat}
              detalhado={detalhado}
              arrastavel
              onClick={onClick}
              onArrastarInicio={onArrastarInicio}
              onArrastarFim={onArrastarFim}
            />
          ))}
        </div>
      )}
    </div>
  );
}
