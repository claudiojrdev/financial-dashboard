import { AnimatePresence, motion } from 'framer-motion';
import { create } from 'zustand';

type TipoToast = 'sucesso' | 'erro' | 'info';

interface AcaoToast {
  rotulo: string;
  on: () => void;
}

interface Toast {
  id: string;
  tipo: TipoToast;
  texto: string;
  acao?: AcaoToast;
}

interface EstadoToast {
  toasts: Toast[];
  push: (tipo: TipoToast, texto: string, acao?: AcaoToast) => void;
  remover: (id: string) => void;
}

const useToastStore = create<EstadoToast>((set) => ({
  toasts: [],
  push: (tipo, texto, acao) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, tipo, texto, acao }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, acao ? 5000 : 3200);
  },
  remover: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Dispara um toast de qualquer lugar (fora de componentes inclusive). */
export const toast = {
  sucesso: (t: string) => useToastStore.getState().push('sucesso', t),
  erro: (t: string) => useToastStore.getState().push('erro', t),
  info: (t: string) => useToastStore.getState().push('info', t),
  comAcao: (t: string, rotulo: string, on: () => void) =>
    useToastStore.getState().push('info', t, { rotulo, on }),
};

const ESTILO: Record<TipoToast, string> = {
  sucesso: 'border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200',
  erro: 'border-red-500/40 bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200',
  info: 'border-brand-500/40 bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-200',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const remover = useToastStore((s) => s.remover);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.18 }}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-md ${ESTILO[t.tipo]}`}
          >
            <span className="cursor-pointer" onClick={() => remover(t.id)}>
              {t.texto}
            </span>
            {t.acao && (
              <button
                type="button"
                onClick={() => {
                  t.acao!.on();
                  remover(t.id);
                }}
                className="shrink-0 rounded-md bg-black/5 px-2 py-1 text-xs font-semibold underline-offset-2 hover:underline dark:bg-white/10"
              >
                {t.acao.rotulo}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
