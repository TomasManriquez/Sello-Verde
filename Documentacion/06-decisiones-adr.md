# 06 — Decisiones de arquitectura (ADR)

> **Alcance:** decisiones de arquitectura **reconstruidas retroactivamente** a partir del código, el historial de git y los documentos históricos. **No cubre:** cómo implementar (→ `05`), el estado actual detallado (→ `01`–`04`).
> **Fuentes:** código en `backend/src` y `frontend/src`, `git log` (27 commits entre 2026-06-22 y 2026-08-31), `Documentacion/historico/implementation_plan_iter1.md`, `AGENTS.md`, `DEPLOYMENT_SOP.md`, `docker-compose*.yml`, `contexto_proyecto.md`, `flujo_software.md`.
> **Verificado contra:** commit `c66929e` (+ cambios locales sin commitear) · 2026-10-09
> **Lectores:** quien necesite saber *por qué* algo es como es antes de cambiarlo.

**Cómo leer estos ADR.** Son reconstrucciones: lo que el código demuestra es **hecho** (con evidencia `archivo:símbolo`); el *motivo* solo se afirma cuando hay evidencia escrita (plan histórico, mensaje de commit, comentario). Donde no la hay se marca `> ⚠️ NO VERIFICADO:` con la pregunta a resolver con el equipo. El **plan histórico** (`Documentacion/historico/implementation_plan_iter1.md`, antes `implementation_plan.md` en la raíz) es *intención de la primera iteración*, no estado actual: el §"Plan vs. código" al final lista dónde divergen.

---

## ADR-001 — PostgreSQL relacional con TypeORM
- **Estado:** Aceptada (reconstruida).
- **Contexto:** el dominio son formularios SEC (Anexos 2 y 3) con jerarquías fijas y consultas por estado y fecha; el proyecto exige datos de ejemplo y despliegue Dockerizado (`AGENTS.md`).
- **Decisión:** PostgreSQL 16 accedido con TypeORM 0.3 (`app.module.ts:TypeOrmModule.forRoot`, `docker-compose*.yml:db`). El plan histórico parte de un ERD relacional (§1.2).
- **Consecuencias:** integridad referencial y enums nativos; el esquema se deriva de las clases (ver ADR-010); modelo detallado en `02-modelo-datos.md`.
- **Alternativas descartadas:** ninguna aparece registrada.
  > ⚠️ NO VERIFICADO: por qué se eligió PostgreSQL y no una base documental u otra; `AGENTS.md` lo fija como parte del stack obligatorio.
- **Evidencia:** `AGENTS.md` (Technical Stack), `backend/package.json` (`typeorm`, `pg`).

## ADR-002 — Monolito modular NestJS (un módulo por dominio)
- **Estado:** Aceptada. **Evidencia:** `app.module.ts` (módulos de feature), plan histórico §3.1 (orden de implementación por módulo), `AGENTS.md` ("Responsabilidad de dominio en cascadas").
- **Contexto:** un solo desarrollador/equipo pequeño, un único usuario final, MVP piloto.
- **Decisión:** un solo proceso backend con módulos `auth`, `establecimientos`, `instalaciones`, `expedientes`, `certificaciones`, `alertas`, `dashboard`, `documentos`, cada uno con `module/controller/service/entities/dto`.
- **Consecuencias:** despliegue simple (un contenedor); los límites entre módulos son de **convención**, no de compilación, y ya se violan (BR-15, ver `01` §4).
- **Alternativas descartadas:** microservicios — nunca aparecen en el repo.
  > ⚠️ NO VERIFICADO: no hay registro de que se evaluaran explícitamente.

