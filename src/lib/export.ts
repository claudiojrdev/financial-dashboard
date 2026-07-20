import Papa from 'papaparse';
import { utils, writeFileXLSX } from 'xlsx';
import type { Categoria, Conta } from '../types';
import { formatarData } from './format';
import { mapaCategorias, nomeCategoria } from './categorias';

const COLUNAS = [
  'nome',
  'categoria',
  'unidade',
  'valor',
  'valor_pago',
  'data_vencimento',
  'data_pagamento',
  'pago',
  'tipocobranca',
] as const;

/** Monta linhas amigáveis a partir das contas, resolvendo a categoria por nome. */
function paraLinhas(contas: Conta[], categorias: Categoria[]): Record<string, string | number>[] {
  const mapa = mapaCategorias(categorias);
  return contas.map((c) => ({
    nome: c.nome,
    categoria: c.categoria_id ? nomeCategoria(c.categoria_id, mapa) : '',
    unidade: c.unidade,
    valor: c.valor,
    valor_pago: c.valor_pago == null ? '' : c.valor_pago,
    data_vencimento: c.data_vencimento ? formatarData(c.data_vencimento) : '',
    data_pagamento: c.data_pagamento ? formatarData(c.data_pagamento) : '',
    pago: c.pago ? 'sim' : 'não',
    tipocobranca: c.tipocobranca,
  }));
}

function nomeArquivo(ext: string): string {
  const hoje = new Date().toISOString().slice(0, 10);
  return `contas-a-pagar-${hoje}.${ext}`;
}

function baixarBlob(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Exporta as contas como CSV (download imediato). */
export function exportarCSV(contas: Conta[], categorias: Categoria[]): void {
  const csv = Papa.unparse(paraLinhas(contas, categorias), { columns: [...COLUNAS] });
  // BOM para abrir corretamente no Excel pt-BR.
  baixarBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), nomeArquivo('csv'));
}

/** Exporta as contas como XLSX (download imediato). */
export function exportarXLSX(contas: Conta[], categorias: Categoria[]): void {
  const ws = utils.json_to_sheet(paraLinhas(contas, categorias), { header: [...COLUNAS] });
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Contas');
  writeFileXLSX(wb, nomeArquivo('xlsx'));
}
