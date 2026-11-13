# 03 — Contrato de la API REST

> **Alcance:** referencia de los 36 endpoints del backend, convenciones transversales que un cliente externo puede asumir, política de evolución del contrato, modelo público vs interno y estado de OpenAPI. **No cubre:** por qué se decidió cada cosa (→ `06-decisiones-adr.md`), reglas de autorización (→ `04-seguridad-y-acceso.md`).
> **Fuentes:** `backend/src/**/*.controller.ts`, `backend/src/**/*.service.ts`, `backend/src/**/dto/*.ts`, `backend/src/main.ts`, `backend/src/common/enums/*`, `frontend/src/lib/api.ts`, `frontend/next.config.js`, `backend/package.json`.
> **Verificado contra:** commit `c66929e` (+ cambios locales sin commitear) · 2026-10-09
> **Lectores:** consumidor externo de la API (suficiente leer solo este documento), agente de IA que modifique controllers o DTOs.

> ⚠️ NO VERIFICADO (global): el contrato se derivó de leer controllers, DTOs y servicios; **no se ejecutó el servidor**. Los códigos de estado de los caminos de error "no controlados" (p. ej. violaciones de unicidad) se infieren del comportamiento por defecto de NestJS/TypeORM.

## 1. Base, versión y autenticación

- **Base URL:** prefijo global `/api` (`main.ts`, `setGlobalPrefix('api')`).
  - Desarrollo: `http://localhost:3001/api` (el navegador llama directo al backend; CORS permite solo `CORS_ORIGIN`).
  - Producción: el backend **no se publica por el proxy**; Nginx envía todo al contenedor Next.js y este reenvía `/api/:path*` al backend (`frontend/next.config.js`, `rewrites`). La URL pública es, por tanto, `https://<dominio-del-frontend>/api/...`. (El compose de producción además publica el puerto 3001 del host: BR-20, `04-seguridad-y-acceso.md`.)
- **Formato:** JSON (`Content-Type: application/json`), salvo la subida de documentos (`multipart/form-data`) y la descarga (binario).
- **Autenticación:** todos los endpoints requieren `Authorization: Bearer <JWT>` excepto `POST /auth/login`. Ver §2.6.
- **Versión:** la URL **no lleva versión** (ver §2.1).

## 2. Convenciones transversales

Cada convención se enuncia como **norma** (lo que un cliente puede/debe asumir) y, si el código no la cumple, como `BRECHA`.

### 2.1 Versionado
**Norma.** Las rutas llevan versión mayor en el prefijo: `/api/v1/...`. Una versión mayor nueva (`/api/v2`) se exige ante cualquier cambio *breaking* (§3); dentro de `v1` solo entran cambios *no-breaking*.

> 🔸 BRECHA [BR-08]: no existe versionado; las rutas son `/api/<recurso>` sin `v1` (`main.ts`). Cualquier cambio rompe a todos los clientes a la vez.

### 2.2 Paginación
**Norma.** Los listados aceptan `page` (≥1) y `limit` (con máximo) y responden con metadatos `{ data, total, page, limit }`.

> 🔸 BRECHA [BR-09]: **ningún listado pagina.** `GET /establecimientos`, `/expedientes`, `/alertas`, `/dashboard/alertas-proximas` devuelven todo el conjunto. Solo hay un `total` (conteo del arreglo devuelto) en algunas respuestas. `GET /establecimientos` además carga todas las relaciones y filtra en memoria (`EstablecimientosService.findAll`).

### 2.3 Forma de respuesta exitosa
**Norma.** Toda respuesta exitosa JSON es un envoltorio `{ "data": <payload>, "message": "<texto>" }`, más `"total"` en listados.

**Realidad:**

| Patrón | Endpoints |
|---|---|
| `{ data, message }` | login, `me`, crear/actualizar de casi todos, listados de locales/instalaciones/certificaciones/defectos/documentos, `GET /expedientes/:id`, dashboard/resumen |
| `{ data, message, total }` | `GET /establecimientos`, `GET /expedientes`, `GET /alertas`, `GET /dashboard/alertas-proximas` |
| `{ message }` sin `data` | `DELETE` de establecimiento, expediente, alerta y documento |
| `{ data: null, message }` | `DELETE /instalaciones/:id` |
| **Objeto plano** `{ ...entidad, expediente_activo, message }` | **`GET /establecimientos/:id`** (sin `data`) |
| Binario | `GET /documentos/:id/descargar` |

