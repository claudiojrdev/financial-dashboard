import { create } from 'zustand';
import type {
  Categoria,
  Conta,
  ContaImportada,
  GrupoFiltro,
  PoliticaImportacao,
  Tema,
  Visao,
} from '../types';
import * as db from '../db/db';
import { encontrarOuCriar } from '../lib/categorias';
import { slug } from '../lib/normalize';
import { api } from '../lib/api';

interface EstadoApp {
  contas: Conta[];
  categorias: Categoria[];
  carregando: boolean;
  /** Data de referência (ISO) para a visão atual do calendário. */
  dataRef: string;
  visao: Visao;
  tema: Tema;
  /** Filtro ativo (árvore E/OU) ou null. */
  filtro: GrupoFiltro | null;
  /** Meeventos está configurado? */
  meeventosConfigurado: boolean;
  /** Última sincronização ISO ou null. */
  ultimaSync: string | null;
  /** Autenticação */
  token: string | null;
  autenticado: boolean;
  userId: string | null;
  username: string | null;

  carregar: () => Promise<void>;
  setVisao: (v: Visao) => void;
  setDataRef: (iso: string) => void;
  alternarTema: () => void;
  setFiltro: (f: GrupoFiltro | null) => void;

  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  verificarAuth: () => Promise<boolean>;

  upsertConta: (conta: Conta) => Promise<void>;
  excluirConta: (id: string) => Promise<void>;
  mudarVencimento: (id: string, dataISO: string) => Promise<void>;
  importar: (novas: ContaImportada[], politica: PoliticaImportacao) => Promise<void>;
  carregarConjunto: (contas: Conta[], categorias: Categoria[]) => Promise<void>;

  criarCategoria: (nome: string, cor: string) => Promise<Categoria>;
  atualizarCategoria: (categoria: Categoria) => Promise<void>;
  excluirCategoria: (id: string) => Promise<void>;

  setMeeventosConfigurado: (v: boolean) => void;
  setUltimaSync: (iso: string | null) => void;
}

const SEM_CATEGORIA = slug('Sem categoria');

