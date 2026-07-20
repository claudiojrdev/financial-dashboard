import Papa from 'papaparse';
import { read, utils } from 'xlsx';
import type {
  CampoImportavel,
  ContaImportada,
  ProblemaImportacao,
  ResultadoImportacao,
} from '../types';
import {
  detectarCampo,
  paraBooleano,
  paraDataISO,
  paraNumero,
} from './normalize';

const TAMANHO_AMOSTRA = 8;

/** Lê o arquivo e devolve linhas como objetos (chave = cabeçalho cru). */
async function lerLinhas(arquivo: File): Promise<Record<string, string>[]> {
  const ext = arquivo.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv' || ext === 'txt' || arquivo.type === 'text/csv') {
    const texto = await arquivo.text();
    const { data } = Papa.parse<Record<string, string>>(texto, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
    });
    return data;
  }

  // XLSX/XLS via SheetJS.
  const buffer = await arquivo.arrayBuffer();
  const wb = read(buffer, { cellDates: true });
  const primeira = wb.SheetNames[0];
  if (!primeira) return [];
  const sheet = wb.Sheets[primeira];
  return utils.sheet_to_json<Record<string, string>>(sheet, {
    raw: true,
    defval: '',
  });
}

/** Parseia e normaliza um arquivo de planilha. */
export async function importarArquivo(arquivo: File): Promise<ResultadoImportacao> {
  const linhas = await lerLinhas(arquivo);
  const cabecalhos = linhas.length ? Object.keys(linhas[0]) : [];

  const mapeamentoSugerido: Record<string, CampoImportavel | null> = {};
  for (const cab of cabecalhos) mapeamentoSugerido[cab] = detectarCampo(cab);

  const { contas, problemas } = normalizarLinhas(linhas, mapeamentoSugerido);

  return {
    cabecalhos,
    mapeamentoSugerido,
    linhas,
    contas,
    problemas,
    amostra: linhas.slice(0, TAMANHO_AMOSTRA),
  };
}

/**
 * Normaliza linhas cruas em contas, dado um mapeamento cabeçalho -> campo.
 * Reexecutável: o preview chama isto de novo quando o usuário ajusta o mapa.
 */
export function normalizarLinhas(
  linhas: Record<string, string>[],
  mapa: Record<string, CampoImportavel | null>
): { contas: ContaImportada[]; problemas: ProblemaImportacao[] } {
  // Inverte: campo -> cabeçalho cru.
  const campoPara: Partial<Record<CampoImportavel, string>> = {};
  for (const [cab, campo] of Object.entries(mapa)) {
    if (campo) campoPara[campo] = cab;
  }

  const contas: ContaImportada[] = [];
  const problemas: ProblemaImportacao[] = [];

  linhas.forEach((linha, i) => {
    const nLinha = i + 1;
    const bruto = (campo: CampoImportavel) => {
      const cab = campoPara[campo];
      return cab != null ? linha[cab] : undefined;
    };

    const nome = (bruto('nome') ?? '').toString().trim();
    const dataVenc = paraDataISO(bruto('data_vencimento'));

    // Linha completamente vazia: ignora em silêncio.
    const algumValor = Object.values(linha).some((v) => String(v ?? '').trim() !== '');
    if (!algumValor) return;

    let invalida = false;
    if (!nome) {
      problemas.push({
        linha: nLinha,
        severidade: 'erro',
        campo: 'nome',
        mensagem: 'Sem nome/descrição — linha ignorada.',
      });
      invalida = true;
    }
    if (!dataVenc) {
      problemas.push({
        linha: nLinha,
        severidade: 'erro',
        campo: 'data_vencimento',
        mensagem: 'Data de vencimento ausente ou inválida — linha ignorada.',
      });
      invalida = true;
    }
    if (invalida) return;

    const valor = paraNumero(bruto('valor')) ?? 0;
    let valorPago = paraNumero(bruto('valor_pago'));
    let pago = paraBooleano(bruto('pago'));
    const dataPgto = paraDataISO(bruto('data_pagamento'));

    // Inferências de coerência (geram avisos, não bloqueiam).
    if (pago == null) {
      // Sem coluna "pago" clara: infere por pagamento/valor_pago.
      pago = dataPgto != null || (valorPago != null && valorPago > 0);
    }
    if (pago && valorPago == null) {
      valorPago = valor;
      problemas.push({
        linha: nLinha,
        severidade: 'aviso',
        campo: 'valor_pago',
        mensagem: 'Marcada como paga sem valor pago — assumido igual ao valor.',
      });
    }
    if (pago && !dataPgto) {
      problemas.push({
        linha: nLinha,
        severidade: 'aviso',
        campo: 'data_pagamento',
        mensagem: 'Marcada como paga sem data de pagamento.',
      });
    }
    if (!pago) valorPago = valorPago ?? null;

    const idBruto = (bruto('id') ?? '').toString().trim();
    const rawTipo = (bruto('tipocobranca') ?? '').toString().trim().toLowerCase();
    const tipocobranca = rawTipo === 'receita' ? 'receita' : 'despesa';

    contas.push({
      id: idBruto || crypto.randomUUID(),
      nome,
      categoria_id: null,
      categoriaNome: (bruto('categoria') ?? '').toString().trim(),
      unidade: (bruto('unidade') ?? '').toString().trim() || '—',
      valor,
      valor_pago: pago ? valorPago ?? valor : valorPago,
      data_vencimento: dataVenc as string,
      data_pagamento: pago ? dataPgto : null,
      pago,
      tipocobranca,
    });
  });

  return { contas, problemas };
}