> 🔸 BRECHA [BR-10]: `GET /establecimientos/:id` no usa el envoltorio `data`, y los `DELETE` no son uniformes. El cliente propio lo oculta con un "desenvoltorio" automático (`frontend/src/lib/api.ts:request`, devuelve `json.data` si existe la clave `data`, si no el objeto completo), por lo que **pierde `message` y `total`** en el resto de las respuestas.

**Códigos de éxito:** `POST` → `201` (default de Nest, incluido `POST /auth/login`); `GET`/`PUT`/`PATCH`/`DELETE` → `200` (los `DELETE` responden cuerpo, no `204`). No hay `@HttpCode` en ningún controller.

### 2.4 Forma canónica de error
**Norma.** `{ "statusCode": <int>, "message": <string | string[]>, "error": "<nombre HTTP>" }`, que es el formato por defecto de NestJS (no hay filtro de excepciones propio). Mapeo de condiciones de dominio:

| Condición | Código | Ejemplo de `message` (texto real del código) |
|---|---|---|
| Recurso inexistente (o soft-deleted) | `404` | `Establecimiento #5 no encontrado` |
| Credenciales inválidas / token inválido o vencido | `401` | `Credenciales inválidas` · `Token inválido o expirado` |
| Cuerpo no cumple el DTO | `400` | arreglo de mensajes de `class-validator` |
| `:id` no numérico | `400` | `Validation failed (numeric string is expected)` (mensaje de `ParseIntPipe`) |
| Regla de negocio violada | `400` | `Transición inválida: …`, `El sello rojo requiere registrar al menos un defecto.`, `El establecimiento ya tiene un expediente activo (#N)…` |
| Archivo > 50 MB | `413` | de `PayloadTooLargeException` (Nest convierte el error de Multer) |
| Error no controlado (p. ej. unicidad de `rbd`, FK) | `500` | `Internal server error` |

**Nunca debe viajar en un error:** trazas de pila, SQL, nombres de tablas/columnas, rutas del servidor ni la existencia de cuentas. Hoy se cumple por defecto (Nest oculta el detalle de los `500`), y el login usa un mensaje único.

> 🔸 BRECHA [BR-11]: no hay manejo de `QueryFailedError`: crear un establecimiento con `rbd` repetido produce `500` en vez de `409`. `message` es **string o arreglo** según el origen, y el cliente propio asume string (`api.ts:request` toma `body.message ?? body.error`), por lo que un `400` de validación se muestra como arreglo. Los textos están en español sin códigos de error estables (`code`) que un cliente pueda programar. ⚠️ NO VERIFICADO en ejecución.

### 2.5 Filtrado, búsqueda y ordenamiento
Solo por query params y solo donde se indica; **no hay sintaxis genérica** (`filter[...]`, `sort=`).

| Endpoint | Param | Semántica |
|---|---|---|
| `GET /establecimientos` | `rbd` | subcadena, insensible a mayúsculas |
| | `search` | subcadena en `nombre`, `rbd` o `comuna` (insensible a mayúsculas) |
| | `estado_general` | igualdad exacta (valor no validado: uno inexistente da lista vacía) |
| `GET /alertas` | `tipo`, `estado` | igualdad exacta (sin validar contra el enum) |
| | `expediente_id` | igualdad |
| | `days_until_expiry` | alertas con `fecha_vencimiento` en `[hoy, hoy+N]` |

**Orden fijo (no configurable):** establecimientos por `nombre` ASC; expedientes por `created_at` DESC; alertas por `fecha_vencimiento` ASC; locales por `numero_local` ASC; instalaciones por `id` ASC; certificaciones por `created_at` DESC; documentos por `created_at` DESC; hitos por `fecha` ASC.

> 🔸 BRECHA [BR-13]: `GET /expedientes` **ignora** cualquier query param (su controller no los lee), aunque el frontend envía `estado_general` (`frontend/src/lib/api.ts:expedientesApi.list`).

### 2.6 Autenticación desde un cliente que no es el frontend propio
1. `POST /api/auth/login` con `{ "email": "...", "password": "..." }` → `data.access_token`.
2. Enviar `Authorization: Bearer <access_token>` en cada request.
3. El token vive **24 h**; no hay refresh ni logout en servidor: al vencer, un `401` obliga a repetir el login.
4. CORS solo condiciona a navegadores y a un único origen (`CORS_ORIGIN`); un cliente servidor-a-servidor no se ve afectado.
5. No hay alta de usuarios ni API keys: las credenciales de integración son las de la cuenta del encargado.

