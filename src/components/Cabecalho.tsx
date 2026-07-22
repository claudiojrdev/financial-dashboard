import { useState } from 'react';
import type { Tema } from '../types';
import {
  IconCalendario,
  IconDownload,
  IconFiltro,
  IconLua,
  IconSair,
  IconSol,
  IconTag,
  IconUpload,
} from './icons';

interface Props {
  tema: Tema;
  temDados: boolean;
  filtrosAtivos: number;
  onAlternarTema: () => void;
  onImportar: () => void;
  onExportarCSV: () => void;
  onExportarXLSX: () => void;
  onCategorias: () => void;
  onFiltros: () => void;
  onLogout: () => void | Promise<void>;
}

export function Cabecalho({
  tema,
  temDados,
  filtrosAtivos,
  onAlternarTema,
  onImportar,
  onExportarCSV,
  onExportarXLSX,
  onCategorias,
  onFiltros,
  onLogout,
}: Props) {
  const [menuExport, setMenuExport] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <IconCalendario width={20} height={20} />
          </span>
          <div className="leading-tight">
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">Contas a Pagar</h1>
            <p className="hidden text-xs text-slate-500 sm:block">Calendário interativo</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {temDados && (
            <>
              <button
                type="button"
                onClick={onFiltros}
                className="btn-outline relative"
                title="Filtros"
              >
                <IconFiltro width={16} height={16} />
                <span className="hidden sm:inline">Filtros</span>
                {filtrosAtivos > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {filtrosAtivos}
                  </span>
                )}
              </button>
              <button type="button" onClick={onCategorias} className="btn-outline" title="Categorias">
                <IconTag width={16} height={16} />
                <span className="hidden sm:inline">Categorias</span>
              </button>
            </>
          )}
          <button type="button" onClick={onImportar} className="btn-outline">
            <IconUpload width={16} height={16} />
            <span className="hidden sm:inline">Importar</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuExport((v) => !v)}
              onBlur={() => setTimeout(() => setMenuExport(false), 150)}
              className="btn-outline"
              disabled={!temDados}
            >
              <IconDownload width={16} height={16} />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            {menuExport && (
              <div className="absolute right-0 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onMouseDown={onExportarCSV}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Exportar .csv
                </button>
                <button
                  type="button"
                  onMouseDown={onExportarXLSX}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Exportar .xlsx
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="btn-ghost px-2 py-2 text-slate-400 hover:text-red-500"
            aria-label="Sair"
            title="Sair"
          >
            <IconSair />
          </button>
          <button
            type="button"
            onClick={onAlternarTema}
            className="btn-ghost px-2 py-2"
            aria-label="Alternar tema claro/escuro"
            title="Tema claro/escuro"
          >
            {tema === 'dark' ? <IconSol /> : <IconLua />}
          </button>
        </div>
      </div>
    </header>
  );
}
