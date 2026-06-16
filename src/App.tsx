import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Conta, Visao } from './types';
import { useStore } from './store/useStore';
import { agruparPorVencimento, navegar } from './lib/calendar';
import { alternarPago, contaVazia } from './lib/contas';
import { exportarCSV, exportarXLSX } from './lib/export';
import { gerarExemplo } from './lib/exemplo';
import { calcularTotais } from './lib/totais';
import { hojeISO } from './lib/status';
import { mapaCategorias } from './lib/categorias';
import { avaliarConta, contarRegras } from './lib/filtros';
import { Cabecalho } from './components/Cabecalho';
import { BarraPeriodo } from './components/BarraPeriodo';
import { Resumo } from './components/Resumo';
import { CalendarioMensal } from './components/CalendarioMensal';
import { CalendarioSemanal } from './components/CalendarioSemanal';
import { TabelaContas } from './components/TabelaContas';
import { ModalEdicao } from './components/ModalEdicao';
import { ModalImportacao } from './components/ModalImportacao';
import { ModalCategorias } from './components/ModalCategorias';
import { ModalFiltros } from './components/ModalFiltros';
import { EstadoVazio } from './components/EstadoVazio';
import { Toaster, toast } from './components/Toaster';
import { IconFiltro } from './components/icons';

