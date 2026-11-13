# 05 — Guía de extensión

> **Alcance:** recetas ejecutables para agregar módulos y cambios frecuentes sin degradar la arquitectura; límites arquitectónicos; puntos de extensión; deuda técnica con ubicación; Definition of Done. **No cubre:** descripción del sistema (→ `01`), contrato (→ `03`).
> **Fuentes:** `backend/src/**` (módulos `instalaciones`, `establecimientos`, `expedientes`, `certificaciones`, `alertas` como referencia), `backend/package.json` (config de Jest), `frontend/src/**`, `AGENTS.md`, `DEPLOYMENT_SOP.md`, `deploy.sh`.
> **Verificado contra:** commit `c66929e` (+ cambios locales sin commitear) · 2026-10-09
> **Lectores:** agente de IA o desarrollador que va a modificar el sistema. Este documento está escrito para poder seguirlo **sin abrir un módulo existente**.

> ⚠️ NO VERIFICADO (global): las recetas se derivan de leer el código; no se ejecutó un módulo nuevo de extremo a extremo. Hoy **no hay infraestructura de tests funcional** (BR-17), lo que condiciona la sección de tests de cada receta.

## 0. Antes de empezar (reglas del repo, obligatorias)

`AGENTS.md` obliga a: (1) usar el stack Next.js + NestJS + PostgreSQL dockerizado, con datos mockup; (2) **leer y validar contra** `flujo_software.md`, `requistos_proyecto.md` y `contexto_proyecto.md` antes de implementar; (3) cumplir el checklist de soft-delete y la regla de dominio en cascadas (§3 de este documento); (4) en frontend, aplicar la guía de diseño de `AGENTS.md` (fuentes distintivas, modo claro/oscuro, AA, 375 px, objetivos táctiles ≥ 44 px, una acción primaria por pantalla); (5) para desplegar, seguir `DEPLOYMENT_SOP.md`/`deploy.sh`, no solo `docker compose up`.

## 1. Receta: agregar un módulo de dominio nuevo (backend)

Ejemplo de referencia de **estructura**: `backend/src/instalaciones/` (`instalaciones.module.ts`, `instalaciones.controller.ts`, `instalaciones.service.ts`, `entities/instalacion.entity.ts`, `dto/create-instalacion.dto.ts`). Ejemplo de referencia de **colaboración entre dominios conforme a la regla**: `EstablecimientosService.remove` → `ExpedientesService.removeByEstablecimiento`. **No copiar** de `InstalacionesService` que inyecte `Repository<Local>` (es una violación de dominio: BR-15).

Nombres: carpeta y archivos en plural minúscula (`certificaciones/`), clases en singular `PascalCase` (`Certificacion`), tabla en plural `snake_case` (`@Entity('certificaciones')`), columnas `snake_case`, DTOs `create-<singular>.dto.ts` / `update-<singular>.dto.ts`, mensajes de usuario en español, enums en `common/enums/<nombre>.enum.ts`.

Secuencia (en este orden; cada paso es un archivo o una edición puntual):

