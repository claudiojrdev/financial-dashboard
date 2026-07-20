import type { PontoSerie, Totais } from '../lib/totais';
import { formatarMoeda } from '../lib/format';
import { GraficoResumo } from './GraficoResumo';

interface Props {
  totais: Totais;
  serieGrafico?: PontoSerie[];
}

export function Resumo({ totais, serieGrafico }: Props) {
  const itens = [
    { rotulo: 'Previsto', valor: totais.previsto, cor: 'text-slate-700 dark:text-slate-200', ponto: 'bg-slate-400' },
    { rotulo: 'Pago', valor: totais.pago, cor: 'text-emerald-600 dark:text-emerald-400', ponto: 'bg-emerald-500' },
    { rotulo: 'Pendente', valor: totais.pendente, cor: 'text-amber-600 dark:text-amber-400', ponto: 'bg-amber-500' },
    { rotulo: 'Vencido', valor: totais.vencido, cor: 'text-red-600 dark:text-red-400', ponto: 'bg-red-500' },
  ];

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="card min-w-0 flex-[1_1_0] divide-y divide-slate-100 dark:divide-slate-800">
        {itens.map((it) => (
          <div key={it.rotulo} className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${it.ponto}`} />
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{it.rotulo}</span>
            </div>
            <div className={`text-base font-bold tabular-nums ${it.cor}`}>
              {formatarMoeda(it.valor)}
            </div>
          </div>
        ))}
      </div>
      {serieGrafico && serieGrafico.length >= 2 && (
        <div className="card min-w-0 flex-[1_1_0] px-4 py-3">
          <GraficoResumo serie={serieGrafico} />
        </div>
      )}
    </div>
  );
}
