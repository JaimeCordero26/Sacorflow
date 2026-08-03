# SacorTech Dashboard

Herramienta interna de SacorTech (dos socios) para: (1) organizar ideas y
proyectos, (2) trackear progreso real vía GitHub, y (3) dar al cliente una vista
pública de solo lectura con roadmap + chat en tiempo real.

## Stack

- **Next.js 15** (App Router, React 19, TypeScript)
- **Cloudflare Workers** vía **`@opennextjs/cloudflare`** (OpenNext, el adaptador
  mantenido actualmente para correr Next en Cloudflare)
- **Cloudflare D1** (SQLite) + **Drizzle ORM** para esquema y migraciones
- **Durable Objects** (WebSockets nativos con hibernación) para el chat
- **R2** declarado (binding `FILES`) para una fase futura de subida de archivos
- **Tailwind CSS**
- Autenticación propia: cookie de sesión firmada (HMAC-SHA256) + `bcryptjs`

## Arquitectura clave

Next/OpenNext no puede manejar upgrades WebSocket. Por eso el `main` del Worker
es **`worker.ts`** (patrón "custom worker" de OpenNext), que:

1. Re-exporta el Durable Object `ChatRoom`.
2. Intercepta `GET /api/chat` con `Upgrade: websocket`, **autentica** (token
   público para el cliente, cookie de sesión para el socio) y reenvía la
   conexión al DO del proyecto (`env.CHAT_ROOM.idFromName(projectId)`).
3. Delega todo lo demás al handler generado por OpenNext (`.open-next/worker.js`).

Los mensajes se transmiten por el DO **y** se persisten en D1
(`mensajes_chat`), así el historial sobrevive a la hibernación del DO.

## Módulos

| Módulo | Ubicación |
|---|---|
| 1. Auth interna | `src/lib/{password,session,auth}.ts`, `src/app/api/auth/*`, `src/app/login` |
| 2. Kanban ideas/proyectos | `src/app/admin/kanban` (drag-and-drop con `@dnd-kit`) |
| 3. Integración GitHub (App) | `src/lib/github.ts`, `src/app/api/webhooks/github` |
| 4. Gestión de proyectos | `src/app/admin/proyectos/[id]` (etapa editable, activo, token, link público) |
| 5. Mini-CRM clientes | `src/app/admin/clientes` (relación N:N con proyectos) |
| 6. Vista pública cliente | `src/app/p/[token]` (roadmap + progreso + chat, rate-limit por IP) |
| 7. Chat en tiempo real | `src/durable-objects/chat-room.ts`, `worker.ts`, inbox en `src/app/admin` |
| 8. Notificaciones | `src/lib/notifications.ts` (Telegram; canales pluggables) |

## Puesta en marcha (local)

```bash
pnpm install

# 1. Variables de entorno locales
cp .dev.vars.example .dev.vars   # edita SESSION_SECRET y credenciales de seed

# 2. Migraciones sobre la D1 local
pnpm db:migrate:local

# 3. Sembrar los dos socios + etapas por defecto (lee de .dev.vars)
pnpm seed

# 4a. Desarrollo de UI (rápido, SIN chat WebSocket — next dev no usa worker.ts)
pnpm dev

# 4b. Preview COMPLETO (worker.ts real: chat, DO, WS) sobre la build de Cloudflare
pnpm cf:preview
```

> El chat en tiempo real solo funciona con `cf:preview` / `cf:deploy` (que usan
> `worker.ts`), no con `pnpm dev`.

## Despliegue

```bash
# 1. Crear los recursos una sola vez
wrangler d1 create sacortech-db        # copia el database_id a wrangler.jsonc
wrangler r2 bucket create sacortech-files

# 2. Migraciones + seed en remoto
pnpm db:migrate:remote
pnpm seed -- --remote

# 3. Secrets de producción
wrangler secret put SESSION_SECRET
wrangler secret put GITHUB_APP_ID
wrangler secret put GITHUB_APP_PRIVATE_KEY   # ver nota PKCS#8 abajo
wrangler secret put GITHUB_WEBHOOK_SECRET
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
# (los SEED_* solo se usan por el script de seed, no en runtime)

# 4. Deploy
pnpm cf:deploy
```

`wrangler.jsonc` trae `database_id: "REPLACE_WITH_D1_DATABASE_ID"` — reemplázalo
con el id real antes del deploy remoto.

## GitHub App (Módulo 3)

- Crea una GitHub App en `https://github.com/settings/apps` con permisos de
  lectura de Issues; suscríbela a los eventos `issues`, `milestone`, `push`.
- Webhook URL: `https://<tu-dominio>/api/webhooks/github`, con el mismo secreto
  que `GITHUB_WEBHOOK_SECRET`.
- Instala la App en el repo; el **Installation ID** aparece en la URL de
  instalación y se captura en la vista de detalle del proyecto.
- **Clave privada**: GitHub la entrega en PKCS#1 (`BEGIN RSA PRIVATE KEY`), pero
  WebCrypto necesita PKCS#8. Convierte una vez:
  ```bash
  openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in gh.pem -out gh.pkcs8.pem
  ```
  Guarda el contenido PKCS#8 (saltos de línea como `\n`) en `GITHUB_APP_PRIVATE_KEY`.

Cálculo de progreso: si hay milestone vinculado, `issues cerrados / totales del
milestone`; si no, sobre todos los issues del repo. El webhook recalcula y
registra un evento amigable en `eventos_progreso` (traducido a lenguaje de
cliente, sin jerga de GitHub).

## Decisiones de implementación

- **`bcryptjs`** (JS puro) en vez de `bcrypt`/`argon2` nativos, porque el runtime
  de Workers no ejecuta addons nativos de C. Costo 10.
- **Sesión stateless** en cookie firmada con HMAC-SHA256 (WebCrypto). Sin tabla
  de sesiones. Cookie `HttpOnly; Secure; SameSite=Lax`, 30 días.
- **Token público** = `crypto.randomUUID()` (36 chars, > 24 pedidos), único e
  inmutable por proyecto. La vista pública muestra el **mismo** mensaje genérico
  para token inexistente o proyecto inactivo (no filtra cuál es).
- **Rate-limit** de `/p/[token]` con el binding nativo de Cloudflare
  (`unsafe.bindings` tipo `ratelimit`, 30 req/60s por IP). Falla-abierto si el
  binding no está disponible en algún entorno local.
- **Etapas configurables**: tabla `etapas` (no hardcodeadas). El seed carga
  Planeación/Diseño/Desarrollo/Pruebas/Entrega.
- **Notificaciones pluggables**: implementa `NotificationChannel` y agrégalo al
  array `channels` para sumar email/Discord sin tocar la lógica de dispatch.
- **R2**: binding `FILES` declarado, sin uso funcional todavía (fase futura).

## Esquema de datos

`src/db/schema.ts` (Drizzle). Entidades: `usuarios`, `clientes`, `etapas`,
`proyectos`, `proyecto_clientes` (pivote N:N), `ideas_comentarios`,
`eventos_progreso`, `mensajes_chat`.

## Notas

- `.dev.vars` y `cloudflare-env.d.ts` están en `.gitignore`. Los tipos de
  bindings se mantienen a mano en `env.d.ts` (o regenera con `pnpm cf:typegen`).
- No hay registro público: los usuarios se crean solo por `pnpm seed`.
