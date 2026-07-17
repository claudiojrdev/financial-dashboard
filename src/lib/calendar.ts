import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Categoria, Conta, GrupoConta, StatusConta, Visao } from '../types';
import { formatarISO } from './normalize';

/** Semana começando no domingo (padrão pt-BR). */
const OPCOES_SEMANA = { weekStartsOn: 0 as const };

export const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Dias (ISO) que compõem a grade mensal — sempre semanas completas. */
export function gradeMensal(dataRef: string): string[] {
  const ref = parseISO(dataRef);
  const inicio = startOfWeek(startOfMonth(ref), OPCOES_SEMANA);
  const fim = endOfWeek(endOfMonth(ref), OPCOES_SEMANA);
  return intervaloDias(inicio, fim);
}

/** Os 7 dias (ISO) da semana que contém dataRef. */
export function gradeSemanal(dataRef: string): string[] {
  const ref = parseISO(dataRef);
  const inicio = startOfWeek(ref, OPCOES_SEMANA);
  return intervaloDias(inicio, addDays(inicio, 6));
}

function intervaloDias(inicio: Date, fim: Date): string[] {
  const dias: string[] = [];
  let cursor = inicio;
  while (cursor <= fim) {
    dias.push(formatarISO(cursor));
    cursor = addDays(cursor, 1);
  }
  return dias;
}

/** Avança/retrocede o período conforme a visão. */
export function navegar(dataRef: string, visao: Visao, passo: number): string {
  const ref = parseISO(dataRef);
  if (visao === 'semanal') return formatarISO(addWeeks(ref, passo));
  if (visao === 'mensal') return formatarISO(addMonths(ref, passo));
  return dataRef; // tabela não navega por período
}

/** Agrupa contas por data de vencimento (ISO). */
export function agruparPorVencimento(contas: Conta[]): Map<string, Conta[]> {
  const mapa = new Map<string, Conta[]>();
  for (const c of contas) {
    const lista = mapa.get(c.data_vencimento);
    if (lista) lista.push(c);
    else mapa.set(c.data_vencimento, [c]);
  }
  return mapa;
}

export interface GrupoMes {
  chave: string; // yyyy-mm
  titulo: string;
  contas: Conta[];
}

/** Agrupa contas por mês de vencimento, ordenado, com contas ordenadas por data. */
export function agruparPorMes(contas: Conta[]): GrupoMes[] {
  const mapa = new Map<string, Conta[]>();
  for (const c of contas) {
    const chave = c.data_vencimento.slice(0, 7); // yyyy-mm
    const lista = mapa.get(chave);
    if (lista) lista.push(c);
    else mapa.set(chave, [c]);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, lista]) => {
      const ref = parseISO(`${chave}-01`);
      const txt = ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return {
        chave,
        titulo: txt.charAt(0).toUpperCase() + txt.slice(1),
        contas: lista.sort((x, y) => x.data_vencimento.localeCompare(y.data_vencimento)),
      };
    });
}

/** Título legível do período atual. */
export function tituloPeriodo(dataRef: string, visao: Visao): string {
  const ref = parseISO(dataRef);
  if (visao !== 'semanal') {
    const txt = ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }
  const dias = gradeSemanal(dataRef);
  const ini = parseISO(dias[0]);
  const fim = parseISO(dias[6]);
  const f = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${f(ini)} – ${f(fim)} de ${fim.getFullYear()}`;
}

/** Agrupa contas por categoria — útil para contas do mesmo dia. */
export function agruparPorCategoria(
  contas: Conta[],
  mapaCat: Map<string, Categoria>
): GrupoConta[] {
  const mapa = new Map<string, Conta[]>();
  for (const c of contas) {
    const chave = c.categoria_id ?? '__sem_categoria__';
    const lista = mapa.get(chave);
    if (lista) lista.push(c);
    else mapa.set(chave, [c]);
  }
  return [...mapa.entries()].map(([chave, lista]) => {
    const cat = chave !== '__sem_categoria__' ? mapaCat.get(chave) : undefined;

    const todosPagos = lista.every((c) => c.pago);
    const nenhumPago = lista.every((c) => !c.pago);
    const algumVencido = lista.some(
      (c) => !c.pago && c.data_vencimento < formatarISO(new Date())
    );

    let status: StatusConta;
    if (todosPagos) {
      const algumParcial = lista.some(
        (c) => c.valor_pago != null && c.valor_pago + 0.005 < c.valor
      );
      status = algumParcial ? 'parcial' : 'pago';
    } else if (nenhumPago && algumVencido) {
      status = 'vencido';
    } else if (nenhumPago) {
      status = 'pendente';
    } else {
      status = 'parcial';
    }

    const emAberto = lista.reduce(
      (acc, c) => acc + (c.valor - (c.valor_pago ?? 0)),
      0
    );

    return {
      categoria_id: chave === '__sem_categoria__' ? null : chave,
      catNome: cat?.nome ?? 'Sem categoria',
      catCor: cat?.cor ?? '#94a3b8',
      contas: lista,
      soma: lista.reduce((acc, c) => acc + c.valor, 0),
      status,
      emAberto,
    };
  });
}
