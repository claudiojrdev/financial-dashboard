# Contas a Pagar · Calendário Interativo

Aplicação web para importar planilhas de contas a pagar (`.csv` / `.xlsx`),
visualizá-las em calendário interativo, com **autenticação multi-usuário** e
**dados sincronizados no servidor** — acessível de qualquer dispositivo.

---

## Stack

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Zustand + IndexedDB + framer-motion  
**Backend:** Node.js + Express + SQLite (better-sqlite3) + JWT + bcryptjs  
**Integração:** API Meeventos (sincronização bidirecional via webhooks)

---

## Como rodar (desenvolvimento)

Requer **Node 18+**.

```bash
npm install           # instala deps do frontend + server (via postinstall)
npm run dev           # frontend em http://localhost:5173
npm run dev:server    # backend em http://localhost:3001 (outro terminal)
```

O Vite faz proxy de `/api` para `http://localhost:3001`.

---

## Como rodar (produção)

```bash
npm install
npm run build          # gera dist/ com o frontend compilado
npm start              # server Express serve o frontend + API na porta 3001
```

---

## Uso rápido

1. Acesse o app — a **tela de login** aparece.
2. **Primeiro acesso**: crie um usuário (registro).
3. Após logar, clique em **Importar** (ou **Carregar dados de exemplo**).
4. Selecione/arraste `exemplo.csv` ou sua própria planilha.
5. Revise o **mapeamento de colunas**, os **avisos/erros** e a **pré-visualização**.
6. Confirme a importação — os dados vão para o servidor (SQLite) e ficam disponíveis
   em qualquer dispositivo.
7. Navegue pelo calendário, alterne visões, edite contas, marque como pagas.
8. Faça logout e login de outro dispositivo — os mesmos dados aparecem.

---

## Funcionalidades

- **Autenticação**: registro/login por usuário, JWT, dados isolados por usuário
- **Calendário mensal/semanal** interativo com drag & drop para alterar datas
- **Visão em tabela** editável inline, agrupada por mês com subtotais
- **Categorias gerenciadas** com cor (CRUD completo)
- **Filtros avançados** com E/OU aninhados
- **Sincronização Meeventos**: importa movimentações via API + webhooks
- **Exportação** para `.csv` e `.xlsx`
- **Dados no servidor**: acessíveis de qualquer dispositivo após login

---

## Modelo de dados

```ts
interface Categoria {
  id: string;
  nome: string;
  cor: string;                    // hex
}

interface Conta {
  id: string;
  nome: string;
  categoria_id: string | null;
  unidade: string;
  valor: number;
  valor_pago: number | null;
  data_vencimento: string;        // ISO yyyy-mm-dd
  data_pagamento: string | null;
  pago: boolean;
  tipocobranca: 'receita' | 'despesa';
}
```

---

## Deploy no Render

A configuração ideal é um **Web Service** único que roda o Express (ele serve o
frontend compilado + a API).

### Configuração (dashboard.render.com)

| Campo | Valor |
|-------|-------|
| **Type** | `Web Service` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Root Directory** | (raiz do repositório) |
| **Node Version** | `18` ou `20` |

O `postinstall` no `package.json` já instala as deps do `server/` automaticamente.

### Variáveis de ambiente (nenhama obrigatória)

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `3001` | Porta do servidor (Render define automagicamente) |
| `VITE_API_URL` | `/api` | URL da API (se quiser separar front/backend) |

### ⚠️ Atenção

O `better-sqlite3` é uma dependência nativa. O Render suporta. Se houver erro de
build, use `node:18` ou superior.

O banco SQLite fica no disco efêmero do Render — **dados são perdidos a cada novo
deploy**. Para dados persistentes, configure um banco externo (PostgreSQL, Supabase,
etc.) ou use um volume persistente do Render.

---

## Deploy na Vercel

A Vercel é otimizada para frontend estático. O backend (Express + SQLite) precisa
rodar separadamente.

### Opção 1: Backend no Render + Frontend na Vercel (recomendado)

1. Faça deploy do backend no Render (Web Service) conforme acima.
2. Na Vercel, importe o repositório e configure:

| Campo | Valor |
|-------|-------|
| **Framework** | `Vite` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Environment Variable** | `VITE_API_URL=https://seu-app.render.com/api` |

### Opção 2: Backend como Serverless Function (experimental)

Crie `api/index.js` na raiz:

```js
import '../server/index.js';
```

E configure `vercel.json`:

```json
{
  "builds": [{ "src": "api/index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/api/(.*)", "dest": "api/index.js" }]
}
```

O `better-sqlite3` **não funciona** no ambiente serverless da Vercel. Você precisará
trocar por `sql.js` (SQLite WASM) ou usar um banco externo.

---

## Estrutura do projeto

```
/
├── src/               # Frontend React
│   ├── components/    # Componentes de UI
│   ├── store/         # Estado global (Zustand)
│   ├── db/            # Cache IndexedDB
│   └── lib/           # Parsing, exportação, filtros, etc.
├── server/            # Backend Express
│   ├── index.js       # Servidor principal
│   ├── db.js          # SQLite + migrações
│   ├── auth.js        # Login/registro JWT
│   ├── movements.js   # CRUD de movimentações
│   ├── sync.js        # Sincronização Meeventos
│   ├── webhooks.js    # Webhooks Meeventos
│   └── config.js      # Configuração por usuário
├── package.json       # Dependências do frontend + scripts
└── server/package.json# Dependências do backend
```
