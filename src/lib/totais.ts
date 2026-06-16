import type { Conta } from '../types';
import { statusDaConta } from './status';

export interface Totais {
  qtd: number;
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
      // Saldo ainda devido em pagamentos parciais conta como pendente.
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
