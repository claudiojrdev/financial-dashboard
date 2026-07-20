import { useMemo } from 'react';
import type { PontoSerie } from '../lib/totais';

interface Props {
  serie: PontoSerie[];
}

const CORES: Record<string, string> = {
  previsto: '#64748b',
  pago: '#10b981',
  pendente: '#f59e0b',
  vencido: '#ef4444',
};
const ROTULOS: Record<string, string> = {
  previsto: 'Previsto',
  pago: 'Pago',
  pendente: 'Pendente',
  vencido: 'Vencido',
};

const LARGURA = 800;
const ALTURA = 260;
const PAD = { t: 12, r: 16, b: 28, l: 36 };
const W = LARGURA - PAD.l - PAD.r;
const H = ALTURA - PAD.t - PAD.b;
const CAMPOS = ['previsto', 'pago', 'pendente', 'vencido'] as const;

export function GraficoResumo({ serie }: Props) {
  if (serie.length < 2) return null;

  const { escalaX, linhas } = useMemo(() => {
    const todosValores = serie.flatMap((p) => [p.previsto, p.pago, p.pendente, p.vencido]);
    const maxVal = Math.max(...todosValores, 1);

    const escalaY = (v: number) => PAD.t + H - (v / maxVal) * H;
    const escalaX = (i: number) => PAD.l + (i / (serie.length - 1)) * W;

    const linhas = CAMPOS.map((campo) => {
      const pts = serie.map((p, i) => `${escalaX(i)},${escalaY(p[campo])}`).join(' ');
      const area = [
        `${escalaX(0)},${PAD.t + H}`,
        pts,
        `${escalaX(serie.length - 1)},${PAD.t + H}`,
      ].join(' ');
      return { campo, pontos: pts, area };
    });

    return { escalaX, linhas, maxVal };
  }, [serie]);

  return (
    <div className="w-full min-w-[400px]">
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Gráfico de linhas dos valores mensais"
      >
        <defs>
          {CAMPOS.map((campo) => (
            <linearGradient key={campo} id={`grad-${campo}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CORES[campo]} stopOpacity="0.12" />
              <stop offset="100%" stopColor={CORES[campo]} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid horizontal */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={PAD.l}
            y1={PAD.t + H * (1 - frac)}
            x2={PAD.l + W}
            y2={PAD.t + H * (1 - frac)}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-700"
            strokeWidth={1}
          />
        ))}

        {/* Rótulos do eixo X */}
        {serie.map((p, i) => (
          <text
            key={p.rotulo}
            x={escalaX(i)}
            y={ALTURA - 6}
            textAnchor="middle"
            className="fill-slate-400 text-[9px]"
          >
            {p.rotulo}
          </text>
        ))}

        {/* Áreas */}
        {linhas.map((l) => (
          <polygon key={`area-${l.campo}`} points={l.area} fill={`url(#grad-${l.campo})`} />
        ))}

        {/* Linhas */}
        {linhas.map((l) => (
          <polyline
            key={l.campo}
            points={l.pontos}
            fill="none"
            stroke={CORES[l.campo]}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      </svg>

      {/* Legenda */}
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {CAMPOS.map((campo) => (
          <div key={campo} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CORES[campo] }} />
            <span className="text-[10px] text-slate-500 dark:text-slate-400">{ROTULOS[campo]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
