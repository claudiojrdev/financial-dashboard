import { IconUpload } from './icons';

interface Props {
  onImportar: () => void;
  onExemplo: () => void;
}

export function EstadoVazio({ onImportar, onExemplo }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        <IconUpload width={32} height={32} />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Nenhuma conta ainda
        </h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Importe uma planilha <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">.csv</code> ou{' '}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">.xlsx</code> com suas contas a pagar
          para visualizá-las no calendário.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={onImportar} className="btn-primary">
          <IconUpload width={16} height={16} /> Importar planilha
        </button>
        <button type="button" onClick={onExemplo} className="btn-outline">
          Carregar dados de exemplo
        </button>
      </div>
    </div>
  );
}
