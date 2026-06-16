import { addDays } from 'date-fns';
import type { Categoria, Conta } from '../types';
import { formatarISO } from './normalize';
import { PALETA } from './categorias';

interface ModeloCat {
  nome: string;
  cor: string;
}

const CATEGORIAS: ModeloCat[] = [
  { nome: 'Moradia', cor: PALETA[0] },
  { nome: 'Utilidades', cor: PALETA[1] },
  { nome: 'Fornecedores', cor: PALETA[2] },
  { nome: 'TI', cor: PALETA[3] },
  { nome: 'Pessoal', cor: PALETA[4] },
  { nome: 'Serviços', cor: PALETA[5] },
  { nome: 'Suprimentos', cor: PALETA[6] },
  { nome: 'Financeiro', cor: PALETA[7] },
  { nome: 'Marketing', cor: PALETA[8] },
];

interface Modelo {
  nome: string;
  categoria: string;
  unidade: string;
  valor: number;
  offset: number; // dias a partir de hoje
  pago?: boolean;
  valorPagoParcial?: number;
}

const MODELOS: Modelo[] = [
  { nome: 'Aluguel', categoria: 'Moradia', unidade: 'Matriz', valor: 3200, offset: 5 },
  { nome: 'Energia elétrica', categoria: 'Utilidades', unidade: 'Matriz', valor: 845.7, offset: 2 },
  { nome: 'Internet/Fibra', categoria: 'Utilidades', unidade: 'Matriz', valor: 199.9, offset: -3 },
  { nome: 'Fornecedor ACME', categoria: 'Fornecedores', unidade: 'Filial 1', valor: 5400, offset: 9 },
  { nome: 'Software (SaaS)', categoria: 'TI', unidade: 'Matriz', valor: 320, offset: -8, pago: true },
  { nome: 'Folha de pagamento', categoria: 'Pessoal', unidade: 'Matriz', valor: 18750, offset: 4 },
  { nome: 'Água e esgoto', categoria: 'Utilidades', unidade: 'Filial 1', valor: 268.4, offset: -1 },
  { nome: 'Contador', categoria: 'Serviços', unidade: 'Matriz', valor: 1200, offset: 1, pago: true },
  { nome: 'Manutenção predial', categoria: 'Serviços', unidade: 'Filial 2', valor: 980, offset: 12, valorPagoParcial: 400 },
  { nome: 'Telefonia móvel', categoria: 'Utilidades', unidade: 'Matriz', valor: 430, offset: 7 },
  { nome: 'Material de escritório', categoria: 'Suprimentos', unidade: 'Filial 1', valor: 156.3, offset: -5, pago: true },
  { nome: 'Seguro empresarial', categoria: 'Financeiro', unidade: 'Matriz', valor: 2100, offset: 15 },
  { nome: 'Marketing digital', categoria: 'Marketing', unidade: 'Matriz', valor: 3500, offset: 6 },
  { nome: 'Frete/Logística', categoria: 'Fornecedores', unidade: 'Filial 2', valor: 720, offset: 3 },
];

/** Gera categorias coloridas e contas de exemplo com vencimentos próximos de hoje. */
export function gerarExemplo(): { categorias: Categoria[]; contas: Conta[] } {
  const categorias: Categoria[] = CATEGORIAS.map((c) => ({
    id: crypto.randomUUID(),
    nome: c.nome,
    cor: c.cor,
  }));
  const idPorNome = new Map(categorias.map((c) => [c.nome, c.id]));

  const hoje = new Date();
  const contas: Conta[] = MODELOS.map((m) => {
    const venc = formatarISO(addDays(hoje, m.offset));
    const parcial = m.valorPagoParcial != null;
    const pago = m.pago || parcial;
    return {
      id: crypto.randomUUID(),
      nome: m.nome,
      categoria_id: idPorNome.get(m.categoria) ?? null,
      unidade: m.unidade,
      valor: m.valor,
      valor_pago: pago ? (parcial ? m.valorPagoParcial! : m.valor) : null,
      data_vencimento: venc,
      data_pagamento: pago ? formatarISO(addDays(hoje, m.offset - 1)) : null,
      pago,
    };
  });

  return { categorias, contas };
}
