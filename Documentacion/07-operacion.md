# 07 — Operación

> **Alcance:** levantar el entorno, variables de entorno, seed, tests, build y despliegue, checklist de impacto y rollback. **No cubre:** diseño (→ `01`), reglas de seguridad (→ `04`).
> **Fuentes:** `docker-compose.yml`, `docker-compose.prod.yml`, `backend/Dockerfile*`, `frontend/Dockerfile*`, `nginx/sello-verde.conf`, `DEPLOYMENT_SOP.md`, `deploy.sh`, `backend/package.json`, `frontend/package.json`, `frontend/.env.example`, `backend/src/database/seed/seed.service.ts`, `.gitignore`.
> **Verificado contra:** commit `c66929e` (+ cambios locales sin commitear) · 2026-10-09
> **Lectores:** desarrollador nuevo (levantar el entorno), quien despliega.

> ⚠️ NO VERIFICADO (global): los comandos de este documento se tomaron de archivos del repo (compose, `package.json`, SOP, `deploy.sh`). **No se ejecutó Docker ni el despliegue durante esta documentación**; solo se confirmó que existen los archivos y scripts. Se ejecutó únicamente la prueba de Jest y de ESLint descritas en §5.

## 1. Requisitos
- Docker y Docker Compose v2 (el archivo declara `version: '3.8'`, atributo obsoleto en Compose v2 pero tolerado).
- Para trabajar sin Docker: Node.js 20 (las imágenes usan `node:20-slim`) y un PostgreSQL 16 accesible.
- No hay `.env.example` en la raíz ni en `backend/`; **solo está versionado `frontend/.env.example`**. El `.gitignore` excluye `.env`, `.env.local`, `.env.*.local` y `.env.production`.

> 🔸 BRECHA [BR-25]: no existe una plantilla versionada de las variables del backend y de producción (el comentario de `.env.production` pide copiarlo a `.env` en el servidor, pero ese archivo está ignorado por git).

## 2. Levantar el entorno local (Docker, desarrollo)

1. Crear un archivo `.env` en la raíz con las variables de §3 (sección "Raíz / compose"). El compose de desarrollo **tiene valores por defecto** para casi todas, de modo que arranca incluso sin `.env` (BR-03).
2. Construir y levantar:

```bash
docker compose up -d --build
```

3. Resultado esperado (⚠️ NO VERIFICADO): `db` saludable, backend en `http://localhost:3001/api`, frontend en `http://localhost:3000`. Con `NODE_ENV=development` (fijado en el compose) y base vacía, el backend carga el seed (13 establecimientos de ejemplo) y crea el usuario administrador (`02` §9).
4. Iniciar sesión en `/login`. **Con el compose de desarrollo el usuario administrador siempre se crea con los valores por defecto del código**: `docker-compose.yml` no reenvía `ADMIN_EMAIL` ni `ADMIN_PASSWORD` al backend (solo `docker-compose.prod.yml` lo hace). Esos valores están en `SeedService.initialSetup` y **no se reproducen aquí** (BR-03).
5. Ver logs: `docker compose logs -f backend`.

> ⚠️ NO VERIFICADO: los `Dockerfile` de desarrollo ejecutan el build compilado, no un modo watch; los montajes `./backend/src:/app/src` y `./frontend/src:/app/src` podrían no producir recarga en caliente. Reconstruir con `--build` tras cambios.

### Sin Docker (alternativa)
```bash
# Backend (requiere PostgreSQL y variables DATABASE_* en backend/.env)
cd backend && npm ci && npm run start:dev
# Frontend
cd frontend && npm ci && npm run dev      # puerto 3000
```
Scripts reales (`backend/package.json`): `build`, `start`, `start:dev` (watch), `start:prod` (`node dist/main`), `lint`, `format`, `test`, `test:cov`, `test:e2e`. Frontend (`frontend/package.json`): `dev`, `build`, `start`, `lint`, `type-check`.

## 3. Variables de entorno (nombres y significado; sin valores)

**Backend** (se leen con `process.env.*` en `backend/src`):

