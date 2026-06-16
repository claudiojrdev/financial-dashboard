# Prompt — Dashboard Financeiro de Contas a Pagar (Calendário Interativo)

> Prompt de construção destinado ao **Claude Opus 4.8**. Use este documento como
> especificação completa para implementar a aplicação do zero. Siga as decisões já
> tomadas (seção "Decisões fechadas") e, em pontos ambíguos, escolha a opção mais
> simples e robusta documentando a decisão em comentários/README.

---

## 1. Papel e objetivo

Você é um engenheiro de software sênior full-stack. Construa uma **aplicação web**
que importa uma planilha de contas a pagar (`.csv` ou `.xlsx`), exibe os lançamentos
em um **calendário mensal e semanal interativo e editável**, persiste as alterações
localmente e permite **exportar** os dados atualizados de volta para planilha.

O resultado deve ser um projeto **funcional, executável e bem organizado**, com
instruções claras de instalação e execução.

---

## 2. Decisões fechadas (NÃO reabrir)

| Tema | Decisão |
|------|---------|
| Arquitetura | **Somente frontend (SPA).** Sem backend/servidor. Todo o processamento (parsing, validação, exportação) acontece no navegador. |
| Persistência dos dados | **Local no navegador via IndexedDB.** Os lançamentos e suas edições vivem no cliente. |
| Parsing e exportação | **No cliente**, usando bibliotecas JS (ver seção 3). Nada é enviado para fora do navegador. |
| Autenticação | **Nenhuma.** App single-user, uso pessoal. Estruture o código de forma que adicionar auth/backend no futuro seja simples, mas não implemente agora. |
| Estilo visual | **Moderno e limpo:** layout arejado, tipografia legível, tema claro/escuro, foco em usabilidade. |

> Observação: o app é totalmente offline-first — funciona sem conexão e sem servidor.
> Mantenha a camada de parsing/exportação isolada (ex.: pasta `lib/`) para que, se um
> dia for preciso mover para um backend, a troca seja localizada.

---

## 3. Stack recomendada (somente frontend)

- React 18 + **TypeScript**
- **Vite** como bundler/dev server
- **Tailwind CSS** para estilo (tema claro/escuro)
- Biblioteca de estado leve (Zustand ou Context + hooks) — evite over-engineering
- `idb` (wrapper de IndexedDB) para persistência
- **Parsing no cliente:** `papaparse` (CSV) e `xlsx` / SheetJS (XLSX)
- **Exportação no cliente:** gerar `.csv` e `.xlsx` (SheetJS) e disparar download via Blob
- Componente de calendário: pode usar uma lib (ex.: FullCalendar ou react-big-calendar) **ou** construir um grid próprio. Avalie e escolha justificando; priorize controle de edição inline e transições suaves.

Se você julgar uma alternativa claramente melhor para algum ponto, pode trocar,
**desde que documente o porquê** e mantenha as decisões fechadas da seção 2.

---

## 4. Modelo de dados

Cada lançamento (conta) tem os campos abaixo. Normalize nomes de coluna da planilha
para estas chaves (aceite variações de acento/maiúsculas/sinônimos comuns):

```ts
interface Conta {
  id: string;                 // gerado no import (uuid) se a planilha não tiver id
  nome: string;
  categoria: string;
  unidade: string;
  valor: number;              // valor previsto/devido
  valor_pago: number | null;  // valor efetivamente pago
  data_vencimento: string;    // ISO yyyy-mm-dd
  data_pagamento: string | null; // ISO yyyy-mm-dd, null se não pago
  pago: boolean;
}
```

Regras de normalização e validação:
- Datas: aceite formatos comuns (`dd/mm/aaaa`, `aaaa-mm-dd`, serial do Excel) e
  normalize para ISO `yyyy-mm-dd`.
- Valores monetários: aceite `1.234,56`, `1234.56`, `R$ 1.234,56` etc.; normalize
  para `number`.
- `pago`: aceite `true/false`, `sim/não`, `1/0`, `x`/vazio.
- Coerência: se `pago === true` e `data_pagamento` vazio, sinalize como aviso (não
  bloqueie). Se `valor_pago` vazio e `pago === true`, assuma `valor_pago = valor` (mas
  marque como inferido).
- Linhas inválidas (sem nome ou sem data de vencimento) entram numa lista de
  "erros de importação" exibida ao usuário, sem derrubar todo o import.

---

## 5. Requisitos funcionais

### 5.1 Importação de planilha
- Upload de `.csv` e `.xlsx` (drag-and-drop + botão).
- O **próprio frontend** faz parsing/validação (papaparse/SheetJS), produz JSON
  normalizado + relatório de avisos/erros por linha e grava no IndexedDB.
- **Tela de pré-visualização/mapeamento** antes de confirmar: mostrar as primeiras
  linhas, permitir mapear colunas da planilha → campos do modelo quando a detecção
  automática não bater, e exibir avisos/erros.