export default function App() {
  const {
    contas,
    categorias,
    carregando,
    dataRef,
    visao,
    tema,
    filtro,
    carregar,
    setVisao,
    setDataRef,
    setFiltro,
    alternarTema,
    upsertConta,
    excluirConta,
    mudarVencimento,
    importar,
    carregarConjunto,
    criarCategoria,
    atualizarCategoria,
    excluirCategoria,
  } = useStore();

  const [contaAberta, setContaAberta] = useState<Conta | null>(null);
  const [novaConta, setNovaConta] = useState(false);
  const [importAberto, setImportAberto] = useState(false);
  const [catAberto, setCatAberto] = useState(false);
  const [filtrosAberto, setFiltrosAberto] = useState(false);

  const hoje = hojeISO();

  useEffect(() => {
    carregar();
  }, [carregar]);

  const mapaCat = useMemo(() => mapaCategorias(categorias), [categorias]);

  const contasFiltradas = useMemo(
    () => contas.filter((c) => avaliarConta(c, filtro, { hoje })),
    [contas, filtro, hoje]
  );

  const porDia = useMemo(() => agruparPorVencimento(contasFiltradas), [contasFiltradas]);
  const totais = useMemo(() => calcularTotais(contasFiltradas, hoje), [contasFiltradas, hoje]);
  const filtrosAtivos = filtro ? contarRegras(filtro) : 0;

  function abrirConta(conta: Conta) {
    setNovaConta(false);
    setContaAberta(conta);
  }

  function novaNoDia(dataISO: string) {
    setNovaConta(true);
    setContaAberta(contaVazia(dataISO));
  }

  async function togglePago(conta: Conta) {
    await upsertConta(alternarPago(conta));
  }

  async function salvar(conta: Conta) {
    await upsertConta(conta);
    setContaAberta(null);
    toast.sucesso(novaConta ? 'Conta criada.' : 'Conta atualizada.');
  }

  async function excluir(id: string) {
    await excluirConta(id);
    setContaAberta(null);
    toast.info('Conta excluída.');
  }

  async function soltarNoDia(id: string, dataISO: string) {
    const conta = contas.find((c) => c.id === id);
    if (!conta || conta.data_vencimento === dataISO) return;
    const anterior = conta.data_vencimento;
    await mudarVencimento(id, dataISO);
    toast.comAcao('Vencimento alterado.', 'Desfazer', () => {
      void mudarVencimento(id, anterior);
    });
  }

  async function carregarExemplo() {
    const { categorias: cats, contas: cs } = gerarExemplo();
    await carregarConjunto(cs, cats);
    toast.sucesso('Dados de exemplo carregados.');
  }

  function exportar(tipo: 'csv' | 'xlsx') {
    if (!contas.length) return;
    if (tipo === 'csv') exportarCSV(contas, categorias);
    else exportarXLSX(contas, categorias);
    toast.sucesso(`Planilha .${tipo} exportada.`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Cabecalho
        tema={tema}
        temDados={contas.length > 0}
        filtrosAtivos={filtrosAtivos}
        onAlternarTema={alternarTema}
        onImportar={() => setImportAberto(true)}
        onExportarCSV={() => exportar('csv')}
        onExportarXLSX={() => exportar('xlsx')}
        onCategorias={() => setCatAberto(true)}
        onFiltros={() => setFiltrosAberto(true)}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-5">
        {carregando ? (
          <div className="flex flex-1 items-center justify-center text-slate-400">Carregando…</div>
        ) : contas.length === 0 ? (
          <EstadoVazio onImportar={() => setImportAberto(true)} onExemplo={carregarExemplo} />
        ) : (
          <>
            <Resumo totais={totais} />
            <BarraPeriodo
              dataRef={dataRef}
              visao={visao}
              onNavegar={(passo) => setDataRef(navegar(dataRef, visao, passo))}
              onHoje={() => setDataRef(hoje)}
              onTrocarVisao={(v: Visao) => setVisao(v)}
            />

            {filtrosAtivos > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setFiltrosAberto(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                >
                  <IconFiltro width={14} height={14} />
                  {filtrosAtivos} {filtrosAtivos === 1 ? 'condição ativa' : 'condições ativas'}
                </button>
                <span className="text-slate-400">
                  {contasFiltradas.length} de {contas.length} contas
                </span>
                <button
                  type="button"
                  onClick={() => setFiltro(null)}
                  className="text-slate-500 underline-offset-2 hover:underline"
                >
                  Limpar
                </button>
              </div>
            )}

            <div className="card relative min-h-[34rem] flex-1 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={visao}
                  className="absolute inset-0 overflow-auto"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  {visao === 'mensal' ? (
                    <CalendarioMensal
                      dataRef={dataRef}
                      hoje={hoje}
                      porDia={porDia}
                      mapaCat={mapaCat}
                      onAbrirConta={abrirConta}
                      onTogglePago={togglePago}
                      onNovaNoDia={novaNoDia}
                      onSoltarNoDia={soltarNoDia}
                    />
                  ) : visao === 'semanal' ? (
                    <CalendarioSemanal
                      dataRef={dataRef}
                      hoje={hoje}
                      porDia={porDia}
                      mapaCat={mapaCat}
                      onAbrirConta={abrirConta}
                      onTogglePago={togglePago}
                      onNovaNoDia={novaNoDia}
                      onSoltarNoDia={soltarNoDia}
                    />
                  ) : (
                    <TabelaContas
                      contas={contasFiltradas}
                      categorias={categorias}
                      mapaCat={mapaCat}
                      hoje={hoje}
                      onUpsert={upsertConta}
                      onTogglePago={togglePago}
                      onExcluir={excluir}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </main>

      <ModalEdicao
        conta={contaAberta}
        novo={novaConta}
        categorias={categorias}
        onFechar={() => setContaAberta(null)}
        onSalvar={salvar}
        onExcluir={excluir}
        onCriarCategoria={criarCategoria}
      />

      <ModalImportacao
        aberto={importAberto}
        temDados={contas.length > 0}
        onFechar={() => setImportAberto(false)}
        onConfirmar={async (novas, politica) => {
          await importar(novas, politica);
          setImportAberto(false);
          toast.sucesso(`${novas.length} conta(s) importada(s).`);
        }}
      />

      <ModalCategorias
        aberto={catAberto}
        categorias={categorias}
        contas={contas}
        onFechar={() => setCatAberto(false)}
        onCriar={criarCategoria}
        onAtualizar={atualizarCategoria}
        onExcluir={excluirCategoria}
      />

      <ModalFiltros
        aberto={filtrosAberto}
        filtroAtual={filtro}
        categorias={categorias}
        onFechar={() => setFiltrosAberto(false)}
        onAplicar={setFiltro}
      />

      <Toaster />
    </div>
  );
}
