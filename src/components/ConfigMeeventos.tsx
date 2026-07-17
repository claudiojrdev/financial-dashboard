import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api, type ConfigResponse } from '../lib/api';
import { IconFechar } from './icons';
import { toast } from './Toaster';

interface Props {
  aberto: boolean;
  onFechar: () => void;
}

export function ConfigMeeventos({ aberto, onFechar }: Props) {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      api.getConfig().then((cfg) => {
        setUrl(cfg.meeventos_url || '');
        setToken('');
      }).catch(() => {});
    }
  }, [aberto]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !token.trim()) {
      toast.erro('Preencha URL e token.');
      return;
    }
    setSalvando(true);
    try {
      await api.saveConfig(url.trim(), token.trim());
      toast.sucesso('Configuração salva.');
      onFechar();
    } catch (err) {
      toast.erro(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar(); }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Configurar Meeventos"
            className="card w-full max-w-md overflow-hidden rounded-b-none sm:rounded-2xl"
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <h3 className="text-base font-semibold">Configurar Meeventos</h3>
              <button type="button" onClick={onFechar} className="btn-ghost px-1.5 py-1.5" aria-label="Fechar">
                <IconFechar />
              </button>
            </div>

            <form onSubmit={salvar} className="px-5 py-4">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="field-label" htmlFor="f-mee-url">URL do sistema</label>
                  <input
                    id="f-mee-url"
                    className="field-input"
                    placeholder="https://seudominio.meeventos.com.br"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="f-mee-token">Token de acesso</label>
                  <input
                    id="f-mee-token"
                    type="password"
                    className="field-input"
                    placeholder="Token gerado no Meeventos"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={onFechar} className="btn-outline">Cancelar</button>
                <button type="submit" disabled={salvando} className="btn-primary">
                  {salvando ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
