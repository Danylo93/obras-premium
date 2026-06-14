# ObrasMaster Premium — Backend AWS

Arquitetura: **Frontend na Vercel** + **API + Banco de Dados na AWS**.

```
Vercel (React/Vite)  ──HTTPS──▶  API Gateway HTTP API (AWS)
                                          │
                                          ▼
                                     Lambda (Node.js 20)
                                          │
                                          ▼
                                    DynamoDB (NoSQL)
```

## Free tier AWS — permanente

| Serviço | Gratuito para sempre | Limite |
|---|---|---|
| **DynamoDB** | ✅ permanente | 25 GB + 25 WCU + 25 RCU |
| **Lambda** | ✅ permanente | 1 M invocações/mês |
| **API Gateway HTTP API** | ✅ permanente | 1 M chamadas/mês |

> Para uma construtora pequena/média, essas cotas nunca serão atingidas.

---

## 1. Pré-requisitos

```bash
# AWS CLI — configure com suas credenciais IAM
aws configure
# Vai pedir: Access Key ID, Secret Access Key, região (use us-east-1), formato (json)

# AWS SAM CLI
brew install aws-sam-cli   # macOS
# Windows/Linux: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html
```

## 2. Deploy do backend (~ 5 minutos)

```bash
cd obras-premium/backend

# Instalar dependências da função Lambda
cd functions/projects && npm install && cd ../..

# Build e deploy
sam build
sam deploy
# O SAM vai perguntar confirmações — pode aceitar todos os padrões (Enter)
```

Ao final, o SAM exibe a URL da API:

```
─────────────────────────────────────────────
Outputs
─────────────────────────────────────────────
Key         ApiUrl
Description URL da API — coloque em VITE_API_URL
Value       https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
─────────────────────────────────────────────
```

**Copie essa URL** — você vai precisar dela nos próximos passos.

---

## 3. Configurar a variável de ambiente na Vercel

O frontend precisa saber o endereço da API. Na **Vercel**, não existe `.env.local` — a variável é configurada pelo dashboard:

1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard) → seu projeto `obras-premium`
2. **Settings → Environment Variables**
3. Adicione:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com` (a URL do passo 2)
   - **Environments:** Production + Preview + Development
4. Clique em **Save**
5. Faça um novo deploy: **Deployments → Redeploy** (ou faça um `git push`)

> A Vercel faz rebuild com a variável injetada no bundle. Sem isso, o app fica em modo offline (localStorage only).

---

## 4. Testar localmente com o banco AWS

Para testar no seu computador apontando para o banco AWS real, crie o arquivo `.env.local` na raiz do projeto:

```bash
# obras-premium/.env.local
VITE_API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
```

Depois reinicie o servidor:

```bash
npm run dev
```

---

## Como funciona o sync

- **Sem `VITE_API_URL`**: 100% localStorage (modo offline, dados ficam só no navegador)
- **Com `VITE_API_URL`**:
  - Na abertura do app → busca dados do DynamoDB e sincroniza com localStorage
  - A cada criação/edição/exclusão → salva no localStorage imediatamente + push para DynamoDB em background
  - Se a API estiver offline → continua funcionando via localStorage, sincroniza quando voltar

## Identificação do usuário

Cada dispositivo gera automaticamente um UUID no primeiro acesso (salvo em `localStorage` como `obras_user_id`). Esse UUID é enviado no header `x-user-id` em cada requisição — é o que separa os dados de diferentes usuários no DynamoDB.

Para usar em **múltiplos dispositivos** (celular + computador sincronizados), seria necessário implementar autenticação via **AWS Cognito**. O código atual suporta um usuário por dispositivo.

---

## Estrutura da tabela DynamoDB

```
Partition Key: userId   (string — UUID do dispositivo)
Sort Key:      projectId (string — UUID da obra)
Atributos:     todos os campos da obra, incluindo expenses[] embutidos
```

---

## Remover tudo (evitar cobranças)

```bash
sam delete --stack-name obras-master
```