| Variable | Significado | Dónde se lee | Notas |
|---|---|---|---|
| `NODE_ENV` | `development` activa seed y logging SQL | `seed.service.ts`, `app.module.ts` | |
| `PORT` | Puerto HTTP del backend | `main.ts` | Por defecto 3001; el compose no lo pasa |
| `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_USER` / `DATABASE_PASSWORD` / `DATABASE_NAME` | Conexión a PostgreSQL | `app.module.ts` | La contraseña tiene fallback embebido (BR-03) |
| `JWT_SECRET` | Secreto de firma del JWT | `auth.module.ts`, `jwt.strategy.ts` | Fallback embebido (BR-03). Cambiarlo invalida todas las sesiones |
| `CORS_ORIGIN` | Único origen permitido por CORS | `main.ts` | Por defecto `http://localhost:3000` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Usuario administrador inicial | `seed.service.ts:initialSetup` | Fallbacks embebidos (BR-03) |
| `UPLOADS_DIR` | Presente en compose y `.env`, **sin efecto**: ningún código la lee | — | BR-22 |

**Compose / raíz** (`${...}` en `docker-compose*.yml`):

| Variable | Significado |
|---|---|
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Credenciales del contenedor Postgres (se mapean a `DATABASE_*` del backend) |
| `DB_PORT` | Puerto del host para Postgres **solo en desarrollo** (en producción la base usa `expose`, sin puerto de host) |
| `BACKEND_PORT`, `FRONTEND_PORT` | Puertos de host en desarrollo |
| `JWT_SECRET` | Se reenvía al backend en ambos compose |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Se reenvían al backend **solo en `docker-compose.prod.yml`** |
| `CORS_ORIGIN` | Se reenvía al backend solo en producción; en desarrollo el compose lo fija en `http://localhost:${FRONTEND_PORT}` |
| `NEXT_PUBLIC_API_URL` | **Producción:** URL pública del sitio (sin `/api`), pasada como *build arg*; se hornea en el bundle |
| `NEXT_INTERNAL_API_URL` | Fijada en el compose de producción a `http://backend:3001`; solo la usan los `rewrites` de Next (server-side) |

**Frontend** (`frontend/.env.example`): `NEXT_PUBLIC_API_URL` — URL base del backend *sin* barra final y *sin* `/api`. En producción: el dominio público (el proxy de Next reenvía `/api`). Ver BR-27 sobre la inconsistencia del compose de desarrollo.

## 4. Seed e importadores

- **Seed:** `SeedService.onApplicationBootstrap` (`backend/src/database/seed/seed.service.ts`), ver `02` §9. Con `NODE_ENV=development` y tabla `usuarios` vacía carga el conjunto de ejemplo; para volver a sembrar hay que vaciar la base (p. ej. `docker compose down -v`, **destruye datos**).
- **Administrador:** se crea en todos los entornos (`initialSetup`) si no existe un usuario con `ADMIN_EMAIL`. No hay endpoint para crear o cambiar usuarios ni contraseñas.
- **Importadores:** no existen (no hay carpeta `scripts/`, ni importadores CSV/KMZ). La carga de datos reales de establecimientos se hace por la UI o por la API.

## 5. Tests y calidad

Estado real **verificado en esta documentación**:

| Comando | Resultado observado |
|---|---|
| `cd backend && node node_modules/jest/bin/jest.js` | Falla: `Module ts-jest in the transform option was not found` (en el `node_modules` local). No hay archivos `*.spec.ts` ni carpeta `test/` |
| `cd backend && node node_modules/eslint/bin/eslint.js src/main.ts` | Falla: ESLint no encuentra archivo de configuración |
| `npm run test:e2e` (backend) | Apunta a `./test/jest-e2e.json`, que no existe (por lectura del archivo, no se ejecutó) |
| Frontend `npm run lint` | No hay archivo de configuración ESLint (`.eslintrc*`) ni clave `eslintConfig` en `package.json`; ⚠️ NO VERIFICADO cómo se comporta `next lint` en este caso (no se ejecutó) |
| Frontend `npm run type-check` | Existe (`tsc --noEmit`); no se ejecutó |

> 🔸 BRECHA [BR-17]: no hay pruebas ni lint operativos; `deploy.sh` ejecuta `npm run lint && npm run test` (backend) y `npm run type-check && npm run lint` (frontend) como "QA gate" y, tal como está el repo, esas etapas no pueden pasar.

## 6. Build y despliegue

**Procedimiento estándar del repo** (`DEPLOYMENT_SOP.md` y `deploy.sh`; **ambos están sin versionar** en el commit de referencia). Pasos de `deploy.sh`:

