import type {
  CampoFiltro,
  Conta,
  GrupoFiltro,
  ItemFiltro,
  Operador,
  Regra,
  StatusConta,
} from '../types';
import { slug } from './normalize';
import { statusDaConta } from './status';

export interface CtxFiltro {
  hoje: string;
}

// ---- Metadados de campos/operadores para o construtor ----

export type TipoCampo = 'texto' | 'categoria' | 'status' | 'numero' | 'data' | 'booleano';

export const TIPO_DO_CAMPO: Record<CampoFiltro, TipoCampo> = {
  nome: 'texto',
  unidade: 'texto',
  categoria_id: 'categoria',
  status: 'status',
  valor: 'numero',
  valor_pago: 'numero',
  pago: 'booleano',
  data_vencimento: 'data',
  data_pagamento: 'data',
};

export const ROTULO_CAMPO: Record<CampoFiltro, string> = {
  nome: 'Nome',
  unidade: 'Unidade',
  categoria_id: 'Categoria',
  status: 'Status',
  valor: 'Valor',
  valor_pago: 'Valor pago',
  pago: 'Pago',
  data_vencimento: 'Vencimento',
  data_pagamento: 'Data pagamento',
};

export const ROTULO_OPERADOR: Record<Operador, string> = {
  igual: 'é igual a',
  diferente: 'é diferente de',
  contem: 'contém',
  maior: 'maior que',
  menor: 'menor que',
  maior_igual: 'maior ou igual a',
  menor_igual: 'menor ou igual a',
  entre: 'entre',
};

export const STATUS_OPCOES: StatusConta[] = ['pago', 'parcial', 'pendente', 'vencido'];

/** Operadores válidos para cada tipo de campo. */
export function operadoresDe(tipo: TipoCampo): Operador[] {
  switch (tipo) {
    case 'texto':
      return ['contem', 'igual', 'diferente'];
    case 'categoria':
    case 'status':
    case 'booleano':
      return ['igual', 'diferente'];
    case 'numero':
      return ['igual', 'diferente', 'maior', 'menor', 'maior_igual', 'menor_igual', 'entre'];
    case 'data':
      return ['igual', 'diferente', 'maior', 'menor', 'entre'];
  }
}

// ---- Construção ----

export function novaRegra(): Regra {
  return { id: crypto.randomUUID(), tipo: 'regra', campo: 'categoria_id', operador: 'igual', valor: '' };
}

export function novoGrupo(combinador: 'E' | 'OU' = 'E'): GrupoFiltro {
  return { id: crypto.randomUUID(), tipo: 'grupo', combinador, itens: [] };
}

/** Conta quantas regras (folhas) existem na árvore. */
export function contarRegras(item: ItemFiltro): number {
  if (item.tipo === 'regra') return 1;
  return item.itens.reduce((s, i) => s + contarRegras(i), 0);
}

/** Atualiza imutavelmente um item (regra/grupo) pelo id. */
export function atualizarNaArvore(grupo: GrupoFiltro, id: string, fn: (item: ItemFiltro) => ItemFiltro): GrupoFiltro {
  const aplicar = (item: ItemFiltro): ItemFiltro => {
    if (item.id === id) return fn(item);
    if (item.tipo === 'grupo') return { ...item, itens: item.itens.map(aplicar) };
    return item;
  };
  return aplicar(grupo) as GrupoFiltro;
}

/** Remove um item pelo id (não remove a raiz). */
export function removerDaArvore(grupo: GrupoFiltro, id: string): GrupoFiltro {
  const limpar = (g: GrupoFiltro): GrupoFiltro => ({
    ...g,
    itens: g.itens
      .filter((i) => i.id !== id)
      .map((i) => (i.tipo === 'grupo' ? limpar(i) : i)),
  });
  return limpar(grupo);
}

/** Insere um item dentro de um grupo (por id do grupo). */
export function inserirNaArvore(grupo: GrupoFiltro, grupoId: string, novo: ItemFiltro): GrupoFiltro {
  const inserir = (g: GrupoFiltro): GrupoFiltro => {
    if (g.id === grupoId) return { ...g, itens: [...g.itens, novo] };
    return { ...g, itens: g.itens.map((i) => (i.tipo === 'grupo' ? inserir(i) : i)) };
  };
  return inserir(grupo);
}

// ---- Avaliação ----

/** Avalia se uma conta passa pelo filtro (grupo raiz). Grupo vazio => passa. */
export function avaliarConta(conta: Conta, grupo: GrupoFiltro | null, ctx: CtxFiltro): boolean {
  if (!grupo || grupo.itens.length === 0) return true;
  return avaliarItem(conta, grupo, ctx);
}

function avaliarItem(conta: Conta, item: ItemFiltro, ctx: CtxFiltro): boolean {
  if (item.tipo === 'regra') return avaliarRegra(conta, item, ctx);
  if (item.itens.length === 0) return true;
  return item.combinador === 'E'
    ? item.itens.every((i) => avaliarItem(conta, i, ctx))
    : item.itens.some((i) => avaliarItem(conta, i, ctx));
}

function avaliarRegra(conta: Conta, regra: Regra, ctx: CtxFiltro): boolean {
  const { campo, operador, valor } = regra;
  switch (campo) {
    case 'nome':
    case 'unidade':
      return cmpTexto(String(conta[campo] ?? ''), operador, valor);
    case 'categoria_id':
      return cmpTexto(conta.categoria_id ?? '', operador, valor);
    case 'status':
      return cmpTexto(statusDaConta(conta, ctx.hoje), operador, valor);
    case 'valor':
      return cmpNumero(conta.valor, operador, valor);
    case 'valor_pago':
      return cmpNumero(conta.valor_pago ?? 0, operador, valor);
    case 'pago': {
      const alvo = valor === true || valor === 'true' || valor === 'sim';
      return conta.pago === alvo;
    }
    case 'data_vencimento':
    case 'data_pagamento':
      return cmpData(conta[campo] ?? '', operador, valor);
  }
}

function cmpTexto(valorConta: string, op: Operador, alvo: unknown): boolean {
  const a = slug(valorConta);
  const b = slug(String(alvo ?? ''));
  switch (op) {
    case 'igual':
      return a === b;
    case 'diferente':
      return a !== b;
    case 'contem':
      return a.includes(b);
    default:
      return false;
  }
}

function cmpNumero(n: number, op: Operador, alvo: unknown): boolean {
  if (op === 'entre' && Array.isArray(alvo)) {
    const [min, max] = alvo as [number, number];
    return n >= Number(min) && n <= Number(max);
  }
  const x = Number(alvo);
  if (Number.isNaN(x)) return true; // valor não preenchido => não restringe
  switch (op) {
    case 'igual':
      return n === x;
    case 'diferente':
      return n !== x;
    case 'maior':
      return n > x;
    case 'menor':
      return n < x;
    case 'maior_igual':
      return n >= x;
    case 'menor_igual':
      return n <= x;
    default:
      return false;
  }
}

function cmpData(d: string, op: Operador, alvo: unknown): boolean {
  if (op === 'entre' && Array.isArray(alvo)) {
    const [ini, fim] = alvo as [string, string];
    if (!ini || !fim) return true;
    return d >= ini && d <= fim;
  }
  const x = String(alvo ?? '');
  if (!x) return true;
  switch (op) {
    case 'igual':
      return d === x;
    case 'diferente':
      return d !== x;
    case 'maior':
      return d > x;
    case 'menor':
      return d < x;
    default:
      return false;
  }
}