1. **Entidad** — `backend/src/<dominio>/entities/<singular>.entity.ts`. `@PrimaryGeneratedColumn() id`, columnas `snake_case`, `@CreateDateColumn created_at`, `@UpdateDateColumn updated_at`. Si la entidad se va a poder borrar lógicamente: **agregar `@DeleteDateColumn() deleted_at`** antes de cualquier operación de borrado (regla de `AGENTS.md`). Relaciones con FK explícita (`@Column() x_id` + `@ManyToOne` + `@JoinColumn({ name: 'x_id' })`) como en el resto.
2. **Registrar la entidad en `backend/src/app.module.ts`**, en el array `entities` de `TypeOrmModule.forRoot`. Es una lista explícita: **sin esto no se crea la tabla** (y `synchronize` la crea/modifica al arrancar: revisar `07-operacion.md` antes de desplegar).
3. **DTOs** — `dto/create-<singular>.dto.ts` con `class-validator` (`@IsString`, `@IsOptional`, `@IsEnum`, `@IsDateString`, etc.). Para actualizar, crear **una clase** `Update<Singular>Dto` con todos los campos `@IsOptional` (patrón de `certificaciones/dto/update-certificacion.dto.ts`). **No usar `Partial<CreateXDto>` como tipo del `@Body`**: se compila a `Object` y desactiva la validación (BR-01).
4. **Servicio** — `<dominio>.service.ts`, `@Injectable()`. Inyectar **solo** `@InjectRepository(<SuEntidad>)`. Para operar sobre otro dominio, inyectar **el servicio** de ese dominio. Convenciones observables: lanzar `NotFoundException(`<Entidad> #${id} no encontrado`)`, `BadRequestException` para reglas de negocio; devolver `{ data, message }` (listas: agregar `total`). Reglas de negocio aquí, no en el controller.
5. **Controller** — `<dominio>.controller.ts`. `@UseGuards(JwtAuthGuard)` **a nivel de clase** (si se omite, el endpoint es público: INV-S1). `@Controller('<ruta-plural>')` (el prefijo global `/api` ya existe). `ParseIntPipe` en cada `:id`. Rutas anidadas con `@Controller()` vacío y la ruta completa en cada método (patrón de `instalaciones` y `certificaciones`).
6. **Módulo** — `<dominio>.module.ts`: `imports: [TypeOrmModule.forFeature([SuEntidad])]` (+ el módulo del otro dominio cuyo servicio necesite), `controllers`, `providers`, y `exports: [Servicio]` si otro dominio lo usará.
7. **Registrar el módulo** en `imports` de `AppModule` (`backend/src/app.module.ts`, sección "Feature modules").
8. **Datos de ejemplo (obligatorio por `AGENTS.md`)** — agregar la entidad a `database/seed/seed.module.ts` (`forFeature`) y crear registros en `SeedService.seed()` (solo corre con `NODE_ENV=development` y base vacía).
9. **Tests mínimos** (ver §1.1).
10. **Frontend** (si tiene UI): interfaz de dominio y grupo de funciones en `frontend/src/lib/api.ts` (clave: `snake_case` **idéntica** a la del backend; BR-13); página bajo `frontend/src/app/(protected)/<ruta>/page.tsx` (`'use client'`); ítem en `components/layout/Sidebar.tsx`; catálogos/etiquetas en `lib/constants.ts`.
11. **Documentación**: actualizar `02-modelo-datos.md`, `03-api-contract.md`, `04-seguridad-y-acceso.md` (matriz) y, si es una decisión de arquitectura, `06-decisiones-adr.md`.

### 1.1 Tests mínimos que debe traer un módulo
Configuración existente (`backend/package.json`, clave `jest`): `rootDir: src`, `testRegex: .*\.spec\.ts$`, transform `ts-jest`, entorno `node`. Convención: `<dominio>.service.spec.ts` junto al servicio, usando `Test.createTestingModule` de `@nestjs/testing` (ya es devDependency) y repositorios simulados con `getRepositoryToken(<Entidad>)`. Mínimo por módulo: (a) cada regla de negocio del servicio (camino feliz y de error); (b) `NotFoundException` para id inexistente; (c) que el controller tenga `JwtAuthGuard` (test de metadata o e2e con `401`).

> 🔸 BRECHA [BR-17]: hoy no existe ningún `*.spec.ts`; `ts-jest` no estaba instalado en el `node_modules` local (Jest falló con "Module ts-jest in the transform option was not found"); `npm run test:e2e` apunta a `./test/jest-e2e.json`, que no existe; y no hay configuración de ESLint (`eslint` no encontró archivo de config en el backend; en el frontend no hay `.eslintrc*`). Por eso el QA gate de `deploy.sh` (`npm run lint && npm run test`) no puede pasar tal como está. Un módulo nuevo debe dejar esta infraestructura funcionando o declarar explícitamente que no pudo ejecutar tests.

## 2. Recetas de cambio frecuente

### 2.1 Agregar un campo a una entidad
1. Entidad: agregar `@Column({ nullable: true | default })`. **Debe ser `nullable` o tener `default`**: con `synchronize: true` TypeORM hace `ALTER TABLE ... ADD` y falla si la tabla tiene filas y la columna es `NOT NULL` sin default.
2. DTO de creación **y** DTO de actualización (clase real, ver paso 3 de §1).
3. Servicio: si asigna campos explícitamente, incluirlo; si usa `Object.assign(item, dto)`, basta el DTO.
4. Respuesta: como las entidades se serializan completas (`03` §4), el campo pasa a ser público automáticamente: decidir si debe proyectarse fuera.
5. Índice: solo si se filtrará por él (no hay `@Index` en ningún lado; agregarlo en la entidad).
6. Frontend: interfaz en `lib/api.ts` y formulario (`components/forms/*`). Verificar que el nombre coincida exactamente con el del backend (BR-13).
7. Migración de datos existentes: no hay migraciones. `synchronize` agrega la columna; el relleno de valores en filas existentes se hace con SQL manual **después de respaldar** (`07-operacion.md`).
8. Seed y documentación (`02`, `03`).

