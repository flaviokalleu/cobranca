# Cobrança API — backend executável

Sistema de cobrança multi-tenant (NestJS + Prisma). Roda em dev **sem Docker/Postgres/Redis**
(usa SQLite e fila em memória) e tem **modo produção** que liga Postgres + Redis + WhatsApp.

## Recursos

| Recurso | Como |
|---|---|
| **Login + RBAC** | JWT; papéis ADMIN e AGENT |
| **Clientes** | `POST /customers`, `GET /customers` |
| **Cobranças** | `POST /charges`, `GET /charges`, `POST /charges/:id/pay` |
| **PIX real** | `GET /charges/:id/pix` → copia-e-cola (BR Code/EMV com CRC válido) |
| **Livro-caixa** | partida dobrada; `GET /ledger/balances` |
| **Lembretes** | fila assíncrona + agendador diário; `POST /admin/reminders/run` |
| **Auditoria** | toda mudança de estado é registrada |

### Permissões (RBAC)

| Rota | ADMIN | AGENT |
|---|:--:|:--:|
| criar cliente / cobrança · ver PIX | ✅ | ✅ |
| dar baixa (`/pay`) · ver saldos · criar usuário | ✅ | ❌ |

## Rodar (dev) — PowerShell, dentro de `app`

```powershell
npm install
npm run prisma:generate
npm run db:push
npm run db:seed        # cria admin demo: tenant=demo / admin@demo.com / demo1234
npm run start:dev      # http://localhost:3000
```

### Testar com a API (outro terminal)

```powershell
# Login -> guarda o token
$login = Invoke-RestMethod http://localhost:3000/auth/login -Method Post -ContentType application/json `
  -Body (@{ tenantId="demo"; email="admin@demo.com"; password="demo1234" } | ConvertTo-Json)
$h = @{ Authorization = "Bearer $($login.accessToken)" }

# Listar clientes / criar cobrança / ver PIX / dar baixa / saldos
$cli = Invoke-RestMethod http://localhost:3000/customers -Headers $h
$body = @{ customerId=$cli[0].id; amountCents=4990; description="Mensalidade"; dueDate="2026-07-15" } | ConvertTo-Json
$cob = Invoke-RestMethod http://localhost:3000/charges -Method Post -Headers $h -ContentType application/json -Body $body
Invoke-RestMethod "http://localhost:3000/charges/$($cob.id)/pix" -Headers $h        # PIX copia-e-cola
Invoke-RestMethod "http://localhost:3000/charges/$($cob.id)/pay" -Method Post -Headers $h
Invoke-RestMethod http://localhost:3000/ledger/balances -Headers $h
```

## Verificação automática

```powershell
npm test                 # unidade: partida dobrada + PIX (CRC16)
node scripts/smoke.mjs   # E2E: auth + RBAC + cobrança + ledger + PIX + agendador (15 checagens)
```

## WhatsApp real (Whaileys) — sua ação

1. No `.env`, mude `REMINDER_SENDER="whaileys"`.
2. `npm run start:dev`.
3. Abra o painel administrativo do WhatsApp, gere o QR Code e escaneie com o WhatsApp do celular (Aparelhos conectados). A partir daí os lembretes vão pelo WhatsApp.

## Modo produção (PostgreSQL + Redis) — precisa Docker

```powershell
docker compose up -d                       # sobe Postgres + Redis
copy .env.production.example .env           # e ajuste os valores
# troque o provider em prisma/schema.prisma para "postgresql"
npm run prisma:generate
npx prisma migrate deploy                   # ou: npm run db:push
npm run build; npm run start
```
Com `QUEUE_DRIVER="bullmq"` a fila passa a usar Redis (retry/backoff/persistência) — sem mexer no código de negócio.

## Frontend

A interface web (login + painel) está em `../web`. Veja o README de lá.

## Estrutura

```
src/
  main.ts                      boot + CORS + validação global
  app.module.ts                guards globais (JWT + RBAC) + agendador
  auth/                        login, JWT, papéis (RBAC)
  common/
    tenant/  prisma/  audit/   isolamento, banco, auditoria
    queue/                     fila trocável: memória (dev) | BullMQ/Redis (prod)
  modules/
    customers/  charges/  ledger/   negócio + partida dobrada
    pix/                       gerador de PIX copia-e-cola (BR Code)
    reminders/                 worker + agendador + envio (console | WhatsApp)
```