function temaInicial(): Tema {
  const salvo = localStorage.getItem('tema');
  if (salvo === 'dark' || salvo === 'light') return salvo;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function aplicarTema(tema: Tema) {
  document.documentElement.classList.toggle('dark', tema === 'dark');
  localStorage.setItem('tema', tema);
}

function tokenSalvo(): string | null {
  try {
    return localStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

export const useStore = create<EstadoApp>((set, get) => ({
  contas: [],
  categorias: [],
  carregando: true,
  dataRef: new Date().toISOString().slice(0, 10),
  visao: 'mensal',
  tema: temaInicial(),
  filtro: null,
  meeventosConfigurado: false,
  ultimaSync: null,
  token: tokenSalvo(),
  autenticado: false,
  userId: null,
  username: null,

  carregar: async () => {
    set({ carregando: true });
    try {
      const [movRes, categorias] = await Promise.all([
        api.getMovements(),
        api.getCategories(),
      ]);
      const contas = movRes.data.map((c) => ({ ...c, pago: !!c.pago }));
      await db.limparContas();
      await db.limparCategorias();
      await db.salvarContas(contas);
      await db.salvarCategorias(categorias);
      set({ contas, categorias, carregando: false });
    } catch {
      const [contas, categorias] = await Promise.all([
        db.carregarContas(),
        db.carregarCategorias(),
      ]);
      set({ contas, categorias, carregando: false });
    }
  },

  setVisao: (visao) => set({ visao }),
  setDataRef: (dataRef) => set({ dataRef }),
  setFiltro: (filtro) => set({ filtro }),

  alternarTema: () => {
    const tema = get().tema === 'dark' ? 'light' : 'dark';
    aplicarTema(tema);
    set({ tema });
  },

  login: async (username, password) => {
    const { token, user } = await api.login(username, password);
    localStorage.setItem('auth_token', token);
    set({ token, autenticado: true, userId: user.id, username: user.username });
  },

  register: async (username, password) => {
    const { token, user } = await api.register(username, password);
    localStorage.setItem('auth_token', token);
    set({ token, autenticado: true, userId: user.id, username: user.username });
  },

  logout: async () => {
    localStorage.removeItem('auth_token');
    set({ token: null, autenticado: false, userId: null, username: null, contas: [], categorias: [] });
    await db.limparContas().catch(() => {});
    await db.limparCategorias().catch(() => {});
  },

  verificarAuth: async () => {
    const token = get().token;
    if (!token) {
      set({ autenticado: false, userId: null, username: null });
      return false;
    }
    try {
      const res = await api.checkToken();
      set({ autenticado: true, userId: res.user.id, username: res.user.username });
      return true;
    } catch {
      localStorage.removeItem('auth_token');
      set({ token: null, autenticado: false, userId: null, username: null });
      return false;
    }
  },

  upsertConta: async (conta) => {
    await Promise.all([
      api.upsertMovement(conta).catch(() => {}),
      db.salvarConta(conta),
    ]);
    set((s) => {
      const existe = s.contas.some((c) => c.id === conta.id);
      return {
        contas: existe
          ? s.contas.map((c) => (c.id === conta.id ? conta : c))
          : [...s.contas, conta],
      };
    });
  },

  excluirConta: async (id) => {
    await Promise.all([
      api.deleteMovement(id).catch(() => {}),
      db.removerConta(id),
    ]);
    set((s) => ({ contas: s.contas.filter((c) => c.id !== id) }));
  },

  mudarVencimento: async (id, dataISO) => {
    const conta = get().contas.find((c) => c.id === id);
    if (!conta || conta.data_vencimento === dataISO) return;
    const atualizada = { ...conta, data_vencimento: dataISO };
    await Promise.all([
      api.upsertMovement(atualizada).catch(() => {}),
      db.salvarConta(atualizada),
    ]);
    set((s) => ({ contas: s.contas.map((c) => (c.id === id ? atualizada : c)) }));
  },

  importar: async (importadas, politica) => {
    let cats = [...get().categorias];
    const novasCats: Categoria[] = [];

    const contas: Conta[] = importadas.map((imp) => {
      const { categoriaNome, ...resto } = imp;
      let categoria_id: string | null = null;
      const nome = categoriaNome.trim();
      if (nome && slug(nome) !== SEM_CATEGORIA) {
        const r = encontrarOuCriar(nome, cats);
        if (r.criada) {
          cats = r.categorias;
          novasCats.push(r.categoria);
        }
        categoria_id = r.categoria.id;
      }
      return { ...resto, categoria_id };
    });

    if (novasCats.length) {
      await db.salvarCategorias(novasCats);
    }
    const todasCats = [...cats];

    if (politica === 'substituir') {
      await Promise.all([
        api.bulkReplaceMovements(contas, todasCats).catch(() => {}),
        db.limparContas().then(() => db.salvarContas(contas)),
      ]);
      set({ contas, categorias: todasCats });
      return;
    }

    if (politica === 'acrescentar') {
      const existentes = new Set(get().contas.map((c) => c.id));
      const ajustadas = contas.map((c) =>
        existentes.has(c.id) ? { ...c, id: crypto.randomUUID() } : c
      );
      await Promise.all([
        Promise.all(ajustadas.map((c) => api.upsertMovement(c).catch(() => {}))),
        db.salvarContas(ajustadas),
      ]);
      set((s) => ({ contas: [...s.contas, ...ajustadas], categorias: todasCats }));
      return;
    }

    const mapa = new Map(get().contas.map((c) => [c.id, c]));
    for (const c of contas) mapa.set(c.id, c);
    const mescladas = [...mapa.values()];
    await Promise.all([
      api.bulkReplaceMovements(mescladas, todasCats).catch(() => {}),
      db.limparContas().then(() => db.salvarContas(mescladas)),
    ]);
    set({ contas: mescladas, categorias: todasCats });
  },

  carregarConjunto: async (contas, categorias) => {
    await Promise.all([
      api.bulkReplaceMovements(contas, categorias).catch(() => {}),
      db.limparContas().then(() => db.salvarContas(contas)).then(() => db.limparCategorias().then(() => db.salvarCategorias(categorias))),
    ]);
    set({ contas, categorias });
  },

  criarCategoria: async (nome, cor) => {
    const categoria: Categoria = { id: crypto.randomUUID(), nome: nome.trim() || 'Sem nome', cor };
    await Promise.all([
      api.createCategory(categoria.id, categoria.nome, categoria.cor).catch(() => {}),
      db.salvarCategoria(categoria),
    ]);
    set((s) => ({ categorias: [...s.categorias, categoria] }));
    return categoria;
  },

  atualizarCategoria: async (categoria) => {
    await Promise.all([
      api.updateCategory(categoria.id, categoria.nome, categoria.cor).catch(() => {}),
      db.salvarCategoria(categoria),
    ]);
    set((s) => ({
      categorias: s.categorias.map((c) => (c.id === categoria.id ? categoria : c)),
    }));
  },

  excluirCategoria: async (id) => {
    const afetadas = get().contas.filter((c) => c.categoria_id === id);
    const atualizadas = afetadas.map((c) => ({ ...c, categoria_id: null }));
    await Promise.all([
      api.deleteCategory(id).catch(() => {}),
      db.removerCategoria(id),
      ...(atualizadas.length ? [db.salvarContas(atualizadas)] : []),
      ...(atualizadas.length ? [Promise.all(atualizadas.map((c) => api.upsertMovement(c).catch(() => {})))] : []),
    ]);
    set((s) => ({
      categorias: s.categorias.filter((c) => c.id !== id),
      contas: s.contas.map((c) => (c.categoria_id === id ? { ...c, categoria_id: null } : c)),
    }));
  },

  setMeeventosConfigurado: (v) => set({ meeventosConfigurado: v }),
  setUltimaSync: (iso) => set({ ultimaSync: iso }),
}));