### 2.7 Idempotencia por verbo
| Verbo | Semántica real |
|---|---|
| `GET` | Seguro e idempotente |
| `PUT` | Actualización **parcial por fusión** (`Object.assign` + `save`): enviar solo los campos a cambiar. Repetirla da el mismo resultado. Responde `200 { data: <entidad guardada>, message }` (el documento actualizado, sin relaciones) |
| `PATCH` | Cambios de estado: **no idempotentes** (repetir `estado-tc6` con el mismo destino da `400` por transición inválida; `revert-tc6` retrocede un paso cada vez). `PATCH /certificaciones/:id`, `/alertas/:id`, `/documentos/:id/renombrar` sí son repetibles |
| `POST` | **No idempotente**, sin `Idempotency-Key`: duplica registros. Excepciones: `POST /expedientes` rechaza un segundo expediente vigente (400); subir un documento con el mismo `nombre_original` **sobrescribe** |
| `DELETE` | Repetirlo da `404` (los soft-deleted no se ven) |

Un `PUT` devuelve el documento actualizado (sin relaciones cargadas). Es el comportamiento que un futuro test de contrato debería fijar.

## 3. Política de evolución del contrato

**Cambios *no-breaking* (permitidos dentro de una versión):**
- Agregar un campo **opcional** a la respuesta o al cuerpo de entrada (p. ej. un `observaciones_internas` opcional en `Establecimiento`).
- Agregar un endpoint nuevo.
- Agregar un parámetro de query **opcional**.
- Agregar un valor a un enum **solo si** los clientes están obligados a tolerar valores desconocidos (norma que hoy no está escrita para clientes; el frontend propio mapea valores a mano en `lib/constants.ts` y **no** tolera desconocidos).

**Cambios *breaking* (exigen `/api/v2`):**
- Cambiar el **tipo** de un campo: p. ej. `Establecimiento.rbd` de `string` a número, o `monto_presupuesto` de `decimal` a `string`.
- Renombrar o eliminar un campo (p. ej. `zona_abastecimiento`, `expediente_activo`) o un endpoint.
- Hacer **obligatorio** un campo que era opcional (p. ej. `fecha_inspeccion` en certificaciones).
- Cambiar un código de estado (p. ej. `201`→`200`), el envoltorio de respuesta o el orden por defecto de un listado.
- Cambiar la semántica de una regla de negocio visible (p. ej. permitir las transiciones TC6 que hoy dan `400`; cambiar los 730/90 días de las alertas).
- Quitar un valor de un enum.

**Procedimiento de deprecación (norma):** (1) marcar el elemento como obsoleto en esta documentación y en el changelog; (2) responder con cabeceras `Deprecation` y `Sunset` con fecha; (3) mantenerlo en la versión vigente durante la ventana acordada; (4) retirarlo solo en la versión mayor siguiente.

> 🔸 BRECHA [BR-30]: no hay changelog de API, versionado ni cabeceras de deprecación. Con `whitelist: true` y `forbidNonWhitelisted: false`, un campo desconocido en el cuerpo se **ignora sin avisar** (excepto en los `PUT`, ver BR-01), lo que oculta errores de contrato del lado cliente.

## 4. Modelo público vs. modelo interno

**Hoy no hay separación:** no existen DTOs de salida; los controllers devuelven las **entidades TypeORM** tal cual (con relaciones cargadas y `deleted_at`, `created_at`, `updated_at`). Lo que cruza la frontera HTTP es, por tanto, el esquema de `02-modelo-datos.md` completo más campos calculados:

| Campo calculado | Dónde se agrega |
|---|---|
| `expediente_activo` (expediente de mayor `id`, con certificaciones ordenadas por fecha desc) | `GET /establecimientos`, `GET /establecimientos/:id` |
| `alertas_activas` (conteo de alertas `activa`) | `GET /expedientes` |
| `dias_restantes` (días hasta `fecha_vencimiento`, redondeo hacia arriba; `null` si fecha inválida) | alertas en `GET /alertas`, `GET /expedientes/:id`, `GET /dashboard/alertas-proximas` |
| `url` (ruta relativa `/uploads/...` derivada de `ruta`) | documentos |

**Proyección explícita (única):** `AuthService.login/getMe` devuelven solo `id, nombre, email, rol`.

