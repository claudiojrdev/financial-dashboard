import type { Categoria } from '../types';
import { slug } from './normalize';

/** Paleta fixa de cores para categorias. */
export const PALETA = [
  '#3478f6', // azul
  '#10b981', // esmeralda
  '#f59e0b', // âmbar
  '#ef4444', // vermelho
  '#8b5cf6', // violeta
  '#ec4899', // rosa
  '#14b8a6', // teal
  '#f97316', // laranja
  '#0ea5e9', // céu
  '#84cc16', // lima
  '#a855f7', // roxo
  '#64748b', // ardósia
];

/** Cor neutra usada como fallback (sem categoria). */
export const COR_NEUTRA = '#94a3b8';

/** Escolhe uma cor da paleta com base num índice (cicla). */
export function corPorIndice(indice: number): string {
  return PALETA[indice % PALETA.length];
}

/** Mapa id -> Categoria para lookups rápidos. */
export function mapaCategorias(categorias: Categoria[]): Map<string, Categoria> {
  return new Map(categorias.map((c) => [c.id, c]));
}

/** Nome de exibição de uma categoria (ou "Sem categoria"). */
export function nomeCategoria(
  categoria_id: string | null,
  mapa: Map<string, Categoria>
): string {
  if (!categoria_id) return 'Sem categoria';
  return mapa.get(categoria_id)?.nome ?? 'Sem categoria';
}

/** Cor de uma categoria (ou cor neutra). */
export function corCategoria(
  categoria_id: string | null,
  mapa: Map<string, Categoria>
): string {
  if (!categoria_id) return COR_NEUTRA;
  return mapa.get(categoria_id)?.cor ?? COR_NEUTRA;
}

/**
 * Encontra uma categoria pelo nome (case/acento-insensitive) numa lista,
 * ou cria uma nova. Retorna a categoria e a lista (possivelmente acrescida).
 * Útil em import/migração.
 */
export function encontrarOuCriar(
  nome: string,
  categorias: Categoria[]
): { categoria: Categoria; categorias: Categoria[]; criada: boolean } {
  const alvo = slug(nome);
  const existente = categorias.find((c) => slug(c.nome) === alvo);
  if (existente) return { categoria: existente, categorias, criada: false };

  const nova: Categoria = {
    id: crypto.randomUUID(),
    nome: nome.trim() || 'Sem nome',
    cor: corPorIndice(categorias.length),
  };
  return { categoria: nova, categorias: [...categorias, nova], criada: true };
}