## ADR-003 — El expediente como raíz del proceso; uno vigente por establecimiento
- **Estado:** Aceptada.
- **Contexto:** `flujo_software.md` §1: el proceso comienza "formalizando el expediente" vinculado al RBD; `contexto_proyecto.md` pide un repositorio de expedientes por establecimiento.
- **Decisión:** certificaciones, hitos TC6, alertas y documentos cuelgan de `Expediente` (`expediente.entity.ts`); el servicio impide un segundo expediente vigente para el mismo establecimiento (`ExpedientesService.create`), y el "expediente activo" es el de mayor `id` (`EstablecimientosService`).
- **Consecuencias:** simplifica la UI (un expediente por EE) pero la regla de unicidad **no está en la base** y el "activo" es una convención. Hay commits que ajustan este comportamiento: `ab81523 "fix: adjuntar información del ultimo expediente"`, `d7d884b "fix: reglas del negocio"`.
- **Alternativas descartadas:** permitir varios expedientes simultáneos (el plan histórico mostraba el ciclo de re-inspección como un "nuevo ciclo" sobre el flujo, sin definir expedientes múltiples).
  > ⚠️ NO VERIFICADO: cómo se modelará la re-inspección a los 2 años (¿nuevo expediente o nuevas certificaciones en el mismo?). Hoy se hace con nuevas certificaciones.

## ADR-004 — `estado_general` denormalizado en establecimiento y expediente
- **Estado:** Aceptada con riesgo.
- **Contexto:** el tablero cuenta establecimientos por estado (`contexto_proyecto.md` §3).
- **Decisión:** el estado vive en `Expediente` y se **copia** a `Establecimiento` desde seis puntos de servicio (`ExpedientesService.create/update/updateEstadoTC6/revertEstadoTC6`, `CertificacionesService.create/update`); `DashboardService.getResumen` cuenta sobre `establecimientos`.
- **Consecuencias:** conteos simples y rápidos; riesgo de divergencia (el `PUT /establecimientos/:id` también permite escribirlo, BR-01); `en_regularizacion` nunca se asigna (BR-24).
- **Alternativas descartadas:** derivar el estado del expediente activo en cada consulta (más fiel, más costosa). ⚠️ NO VERIFICADO que se haya considerado.

## ADR-005 — Máquina de estados TC6 explícita con bitácora de hitos
- **Estado:** Aceptada (evolucionó respecto del plan).
- **Contexto:** el flujo TC6 es secuencial y auditable: `En elaboración → Ingresado a la SEC → Observado → TC6 Aprobado` (`flujo_software.md` §3).
- **Decisión:** dos tablas de datos `TC6_TRANSITIONS` y `TC6_REVERSE` en `expedientes.service.ts`; cada cambio inserta un `HitoTC6` (`hito-tc6.entity.ts`); además existe `PATCH /expedientes/:id/revert-tc6` para deshacer un paso.
- **Consecuencias:** el flujo se edita como datos (`05` §2.3); el historial es append-only. El plan histórico decía "solo avanza (o retrocede a `observado`)"; el código permite retroceder paso a paso hasta `sin_iniciar`.
- **Alternativas descartadas:** un campo de estado libre sin historial.

## ADR-006 — Alertas materializadas, generadas por reglas y con ciclo de vida por instalación
- **Estado:** Aceptada.
- **Contexto:** requisito de alertas automáticas a 2 años (sello verde) y 90 días (regularización) (`contexto_proyecto.md` §3, `flujo_software.md` §4). El plan precisaba que las alertas se muestran **solo dentro de la plataforma** (sin correo/push).
- **Decisión:** tabla `alertas`; se crean en `CertificacionesService.create/update`; un `@Cron('0 8 * * *')` en `AlertasService` las pasa a `notificada`/`vencida`; las alertas pueden ligarse a una `instalacion` (`Alerta.instalacion_id`: "lifecycle por instalación"), de modo que certificar una instalación resuelve su alerta previa. Commits relacionados: `223147f "Fix: interpretación del tipo de alerta"`, `685a225 "Feature: eliminar alertas"`.
- **Consecuencias:** estado persistente y borrable; pero la lógica de generación está duplicada (create/update) y el estado `notificada` no envía nada y saca la alerta del tablero (BR-19, BR-22).
- **Alternativas descartadas:** calcular vencimientos al vuelo desde `fecha_inspeccion`. ⚠️ NO VERIFICADO el motivo de la elección.