**Campos internos que hoy se filtran y no deberían ser parte del contrato público:** `Documento.ruta` y `nombre_archivo` (rutas de servidor), `deleted_at`, y datos personales/financieros descritos en `02-modelo-datos.md` §7.

> 🔸 BRECHA [BR-26]: sin DTOs de respuesta, cualquier columna nueva de una entidad pasa a ser parte del contrato público automáticamente. Para clientes externos eso convierte el esquema interno en API.

**Divergencias entre el modelo declarado por el frontend y el real (el cliente propio asume nombres distintos al backend):**

> 🔸 BRECHA [BR-13]: `Anexo2Form.tsx` envía `zona` y `artefacto`, pero el DTO de instalaciones define `zona_abastecimiento` y `artefacto_cilindro`; con `whitelist: true` esos campos se descartan en `POST /locales/:id/instalaciones` (y en el `PUT`, por BR-01, se aceptaría un campo `zona` que no existe en la entidad). Del mismo modo `lib/api.ts` declara `Defecto.tipo` (el backend usa `tipo_defecto`), `Expediente.monto_estimado` (backend: `monto_presupuesto`/`monto_ejecutado`) y `DashboardStats.tc6_aprobado` (el backend no lo devuelve; devuelve `en_levantamiento`, `en_certificacion`, `sello_rojo`, `sello_amarillo`, `en_regularizacion`, `alertas_proximas_30d`). `ALERTA_TIPOS` en `lib/constants.ts` usa claves (`vencimiento_sello`, `plazo_regularizacion`, `tc6_pendiente`) que no existen en `TipoAlerta`. ⚠️ NO VERIFICADO en ejecución el efecto exacto de la pérdida de datos de instalaciones.

## 5. Estado de OpenAPI

- **No existe especificación OpenAPI ni Swagger UI.** `@nestjs/swagger` no está en `backend/package.json` y `main.ts` no llama a `SwaggerModule`. No hay endpoint `/docs` ni `/api-json`.
- Para publicarla como contrato formal faltaría: dependencia y bootstrap de Swagger; `@ApiProperty` en DTOs (los DTOs actuales no tienen metadatos); DTOs reales para los `PUT` (BR-01) y para las **respuestas** (§4); esquema de error común; declaración del esquema `bearerAuth`; descripción del `multipart` de documentos; versión en la ruta (BR-08).

> 🔸 BRECHA [BR-12]: sin OpenAPI, este documento es la única referencia del contrato y puede divergir del código sin que nada falle.

## 6. Resumen de endpoints (36)

Todas las rutas con prefijo `/api`. **Auth:** 🔓 público · 🔒 JWT.

