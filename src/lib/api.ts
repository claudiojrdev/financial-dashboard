import type { Categoria, Conta } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.erro || `Erro ${res.status}`);
  }
  return res.json();
}

export interface SyncStatus {
  configurado: boolean;
  ultima_sync?: string;
  sync_erro?: string;
  total_movimentos: number;
}

export interface ConfigResponse {
  meeventos_url: string;
  meeventos_token: string;
  configurado: boolean;
}

export interface MovementsResponse {
  data: Conta[];
  pagination: { page: number; page_size: number; total: number };
}

export const api = {
  getConfig: () => request<ConfigResponse>('/config'),

  saveConfig: (meeventos_url: string, meeventos_token: string) =>
    request<{ status: string }>('/config', {
      method: 'POST',
      body: JSON.stringify({ meeventos_url, meeventos_token }),
    }),

  syncNow: () =>
    request<{ status: string; movimentos_sincronizados: number; ultima_sync: string }>(
      '/meeventos/sync',
      { method: 'POST' }
    ),

  getSyncStatus: () => request<SyncStatus>('/meeventos/status'),

  getMovements: (since?: string) => {
    const params = new URLSearchParams({ limit: '10000' });
    if (since) params.set('since', since);
    return request<MovementsResponse>(`/movements?${params}`);
  },

  getCategories: () => request<Categoria[]>('/categories'),

  togglePago: (id: string) =>
    request<Conta>(`/movements/${encodeURIComponent(id)}/toggle-pago`, {
      method: 'PUT',
    }),
};
