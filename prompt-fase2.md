# Prompt — Fase 2: Filtros, Categorias, Tabela e Drag & Drop

> Prompt de evolução destinado ao **Claude Opus 4.8**. O app da Fase 1 já existe e
> funciona (ver [`prompt.md`](./prompt.md) e [`README.md`](./README.md)). Aqui você vai
> **adicionar 4 funcionalidades** ao código existente, **sem reescrever do zero** e
> **sem quebrar** o que já funciona.

---

## 1. Contexto do código atual (respeite esta arquitetura)

App **somente frontend**: React 18 + TS + Vite + Tailwind + Zustand + IndexedDB (`idb`),
parsing/exportação no cliente (PapaParse / SheetJS), animações com framer-motion.
Nomes de código em **português**.

Arquivos-chave a conhecer antes de mexer:

```
src/
├── types.ts                 # interface Conta, Visao ('mensal'|'semanal'), StatusConta, etc.
├── store/useStore.ts        # estado global Zustand + ações (carregar, upsertConta, importar...)
├── db/db.ts                 # IndexedDB: store 'contas' (versão 1)
├── lib/
│   ├── normalize.ts         # detectarCampo, paraDataISO, paraNumero, paraBooleano
│   ├── parse.ts             # importarArquivo / normalizarLinhas
│   ├── export.ts            # exportarCSV / exportarXLSX
│   ├── calendar.ts          # gradeMensal/Semanal, navegar, agruparPorVencimento
│   ├── status.ts            # statusDaConta + META_STATUS (cores por status)
│   ├── totais.ts            # calcularTotais
│   └── contas.ts            # alternarPago, contaVazia
├── components/
│   ├── Cabecalho, BarraPeriodo, Resumo, CartaoConta
│   ├── CalendarioMensal, CalendarioSemanal
│   ├── ModalEdicao, ModalImportacao, EstadoVazio, Toaster, icons
└── App.tsx
```

Modelo atual (resumido):
```ts
interface Conta {
  id; nome; categoria: string; unidade; valor; valor_pago; 
  data_vencimento; data_pagamento; pago;
}
```

**Regras gerais para esta fase**
- Reaproveite componentes/helpers existentes; siga o estilo (Tailwind, classes `.btn`, `.card`, `.field-input`, toasts via `toast.*`).
- Mantenha `npm run typecheck` e `npm run build` **verdes** ao final.
- Toda alteração de dados continua **persistindo no IndexedDB**.
- Ao mudar o schema do IndexedDB, **suba a versão** do banco e escreva a **migração** no `upgrade()`.

---

## 2. Funcionalidade A — Categorias gerenciadas (com cor)

Hoje `categoria` é texto livre. Transforme em **entidade gerenciada**, relação
**1 categoria → 1 conta** (uma conta tem no máximo uma categoria; a mesma categoria
se repete em várias contas).

### Modelo
```ts
interface Categoria {
  id: string;
  nome: string;
  cor: string; // hex, ex.: '#3478f6'
}
```
- Em `Conta`, adicione `categoria_id: string | null` (referência à `Categoria`).
- A `Categoria` é a **fonte da verdade** para nome + cor. Derive o nome para exibição a
  partir do store (não duplique o texto na conta para lógica).

### Persistência e migração
- Novo object store **`categorias`** no IndexedDB. **Suba o banco para versão 2.**
- Migração v1→v2: para cada conta existente, faça **find-or-create** de uma `Categoria`
  a partir do texto atual de `categoria` (case-insensitive por nome), atribua `categoria_id`
  e uma **cor** de uma paleta padrão (distribua as cores). "Sem categoria" pode virar
  `categoria_id = null` ou uma categoria neutra cinza — escolha e documente.

### Gerenciamento (UI)
- Tela/modal **"Categorias"** (botão no Cabecalho): listar, **criar, renomear, recolorir,
  excluir**. Use um seletor de cor a partir de uma **paleta fixa** (8–12 cores) — simples.
