import type { CampoImportavel } from '../types';

/**
 * Funções de normalização de valores crus vindos de planilhas.
 * Datas viram ISO `yyyy-mm-dd`; valores monetários viram `number`; booleanos
 * aceitam variações comuns em português.
 */

const DIAS_EPOCH_EXCEL = 25569; // dias entre 1899-12-30 e 1970-01-01
const MS_POR_DIA = 86400 * 1000;

/** Remove acentos e baixa a caixa, para comparar nomes de coluna. */
export function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, '_');
}

/** Sinônimos aceitos para cada campo importável. */
const SINONIMOS: Record<CampoImportavel, string[]> = {
  id: ['id', 'codigo', 'cod'],
  nome: ['nome', 'descricao', 'titulo', 'conta', 'fornecedor', 'lancamento'],
  categoria: ['categoria', 'tipo', 'grupo', 'classificacao'],
  unidade: ['unidade', 'filial', 'loja', 'setor', 'centro_de_custo', 'cc'],
  valor: ['valor', 'valor_previsto', 'valor_devido', 'total', 'valor_total', 'vlr'],
  valor_pago: ['valor_pago', 'pago_valor', 'valor_quitado', 'vlr_pago'],
  data_vencimento: ['data_vencimento', 'vencimento', 'venc', 'data_venc', 'dt_vencimento'],
  data_pagamento: ['data_pagamento', 'pagamento', 'data_pgto', 'dt_pagamento', 'data_quitacao'],
  pago: ['pago', 'quitado', 'status', 'situacao', 'liquidado'],
  tipocobranca: ['tipocobranca', 'tipo_cobranca', 'natureza', 'tipo_lancamento', 'receita_despesa'],
};

/** Tenta casar um cabeçalho cru com um campo importável. */
export function detectarCampo(cabecalho: string): CampoImportavel | null {
  const s = slug(cabecalho);
  for (const campo of Object.keys(SINONIMOS) as CampoImportavel[]) {
    if (SINONIMOS[campo].some((alias) => alias === s)) return campo;
  }
  // casamento parcial (contém)
  for (const campo of Object.keys(SINONIMOS) as CampoImportavel[]) {
    if (SINONIMOS[campo].some((alias) => s.includes(alias) || alias.includes(s))) return campo;
  }
  return null;
}

/** Converte uma string/numero para data ISO `yyyy-mm-dd`, ou null. */
export function paraDataISO(valor: unknown): string | null {
  if (valor == null || valor === '') return null;

  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return formatarISO(valor);
  }

  // Serial do Excel (número de dias).
  if (typeof valor === 'number' && isFinite(valor)) {
    const ms = (valor - DIAS_EPOCH_EXCEL) * MS_POR_DIA;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : formatarISO(d);
  }

  const txt = String(valor).trim();
  if (!txt) return null;

  // Número puro como texto -> serial do Excel.
  if (/^\d+(\.\d+)?$/.test(txt)) {
    const n = Number(txt);
    if (n > 59 && n < 80000) {
      const d = new Date((n - DIAS_EPOCH_EXCEL) * MS_POR_DIA);
      if (!isNaN(d.getTime())) return formatarISO(d);
    }
  }

  // dd/mm/aaaa ou dd-mm-aaaa
  let m = txt.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const dia = Number(m[1]);
    const mes = Number(m[2]);
    let ano = Number(m[3]);
    if (ano < 100) ano += ano < 50 ? 2000 : 1900;
    return montarISO(ano, mes, dia);
  }

  // aaaa-mm-dd (com possível hora)
  m = txt.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
  if (m) {
    return montarISO(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  // Última tentativa: Date nativo.
  const d = new Date(txt);
  return isNaN(d.getTime()) ? null : formatarISO(d);
}

function montarISO(ano: number, mes: number, dia: number): string | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const d = new Date(ano, mes - 1, dia);
  if (d.getMonth() !== mes - 1) return null; // dia inválido para o mês
  return formatarISO(d);
}

/** Formata uma Date local como `yyyy-mm-dd` (sem fuso). */
export function formatarISO(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** Converte texto monetário (`R$ 1.234,56`, `1234.56`, `1.234,56`) em number. */
export function paraNumero(valor: unknown): number | null {
  if (valor == null || valor === '') return null;
  if (typeof valor === 'number') return isFinite(valor) ? valor : null;

  let txt = String(valor).trim();
  if (!txt) return null;

  const negativo = /^\(.*\)$/.test(txt) || txt.includes('-');
  txt = txt.replace(/[^\d.,]/g, '');
  if (!txt) return null;

  const temVirgula = txt.includes(',');
  const temPonto = txt.includes('.');

  if (temVirgula && temPonto) {
    // O último separador é o decimal.
    if (txt.lastIndexOf(',') > txt.lastIndexOf('.')) {
      txt = txt.replace(/\./g, '').replace(',', '.');
    } else {
      txt = txt.replace(/,/g, '');
    }
  } else if (temVirgula) {
    txt = txt.replace(',', '.');
  } else if (temPonto) {
    // Apenas pontos: ambíguo. Em pt-BR, ponto costuma ser separador de milhar.
    const partes = txt.split('.');
    const ultima = partes[partes.length - 1];
    // Vários pontos (1.234.567) ou ponto seguido de 3 dígitos (2.000) => milhar.
    if (partes.length > 2 || (partes.length === 2 && ultima.length === 3)) {
      txt = txt.replace(/\./g, '');
    }
    // Caso contrário (10.50, 1.5) mantém como decimal.
  }

  const n = Number(txt);
  if (!isFinite(n)) return null;
  return negativo ? -Math.abs(n) : n;
}

const VERDADEIROS = new Set(['true', 'verdadeiro', 'sim', 's', '1', 'x', 'pago', 'quitado', 'liquidado']);
const FALSOS = new Set(['false', 'falso', 'nao', 'n', '0', '', 'pendente', 'aberto', 'em_aberto']);

/** Interpreta um valor como booleano "pago". Retorna null se ambíguo. */
export function paraBooleano(valor: unknown): boolean | null {
  if (typeof valor === 'boolean') return valor;
  if (valor == null) return null;
  const s = slug(String(valor));
  if (VERDADEIROS.has(s)) return true;
  if (FALSOS.has(s)) return false;
  return null;
}