## ADR-007 — Borrado lógico selectivo con cascada gobernada por el servicio dueño
- **Estado:** Aceptada, **incompleta**.
- **Contexto:** los commits `46af575 "feat: eliminar establecimientos y expediente"`, `4e0c83e "eliminacion de establecimiento y cadena secuenciasl"`, `e31a67d "fix: soft-delete para alertas eliminadas en cascada"` y `1e76dfa "replace delete logic for complete cascade reaction"` muestran una secuencia de correcciones hasta fijar las reglas hoy escritas en `AGENTS.md` (checklist de soft-delete y dominio en cascadas).
- **Decisión:** `@DeleteDateColumn` en `Establecimiento`, `Expediente`, `Alerta`; `softDelete()`; el establecimiento delega la cascada a `ExpedientesService.removeByEstablecimiento`.
- **Consecuencias:** el patrón de cascada por servicio está bien aplicado ahí; el resto de entidades y `DELETE /expedientes/:id` no lo cumplen (BR-14); las FK `ON DELETE CASCADE` de la base solo actúan en borrados físicos.
- **Alternativas descartadas:** borrado físico en cascada de la base (se descartó en favor de conservar datos; ⚠️ NO VERIFICADO el motivo exacto).

## ADR-008 — Autenticación propia con JWT y usuarios en base de datos
- **Estado:** Aceptada; **diverge del plan**.
- **Contexto:** un único usuario (encargado del SLEP). El plan histórico proponía "autenticación simplificada: token simple en cookie httpOnly. No se implementará OAuth ni JWT complejo" (sección "User Review Required").
- **Decisión implementada:** JWT firmado con `JWT_SECRET`, 24 h, token en `localStorage` (`auth.module.ts`, `jwt.strategy.ts`, `frontend/src/lib/api.ts`). Usuario administrador creado por `SeedService.initialSetup` desde variables de entorno (commits `8d4eb2b "extraer la creación de admin"`, `f312ea0 "fix: creacion de admin"`).
- **Consecuencias:** sin gestión de usuarios ni roles aplicados; token expuesto a XSS (BR-02, BR-06).
- **Integración pendiente con Google Workspace:** `.env` incluye claves comentadas (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GMAIL_API_KEY`, `GOOGLE_DRIVE_API_KEY`, bajo "Future: Google API Integration") y existe un `auth.middleware.ts` totalmente comentado. ⚠️ NO VERIFICADO: no hay código ni documento que defina el alcance (¿SSO, correo, Drive?).
- **Alternativas descartadas:** cookie `httpOnly` (propuesta en el plan, no implementada), OAuth/SSO (explícitamente diferido).

## ADR-009 — Archivos en el filesystem del servidor con volumen Docker
- **Estado:** Aceptada. **Evidencia:** plan histórico ("Upload de documentos: filesystem del contenedor Docker (volume montado). No se integrará almacenamiento cloud"), `documentos.controller.ts` (`diskStorage`), volumen `sello_verde_uploads` en `docker-compose.prod.yml`. Commits: `2bafd94 "fix: ruta para almacentar archivos"`, `0202ea9 "expediente - descarga, editar nombre y eliminar"`.
- **Consecuencias:** implementación mínima; los archivos no se versionan ni respaldan con la base; el servicio estático público es una brecha (BR-04) y la ruta de subida no se valida (BR-07).
- **Alternativas descartadas:** almacenamiento cloud (S3/GCS), diferido por el plan.

## ADR-010 — `synchronize: true` en lugar de migraciones
- **Estado:** En tensión (decisión de MVP vigente en producción). **Evidencia:** comentario "MVP only — use migrations in production" en `app.module.ts`; `DEPLOYMENT_SOP.md` §4 exige migraciones.
- **Decisión:** el esquema se sincroniza al arrancar.
- **Consecuencias:** cambiar una entidad cambia producción sin revisión ni reversa (puede eliminar columnas) (BR-16).
- **Alternativas descartadas:** migraciones TypeORM (previstas para después, sin implementar).

## ADR-011 — Topología de producción: Nginx host → Next.js (proxy de API) → backend/BD en red interna
- **Estado:** Aceptada. **Evidencia:** comentario de cabecera de `docker-compose.prod.yml`, `nginx/sello-verde.conf`, `frontend/next.config.js` (`rewrites`), commits `b2a7dd6 "configuracion para host produccion"` y `f68205b "fix: credenciales y puerto expuesto"`.
- **Decisión:** el backend y la BD viven en una red Docker aislada; solo el frontend escucha en loopback (`127.0.0.1:3080`) y reenvía `/api` y `/uploads` al backend vía `rewrites`. El navegador usa un único origen (evita CORS en producción).
- **Consecuencias:** `NEXT_PUBLIC_API_URL` se hornea al construir (reconstrucción al cambiar dominio); el backend sigue publicado en `3001` pese a la intención (BR-20).
- **Alternativas descartadas:** exponer el backend con su propio subdominio (se ve en comentarios de ejemplo en `frontend/src/lib/constants.ts`, que mencionan un host de API aparte). ⚠️ NO VERIFICADO.

## ADR-012 — Frontend Next.js (App Router) como SPA cliente con cliente HTTP propio
- **Estado:** Aceptada. **Evidencia:** todas las páginas y layouts leídos (salvo `app/layout.tsx`) son `'use client'`; `frontend/src/lib/api.ts` (wrapper de `fetch` con desenvoltorio `data`), `hooks/useAuth.ts`; sin `middleware.ts`.
- **Decisión:** autenticación y navegación protegida del lado del cliente; sin librerías de estado/UI; tema claro/oscuro con `localStorage` (`sv_theme`) según `AGENTS.md`.
- **Consecuencias:** Next.js se usa casi solo como bundler y proxy; la protección de rutas es solo visual. Los tipos del contrato se mantienen a mano (BR-13).
- **Alternativas descartadas:** SSR con cookies de sesión (consistente con el rechazo de la cookie `httpOnly` en ADR-008, ⚠️ NO VERIFICADO).

## ADR-013 — Seed solo en desarrollo; usuario administrador en todos los entornos
- **Estado:** Aceptada. **Evidencia:** `SeedService.onApplicationBootstrap`; commits `83807a5 "seed solo para ambiente dev"`, `8d4eb2b`, `f312ea0`.
- **Decisión:** los datos de ejemplo se cargan solo con `NODE_ENV=development` y base vacía; el administrador se crea siempre si no existe.
- **Consecuencias:** producción arranca sin datos pero con usuario; el administrador cae a credenciales por defecto si faltan variables (BR-03).

---

## Plan vs. código (divergencias del documento histórico)

Fuente: `Documentacion/historico/implementation_plan_iter1.md`.

| Tema | Plan histórico | Código actual |
|---|---|---|
| Autenticación | token simple en cookie `httpOnly`, sin JWT | JWT en `localStorage` (ADR-008) |
| TC6 | solo avanza, o vuelve a `observado` | puede retroceder hasta `sin_iniciar` |
| Cron | `alertas.cron.ts` separado | `@Cron` dentro de `alertas.service.ts` |
| Guard de auth | `auth/auth.guard.ts` | `auth/guards/jwt-auth.guard.ts` + `strategies/jwt.strategy.ts` |
| Seed | `database/init.sql` + `seeds/seed.ts` | `database/seed/seed.service.ts` (solo desarrollo) |
| Módulo de BD | `database/database.module.ts` | no existe; `TypeOrmModule.forRoot` en `app.module.ts` |
| Usuario en expediente | `usuario_id` FK en `EXPEDIENTE` | no existe |
| Documentos | `tipo_documento`, `url_archivo`, `fecha_subida` | `nombre_original`, `nombre_archivo`, `ruta`, `tipo_mime`, `tamano_bytes`, `descripcion` |
| Defecto | campo `marcado` | no existe (cada fila es un defecto presente) |
| Alertas | campos `tipo_alerta`, `fecha_activacion` | `tipo`, `fecha_notificacion` (sin `fecha_activacion`) |
| Endpoints de borrado | no previstos | `DELETE` de establecimientos, expedientes (incompleto), alertas, instalaciones, documentos |
| Alcance del piloto | 20–24 establecimientos | seed con 13 |