- Ao **excluir** uma categoria, as contas afetadas ficam com `categoria_id = null`
  (peça confirmação informando quantas contas serão afetadas).

### Onde a cor aparece
- No `CartaoConta` e na tabela, mostre a **cor da categoria** como um **ponto/lozango**
  (ou tag) — **sem** substituir o indicador de status atual (a borda esquerda colorida
  continua representando pago/parcial/pendente/vencido). Status e categoria são sinais
  distintos; mantenha ambos legíveis.
- No `ModalEdicao`, troque o input de texto de categoria por um **select de categorias**
  (com opção "+ Nova categoria" inline) + "Sem categoria".

### Import / Export
- **Import** (`parse.ts`): ao normalizar, mapeie o texto da coluna categoria para
  `categoria_id` via **find-or-create** de `Categoria` (cor automática da paleta).
- **Export** (`export.ts`): escreva o **nome** da categoria na coluna `categoria`
  (resolvendo `categoria_id` → nome). Mantenha o formato de planilha compatível com o atual.
- Atualize os **dados de exemplo** (`lib/exemplo.ts`) para já virem com categorias coloridas.

---

## 3. Funcionalidade B — Filtros com construtor avançado (E/OU)

Filtro aplicável a **todas as visões** (mensal, semanal e tabela), com **condições
aninhadas** combinando **E (AND)** e **OU (OR)**.

### Estrutura de dados (recursiva)
```ts
type Operador =
  | 'igual' | 'diferente'
  | 'contem'
  | 'maior' | 'menor' | 'maior_igual' | 'menor_igual'
  | 'entre';

type CampoFiltro =
  | 'nome' | 'categoria_id' | 'unidade' | 'status'
  | 'valor' | 'valor_pago' | 'pago'
  | 'data_vencimento' | 'data_pagamento';

interface Regra {
  id: string;
  campo: CampoFiltro;
  operador: Operador;
  valor: string | number | boolean | [number, number] | [string, string];
}

interface GrupoFiltro {
  id: string;
  combinador: 'E' | 'OU';
  itens: (Regra | GrupoFiltro)[]; // permite ao menos 1 nível de aninhamento
}
```

### Avaliador
- Crie `lib/filtros.ts` com `avaliarConta(conta, grupo, ctx): boolean` que percorre a
  árvore. `ctx` pode trazer `hoje` (para `status`) e acesso a categorias se necessário.
- Operadores por tipo de campo: textos (`igual`, `diferente`, `contem`), números/datas
  (`maior`, `menor`, `maior_igual`, `menor_igual`, `entre`), enum/bool (`igual`/`diferente`).
- `status` usa `statusDaConta` (pago/parcial/pendente/vencido).

### UI (construtor)
- Painel/modal **"Filtros"** com:
  - escolha do **combinador** do grupo (E / OU),
  - botões **"+ Condição"** e **"+ Grupo"** (aninhado),
  - cada condição: select de **campo** → select de **operador** (coerente com o tipo) →
    input de **valor** adequado (texto, número, faixa "entre", select de categoria/status,
    toggle de pago, date/intervalo de datas),
  - **remover** condição/grupo.
- Mostre um resumo dos **filtros ativos** (chips) perto da `BarraPeriodo`, com **"Limpar"**.
- Estado do filtro no store; aplique via **selector memoizado** que produz `contasFiltradas`.
  `agruparPorVencimento`, a tabela e o `Resumo` passam a usar **contasFiltradas**
  (os totais refletem o conjunto filtrado — documente isso).
- (Opcional, desejável) persistir o último filtro (IndexedDB/localStorage).

---

## 4. Funcionalidade C — Visão em Tabela (por mês)

Adicione **"Tabela"** como **terceira opção** no seletor de visão.

### Mudanças de tipo/estado
- `Visao` passa a ser `'mensal' | 'semanal' | 'tabela'`. Atualize `BarraPeriodo` e a
  troca animada em `App.tsx` (a transição suave deve continuar funcionando entre as 3).

