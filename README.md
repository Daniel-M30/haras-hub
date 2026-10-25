# Haras Hub

**Plataforma web para catálogo de animais, gerenciamento de informações e administração de conteúdo.**

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149eca?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169e1?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss)
![AWS S3](https://img.shields.io/badge/AWS-S3-ff9900?logo=amazons3)

## Sobre o projeto

O **Haras Hub** é uma aplicação Full Stack desenvolvida para apresentar e administrar um catálogo de animais.

A plataforma oferece uma interface pública para consulta de animais, visualização de características e acesso a informações de contato. Também dispõe de um painel administrativo para gerenciamento de registros, mídias, usuários e permissões.

A implementação inclui uma interface identificada como **Elite da Raça**.

## Funcionalidades

### Catálogo público

- Consulta de animais cadastrados.
- Pesquisa por texto e filtros dinâmicos por características.
- Visualização de informações e disponibilidade.
- Páginas individuais com detalhes dos animais.
- Carrossel de imagens e vídeos.
- Seção de destaques na página inicial.
- Contato via WhatsApp com mensagem contextualizada.

### Painel administrativo

- Autenticação de usuários.
- Gerenciamento de animais e tipos de animais.
- Configuração de características dinâmicas.
- Gerenciamento de grupos, papéis e permissões.
- Cadastro e manutenção de usuários.
- Administração dos destaques do catálogo.
- Upload e remoção de mídias associadas aos animais.

As operações administrativas são condicionadas às permissões do usuário autenticado.

### Gerenciamento de mídias

O sistema utiliza o Amazon S3 para armazenamento remoto de imagens e vídeos, com suporte a upload dividido em partes.

O limite atualmente configurado é de **50 MB por arquivo**, com blocos de até **4 MB**.

## Tecnologias utilizadas

| Camada | Tecnologias |
| --- | --- |
| Aplicação web | Next.js 16, React 19, TypeScript |
| Interface | Tailwind CSS 4, componentes Radix UI/shadcn |
| Banco de dados | PostgreSQL, Prisma ORM 7 |
| Autenticação | JWT, bcryptjs |
| Validação | Zod |
| Armazenamento | Amazon S3, AWS SDK |
| Interface administrativa | Componentes React e rotas API do Next.js |

## Estrutura do projeto

- `src/app/(public)/` — Páginas públicas do catálogo.
- `src/app/(private)/` — Área administrativa.
- `src/app/api/` — Rotas da aplicação.
- `src/components/` — Componentes da interface.
- `src/lib/` — Acesso a dados, autenticação, catálogo, armazenamento e regras de aplicação.
- `src/types/` — Definições TypeScript.
- `prisma/schema.prisma` — Modelos de dados.
- `prisma/migrations/` — Migrações do banco de dados.
- `prisma/seed.ts` — Configuração inicial de permissões e conta administrativa.

## Executando localmente

### Pré-requisitos

- Node.js compatível com Next.js 16 e Prisma 7 (recomendado Node.js 22.12 ou superior na linha 22).
- npm.
- PostgreSQL configurado e acessível.
- Credenciais de armazenamento AWS S3 para utilizar o upload remoto de mídias.

### 1. Obter o projeto

```bash
git clone https://github.com/Daniel-M30/haras-hub.git
cd haras-hub
npm ci
```

### 2. Configurar o ambiente

Crie um arquivo `.env` na raiz do projeto, com as variáveis aplicáveis ao seu ambiente:

```dotenv
DATABASE_URL="postgresql://usuario:senha@localhost:5432/haras_hub"
AUTH_SECRET="SUBSTITUA_POR_UM_SEGREDO_FORTE"
ADMIN_PASSWORD_HASH="HASH_BCRYPT_GERADO_LOCALMENTE"

AWS_REGION="SUA_REGIAO"
AWS_S3_BUCKET="SEU_BUCKET"
AWS_ACCESS_KEY_ID="SUA_CHAVE"
AWS_SECRET_ACCESS_KEY="SUA_CHAVE_SECRETA"

NEXT_PUBLIC_WHATSAPP_NUMBER="55DDDNUMERO"
NEXT_PUBLIC_WHATSAPP_DISPLAY_PHONE="(DD) NUMERO"
```

`DATABASE_URL` é necessária para conexão com o banco. `AUTH_SECRET` deve receber um segredo forte e exclusivo. `ADMIN_PASSWORD_HASH` é utilizada pelo seed administrativo.

As variáveis AWS são necessárias para operações com mídias remotas. As variáveis WhatsApp permitem configurar o contato exibido na aplicação.

**Nunca versione credenciais reais, senhas ou arquivos `.env`.**

### 3. Preparar o banco

Utilizando um banco de desenvolvimento apropriado, aplique as migrações existentes e gere o Prisma Client:

```bash
npx prisma migrate dev
npx prisma generate
```

O projeto possui um seed para configurar papéis, permissões, grupos e uma conta administrativa:

```bash
npx prisma db seed
```

**Atenção:** o seed altera registros administrativos, inclusive associações de permissões. Execute-o somente em um banco de desenvolvimento que possa ser modificado, após revisar `prisma/seed.ts`.

### 4. Iniciar a aplicação

```bash
npm run dev
```

Acesse `http://localhost:3000` para visualizar a aplicação. A área administrativa utiliza a rota `/admin`.

O uso do painel depende de uma conta administrativa previamente configurada e das permissões correspondentes.

## Comandos disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera o build de produção |
| `npm run start` | Inicia o build de produção |
| `npm run lint` | Executa o ESLint |
| `npx prisma generate` | Gera o Prisma Client |
| `npx prisma migrate dev` | Aplica migrações no ambiente de desenvolvimento |
| `npx prisma db seed` | Executa o seed configurado |

## Estado atual e limitações

O repositório contém a implementação das funcionalidades descritas, mas esta documentação foi preparada com base na leitura do código-fonte, sem execução local ou validação de implantação.

Ainda não há suíte de testes automatizados nem workflow de CI identificados no repositório.

Antes de disponibilizar a aplicação publicamente, é necessário revisar aspectos de segurança, configuração de autenticação e proteção dos dados de usuários.

A documentação de implantação e demonstrações visuais poderão ser adicionadas após validação do ambiente correspondente.

## Licenciamento

O repositório não possui atualmente um arquivo `LICENSE`. A disponibilização pública do código não implica autorização automática de reutilização.

## Autor

Desenvolvido por [Daniel Monteiro](https://github.com/Daniel-M30).