| # | Método | Ruta | Auth | Descripción | Éxito |
|---|---|---|---|---|---|
| 1 | POST | `/auth/login` | 🔓 | Iniciar sesión | 201 |
| 2 | GET | `/auth/me` | 🔒 | Usuario del token | 200 |
| 3 | GET | `/establecimientos` | 🔒 | Listar (filtros) | 200 |
| 4 | GET | `/establecimientos/:id` | 🔒 | Detalle con locales, instalaciones, expedientes | 200 |
| 5 | POST | `/establecimientos` | 🔒 | Crear | 201 |
| 6 | PUT | `/establecimientos/:id` | 🔒 | Actualizar (parcial) | 200 |
| 7 | DELETE | `/establecimientos/:id` | 🔒 | Soft-delete en cascada | 200 |
| 8 | GET | `/establecimientos/:id/locales` | 🔒 | Listar locales | 200 |
| 9 | POST | `/establecimientos/:id/locales` | 🔒 | Crear local | 201 |
| 10 | PUT | `/locales/:id` | 🔒 | Actualizar local | 200 |
| 11 | GET | `/locales/:localId/instalaciones` | 🔒 | Listar instalaciones | 200 |
| 12 | POST | `/locales/:localId/instalaciones` | 🔒 | Crear instalación | 201 |
| 13 | PUT | `/instalaciones/:id` | 🔒 | Actualizar instalación | 200 |
| 14 | DELETE | `/instalaciones/:id` | 🔒 | Borrar (físico) | 200 |
| 15 | GET | `/expedientes` | 🔒 | Listar | 200 |
| 16 | GET | `/expedientes/:id` | 🔒 | Detalle completo | 200 |
| 17 | POST | `/expedientes` | 🔒 | Crear | 201 |
| 18 | PUT | `/expedientes/:id` | 🔒 | Actualizar (parcial) | 200 |
| 19 | PATCH | `/expedientes/:id/estado-tc6` | 🔒 | Avanzar estado TC6 | 200 |
| 20 | PATCH | `/expedientes/:id/revert-tc6` | 🔒 | Retroceder un paso TC6 | 200 |
| 21 | DELETE | `/expedientes/:id` | 🔒 | "Eliminar" (ver BR-14) | 200 |
| 22 | GET | `/expedientes/:expedienteId/certificaciones` | 🔒 | Listar | 200 |
| 23 | POST | `/expedientes/:expedienteId/certificaciones` | 🔒 | Crear (genera alerta) | 201 |
| 24 | PATCH | `/certificaciones/:id` | 🔒 | Actualizar (sincroniza alerta) | 200 |
| 25 | GET | `/certificaciones/:id/defectos` | 🔒 | Listar defectos | 200 |
| 26 | POST | `/certificaciones/:id/defectos` | 🔒 | Agregar defectos (bulk) | 201 |
| 27 | GET | `/alertas` | 🔒 | Listar (filtros) | 200 |
| 28 | PATCH | `/alertas/:id` | 🔒 | Cambiar estado | 200 |
| 29 | DELETE | `/alertas/:id` | 🔒 | Soft-delete (solo `resuelta`) | 200 |
| 30 | GET | `/dashboard/resumen` | 🔒 | KPIs | 200 |
| 31 | GET | `/dashboard/alertas-proximas` | 🔒 | Alertas ≤ 30 días | 200 |
| 32 | GET | `/expedientes/:expedienteId/documentos` | 🔒 | Listar documentos | 200 |
| 33 | POST | `/expedientes/:expedienteId/documentos` | 🔒 | Subir (multipart) | 201 |
| 34 | GET | `/documentos/:id/descargar` | 🔒 | Descargar archivo | 200 |
| 35 | PATCH | `/documentos/:id/renombrar` | 🔒 | Renombrar | 200 |
| 36 | DELETE | `/documentos/:id` | 🔒 | Borrar (físico + archivo) | 200 |

Todas las respuestas de error posibles incluyen además `401` (sin/ con token inválido) en los 🔒, y `400` por `:id` no numérico en los que llevan `:id`.

## 7. Referencia por endpoint

Convención de nombres de campo: `snake_case`. "Ent." = entidad de `02-modelo-datos.md`. Ejemplos con datos ficticios.

### 7.1 Autenticación — `auth/auth.controller.ts`

**1. `POST /auth/login`** (🔓)
- Body (`LoginDto`): `email` (email válido), `password` (string, mín. 4).
- 201: `{ "data": { "access_token": "<jwt>", "user": { "id": 1, "nombre": "Usuario Demo", "email": "demo@example.com", "rol": "admin" } }, "message": "Login exitoso" }`.
- Errores: `401 Credenciales inválidas`; `400` validación.

**2. `GET /auth/me`** (🔒) → 200 `{ data: { id, nombre, email, rol }, message: "OK" }`; `401` si token inválido o usuario inexistente.

### 7.2 Establecimientos y locales — `establecimientos/*`

**3. `GET /establecimientos`** — query §2.5. 200 `{ data: Establecimiento[], message, total }`. Cada elemento trae `locales`, `expedientes` (con `certificaciones` y `alertas`) y `expediente_activo`.

**4. `GET /establecimientos/:id`** — 200 **objeto plano** `{ ...Establecimiento (con locales.instalaciones, expedientes.certificaciones, expedientes.alertas), expediente_activo, message: "OK" }`. `404 Establecimiento #id no encontrado`.

**5. `POST /establecimientos`** — Body `CreateEstablecimientoDto`: `rbd` (string, **obligatorio, único**), `nombre` (string, obligatorio); opcionales: `direccion`, `nombre_propietario`, `telefono`, `comuna`, `region`, `observaciones` (string), `email` (email), `estado_general` (enum `EstadoGeneral`), `cantidad_locales` (number). 201 `{ data: Establecimiento, message: "Establecimiento creado exitosamente" }`. `rbd` repetido → `500` (BR-11).

**6. `PUT /establecimientos/:id`** — Body: cualquier subconjunto de los campos de `5` **sin validación** (BR-01). 200 `{ data: Establecimiento, message: "Establecimiento actualizado exitosamente" }`; `404`.

