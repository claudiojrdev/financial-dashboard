import { useState } from 'react';
import { parseISO } from 'date-fns';
import type { Categoria, Conta } from '../types';
import { NOMES_DIAS, gradeSemanal } from '../lib/calendar';
import { formatarMoeda } from '../lib/format';
import { CartaoConta } from './CartaoConta';
import { IconMais } from './icons';

interface Props {
  dataRef: string;
  hoje: string;
  porDia: Map<string, Conta[]>;
  mapaCat: Map<string, Categoria>;
  onAbrirConta: (conta: Conta) => void;
  onTogglePago: (conta: Conta) => void;
  onNovaNoDia: (dataISO: string) => void;
  onSoltarNoDia: (id: string, dataISO: string) => void;
}

export function CalendarioSemanal({
  dataRef,
  hoje,
  porDia,
  mapaCat,
  onAbrirConta,
  onTogglePago,
  onNovaNoDia,
  onSoltarNoDia,
}: Props) {
  const dias = gradeSemanal(dataRef);
  const [arrastando, setArrastando] = useState(false);
  const [diaAlvo, setDiaAlvo] = useState<string | null>(null);

  return (
    <div className="grid h-full grid-cols-1 sm:grid-cols-7">
      {dias.map((dia) => {
        const data = parseISO(dia);
        const ehHoje = dia === hoje;
        const contas = porDia.get(dia) ?? [];
        const totalDia = contas.reduce((s, c) => s + c.valor, 0);
        const alvo = diaAlvo === dia;

        return (
          <div
            key={dia}
            onDragOver={(e) => {
              if (arrastando) {
                e.preventDefault();
                if (diaAlvo !== dia) setDiaAlvo(dia);
              }
            }}
            onDragLeave={() => setDiaAlvo((d) => (d === dia ? null : d))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain');
              setDiaAlvo(null);
              setArrastando(false);
              if (id) onSoltarNoDia(id, dia);
            }}
            className={`group/col flex min-h-[8rem] flex-col border-b border-r border-slate-200 dark:border-slate-800 ${
              alvo ? 'ring-2 ring-inset ring-brand-500 bg-brand-50/60 dark:bg-brand-500/10' : ''
            }`}
          >
            <div
              className={`flex items-center justify-between border-b border-slate-200 px-2 py-2 dark:border-slate-800 ${
                ehHoje ? 'bg-brand-50 dark:bg-brand-500/10' : ''
              }`}
            >
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-semibold uppercase text-slate-400">
                  {NOMES_DIAS[data.getDay()]}
                </span>
                <span
                  className={`text-sm font-bold ${
                    ehHoje ? 'text-brand-600 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {data.getDate()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNovaNoDia(dia)}
                title="Nova conta neste dia"
                className="rounded p-0.5 text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-slate-700
                  focus:opacity-100 group-hover/col:opacity-100 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                <IconMais width={15} height={15} />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2">
              {contas.length === 0 ? (
                <span className="mt-2 text-center text-[11px] text-slate-300 dark:text-slate-600">
                  —
                </span>
              ) : (
                contas.map((c) => (
                  <CartaoConta
                    key={c.id}
                    conta={c}
                    hoje={hoje}
                    mapaCat={mapaCat}
                    detalhado
                    arrastavel
                    onClick={onAbrirConta}
                    onTogglePago={onTogglePago}
                    onArrastarInicio={() => setArrastando(true)}
                    onArrastarFim={() => {
                      setArrastando(false);
                      setDiaAlvo(null);
                    }}
                  />
                ))
              )}
            </div>

            {totalDia > 0 && (
              <div className="border-t border-slate-200 px-2 py-1.5 text-right text-xs font-semibold tabular-nums text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {formatarMoeda(totalDia)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