1. `git checkout main && git pull origin main`.
2. QA gate: backend (`npm install`, `lint`, `test`), frontend (`npm install`, `type-check`, `lint`).
3. `docker compose -f docker-compose.prod.yml build --no-cache`.
4. `docker compose -f docker-compose.prod.yml up -d`.
5. `sleep 30` y comprobar el estado `healthy` de `sello_verde_db`, `sello_verde_backend` y `sello_verde_frontend`.

```bash
./deploy.sh
```

Variables necesarias en el `.env` del servidor para el compose de producción (sin defaults): `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Nginx del host se configura una vez con `nginx/sello-verde.conf` (instrucciones dentro del archivo: copiar a `sites-available`, enlazar, `nginx -t`, recargar, y `certbot` para HTTPS).

Verificación posterior según el SOP: `docker ps` (estado `healthy`) y `curl -I http://127.0.0.1:3080/api` (el backend no publica puerto en producción). El endpoint `/api` no tiene handler; los healthchecks aceptan cualquier código < 500, de modo que solo prueban que el proceso HTTP responde (no la conexión a la base).

> 🔸 BRECHA [BR-28]: `deploy.sh` y el SOP usan la rama `main`, pero el repo trabaja en `master` (ramas locales: `master`, `feature/cert-read-only`; remota: `origin/master`): `git checkout main` fallaría. El SOP además exige "aplicar migraciones" y no existen (BR-16).

## 7. Checklist de impacto en despliegue

| Si cambias… | Entonces… |
|---|---|
| Una entidad (columna/tabla/enum) | `synchronize: true` lo aplica **al arrancar**: respaldar la base antes (`pg_dump`), revisar que no elimine columnas, probar en desarrollo |
| `package.json` / dependencias | Reconstruir con `--no-cache`; revisar `package-lock.json` |
| Una variable del backend | Añadirla a `environment` del backend en `docker-compose.prod.yml` (solo recibe las listadas) y al `.env` del servidor |
| `NEXT_PUBLIC_API_URL` o el dominio | **Reconstruir la imagen del frontend** (se hornea al construir) |
| `JWT_SECRET` | Todos los tokens vigentes dejan de ser válidos (sesiones cerradas) |
| `CORS_ORIGIN` | Debe ser el dominio público del frontend, sin barra final |
| `nginx/sello-verde.conf` | Copiar al host y recargar Nginx (no está en Docker); `client_max_body_size` (55 MB) debe seguir ≥ límite del backend (50 MB) |
| Directorio/volumen de uploads | Mantener el volumen `sello_verde_uploads`; el límite de 50 MB está en `documentos.controller.ts` |
| Cron (`AlertasService`) | Corre en el backend a las 08:00 en la zona horaria del contenedor; no hay réplicas (con varias instancias correría varias veces) |

## 8. Rollback

- **Código/imágenes:** no se etiquetan versiones de imagen; para volver atrás: `git checkout <commit anterior>` + `docker compose -f docker-compose.prod.yml build --no-cache` + `up -d`. ⚠️ NO VERIFICADO: no hay procedimiento de rollback escrito en el repo.
- **Base de datos:** no hay migraciones reversibles. Antes de cada despliegue con cambios de esquema:
  ```bash
  docker exec sello_verde_db pg_dump -U <DB_USER> <DB_NAME> > respaldo.sql
  ```
  Restaurar con `psql`. `synchronize` no recupera columnas eliminadas.
- **Archivos subidos:** viven en el volumen `sello_verde_uploads`, fuera de la base; no se respaldan con `pg_dump` y se eliminan físicamente al borrar documentos.
- **Volúmenes:** `docker compose down -v` **destruye** `sello_verde_postgres` y `sello_verde_uploads`. No usar `-v` en producción.

> 🔸 BRECHA [BR-29]: no hay respaldo automatizado ni política de retención en el repo.

## 9. Observabilidad
- Logs: salida estándar de los contenedores (`docker compose -f docker-compose.prod.yml logs -f`); el backend usa `console.log` y `Logger` de Nest; el cron escribe `[CRON] ...`.
- Healthchecks: db (`pg_isready`), backend (`GET /api` < 500), frontend (`GET /` < 500).
- No hay métricas, trazas ni alertas externas.
