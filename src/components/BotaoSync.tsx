import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { IconRefresh } from './icons';
import { toast } from './Toaster';

interface Props {
  onSyncComplete?: () => void;
}

export function BotaoSync({ onSyncComplete }: Props) {
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.getSyncStatus().then((s) => {
      setUltimaSync(s.ultima_sync ?? null);
      setErro(s.sync_erro ?? null);
    }).catch(() => {});
  }, []);

  async function sincronizar() {
    setSincronizando(true);
    setErro(null);
    try {
      const r = await api.syncNow();
      setUltimaSync(r.ultima_sync);
      toast.sucesso(`${r.movimentos_sincronizados} movimentações sincronizadas.`);
      onSyncComplete?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar';
      setErro(msg);
      toast.erro(msg);
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <div className="relative">
      {erro && (
        <div
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500"
          title={erro}
        />
      )}
      <button
        type="button"
        onClick={sincronizar}
        disabled={sincronizando}
        title={`Sincronizar${ultimaSync ? ` · Última: ${new Date(ultimaSync).toLocaleString('pt-BR')}` : ''}`}
        className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <IconRefresh
          width={16}
          height={16}
          className={sincronizando ? 'animate-spin' : ''}
        />
      </button>
    </div>
  );
}
