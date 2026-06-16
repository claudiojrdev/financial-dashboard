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

  carregar: () => Promise<void>;
  setVisao: (v: Visao) => void;
  setDataRef: (iso: string) => void;
  alternarTema: () => void;
  setFiltro: (f: GrupoFiltro | null) => void;

  upsertConta: (conta: Conta) => Promise<void>;
  excluirConta: (id: string) => Promise<void>;
  mudarVencimento: (id: string, dataISO: string) => Promise<void>;
  importar: (novas: ContaImportada[], politica: PoliticaImportacao) => Promise<void>;
  carregarConjunto: (contas: Conta[], categorias: Categoria[]) => Promise<void>;
  limparTudo: () => Promise<void>;

  criarCategoria: (nome: string, cor: string) => Promise<Categoria>;
  atualizarCategoria: (categoria: Categoria) => Promise<void>;
  excluirCategoria: (id: string) => Promise<void>;
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

export const useStore = create<EstadoApp>((set, get) => ({
  contas: [],
  categorias: [],
  carregando: true,
  dataRef: new Date().toISOString().slice(0, 10),
  visao: 'mensal',
  tema: temaInicial(),
  filtro: null,

  carregar: async () => {
    set({ carregando: true });
    const [contas, categorias] = await Promise.all([
      db.carregarContas(),
      db.carregarCategorias(),
    ]);
    set({ contas, categorias, carregando: false });
  },

  setVisao: (visao) => set({ visao }),
  setDataRef: (dataRef) => set({ dataRef }),
  setFiltro: (filtro) => set({ filtro }),

  alternarTema: () => {
    const tema = get().tema === 'dark' ? 'light' : 'dark';
    aplicarTema(tema);
    set({ tema });
  },

  upsertConta: async (conta) => {
    await db.salvarConta(conta);
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
    await db.removerConta(id);
    set((s) => ({ contas: s.contas.filter((c) => c.id !== id) }));
  },

  mudarVencimento: async (id, dataISO) => {
    const conta = get().contas.find((c) => c.id === id);
    if (!conta || conta.data_vencimento === dataISO) return;
    const atualizada = { ...conta, data_vencimento: dataISO };
    await db.salvarConta(atualizada);
    set((s) => ({ contas: s.contas.map((c) => (c.id === id ? atualizada : c)) }));
  },

  importar: async (importadas, politica) => {
    // Resolve nomes de categoria em categorias gerenciadas (find-or-create).
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

    if (novasCats.length) await db.salvarCategorias(novasCats);
    set({ categorias: cats });

    if (politica === 'substituir') {
      await db.limparContas();
      await db.salvarContas(contas);
      set({ contas });
      return;
    }

    if (politica === 'acrescentar') {
      const existentes = new Set(get().contas.map((c) => c.id));
      const ajustadas = contas.map((c) =>
        existentes.has(c.id) ? { ...c, id: crypto.randomUUID() } : c
      );
      await db.salvarContas(ajustadas);
      set((s) => ({ contas: [...s.contas, ...ajustadas] }));
      return;
    }

    // mesclar
    const mapa = new Map(get().contas.map((c) => [c.id, c]));
    for (const c of contas) mapa.set(c.id, c);
    await db.salvarContas(contas);
    set({ contas: [...mapa.values()] });
  },

  carregarConjunto: async (contas, categorias) => {
    await db.limparContas();
    await db.salvarCategorias(categorias);
    await db.salvarContas(contas);
    set({ contas, categorias });
  },

  limparTudo: async () => {
    await db.limparContas();
    set({ contas: [] });
  },

  criarCategoria: async (nome, cor) => {
    const categoria: Categoria = { id: crypto.randomUUID(), nome: nome.trim() || 'Sem nome', cor };
    await db.salvarCategoria(categoria);
    set((s) => ({ categorias: [...s.categorias, categoria] }));
    return categoria;
  },

  atualizarCategoria: async (categoria) => {
    await db.salvarCategoria(categoria);
    set((s) => ({
      categorias: s.categorias.map((c) => (c.id === categoria.id ? categoria : c)),
    }));
  },

  excluirCategoria: async (id) => {
    await db.removerCategoria(id);
    // Desassocia das contas afetadas.
    const afetadas = get().contas.filter((c) => c.categoria_id === id);
    const atualizadas = afetadas.map((c) => ({ ...c, categoria_id: null }));
    if (atualizadas.length) await db.salvarContas(atualizadas);
    set((s) => ({
      categorias: s.categorias.filter((c) => c.id !== id),
      contas: s.contas.map((c) => (c.categoria_id === id ? { ...c, categoria_id: null } : c)),
    }));
  },
}));
