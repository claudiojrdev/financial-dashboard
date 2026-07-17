import type { Conta } from '../types';
import { hojeISO } from './status';

/** Alterna o estado de pagamento mantendo os campos coerentes. */
export function alternarPago(conta: Conta): Conta {
  if (conta.pago) {
    return { ...conta, pago: false, data_pagamento: null, valor_pago: null };
  }
  return {
    ...conta,
    pago: true,
    data_pagamento: conta.data_pagamento ?? hojeISO(),
    valor_pago: conta.valor_pago ?? conta.valor,
  };
}

/** Cria uma conta vazia com vencimento numa data (ISO). */
export function contaVazia(dataVencimento: string, tipocobranca: 'receita' | 'despesa' = 'despesa'): Conta {
  return {
    id: crypto.randomUUID(),
    nome: '',
    categoria_id: null,
    unidade: '—',
    valor: 0,
    valor_pago: null,
    data_vencimento: dataVencimento,
    data_pagamento: null,
    pago: false,
    tipocobranca,
  };
}