### Componente `TabelaContas`
- Lista **editável** das contas (respeitando os **filtros ativos**), **agrupada por mês**
  do `data_vencimento`, com **cabeçalho de mês** e **subtotal por mês** (previsto/pago/
  pendente). Ordene por data dentro do mês.
- Colunas: status, nome, categoria (com cor), unidade, valor, valor_pago, vencimento,
  pagamento, pago.
- **Edição rápida**: permitir editar inline os campos principais (nome, valor, categoria,
  datas) e **toggle de pago** direto na linha; clicar na linha (ou num botão "editar")
  abre o `ModalEdicao` existente para edição completa. Toda alteração persiste na hora.
- Estados vazio/sem-resultado-de-filtro tratados.
- Por padrão, a tabela pode mostrar **todos os meses** com dados (não só o período do
  calendário) — assim cumpre "facilitar a visualização enquanto altera". Deixe claro no
  código/README a relação com `dataRef`.

---

## 5. Funcionalidade D — Drag & Drop para mudar datas

No **calendário** (mensal e semanal), permitir **arrastar uma conta para outro dia**,
alterando `data_vencimento` para o dia de destino.

- Use **HTML5 Drag and Drop nativo** (sem nova dependência): `CartaoConta` vira
  `draggable`; cada célula de dia é **drop target**.
- Ao soltar: atualize `data_vencimento` para o dia alvo, **persista** e mostre um
  **toast com "Desfazer"** (restaura a data anterior). Soltar no mesmo dia é no-op.
- **Feedback visual**: realce a célula de destino no `dragOver`; reduza opacidade do
  cartão arrastado.
- Não conflite com o clique (abrir conta) nem com o toggle de pago.
- Funciona nas duas visões de calendário; na tabela não há DnD de data (edição é inline).

---

## 6. Requisitos não-funcionais
- TypeScript estrito, sem `any` solto; tipos novos em `types.ts`.
- Acessibilidade: selects/inputs com label; DnD não pode ser o **único** meio de mudar a
  data (o `ModalEdicao` e a edição inline na tabela já cobrem o caminho por teclado).
- Performance: filtro e agrupamentos memoizados; tabela fluida com milhares de linhas.
- Responsivo; tabela com scroll horizontal no mobile.
- Mantenha tema claro/escuro e o padrão visual atual.

---

## 7. Critérios de aceitação
1. `npm run build` e `npm run typecheck` passam sem erro.
2. Consigo **criar/renomear/excluir** categorias com cor; a cor aparece nos cartões e na
   tabela **sem** apagar o indicador de status.
3. Importar a planilha existente cria/associa categorias automaticamente; exportar mantém
   a coluna `categoria` com os nomes corretos.
4. Monto um filtro **com E e OU aninhados** (ex.: `(categoria = Utilidades) OU (valor > 1000)`
   E `status ≠ pago`) e o calendário, a tabela e os **totais** refletem só o resultado.
5. Alterno entre **Mensal / Semanal / Tabela** com transição suave, sem perder dados nem filtros.
6. Na **tabela** vejo as contas agrupadas por mês com subtotais, edito inline e marco como
   paga; a alteração persiste ao recarregar.
7. **Arrasto** uma conta para outro dia no calendário, a data muda e persiste; o toast
   "Desfazer" restaura a data anterior.

---

## 8. Como trabalhar
- Comece por um **plano curto** + as mudanças de schema (DB v2 + migração de categorias),
  pois Categorias e Filtros dependem do novo modelo.
- Ordem sugerida: Categorias (modelo+migração+CRUD+UI) → Filtros (avaliador+construtor) →
  Tabela (usa filtros+categorias) → Drag & Drop.
- Mantenha o app **rodável a cada etapa** e rode `typecheck`/`build` ao final de cada uma.
- Atualize o **README** (novas features, modelo `Categoria`, schema v2) e os **dados de
  exemplo**.
- Decisões ambíguas não cobertas aqui: escolha o caminho mais simples e robusto e
  registre no README. Ao final, auto-checklist contra a seção 7.
```