### 2.2 Agregar un valor a un enum / catálogo
Editar `common/enums/<nombre>.enum.ts` (el barrel `index.ts` ya lo exporta) → replicar en `frontend/src/lib/constants.ts` (los catálogos están duplicados a mano) y en los mapas de etiquetas/badges (`ESTADO_BADGE_CLASS`, `components/ui/Badge.tsx`, `components/tables/AlertaTable.tsx` que hace `replace` de textos). Revisar `DashboardService.getResumen` si es un estado contable. ⚠️ NO VERIFICADO: cómo `synchronize` altera un tipo `enum` de PostgreSQL ya existente; probar en una base de desarrollo antes de desplegar. Agregar un valor es *no-breaking* para el contrato solo si los clientes toleran valores desconocidos (`03` §3).

### 2.3 Agregar o cambiar un estado TC6
`common/enums/estado-tc6.enum.ts` + las dos tablas de datos de `expedientes/expedientes.service.ts`: `TC6_TRANSITIONS` (adelante) y `TC6_REVERSE` (atrás) + los efectos sobre `estado_general` dentro de `updateEstadoTC6` y `revertEstadoTC6` + `TC6_ESTADOS` en `lib/constants.ts` y el stepper (`components/ui/Stepper.tsx`).

### 2.4 Agregar un tipo de alerta o cambiar los plazos
`TipoAlerta` (enum) → generación en `CertificacionesService.create` **y** en `update` (la lógica está duplicada: 730 días para verde, 90 para amarillo/rojo, textos del `mensaje`) → reglas de transición en `AlertasService.update/remove` → cron `checkAndNotifyAlerts` si tiene ventanas distintas → `frontend`: opciones de filtro en `app/(protected)/alertas/page.tsx`, etiquetas en `AlertaTable.tsx` y `app/(protected)/expedientes/[id]/page.tsx`.

### 2.5 Agregar un filtro al listado
Controller: `@Query('<param>')` en el método `findAll` correspondiente; servicio: agregar la condición (en `EstablecimientosService.findAll` los filtros son **en memoria** sobre todo el conjunto; en `AlertasService.findAll` usan `QueryBuilder`: preferir este último); frontend: parámetro en la función `list` de `lib/api.ts` (construye el query con `URLSearchParams`) y control en la página. Documentar el param en `03` §2.5. Un param opcional nuevo es *no-breaking*.

### 2.6 Agregar un KPI al tablero
`DashboardService.getResumen` (agregar el conteo y la clave en el objeto `data`) → `DashboardStats` y `KPICard` en el frontend (`lib/api.ts`, `app/(protected)/dashboard/page.tsx`). Agregar claves a `data` es *no-breaking*.

### 2.7 Agregar un endpoint a un módulo existente
Método en el servicio (regla de negocio ahí) → método en el controller con verbo y `ParseIntPipe` → fila en `03` (tabla + subsección) → función en `lib/api.ts` si el frontend lo usa. Si la ruta anida otro recurso, cuidar el orden/colisión con rutas con `:id` (p. ej. `expedientes/:id` vs `expedientes/:expedienteId/documentos` coexisten en controllers distintos).

### 2.8 Agregar un rol
**No hay mecanismo hoy** (BR-02): `rol` es texto libre en `usuarios` y viaja en el token, pero nadie lo lee. Para introducir roles hay que, como mínimo: definir el catálogo (enum), exponer `rol` en `req.user` (ya lo hace `JwtStrategy.validate`), crear un decorador/guard de roles y aplicarlo por controller o método, y reflejarlo en la matriz de `04`. Hasta entonces, cualquier valor de `rol` es equivalente.

### 2.9 Agregar una variable de entorno
Leerla en el código (`process.env.X`); agregarla a la lista `environment` del servicio en `docker-compose.prod.yml` (el backend **solo recibe** las variables listadas ahí) y en `docker-compose.yml`; documentarla en `07` (nombre y significado, nunca el valor); si es `NEXT_PUBLIC_*`, además `ARG` en `frontend/Dockerfile.prod` y `args` en el compose (se hornea al construir). **Nunca** dar valor por defecto a un secreto (BR-03).

## 3. Límites arquitectónicos (no se negocian)

