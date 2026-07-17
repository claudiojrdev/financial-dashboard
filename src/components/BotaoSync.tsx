import { useState, useEffect } from 'react';
import { api } from '../lib/api';
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
    <div className="flex items-center gap-2">
      {erro && (
        <span className="text-xs text-red-500" title={erro}>
          ⚠
        </span>
      )}
      {ultimaSync && (
        <span className="text-[11px] text-slate-400">
          {new Date(ultimaSync).toLocaleString('pt-BR')}
        </span>
      )}
      <button
        type="button"
        onClick={sincronizar}
        disabled={sincronizando}
        className="btn-outline px-2.5 py-1 text-xs"
      >
        {sincronizando ? 'Sincronizando…' : 'Sincronizar'}
      </button>
    </div>
  );
}
