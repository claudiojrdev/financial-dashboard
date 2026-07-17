import { useCallback, useState } from 'react';
import { parseISO } from 'date-fns';
import type { Categoria, Conta } from '../types';
import { NOMES_DIAS, agruparPorCategoria, gradeMensal } from '../lib/calendar';
import { CartaoConta } from './CartaoConta';
import { CartaoGrupo } from './CartaoGrupo';
import { IconMais } from './icons';

interface Props {
  dataRef: string;
  hoje: string;
  porDia: Map<string, Conta[]>;
  mapaCat: Map<string, Categoria>;
  onAbrirConta: (conta: Conta) => void;
  onNovaNoDia: (dataISO: string) => void;
  onSoltarNoDia: (id: string, dataISO: string) => void;
}

const LIMITE_VISIVEL = 4;

type ItemDia =
  | { tipo: 'conta'; conta: Conta }
  | { tipo: 'grupo'; grupo: ReturnType<typeof agruparPorCategoria>[number] };

function chaveGrupo(categoria_id: string | null, dia: string): string {
  return `${categoria_id ?? '__null__'}::${dia}`;
}

export function CalendarioMensal({
  dataRef,
  hoje,
  porDia,
  mapaCat,
  onAbrirConta,
  onNovaNoDia,
  onSoltarNoDia,
}: Props) {
  const dias = gradeMensal(dataRef);
  const mesRef = parseISO(dataRef).getMonth();
  const [arrastando, setArrastando] = useState(false);
  const [diaAlvo, setDiaAlvo] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const toggleGrupo = useCallback((categoria_id: string | null, dia: string) => {
    setExpandidos((prev) => {
      const chave = chaveGrupo(categoria_id, dia);
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave);
      else next.add(chave);
      return next;
    });
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
        {NOMES_DIAS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid flex-1 auto-rows-fr grid-cols-7">
        {dias.map((dia) => {
          const data = parseISO(dia);
          const noMes = data.getMonth() === mesRef;
          const ehHoje = dia === hoje;
          const contas = porDia.get(dia) ?? [];
          const alvo = diaAlvo === dia;

          const grupos = agruparPorCategoria(contas, mapaCat);
          const itens: ItemDia[] = [];
          for (const g of grupos) {
            if (g.contas.length === 1) {
              itens.push({ tipo: 'conta', conta: g.contas[0] });
            } else {
              itens.push({ tipo: 'grupo', grupo: g });
            }
          }

          const visiveis = itens.slice(0, LIMITE_VISIVEL);
          const ocultas = itens.length - visiveis.length;

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
              className={`group/cel flex min-h-[7rem] flex-col gap-1 border-b border-r border-slate-200 p-1.5
                dark:border-slate-800 ${noMes ? '' : 'bg-slate-50/60 dark:bg-slate-950/40'} ${
                  alvo ? 'ring-2 ring-inset ring-brand-500 bg-brand-50/60 dark:bg-brand-500/10' : ''
                }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    ehHoje
                      ? 'bg-brand-600 text-white'
                      : noMes
                        ? 'text-slate-600 dark:text-slate-300'
                        : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {data.getDate()}
                </span>
                <button
                  type="button"
                  onClick={() => onNovaNoDia(dia)}
                  title="Nova conta neste dia"
                  className="rounded p-0.5 text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-slate-700
                    focus:opacity-100 group-hover/cel:opacity-100 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                >
                  <IconMais width={14} height={14} />
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
                {visiveis.map((item) =>
                  item.tipo === 'conta' ? (
                    <CartaoConta
                      key={item.conta.id}
                      conta={item.conta}
                      hoje={hoje}
                      mapaCat={mapaCat}
                      arrastavel
                      onClick={onAbrirConta}
                      onArrastarInicio={() => setArrastando(true)}
                      onArrastarFim={() => {
                        setArrastando(false);
                        setDiaAlvo(null);
                      }}
                    />
                  ) : (
                    <CartaoGrupo
                      key={chaveGrupo(item.grupo.categoria_id, dia)}
                      grupo={item.grupo}
                      expandido={expandidos.has(chaveGrupo(item.grupo.categoria_id, dia))}
                      onToggle={() => toggleGrupo(item.grupo.categoria_id, dia)}
                      hoje={hoje}
                      mapaCat={mapaCat}
                      onClick={onAbrirConta}
                      onArrastarInicio={() => setArrastando(true)}
                      onArrastarFim={() => {
                        setArrastando(false);
                        setDiaAlvo(null);
                      }}
                    />
                  )
                )}
                {ocultas > 0 && (
                  <span className="pl-1 text-[11px] font-medium text-slate-400">+{ocultas} mais</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
