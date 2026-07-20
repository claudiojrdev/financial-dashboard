import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  CampoImportavel,
  PoliticaImportacao,
  ResultadoImportacao,
} from '../types';
import { importarArquivo, normalizarLinhas } from '../lib/parse';
import { toast } from './Toaster';
import { IconAviso, IconFechar, IconUpload } from './icons';

interface Props {
  aberto: boolean;
  temDados: boolean;
  onFechar: () => void;
  onConfirmar: (contas: ResultadoImportacao['contas'], politica: PoliticaImportacao) => void;
}

const CAMPOS: { campo: CampoImportavel; rotulo: string }[] = [
  { campo: 'nome', rotulo: 'Nome' },
  { campo: 'categoria', rotulo: 'Categoria' },
  { campo: 'unidade', rotulo: 'Unidade' },
  { campo: 'valor', rotulo: 'Valor' },
  { campo: 'valor_pago', rotulo: 'Valor pago' },
  { campo: 'data_vencimento', rotulo: 'Vencimento' },
  { campo: 'data_pagamento', rotulo: 'Data pagamento' },
  { campo: 'pago', rotulo: 'Pago' },
  { campo: 'tipocobranca', rotulo: 'Tipo' },
  { campo: 'id', rotulo: 'ID' },
];

export function ModalImportacao({ aberto, temDados, onFechar, onConfirmar }: Props) {
  const [arquivo, setArquivo] = useState<string>('');
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null);
  const [mapa, setMapa] = useState<Record<string, CampoImportavel | null>>({});
  const [politica, setPolitica] = useState<PoliticaImportacao>('substituir');
  const [carregando, setCarregando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Recalcula contas/problemas conforme o mapeamento ajustado.
  const recalculo = useMemo(() => {
    if (!resultado) return null;
    return normalizarLinhas(resultado.linhas, mapa);
  }, [resultado, mapa]);

  async function processar(file: File) {
    setCarregando(true);
    try {
      const res = await importarArquivo(file);
      if (!res.cabecalhos.length) {
        toast.erro('Não consegui ler colunas neste arquivo.');
        setCarregando(false);
        return;
      }
      setArquivo(file.name);
      setResultado(res);
      setMapa(res.mapeamentoSugerido);
    } catch (err) {
      console.error(err);
      toast.erro('Falha ao processar o arquivo.');
    } finally {
      setCarregando(false);
    }
  }

  function reset() {
    setArquivo('');
    setResultado(null);
    setMapa({});
    if (inputRef.current) inputRef.current.value = '';
  }

  function fechar() {
    reset();
    onFechar();
  }

  const contasFinais = recalculo?.contas ?? resultado?.contas ?? [];
  const problemas = recalculo?.problemas ?? resultado?.problemas ?? [];
  const erros = problemas.filter((p) => p.severidade === 'erro');
  const avisos = problemas.filter((p) => p.severidade === 'aviso');

  function confirmar() {
    if (!contasFinais.length) {
      toast.erro('Nenhuma linha válida para importar.');
      return;
    }
    onConfirmar(contasFinais, temDados ? politica : 'substituir');
    reset();
  }

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) fechar();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Importar planilha"
            className="card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-b-none sm:rounded-2xl"
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <h3 className="text-base font-semibold">Importar planilha</h3>
              <button type="button" onClick={fechar} className="btn-ghost px-1.5 py-1.5" aria-label="Fechar">
                <IconFechar />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {!resultado ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setArrastando(true);
                  }}
                  onDragLeave={() => setArrastando(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setArrastando(false);
                    const f = e.dataTransfer.files[0];
                    if (f) processar(f);
                  }}
                  className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                    arrastando
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <span className="rounded-full bg-brand-100 p-3 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                    <IconUpload width={26} height={26} />
                  </span>
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">
                      Arraste um arquivo aqui
                    </p>
                    <p className="text-sm text-slate-500">ou clique para selecionar (.csv, .xlsx)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="btn-primary"
                    disabled={carregando}
                  >
                    {carregando ? 'Lendo...' : 'Selecionar arquivo'}
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) processar(f);
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
                    <span className="truncate">
                      <span className="font-medium">{arquivo}</span>
                      <span className="text-slate-500"> · {contasFinais.length} válidas</span>
                    </span>
                    <button type="button" onClick={reset} className="text-brand-600 hover:underline">
                      Trocar
                    </button>
                  </div>

                  {/* Mapeamento de colunas */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Mapeamento de colunas
                    </h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {resultado.cabecalhos.map((cab) => (
                        <div key={cab} className="flex items-center gap-2">
                          <span className="w-1/2 truncate text-sm text-slate-600 dark:text-slate-300" title={cab}>
                            {cab}
                          </span>
                          <select
                            className="field-input w-1/2 py-1.5"
                            value={mapa[cab] ?? ''}
                            onChange={(e) =>
                              setMapa((m) => ({
                                ...m,
                                [cab]: (e.target.value || null) as CampoImportavel | null,
                              }))
                            }
                          >
                            <option value="">— ignorar —</option>
                            {CAMPOS.map((c) => (
                              <option key={c.campo} value={c.campo}>
                                {c.rotulo}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Relatório */}
                  {(erros.length > 0 || avisos.length > 0) && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 text-sm font-medium dark:border-slate-800">
                        <IconAviso width={16} height={16} className="text-amber-500" />
                        {erros.length} erro(s) · {avisos.length} aviso(s)
                      </div>
                      <ul className="max-h-32 overflow-y-auto px-3 py-2 text-xs">
                        {problemas.slice(0, 50).map((p, i) => (
                          <li key={i} className="flex gap-2 py-0.5">
                            <span
                              className={`shrink-0 font-semibold ${
                                p.severidade === 'erro' ? 'text-red-500' : 'text-amber-500'
                              }`}
                            >
                              L{p.linha}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">{p.mensagem}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Preview da amostra */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Pré-visualização ({resultado.amostra.length} primeiras linhas)
                    </h4>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800">
                          <tr>
                            {resultado.cabecalhos.map((c) => (
                              <th key={c} className="whitespace-nowrap px-2 py-1.5 font-medium">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {resultado.amostra.map((linha, i) => (
                            <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                              {resultado.cabecalhos.map((c) => (
                                <td key={c} className="whitespace-nowrap px-2 py-1 text-slate-600 dark:text-slate-400">
                                  {String(linha[c] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Política (só quando já há dados) */}
                  {temDados && (
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Já existem contas. O que fazer?
                      </h4>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {(
                          [
                            ['substituir', 'Substituir', 'Apaga tudo e importa do zero'],
                            ['mesclar', 'Mesclar', 'Atualiza por ID e adiciona o resto'],
                            ['acrescentar', 'Acrescentar', 'Adiciona como novas contas'],
                          ] as [PoliticaImportacao, string, string][]
                        ).map(([val, titulo, desc]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setPolitica(val)}
                            className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                              politica === val
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            <div className="font-medium">{titulo}</div>
                            <div className="text-xs text-slate-500">{desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {resultado && (
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
                <button type="button" onClick={fechar} className="btn-outline">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmar}
                  className="btn-primary"
                  disabled={!contasFinais.length}
                >
                  Importar {contasFinais.length} conta(s)
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