| # | Regla | Origen | Consecuencia concreta de violarla |
|---|---|---|---|
| L1 | Un servicio es el **único dueño** de los repositorios de su dominio | `AGENTS.md` | Reglas duplicadas, cascadas incompletas (ver BR-14) y estados divergentes entre servicios |
| L2 | Las cascadas se hacen llamando a **métodos del servicio** correcto (`servicioB.removeByPadre(id)`); si no existe, se crea ahí | `AGENTS.md` | Se salta la lógica de negocio del hijo (p. ej. alertas que no se borran) |
| L3 | Borrado lógico = `@DeleteDateColumn()` en la entidad **+** `repository.softDelete()`; nunca `update({ estado })`. **Todas** las entidades de la cascada lo cumplen | `AGENTS.md` | Los filtros de TypeORM no ocultan nada; los datos "borrados" reaparecen en listados y conteos |
| L4 | Un controller no contiene lógica de negocio ni toca repositorios | convención observada | La regla deja de reutilizarse; otros servicios no pueden invocarla |
| L5 | Un service **no importa un controller**; las dependencias van controller → service → repositorio | convención NestJS | Dependencias circulares de módulos; no se puede probar el servicio sin HTTP |
| L6 | La lógica compartida vive en el **servicio del dominio dueño** (exportado en su módulo) o en `common/` (enums); no se copia entre servicios | convención observada | Lo ya ocurrido: `dias_restantes` y la generación de alertas duplicados (§5) |
| L7 | Todo controller declara `@UseGuards(JwtAuthGuard)` a nivel de clase | seguridad (`04` INV-S1) | Endpoint público |
| L8 | El `@Body` de un endpoint de escritura es una **clase DTO real**, nunca `Partial<Dto>` | BR-01 | Sin validación ni whitelist: asignación masiva |
| L9 | Toda entidad nueva se registra en `TypeOrmModule.forRoot({ entities })` | `app.module.ts` | La tabla no existe y el servicio falla en tiempo de ejecución |
| L10 | Los enums de dominio viven en `common/enums` y se replican **idénticos** en `frontend/src/lib/constants.ts` | convención observada | Etiquetas o filtros inválidos en el frontend (hoy ya divergen: BR-13) |
| L11 | Las respuestas siguen el envoltorio `{ data, message }` | `03` §2.3 | Rompe el desenvoltorio del cliente (`lib/api.ts:request`) |

## 4. Puntos de extensión ya previstos en el diseño

- **Tablas de transición TC6** (`TC6_TRANSITIONS`, `TC6_REVERSE`): el flujo es *datos*, no `if`s. Para cambiarlo se edita la tabla; no se agrega lógica ad-hoc.
- **Enums centralizados** (`common/enums`): única fuente de catálogos del backend; usarlos en entidades, DTOs y servicios.
- **Alertas con ciclo de vida por instalación** (`Alerta.instalacion_id`, `Certificacion.instalacion_id`/`local_id`): permite certificar y alertar por instalación sin tocar el expediente; el código llama "legacy" a las alertas sin instalación. Usar estas columnas en vez de crear tablas paralelas.
- **`HitoTC6`** como bitácora de transiciones: cualquier nuevo flujo de estados con historial debe seguir el mismo patrón (tabla de hitos con `estado_anterior`/`estado_nuevo`).
- **`@Cron` en `AlertasService`**: lugar natural para tareas programadas (`ScheduleModule.forRoot()` ya está en `AppModule`).
- **`Usuario.rol`**: campo reservado para autorización por rol (BR-02).
- **`Documento` ligado a `Expediente`** con `descripcion`: adjuntos genéricos. El plan histórico incluía una columna `tipo_documento` que la entidad **no** tiene; para clasificar adjuntos, agregarla (nullable) en vez de codificar el tipo en `descripcion`.
- **Variables `GOOGLE_*` comentadas en `.env`**: placeholder de una integración futura (⚠️ NO VERIFICADO: no hay código asociado).

## 5. Deuda técnica y acoplamientos conocidos (con ubicación)

**Duplicación**
- `dias_restantes` se calcula 4 veces con el mismo código: `alertas.service.ts` (`findAll`, `getProximas`), `dashboard.service.ts` (`getAlertasProximas`), `expedientes.service.ts` (`findOne`).
- La generación de la alerta (fechas 730/90 días, textos del mensaje, sincronización de estados) está **duplicada** en `certificaciones.service.ts` (`create` y `update`) y con diferencias sutiles entre ambas (p. ej. `create` resuelve alertas previas; `update` solo toca la primera alerta de la certificación).
- `AlertasService.getProximas` y `AlertasService.resolverPorExpedientes` **no se usan** en ningún lugar (código muerto); `DashboardService.getAlertasProximas` repite la lógica de `getProximas`.
- `estado_general` copiado entre `Expediente` y `Establecimiento` por sincronización manual en 6 sitios (BR-24).