**7. `DELETE /establecimientos/:id`** — 200 `{ message: "Establecimiento y recursos asociados eliminados exitosamente" }`. Efecto: soft-delete de las alertas de sus expedientes, de sus expedientes y del establecimiento (ver `02` §6). `404`.

**8. `GET /establecimientos/:id/locales`** — 200 `{ data: Local[] (con instalaciones), message }`; `404` si el establecimiento no existe.

**9. `POST /establecimientos/:id/locales`** — Body `CreateLocalDto`: `numero_local` (number, obligatorio); opcionales `nombre`, `direccion`, `observaciones` (string), `usa_gas` (boolean). 201 `{ data: Local, message: "Local creado exitosamente" }`; `404`. No valida unicidad de `numero_local`.

**10. `PUT /locales/:id`** — Body: subconjunto de `9`, **sin validación** (BR-01). 200 `{ data: Local, message: "Local actualizado exitosamente" }`; `404 Local #id no encontrado`.

### 7.3 Instalaciones — `instalaciones/instalaciones.controller.ts`

**11. `GET /locales/:localId/instalaciones`** — 200 `{ data: Instalacion[], message }`; `404` si el local no existe.

**12. `POST /locales/:localId/instalaciones`** — Body `CreateInstalacionDto` (todos opcionales): `tipo_gas` (`GLP` | `Gas Natural`), `abastecimiento` (enum `Abastecimiento`), `zona_abastecimiento` (enum `ZonaAbastecimiento`), `referencia`, `artefacto_cilindro`, `observaciones` (string). 201 `{ data: Instalacion, message: "Instalación creada exitosamente" }`; `404`.

**13. `PUT /instalaciones/:id`** — Body subconjunto de `12`, **sin validación** (BR-01). 200 `{ data, message: "Instalación actualizada exitosamente" }`; `404 Instalación #id no encontrada`.

**14. `DELETE /instalaciones/:id`** — Borrado **físico**. 200 `{ data: null, message: "Instalación eliminada exitosamente" }`; `404`. Si hay certificaciones o alertas que la referencian, las FKs (sin ON DELETE) deberían impedirlo con `500`. ⚠️ NO VERIFICADO.

### 7.4 Expedientes — `expedientes/expedientes.controller.ts`

**15. `GET /expedientes`** — sin parámetros. 200 `{ data: Expediente[] (con establecimiento, certificaciones, y alertas_activas), message, total }`.

**16. `GET /expedientes/:id`** — 200 `{ data: { ...Expediente con establecimiento.locales.instalaciones, certificaciones (con defectos, local, instalacion, alertas), documentos (con url), hitos (por fecha asc), alertas (con instalacion.local y dias_restantes) }, message }`; `404`.

**17. `POST /expedientes`** — Body `CreateExpedienteDto`: `establecimiento_id` (number, obligatorio); opcionales `empresa_instaladora`, `rut_empresa`, `contacto_empresa`, `telefono_empresa`, `email_empresa`, `numero_licitacion`, `observaciones` (string), `estado_tc6` (enum), `estado_general` (enum), `monto_presupuesto`, `monto_ejecutado` (number), `fecha_inicio`, `fecha_fin_estimada` (ISO date). 201 `{ data: Expediente, message: "Expediente creado exitosamente" }`. Errores: `404` establecimiento inexistente; `400` si ya hay un expediente vigente para el establecimiento. Efectos: crea el hito inicial (`estado_nuevo = sin_iniciar`) y, si el establecimiento está en `sin_gestion`, lo pasa a `en_levantamiento`.

**18. `PUT /expedientes/:id`** — Body subconjunto de `17`, **sin validación** (BR-01). 200 `{ data, message: "Expediente actualizado exitosamente" }`. Efecto: si el cuerpo trae `estado_general`, se copia al establecimiento.

**19. `PATCH /expedientes/:id/estado-tc6`** — Body `{ nuevo_estado: EstadoTC6 (obligatorio), observaciones?: string }`. Máquina de estados (`expedientes.service.ts:TC6_TRANSITIONS`):
`sin_iniciar → en_elaboracion → ingresado_sec → (observado | tc6_aprobado)`; `observado → tc6_aprobado`; `tc6_aprobado` es terminal. Cualquier otra → `400 Transición inválida: A → B. Transiciones permitidas: …`. Efectos: registra un `HitoTC6`; `estado_general` pasa a `en_certificacion` si el destino es `tc6_aprobado`, o a `en_proyecto` si estaba en `sin_gestion`/`en_levantamiento`; se copia al establecimiento. 200 `{ data: Expediente, message: "Estado TC6 actualizado a <estado>" }`.

