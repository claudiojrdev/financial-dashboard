/** Categoria gerenciada (fonte da verdade para nome + cor). */
export interface Categoria {
  id: string;
  nome: string;
  /** Cor em hex, ex.: '#3478f6'. */
  cor: string;
}

export type TipoCobranca = 'receita' | 'despesa';

/** Campos do modelo de uma conta a pagar. */
export interface Conta {
  id: string;
  nome: string;
  /** Referência à categoria gerenciada, ou `null` (sem categoria). */
  categoria_id: string | null;
  /** Centro de custo (equivalente ao campo unidade no Asaas / centrodecusto no Meeventos). */
  unidade: string;
  /** Valor previsto/devido. */
  valor: number;
  /** Valor efetivamente pago. `null` quando não pago. */
  valor_pago: number | null;
  /** Data de vencimento em ISO `yyyy-mm-dd`. */
  data_vencimento: string;
  /** Data de pagamento em ISO `yyyy-mm-dd`, ou `null`. */
  data_pagamento: string | null;
  pago: boolean;
  /** Receita ou despesa. */
  tipocobranca: TipoCobranca;
}

/** Chaves do modelo. */
export type CampoConta = keyof Conta;

/**
 * Campos mapeáveis na importação. Usa `categoria` (nome em texto) em vez de
 * `categoria_id`, pois a planilha traz o nome — resolvido depois em categoria gerenciada.
 */
export type CampoImportavel =
  | 'id'
  | 'nome'
  | 'categoria'
  | 'unidade'
  | 'valor'
  | 'valor_pago'
  | 'data_vencimento'
  | 'data_pagamento'
  | 'pago'
  | 'tipocobranca';

export type Severidade = 'erro' | 'aviso';

/** Problema encontrado ao importar uma linha. */
export interface ProblemaImportacao {
  /** Índice da linha na planilha (base 1, sem cabeçalho). */
  linha: number;
  severidade: Severidade;
  campo?: CampoImportavel;
  mensagem: string;
}

/**
 * Conta vinda da importação: ainda sem `categoria_id` resolvido — carrega o
 * nome cru da categoria, que o store converte em categoria gerenciada.
 */
export interface ContaImportada extends Conta {
  categoriaNome: string;
}

/** Resultado do parsing/normalização de um arquivo. */
export interface ResultadoImportacao {
  /** Cabeçalhos crus detectados no arquivo. */
  cabecalhos: string[];
  /** Mapeamento sugerido cabeçalho-original -> campo do modelo. */
  mapeamentoSugerido: Record<string, CampoImportavel | null>;
  /** Todas as linhas cruas (para reaplicar o mapeamento no preview). */
  linhas: Record<string, string>[];
  /** Linhas válidas já normalizadas com o mapeamento sugerido. */
  contas: ContaImportada[];
  /** Avisos e erros por linha. */
  problemas: ProblemaImportacao[];
  /** Amostra (até N) das linhas cruas para preview. */
  amostra: Record<string, string>[];
}

/** Como combinar uma importação com os dados já existentes. */
export type PoliticaImportacao = 'substituir' | 'mesclar' | 'acrescentar';

export type Visao = 'mensal' | 'semanal' | 'tabela';

// ---- Filtros (construtor avançado E/OU) ----

export type Operador =
  | 'igual'
  | 'diferente'
  | 'contem'
  | 'maior'
  | 'menor'
  | 'maior_igual'
  | 'menor_igual'
  | 'entre';

export type CampoFiltro =
  | 'nome'
  | 'categoria_id'
  | 'unidade'
  | 'status'
  | 'valor'
  | 'valor_pago'
  | 'pago'
  | 'data_vencimento'
  | 'data_pagamento'
  | 'tipocobranca';

export type ValorFiltro =
  | string
  | number
  | boolean
  | [number, number]
  | [string, string];

/** Uma condição simples do filtro. */
export interface Regra {
  id: string;
  tipo: 'regra';
  campo: CampoFiltro;
  operador: Operador;
  valor: ValorFiltro;
}

/** Grupo de regras/subgrupos combinados por E/OU. */
export interface GrupoFiltro {
  id: string;
  tipo: 'grupo';
  combinador: 'E' | 'OU';
  itens: ItemFiltro[];
}

export type ItemFiltro = Regra | GrupoFiltro;

export type Tema = 'light' | 'dark';

/** Situação visual derivada de uma conta numa data de referência. */
export type StatusConta = 'pago' | 'parcial' | 'pendente' | 'vencido';

/** Grupo de contas da mesma categoria no mesmo dia. */
export interface GrupoConta {
  categoria_id: string | null;
  catNome: string;
  catCor: string;
  contas: Conta[];
  soma: number;
  status: StatusConta;
  emAberto: number;
}
