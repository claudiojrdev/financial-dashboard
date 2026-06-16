# Contas a Pagar · Calendário Interativo

Aplicação web (**somente frontend, offline-first**) para importar uma planilha de
contas a pagar (`.csv` / `.xlsx`), visualizá-las em um **calendário mensal/semanal
interativo e editável**, persistir as alterações localmente e **exportar** os dados
atualizados de volta para planilha.

Construída a partir de [`prompt.md`](./prompt.md).

---

## Stack

- **React 18 + TypeScript** com **Vite**
- **Tailwind CSS** (tema claro/escuro)
- **Zustand** para estado global
- **IndexedDB** (via `idb`) para persistência local
- **PapaParse** (CSV) e **SheetJS / xlsx** (XLSX) para import/export — tudo no cliente
- **framer-motion** para transições

Não há backend: parsing, validação, persistência e exportação acontecem 100% no
navegador. Nada é enviado para fora do dispositivo.

---

## Como rodar

Requer **Node 18+** (testado com Node 22).

```bash
npm install
npm run dev        # http://localhost:5173
```

Outros scripts:

```bash
npm run build      # typecheck + build de produção em dist/
npm run preview    # serve o build de produção
npm run typecheck  # apenas checagem de tipos
```

---

## Uso rápido

1. Abra o app e clique em **Importar** (ou **Carregar dados de exemplo**).
2. Selecione/arraste `exemplo.csv` (incluído na raiz) ou sua própria planilha.
3. Revise o **mapeamento de colunas**, os **avisos/erros** e a **pré-visualização**.
4. Confirme a importação — os dados ficam salvos no navegador (IndexedDB).
5. Navegue pelo calendário, alterne **mensal/semanal**, edite contas, marque como
   pagas. Tudo persiste automaticamente.
6. Use **Exportar** para baixar `.csv` ou `.xlsx` com o estado atual.

---

## Funcionalidades (Fase 2)

- **Categorias gerenciadas com cor**: entidade própria (nome + cor) com CRUD (botão
  *Categorias*). Cada conta referencia **uma** categoria; a cor aparece como ponto nos
  cartões/tabela **sem** substituir o indicador de status. Excluir uma categoria
  desassocia as contas (ficam "Sem categoria").
- **Filtros avançados (E/OU)**: construtor de condições aninhadas (botão *Filtros*).
  Ex.: `(Categoria = Utilidades OU Valor > 1000) E Status ≠ Pago`. Campos: nome,
  categoria, unidade, status, valor, valor pago, pago, datas — com operadores por tipo
  (contém, igual, maior/menor, entre…). Aplica-se a **todas as visões** e aos totais.
- **Visão em Tabela**: terceira opção no seletor (Mensal / Semanal / **Tabela**).
  Tabela **editável inline**, agrupada por mês, com subtotais (previsto/pago/pendente).
- **Drag & drop de datas**: arraste uma conta para outro dia no calendário para mudar o
  vencimento; um toast **Desfazer** restaura a data anterior.

## Modelo de dados

```ts
interface Categoria {
  id: string;
  nome: string;
  cor: string;                    // hex, ex.: '#3478f6'
}

interface Conta {
  id: string;
  nome: string;
  categoria_id: string | null;    // referência à Categoria (ou "Sem categoria")
  unidade: string;
  valor: number;                  // valor previsto/devido
  valor_pago: number | null;      // valor efetivamente pago
  data_vencimento: string;        // ISO yyyy-mm-dd
  data_pagamento: string | null;  // ISO yyyy-mm-dd
  pago: boolean;
}
```

> **Persistência (IndexedDB v2)**: stores `contas` e `categorias`. A migração v1→v2
> converte automaticamente o antigo campo de texto `categoria` em categorias
> gerenciadas (com cores da paleta) e popula `categoria_id`.

### Normalização na importação
- **Colunas**: detecção automática por sinônimos (ex.: `vencimento`, `venc`,
  `dt_vencimento` → `data_vencimento`); ajuste manual no diálogo de importação.
- **Categoria**: o texto da coluna `categoria` é resolvido em categoria gerenciada via
  *find-or-create* (case/acento-insensitive), recebendo uma cor automática.
- **Datas**: aceita `dd/mm/aaaa`, `aaaa-mm-dd` e o serial numérico do Excel →
  normaliza para ISO.
- **Valores**: aceita `R$ 1.234,56`, `1.234,56`, `1234.56` → `number`.
- **Pago**: aceita `sim/não`, `true/false`, `1/0`, `x`, `pago/pendente`.
- **Coerência**: marcada como paga sem valor pago assume `valor_pago = valor`
  (gera aviso); linhas sem nome ou sem vencimento entram no relatório de erros e
  são ignoradas (sem derrubar o import).

---

## Estrutura

```
src/
├── components/   # Cabeçalho, calendários, cartões, modais (edição/importação), toaster
├── store/        # estado global (Zustand) + ações
├── db/           # camada IndexedDB (idb)
├── lib/          # parsing, exportação, normalização, datas/calendário, status, totais
└── App.tsx       # orquestração
```

---

## Decisões e observações

- **Single-user, sem autenticação** (uso pessoal). A camada de dados está isolada em
  `db/` e `store/`, então trocar IndexedDB por uma API/banco no futuro é localizado.
- **Política de reimportação**: ao importar com dados já existentes, escolha
  *Substituir*, *Mesclar* (por `id`) ou *Acrescentar*.
- **Status visual**: pago (verde), parcial (âmbar), pendente (cinza), vencido e não
  pago (vermelho).
- **Bundle**: o SheetJS torna o bundle relativamente grande (~720 kB). Para reduzir,
  daria para carregar `xlsx` sob demanda (dynamic import) — não feito para manter o
  código simples.

---

## Possíveis próximos passos
- Persistir o último filtro entre sessões.
- Ordenação por coluna e busca rápida na tabela.
- Recorrência de contas e gráficos de fluxo de caixa.
