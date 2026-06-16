import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from 'idb';
import type { Categoria, Conta } from '../types';
import { slug } from '../lib/normalize';
import { corPorIndice } from '../lib/categorias';

interface FinanceiroDB extends DBSchema {
  contas: {
    key: string;
    value: Conta;
    indexes: { 'por-vencimento': string };
  };
  categorias: {
    key: string;
    value: Categoria;
  };
}

const NOME_DB = 'dashboard-financeiro';
const VERSAO = 2;

let dbPromise: Promise<IDBPDatabase<FinanceiroDB>> | null = null;

function getDB(): Promise<IDBPDatabase<FinanceiroDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FinanceiroDB>(NOME_DB, VERSAO, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (!db.objectStoreNames.contains('contas')) {
          const store = db.createObjectStore('contas', { keyPath: 'id' });
          store.createIndex('por-vencimento', 'data_vencimento');
        }
        if (!db.objectStoreNames.contains('categorias')) {
          db.createObjectStore('categorias', { keyPath: 'id' });
        }
        // v1 -> v2: converte categoria (texto livre) em categorias gerenciadas.
        if (oldVersion >= 1 && oldVersion < 2) {
          await migrarCategorias(tx);
        }
      },
    });
  }
  return dbPromise;
}

/** Migra contas antigas: `categoria: string` -> `categoria_id` + store de categorias. */
async function migrarCategorias(
  tx: IDBPTransaction<FinanceiroDB, ('contas' | 'categorias')[], 'versionchange'>
): Promise<void> {
  const contasStore = tx.objectStore('contas');
  const categoriasStore = tx.objectStore('categorias');
  const todas = await contasStore.getAll();

  const porSlug = new Map<string, Categoria>();
  const semCategoria = slug('Sem categoria');
  let indice = 0;

  for (const conta of todas) {
    const raw = conta as Conta & { categoria?: string };
    const nome = (raw.categoria ?? '').toString().trim();
    let categoria_id: string | null = null;

    if (nome && slug(nome) !== semCategoria) {
      const s = slug(nome);
      let cat = porSlug.get(s);
      if (!cat) {
        cat = { id: crypto.randomUUID(), nome, cor: corPorIndice(indice++) };
        porSlug.set(s, cat);
        await categoriasStore.put(cat);
      }
      categoria_id = cat.id;
    }

    const atualizada: Conta & { categoria?: string } = { ...raw, categoria_id };
    delete atualizada.categoria;
    await contasStore.put(atualizada);
  }
}

// ---- Contas ----

export async function carregarContas(): Promise<Conta[]> {
  const db = await getDB();
  return db.getAll('contas');
}

export async function salvarConta(conta: Conta): Promise<void> {
  const db = await getDB();
  await db.put('contas', conta);
}

export async function salvarContas(contas: Conta[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('contas', 'readwrite');
  await Promise.all(contas.map((c) => tx.store.put(c)));
  await tx.done;
}

export async function removerConta(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('contas', id);
}

export async function limparContas(): Promise<void> {
  const db = await getDB();
  await db.clear('contas');
}

// ---- Categorias ----

export async function carregarCategorias(): Promise<Categoria[]> {
  const db = await getDB();
  return db.getAll('categorias');
}

export async function salvarCategoria(categoria: Categoria): Promise<void> {
  const db = await getDB();
  await db.put('categorias', categoria);
}

export async function salvarCategorias(categorias: Categoria[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('categorias', 'readwrite');
  await Promise.all(categorias.map((c) => tx.store.put(c)));
  await tx.done;
}

export async function removerCategoria(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('categorias', id);
}