**20. `PATCH /expedientes/:id/revert-tc6`** — Body `{ observaciones?: string }`. Retrocede un paso (`TC6_REVERSE`: `tc6_aprobado→observado→ingresado_sec→en_elaboracion→sin_iniciar`); desde `sin_iniciar` → `400`. Registra hito de reversión; ajusta `estado_general` (a `en_levantamiento` al volver a `sin_iniciar`; de `en_certificacion` a `en_proyecto`). 200 `{ data, message: "Estado TC6 revertido a <estado>" }`. El frontend propio **no** usa este endpoint.

**21. `DELETE /expedientes/:id`** — 200 `{ message: "Expediente eliminado exitosamente" }`.
> 🔸 BRECHA [BR-14]: solo hace soft-delete de las **alertas** del expediente; el expediente permanece (`ExpedientesService.remove`). El frontend propio no invoca este endpoint.

### 7.5 Certificaciones y defectos — `certificaciones/*`

**22. `GET /expedientes/:expedienteId/certificaciones`** — 200 `{ data: Certificacion[] (con defectos, local, instalacion, alertas; created_at desc), message }`; `404`.

**23. `POST /expedientes/:expedienteId/certificaciones`** — Body `CreateCertificacionDto`: opcionales `local_id`, `instalacion_id` (number), `tipo_sello` (`verde|amarillo|rojo`), `nombre_inspector`, `entidad_certificadora`, `rut_inspector`, `numero_certificado`, `url_certificado`, `observaciones` (string), `fecha_inspeccion` (ISO date), `defectos` (arreglo de `{ tipo_defecto (enum, obligatorio), instalacion_afectada?, descripcion? }`).
- `400` si `tipo_sello` es `amarillo`/`rojo` y no hay al menos un defecto.
- **Efectos (solo si vienen `tipo_sello` y `fecha_inspeccion`):** resuelve las alertas `activa`/`notificada` previas del expediente de la misma instalación (y todas las del expediente con `instalacion_id` nulo); crea una alerta nueva: `verde` → `vencimiento_sello_verde` a **730 días** de la inspección; `amarillo`/`rojo` → `plazo_regularizacion_90d` a **90 días**; actualiza `estado_general` del expediente y del establecimiento (`sello_verde`/`sello_amarillo`/`sello_rojo`). Si falta alguno de los dos campos **no se crea alerta ni se cambia el estado**.
- 201 `{ data: Certificacion (con defectos, local, instalacion, alertas), message: "Certificación creada exitosamente" }`.

**24. `PATCH /certificaciones/:id`** — Body `UpdateCertificacionDto` (mismos campos, todos opcionales). Si `defectos` viene, **reemplaza** la lista completa (borra y reinserta). Si cambia `tipo_sello` o `fecha_inspeccion`, actualiza la primera alerta ligada a la certificación (o crea una) y re-sincroniza estados. 200 `{ data: Certificacion, message: "Certificación actualizada exitosamente" }`; `404 Certificación #id no encontrada`. No exige defectos para amarillo/rojo (la validación solo existe en la creación).

**25. `GET /certificaciones/:id/defectos`** — 200 `{ data: Defecto[], message }`; `404`.

**26. `POST /certificaciones/:id/defectos`** — Body `{ defectos: [ { tipo_defecto, instalacion_afectada?, descripcion? } ] }`. **Agrega** (no reemplaza). 201 `{ data: Defecto[], message: "N defecto(s) creado(s) exitosamente" }`; `404`. El frontend propio no lo usa.

### 7.6 Alertas — `alertas/alertas.controller.ts`

**27. `GET /alertas`** — query §2.5. 200 `{ data: Alerta[] (con expediente.establecimiento, certificacion, instalacion.local, y dias_restantes), message, total }`.

**28. `PATCH /alertas/:id`** — Body `{ estado: EstadoAlerta }` (obligatorio). Reglas: pasar a `resuelta` una alerta `plazo_regularizacion_90d` exige que el expediente tenga al menos una certificación `verde` (de la misma instalación si la alerta la tiene), si no `400 No se puede resolver esta alerta: la instalación debe tener un Sello Verde vigente primero.`; pasar a `notificada` fija `fecha_notificacion`. 200 `{ data: Alerta, message: "Alerta actualizada exitosamente" }`; `404`.

