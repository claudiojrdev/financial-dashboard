import type { Categoria, Conta } from '../types';

const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
  });

  if (res.status === 401 && token) {
    localStorage.removeItem('auth_token');
    window.location.reload();
  }

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

export interface AuthUser {
  id: string;
  username: string;
  webhook_token?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface MeResponse {
  autenticado: boolean;
  user: AuthUser;
}

export interface BulkResponse {
  status: string;
  movimentos: number;
  categorias: number;
}

export const api = {
  login: (username: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username: string, password: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getAuthStatus: () =>
    request<{ configurada: boolean }>('/auth/status'),

  checkToken: () =>
    request<MeResponse>('/auth/me'),

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

  upsertMovement: (conta: Conta) =>
    request<Conta>('/movements', {
      method: 'POST',
      body: JSON.stringify(conta),
    }),

  deleteMovement: (id: string) =>
    request<{ status: string }>(`/movements/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  bulkReplaceMovements: (movimentacoes: Conta[], categorias: Categoria[]) =>
    request<BulkResponse>('/movements/bulk', {
      method: 'POST',
      body: JSON.stringify({ movimentacoes, categorias }),
    }),

  createCategory: (id: string, nome: string, cor: string) =>
    request<Categoria>('/categories', {
      method: 'POST',
      body: JSON.stringify({ id, nome, cor }),
    }),

  updateCategory: (id: string, nome: string, cor: string) =>
    request<Categoria>(`/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ nome, cor }),
    }),

  deleteCategory: (id: string) =>
    request<{ status: string }>(`/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};
