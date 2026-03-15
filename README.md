# Doom — Full-Stack Game & Auth Platform

> Aplicação full-stack com jogo raycasting (estilo Doom), autenticação, leaderboard e integração Manus para deploy automático.

---

## Índice

- [Visão Geral e Arquitetura](#visão-geral-e-arquitetura)
- [Stack Técnico](#stack-técnico)
- [Diagrama de Arquitetura](#diagrama-de-arquitetura)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Pré-requisitos](#pré-requisitos)
- [Desenvolvimento Local](#desenvolvimento-local)
- [Desenvolvimento com Docker](#desenvolvimento-com-docker)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Base de Dados](#base-de-dados)
- [Deploy (Manus + Neon)](#deploy-manus--neon)
- [Scripts Disponíveis](#scripts-disponíveis)

---

## Visão Geral e Arquitetura

A aplicação combina:

1. **Frontend** — React 19 com Vite, roteamento (Wouter), UI com Radix e Tailwind
2. **Backend** — Node.js (Express) com tRPC para API type-safe
3. **Base de Dados** — PostgreSQL via Drizzle ORM
4. **Jogo** — Raycasting em canvas (game.js), inspirado em Doom clássico

O fluxo principal: o utilizador interage com a interface React; o cliente usa o tRPC client para chamadas à API; o servidor Express expõe os procedimentos tRPC e acede ao PostgreSQL via Drizzle. Em desenvolvimento, o Vite roda como middleware do Express com HMR. Em produção, os ficheiros estáticos (incluindo o jogo) são servidos pelo Express.

---

## Stack Técnico

| Camada         | Tecnologia                     | Versão / Notas                    |
|----------------|--------------------------------|-----------------------------------|
| Runtime        | Node.js                        | 20 LTS (recomendado)              |
| Package Manager| pnpm                           | 10.x                              |
| Frontend       | React, Vite, TypeScript        | React 19, Vite 7                  |
| UI             | Radix UI, Tailwind CSS         | Componentes acessíveis            |
| Roteamento     | Wouter                         | Roteamento client-side            |
| API            | tRPC                           | v11 — APIs type-safe              |
| Backend        | Express                        | Servidor HTTP                     |
| ORM            | Drizzle                        | Schema + migrações                |
| Base de Dados  | PostgreSQL                     | 15+ (Neon em prod, local em dev)  |
| Deploy         | Manus                          | Deploy automático                 |

---

## Diagrama de Arquitetura

```mermaid
flowchart TB
    subgraph Browser["Browser"]
        UI[React UI]
        Game[Canvas Game]
        tRPCClient[tRPC Client]
        UI --> tRPCClient
        UI --> Game
    end

    subgraph Server["Node.js Server"]
        Express[Express]
        Vite[Vite Dev Server]
        tRPCServer[tRPC Router]
        Express --> Vite
        Express --> tRPCServer
    end

    subgraph Data["Data Layer"]
        Drizzle[Drizzle ORM]
        DB[(PostgreSQL)]
        Drizzle --> DB
    end

    subgraph External["External Services"]
        Neon[Neon DB - Prod]
        OAuth[OAuth Provider]
    end

    tRPCClient -->|HTTP/JSON| Express
    tRPCServer --> Drizzle
    Drizzle -.->|Production| Neon
    tRPCServer -.-> OAuth
```

```mermaid
flowchart LR
    subgraph Dev["Desenvolvimento Local (Docker)"]
        App[app:9992]
        PG[db:5432]
        App --> PG
    end

    subgraph Prod["Produção (Manus)"]
        Manus[Manus Runtime]
        NeonDB[Neon PostgreSQL]
        Manus --> NeonDB
    end
```

```mermaid
flowchart TD
    subgraph Client["client/"]
        Pages[pages/]
        Components[components/]
        Hooks[hooks/]
        Public[public/game.js]
    end

    subgraph Server["server/"]
        Core[_core/]
        Routers[routers.ts]
        DB[db.ts]
    end

    subgraph Shared["shared/"]
        Types[types.ts]
        Const[const.ts]
    end

    subgraph Drizzle["drizzle/"]
        Schema[schema.ts]
        Migrations[migrations/]
    end

    Pages --> Components
    Pages --> Hooks
    Routers --> DB
    DB --> Schema
    Core --> Shared
```

---

## Estrutura do Projeto

```
├── client/                 # Frontend React + Vite
│   ├── public/             # Assets estáticos (game.js, mike.jpg)
│   └── src/
│       ├── pages/          # Páginas (Home, Game, Login, Settings, etc.)
│       ├── components/     # Componentes reutilizáveis
│       ├── contexts/       # React Context (Auth, Theme)
│       └── hooks/          # Custom hooks
├── server/                 # Backend Express + tRPC
│   ├── _core/              # Configuração (vite, trpc, oauth, etc.)
│   └── routers.ts          # Procedimentos tRPC
├── shared/                 # Código partilhado cliente/servidor
├── drizzle/                # Schema e migrações
│   ├── schema.ts
│   └── *.sql
├── Dockerfile.dev          # Imagem para desenvolvimento
├── docker-compose.yml      # db + app (porta 9992)
├── .env.dev                # Variáveis para Docker dev (commitado)
├── .env.example            # Template para dev sem Docker
└── package.json
```

---

## Pré-requisitos

- **Node.js** 20+ (LTS)
- **pnpm** 10+
- **Docker** e **Docker Compose** (para desenvolvimento dockerizado)
- **PostgreSQL** 15+ (ou uso do contentor Docker)

---

## Desenvolvimento Local

### Sem Docker (host direto)

1. Configurar base de dados local (ex.: PostgreSQL em Docker):

   ```bash
   pnpm db:up
   pnpm db:migrate
   ```

2. Criar `.env` a partir do exemplo:

   ```bash
   cp .env.example .env
   # Editar DATABASE_URL para postgresql://doom:doom_dev_password@localhost:5432/doom_dev
   ```

3. Instalar dependências e iniciar:

   ```bash
   pnpm install
   pnpm dev:local
   ```

4. Aceder em `http://localhost:3000` (ou à porta indicada no terminal).

---

## Desenvolvimento com Docker

**O desenvolvedor só precisa executar e codificar.** O deploy é responsabilidade da pipeline; o mesmo código é usado em ambos os contextos.

- O ficheiro **`.env.dev`** é commitado e carregado automaticamente pelo docker-compose.
- Não é necessário criar `.env` nem configurar variáveis para desenvolvimento.
- As migrações são aplicadas automaticamente ao iniciar o contentor.

### Regra de rede

- A aplicação é exposta **obrigatoriamente na porta 9992**.
- O serviço `db` expõe a porta 5432 para o host (opcional, para ferramentas externas).

### Comandos

```bash
# Construir e iniciar (migrações automáticas)
pnpm docker:dev

# Aceder à aplicação
# http://localhost:9992

# Utilizador de teste (criado automaticamente)
# Email: teste@teste.com | Senha: teste123
```

### Executar migrações manualmente (opcional)

As migrações correm no arranque. Para forçar novamente:

```bash
docker compose exec app pnpm db:migrate
```

### Logs

```bash
docker compose logs -f app
docker compose logs -f db
```

### Parar

```bash
docker compose down
```

---

## Variáveis de Ambiente

| Variável           | Obrigatório | Descrição                                       |
|--------------------|------------|-------------------------------------------------|
| `DATABASE_URL`     | Sim        | Connection string PostgreSQL                    |
| `NEON_DATABASE_URL`| Não        | Fallback para Neon em produção                  |
| `JWT_SECRET`       | Sim        | Secret para tokens de sessão                    |
| `VITE_APP_ID`      | Não        | App ID do Manus / OAuth                         |
| `PORT`             | Não        | Porta do servidor (default: 3000)               |
| `NODE_ENV`         | Não        | `development` ou `production`                   |

---

## Base de Dados

- **Desenvolvimento:** PostgreSQL 15 em Docker (`db`)
- **Produção:** Neon (connection string via `DATABASE_URL` ou `NEON_DATABASE_URL`)

### Migrações

```bash
pnpm db:migrate      # Aplicar migrações
pnpm db:push         # Gerar e aplicar (drizzle-kit)
```

### Credenciais locais (Docker)

- Utilizador: `doom`
- Password: `doom_dev_password`
- Base: `doom_dev`
- Host: `localhost` (host) ou `db` (rede Docker)

---

## Deploy (Manus + Neon)

A pipeline usa o **mesmo código** do repositório. A diferença está apenas nas variáveis de ambiente:

| Contexto     | Variáveis                          |
|--------------|------------------------------------|
| Dev (Docker) | `.env.dev` → `db` local            |
| Prod (Manus) | Plataforma → Neon DB               |

O desenvolvedor não precisa configurar deploy; a pipeline injecta `DATABASE_URL` (Neon) e demais secrets em produção.

---

## Scripts Disponíveis

| Script        | Descrição                                           |
|---------------|-----------------------------------------------------|
| `pnpm dev`    | Servidor de desenvolvimento (sem subir o DB)        |
| `pnpm dev:local` | Sobe o DB e inicia o servidor de desenvolvimento |
| `pnpm build`  | Build do frontend (Vite) e backend (esbuild)        |
| `pnpm start`  | Inicia o servidor em produção                       |
| `pnpm db:up`  | Sobe o PostgreSQL via Docker Compose                |
| `pnpm db:down`| Para os contentores do Docker Compose               |
| `pnpm docker:dev` | Sobe stack completa (db + app) na porta 9992  |
| `pnpm db:migrate` | Executa migrações Drizzle                       |
| `pnpm db:push`    | Gera e aplica migrações                         |
| `pnpm test`   | Executa testes (Vitest)                             |
| `pnpm check`  | Verificação de tipos (TypeScript)                   |
| `pnpm format` | Formatação com Prettier                             |

---

## Licença

MIT
