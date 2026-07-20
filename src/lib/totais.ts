import { addDays, addMonths, endOfMonth, endOfWeek, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import type { Conta } from '../types';
import { statusDaConta } from './status';
import { formatarISO } from './normalize';

export interface Totais {
  qtd: number;
  previsto: number;
  pago: number;
  pendente: number;
  vencido: number;
}

export interface PontoSerie {
  rotulo: string;
  previsto: number;
  pago: number;
  pendente: number;
  vencido: number;
}

/** Soma os totais de um conjunto de contas para o resumo do período. */
export function calcularTotais(contas: Conta[], hoje: string): Totais {
  const t: Totais = { qtd: contas.length, previsto: 0, pago: 0, pendente: 0, vencido: 0 };
  for (const c of contas) {
    t.previsto += c.valor;
    const status = statusDaConta(c, hoje);
    if (status === 'pago' || status === 'parcial') {
      t.pago += c.valor_pago ?? 0;
      if (status === 'parcial') t.pendente += c.valor - (c.valor_pago ?? 0);
    } else if (status === 'vencido') {
      t.vencido += c.valor;
      t.pendente += c.valor;
    } else {
      t.pendente += c.valor;
    }
  }
  return t;
}

/** Série mensal dos últimos N meses para o gráfico. */
export function calcularSerieMensal(
  contas: Conta[],
  hoje: string,
  quantidade: number = 12
): PontoSerie[] {
  const hojeRef = parseISO(hoje);
  const meses: PontoSerie[] = [];

  for (let i = quantidade - 1; i >= 0; i--) {
    const mesRef = addMonths(startOfMonth(hojeRef), -i);
    const chaveMes = formatarISO(mesRef).slice(0, 7);
    const mesSeguinte = addMonths(mesRef, 1);

    const contasDoMes = contas.filter((c) => {
      const d = parseISO(c.data_vencimento);
      return d >= mesRef && d < mesSeguinte;
    });

    const t = calcularTotais(contasDoMes, hoje);
    meses.push({
      rotulo: chaveMes.slice(5),
      previsto: t.previsto,
      pago: t.pago,
      pendente: t.pendente,
      vencido: t.vencido,
    });
  }

  return meses;
}

const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Série semanal dentro do mês que contém dataRef (para visão mensal). */
export function calcularSerieSemanal(
  contas: Conta[],
  hoje: string,
  dataRef: string
): PontoSerie[] {
  const ref = parseISO(dataRef);
  const mesIni = startOfMonth(ref);
  const mesFim = endOfMonth(ref);

  const semanas: PontoSerie[] = [];
  let cursor = mesIni;

  while (cursor <= mesFim) {
    const semanaIni = cursor;
    const semanaFim = endOfWeek(cursor, { weekStartsOn: 0 });
    const semanaLabel = `Sem ${semanas.length + 1}`;

    const contasDaSemana = contas.filter((c) => {
      const d = parseISO(c.data_vencimento);
      return d >= semanaIni && d <= semanaFim;
    });

    const t = calcularTotais(contasDaSemana, hoje);
    semanas.push({
      rotulo: semanaLabel,
      previsto: t.previsto,
      pago: t.pago,
      pendente: t.pendente,
      vencido: t.vencido,
    });

    cursor = addDays(semanaFim, 1);
  }

  return semanas;
}

/** Série diária dentro da semana que contém dataRef (para visão semanal). */
export function calcularSerieDiaria(
  contas: Conta[],
  hoje: string,
  dataRef: string
): PontoSerie[] {
  const ref = parseISO(dataRef);
  const semanaIni = startOfWeek(ref, { weekStartsOn: 0 });

  const dias: PontoSerie[] = [];

  for (let i = 0; i < 7; i++) {
    const dia = addDays(semanaIni, i);
    const diaISO = formatarISO(dia);

    const contasDoDia = contas.filter((c) => c.data_vencimento === diaISO);
    const t = calcularTotais(contasDoDia, hoje);
    dias.push({
      rotulo: NOMES_DIAS[i],
      previsto: t.previsto,
      pago: t.pago,
      pendente: t.pendente,
      vencido: t.vencido,
    });
  }

  return dias;
}