- Política ao reimportar: perguntar ao usuário se quer **substituir** tudo, **mesclar**
  (por `id`/chave) ou **acrescentar**.

### 5.2 Visualização em calendário (mensal e semanal)
- **Visão mensal:** grid do mês; cada dia mostra as contas com `data_vencimento`
  naquele dia (resumo: nome curto, valor, status pago/pendente por cor).
- **Visão semanal:** mesma informação com mais detalhe por dia.
- **Alternância mensal ↔ semanal** com **transição suave e rápida**; trocar de visão
  **preserva todas as alterações** (vêm do mesmo estado/IndexedDB).
- Navegação entre períodos (mês/semana anterior e seguinte, "hoje").
- Indicadores visuais: pago (verde), pendente no prazo (neutro), **vencido e não pago**
  (vermelho/alerta), pago parcial (`valor_pago < valor`).
- Cabeçalho/resumo do período: total previsto, total pago, total pendente, total vencido.

### 5.3 Edição interativa
- Clicar numa conta abre edição (modal ou painel lateral) para alterar **qualquer
  campo**: nome, categoria, unidade, valor, valor_pago, datas, e **status de pagamento**.
- Marcar como pago/não pago com um toque (ex.: checkbox/toggle no card), atualizando
  `pago`, `data_pagamento` e `valor_pago` de forma coerente.
- Toda edição persiste imediatamente no IndexedDB (otimista, com feedback visual).
- Permitir **criar** uma nova conta e **excluir** uma conta.
- (Desejável, se viável) arrastar uma conta para outro dia para alterar a data de
  vencimento.

### 5.4 Exportação de planilha
- Botão "Exportar" gera arquivo com o estado atual (todas as edições).
- Suportar `.csv` e `.xlsx`.
- Geração **no cliente** (SheetJS/Blob) e download direto, sem servidor.
- Colunas exportadas iguais ao modelo de dados; datas e valores em formato amigável.

---

## 6. Requisitos não-funcionais
- **TypeScript** com tipagem real (sem `any` espalhado).
- Código organizado por responsabilidade; componentes pequenos e reutilizáveis.
- Estados de carregamento, vazio e erro tratados na UI.
- Responsivo (desktop primeiro; utilizável em tablet).
- Acessibilidade básica: foco visível, labels, contraste adequado, navegação por teclado nos modais.
- Performance: o calendário deve continuar fluido com **alguns milhares** de lançamentos.
- App offline-first; funciona sem conexão depois de carregado.

---

## 7. Estrutura esperada do projeto

```
/ (raiz)  — projeto único React + Vite + TS + Tailwind
├── src/
│   ├── components/   # Calendário, cards, modais, upload, etc.
│   ├── store/        # estado global
│   ├── db/           # camada IndexedDB
│   ├── lib/          # parsing, exportação, normalização, datas, dinheiro
│   └── pages/
├── public/
├── index.html
└── README.md        # como instalar e rodar
```

---

## 8. Critérios de aceitação (a aplicação está pronta quando)
1. `npm install` + `npm run dev` (ou comando documentado) sobem o app sem erro.
2. Consigo importar um `.csv` **e** um `.xlsx` de exemplo; vejo pré-visualização e
   relatório de avisos/erros.
3. Os lançamentos aparecem no **calendário mensal** nos dias de vencimento corretos.
4. Alterno para **semanal** e volta sem perder dados, com transição suave.
5. Edito qualquer campo de uma conta e marco como paga; ao **recarregar a página**, a
   alteração permanece (IndexedDB).
6. Vejo destaque visual para contas **vencidas e não pagas** e os **totais** do período.
7. **Exporto** para `.csv` e `.xlsx` e o arquivo reflete todas as minhas edições.
8. README explica claramente arquitetura, decisões e como rodar.

---

## 9. Entregáveis
1. Código completo de `frontend/` e `backend/`.
2. `README.md` na raiz (setup, scripts, arquitetura, decisões tomadas).
3. Uma planilha de exemplo (`exemplo.csv`) para teste rápido.
4. Comentários explicando pontos não óbvios (normalização de datas/valores, mapeamento de colunas).

---

## 10. Como trabalhar (instruções de processo)
- Comece propondo um **plano curto** e a estrutura de pastas, depois implemente.
- Implemente em ordem útil: modelo de dados + IndexedDB → import (backend+preview) →
  calendário mensal → semanal + transição → edição → exportação → polimento visual.
- Faça commits/etapas lógicas e mantenha o app rodável a cada etapa.
- Se encontrar uma decisão ambígua não coberta aqui, **escolha o caminho mais simples
  e robusto** e registre a decisão no README — não trave esperando confirmação.
- Ao final, faça um auto-checklist contra a seção 8 (Critérios de aceitação).
```
