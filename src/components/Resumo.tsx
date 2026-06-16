import type { Totais } from '../lib/totais';
import { formatarMoeda } from '../lib/format';

interface Props {
  totais: Totais;
}

export function Resumo({ totais }: Props) {
  const itens = [
    { rotulo: 'Previsto', valor: totais.previsto, cor: 'text-slate-700 dark:text-slate-200', ponto: 'bg-slate-400' },
    { rotulo: 'Pago', valor: totais.pago, cor: 'text-emerald-600 dark:text-emerald-400', ponto: 'bg-emerald-500' },
    { rotulo: 'Pendente', valor: totais.pendente, cor: 'text-amber-600 dark:text-amber-400', ponto: 'bg-amber-500' },
    { rotulo: 'Vencido', valor: totais.vencido, cor: 'text-red-600 dark:text-red-400', ponto: 'bg-red-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {itens.map((it) => (
        <div key={it.rotulo} className="card px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${it.ponto}`} />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{it.rotulo}</span>
          </div>
          <div className={`mt-0.5 text-base font-bold tabular-nums ${it.cor}`}>
            {formatarMoeda(it.valor)}
          </div>
        </div>
      ))}
    </div>
  );
}
