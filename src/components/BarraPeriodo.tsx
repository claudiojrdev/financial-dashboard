import type { Visao } from '../types';
import { tituloPeriodo } from '../lib/calendar';
import { IconDireita, IconEsquerda } from './icons';

interface Props {
  dataRef: string;
  visao: Visao;
  onNavegar: (passo: number) => void;
  onHoje: () => void;
  onTrocarVisao: (v: Visao) => void;
}

export function BarraPeriodo({ dataRef, visao, onNavegar, onHoje, onTrocarVisao }: Props) {
  const ehCalendario = visao === 'mensal' || visao === 'semanal';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-h-[2.25rem] items-center gap-2">
        {ehCalendario ? (
          <>
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => onNavegar(-1)}
                aria-label="Período anterior"
                className="btn-ghost rounded-r-none px-2 py-1.5"
              >
                <IconEsquerda />
              </button>
              <button
                type="button"
                onClick={() => onNavegar(1)}
                aria-label="Próximo período"
                className="btn-ghost rounded-l-none border-l border-slate-200 px-2 py-1.5 dark:border-slate-800"
              >
                <IconDireita />
              </button>
            </div>
            <button type="button" onClick={onHoje} className="btn-outline">
              Hoje
            </button>
            <h2 className="ml-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
              {tituloPeriodo(dataRef, visao)}
            </h2>
          </>
        ) : (
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Todas as contas
          </h2>
        )}
      </div>

      <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
        {(['mensal', 'semanal', 'tabela'] as Visao[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onTrocarVisao(v)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              visao === v
                ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-950 dark:text-brand-300'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