**29. `DELETE /alertas/:id`** — Solo si `estado = resuelta`, si no `400 Solo se pueden eliminar alertas en estado 'resuelta'…`. Soft-delete. 200 `{ message: "Alerta eliminada exitosamente" }`; `404`.

*Proceso automático (no HTTP):* `AlertasService.checkAndNotifyAlerts` corre a las 08:00 todos los días (`@Cron('0 8 * * *')`, zona horaria del proceso): marca `notificada` las `activa` con vencimiento ≤ hoy+30 días y `vencida` las `activa`/`notificada` con vencimiento anterior a hoy. No envía correos ni mensajes.

> 🔸 BRECHA [BR-19]: el cron pasa a `notificada` toda alerta a ≤30 días, y el dashboard (`alertas_activas`, `alertas_proximas_30d`, `alertas-proximas`) cuenta **solo** `activa`: tras el cron esas alertas desaparecen de los indicadores del tablero. Además el estado `notificada` no implica ningún envío real.

### 7.7 Dashboard — `dashboard/*`

**30. `GET /dashboard/resumen`** — 200 `{ data: { total_ee, sin_gestion, en_levantamiento, en_proyecto, en_certificacion, sello_verde, sello_rojo, sello_amarillo, en_regularizacion, alertas_activas, alertas_proximas_30d }, message }`. Todos enteros; los `*_ee`/estado cuentan establecimientos (excluye soft-deleted).

**31. `GET /dashboard/alertas-proximas`** — 200 `{ data: Alerta[] (estado activa, vencimiento ≤ hoy+30, **incluye ya vencidas por fecha**, con expediente.establecimiento, instalacion.local, dias_restantes), message, total }`.

### 7.8 Documentos — `documentos/*`

**32. `GET /expedientes/:expedienteId/documentos`** — 200 `{ data: Documento[] (+ url), message }`; `404`.

**33. `POST /expedientes/:expedienteId/documentos`** — `multipart/form-data`: campo `file` (obligatorio; máx. **50 MB**), `descripcion` (texto, opcional). Si ya existe un documento del expediente con el mismo `nombre_original`, se **sobrescribe** archivo y metadatos (`message: "Documento sobreescrito exitosamente"`); si no, se crea (`"Documento subido exitosamente"`). Ambos `201`. Errores: `404` expediente (se elimina el archivo ya subido), `413` por tamaño. Sin `file` el comportamiento es indefinido (⚠️ NO VERIFICADO; `file.originalname` se desreferencia sin comprobar). Ver BR-07.

**34. `GET /documentos/:id/descargar`** — respuesta binaria con `Content-Disposition: attachment; filename=<nombre_original>`. `404` si no hay fila o el archivo físico no existe. Un navegador debe usar `fetch` con el header `Authorization` y construir un blob (como hace `expedientes/[id]/page.tsx:handleDownload`): un enlace directo no envía el token.

**35. `PATCH /documentos/:id/renombrar`** — Body `{ nombre: string }`. Solo cambia `nombre_original` (no el archivo en disco); si el nuevo nombre no trae extensión, conserva la original. `400 El nombre no puede estar vacío` si queda vacío; sin `nombre` el comportamiento no está controlado (⚠️ NO VERIFICADO). 200 `{ data: Documento (+url), message: "Documento renombrado exitosamente" }`.

**36. `DELETE /documentos/:id`** — borra el archivo y la fila. 200 `{ message: "Documento eliminado exitosamente" }`; `404`.

## 8. Endpoints no consumidos por el frontend propio

Útiles para saber qué rutas no tienen un cliente que las ejercite: `GET /auth/me`, `GET /locales/:localId/instalaciones`, `GET /certificaciones/:id/defectos`, `POST /certificaciones/:id/defectos`, `PATCH /expedientes/:id/revert-tc6`, `PUT /expedientes/:id`, `DELETE /expedientes/:id`, `GET /expedientes/:expedienteId/certificaciones` (existe `certificacionesApi.list`, sin uso) y `GET /expedientes/:expedienteId/documentos` (existe `documentosApi.list`, sin uso: el detalle de expediente ya trae los documentos). Los demás endpoints sí son invocados por alguna página, componente o hook. (Verificado cruzando `frontend/src/lib/api.ts` y los llamados a `Api.*` en páginas y componentes.)