**Suposiciones frágiles**
- "Expediente activo" = el de mayor `id` (`EstablecimientosService.findAll/findOne`); "un expediente vigente por establecimiento" lo garantiza solo `ExpedientesService.create`, no la base.
- `AlertasService.update`: para resolver una alerta de 90 días exige *existencia* de cualquier certificación verde del expediente/instalación; el mensaje dice "vigente" pero no se compara fecha ni se verifica que sea posterior a la alerta.
- `CertificacionesService.update` sincroniza `findOne({ certificacion_id })` (cualquier alerta de esa certificación) y, si `fecha_inspeccion` queda vacía, `new Date(null)` produciría una fecha de 1970 + plazo.
- Fechas: mezcla de `new Date(string)`, `toISOString().split('T')[0]` (UTC) y `setDate` en hora del proceso; el cron usa la zona horaria del proceso. Un servidor en otra zona puede correr los límites de día.
- `EstablecimientosService.findOne` usa `length >> 0` (desplazamiento de bits) donde se quiso `> 0`; funciona por casualidad con longitudes enteras.
- `Local.numero_local` sin unicidad; `Establecimiento.cantidad_locales` es un dato declarado, no derivado de `locales`.
- Sin transacciones (BR-18); `Object.assign(item, dto)` en `update` de varios servicios (BR-01).
- Subida de documentos: nombre en disco = nombre original saneado (colisiones silenciosas), borrados físicos sin papelera (BR-07).

**Escalabilidad** (volumen de referencia: el seed trae 13 establecimientos; `contexto_proyecto.md` habla de 20 y el plan histórico de 24; ⚠️ NO VERIFICADO: el volumen real en producción)
- `GET /establecimientos` (`EstablecimientosService.findAll`) carga **todos** los establecimientos con 4 relaciones anidadas (`locales`, `expedientes`, `expedientes.certificaciones`, `expedientes.alertas`) y filtra en memoria; el costo crece con el producto de filas relacionadas y no hay paginación (BR-09). Al ×10 sigue siendo manejable; al ×100 es el primer cuello de botella.
- `GET /expedientes` (`ExpedientesService.findAll`) ejecuta **un `count` por expediente** (N+1).
- `DashboardService.getResumen` lanza 11 `count` independientes (9 sobre establecimientos y 2 sobre alertas) (un `GROUP BY estado_general` bastaría).
- Sin índices sobre FKs (`expediente_id`, `local_id`, etc.): las consultas por FK recorren la tabla completa.
- Archivos en el filesystem de un único contenedor/volumen: no escala horizontalmente.

**Artefactos y código muerto**
- `backend/src/auth.middleware.ts`: todo comentado, sin uso (archivo no versionado).
- `common/enums/comunas.enum.ts`: todo comentado (no versionado) y su `export` comentado en `index.ts`.
- `bak.txt` (raíz, versionado): copia antigua de `frontend/src/lib/api.ts`.
- `UPLOADS_DIR` se define en compose y `.env` pero **ningún código lo lee** (las rutas de subida son relativas `uploads/`); `MulterModule.register({ dest })` en `documentos.module.ts` queda anulado por el `diskStorage` del controller.
- `buildFileUrl` en `frontend/src/lib/api.ts` no se usa (descarga vía `/documentos/:id/descargar`).

> 🔸 BRECHA [BR-22]: duplicación y código muerto listados arriba.

## 6. Invariantes de dominio (reglas de negocio que no se deben romper)

Ninguna tiene test (BR-17). Ubicación para agregarlos.

