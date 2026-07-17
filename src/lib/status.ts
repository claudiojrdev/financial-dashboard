import type { Conta, StatusConta } from '../types';
import { formatarISO } from './normalize';

/** Data de hoje em ISO, calculada uma vez por render. */
export function hojeISO(): string {
  return formatarISO(new Date());
}

/**
 * Deriva o status visual de uma conta.
 * - pago: quitada integralmente
 * - parcial: marcada paga mas valor_pago < valor
 * - vencido: não paga e vencimento anterior a hoje
 * - pendente: não paga e ainda no prazo
 */
export function statusDaConta(conta: Conta, hoje = hojeISO()): StatusConta {
  if (conta.pago) {
    if (conta.valor_pago != null && conta.valor_pago + 0.005 < conta.valor) {
      return 'parcial';
    }
    return 'pago';
  }
  if (conta.data_vencimento && conta.data_vencimento < hoje) return 'vencido';
  return 'pendente';
}

export const META_STATUS: Record<
  StatusConta,
  { rotulo: string; ponto: string; chip: string; barra: string; fundo: string; borda: string }
> = {
  pago: {
    rotulo: 'Pago',
    ponto: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    barra: 'border-l-emerald-500',
    fundo: 'bg-emerald-100/60 dark:bg-emerald-950/25',
    borda: 'border-emerald-200 dark:border-emerald-800/50',
  },
  parcial: {
    rotulo: 'Parcial',
    ponto: 'bg-amber-500',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    barra: 'border-l-amber-500',
    fundo: 'bg-amber-100/60 dark:bg-amber-950/25',
    borda: 'border-amber-200 dark:border-amber-800/50',
  },
  pendente: {
    rotulo: 'Pendente',
    ponto: 'bg-slate-400',
    chip: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    barra: 'border-l-slate-400',
    fundo: 'bg-slate-100/60 dark:bg-slate-800/60',
    borda: 'border-slate-200 dark:border-slate-700',
  },
  vencido: {
    rotulo: 'Vencido',
    ponto: 'bg-red-500',
    chip: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    barra: 'border-l-red-500',
    fundo: 'bg-red-100/60 dark:bg-red-950/25',
    borda: 'border-red-200 dark:border-red-800/50',
  },
};
