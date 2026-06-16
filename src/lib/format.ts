import { parseISO } from 'date-fns';

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dataCurta = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Formata um número como moeda BRL. */
export function formatarMoeda(valor: number | null | undefined): string {
  return moeda.format(valor ?? 0);
}

/** Formata uma data ISO `yyyy-mm-dd` como `dd/mm/aaaa`. */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return dataCurta.format(parseISO(iso));
  } catch {
    return iso;
  }
}