| ID | Invariante | Dónde se aplica |
|---|---|---|
| INV-D1 | A lo más un expediente vigente por establecimiento | `ExpedientesService.create` |
| INV-D2 | `estado_tc6` solo cambia por las tablas `TC6_TRANSITIONS`/`TC6_REVERSE`, y cada cambio deja un `HitoTC6` | `ExpedientesService.updateEstadoTC6/revertEstadoTC6` |
| INV-D3 | Sello amarillo/rojo exige ≥ 1 defecto **al crear** | `CertificacionesService.create` |
| INV-D4 | Certificación con `tipo_sello` **y** `fecha_inspeccion` crea alerta: verde +730 días, amarillo/rojo +90 días | `CertificacionesService.create/update` |
| INV-D5 | Una certificación nueva resuelve las alertas activas/notificadas previas de la misma instalación (y las del expediente sin instalación) | `CertificacionesService.create` |
| INV-D6 | Una alerta de regularización (90 d) solo se resuelve si existe un sello verde | `AlertasService.update` |
| INV-D7 | Solo se pueden borrar alertas `resuelta` | `AlertasService.remove` |
| INV-D8 | `estado_general` del establecimiento sigue al del expediente tras cada cambio | `ExpedientesService.*`, `CertificacionesService.*` |
| INV-D9 | Un documento con el mismo `nombre_original` en el mismo expediente reemplaza al anterior | `DocumentosService.create` |
| INV-D10 | El cron diario (08:00) marca `notificada` (≤30 d) y `vencida` (fecha pasada) | `AlertasService.checkAndNotifyAlerts` |

## 7. Definition of Done de una feature

Marcar cada punto con **evidencia observable** (comando y resultado, no "debería funcionar").

**Reglas del repo (`AGENTS.md`)**
- [ ] Se leyeron y validaron `flujo_software.md`, `requistos_proyecto.md` y `contexto_proyecto.md` contra la lógica implementada.
- [ ] Soft-delete (si aplica): (1) `@DeleteDateColumn()` presente; (2) se usa `repository.softDelete()` y no `update({ estado })`; (3) **toda** la cascada cumple 1 y 2.
- [ ] Ningún servicio inyecta repositorios de otro dominio; las cascadas llaman a métodos del servicio dueño (si falta el método, se crea allí).
- [ ] Hay datos mockup para la entidad/flujo nuevo (seed).
- [ ] Frontend: cumple el checklist de calidad de `AGENTS.md` (fuentes distintivas, modo claro/oscuro, contraste AA, responsive desde 375 px, objetivos ≥ 44 px, una acción primaria por pantalla).

**Calidad técnica**
- [ ] DTO como clase real en cada endpoint de escritura; `@UseGuards(JwtAuthGuard)` en el controller; entidad registrada en `app.module.ts`.
- [ ] Enums replicados en `frontend/src/lib/constants.ts`; nombres de campos idénticos entre `lib/api.ts` y el backend.
- [ ] **Tests**: pasan las reglas nuevas — adjuntar el comando (`cd backend && npm run test`) y su salida resumida. Si la infraestructura sigue rota (BR-17), dejarlo declarado explícitamente en lugar de omitirlo.
- [ ] QA gate de `DEPLOYMENT_SOP.md`: backend `npm run lint`, `npm run build`, `npm run test`; frontend `npm run lint`, `npm run type-check`, `npm run build` (adjuntar resultado de cada uno).

**Impacto en despliegue (obligatorio)**
- [ ] ¿Cambia el esquema? Con `synchronize: true` el cambio se aplica **al arrancar** y puede eliminar columnas: respaldo previo con `pg_dump` y revisión del diff de entidades.
- [ ] ¿Nueva variable de entorno? Agregada a `docker-compose.prod.yml` y documentada en `07`.
- [ ] ¿Nueva dependencia? Se reconstruyen las imágenes (`docker compose -f docker-compose.prod.yml build --no-cache`).
- [ ] ¿Cambia `NEXT_PUBLIC_*` o el dominio? Reconstruir la imagen del frontend (se hornea al construir).
- [ ] ¿Cambia `nginx/sello-verde.conf`? Se recarga Nginx del host (no está en Docker).

**Plan de rollback (componentes críticos: base de datos, autenticación, almacenamiento de archivos, configuración de despliegue)**
- [ ] Escrito en la descripción de la feature: cómo volver al commit anterior (`git revert` + reconstrucción de imágenes) y qué pasa con los datos.
- [ ] Para cambios de esquema: dump restaurable (`psql < dump.sql`); `synchronize` **no** revierte ni recupera columnas eliminadas.
- [ ] Para cambios de `JWT_SECRET`: advertir que invalida todas las sesiones activas.

**Documentación**
- [ ] Actualizados `02`, `03`, `04` y `07` según corresponda, y un ADR en `06` si cambia una decisión de arquitectura. Se corrigen o se agregan `NO VERIFICADO`/`BRECHA` en lugar de ocultar lo que no se pudo comprobar.
