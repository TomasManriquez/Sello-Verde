# 00 — Sello Verde: base de conocimiento técnica

> **Alcance:** punto de entrada de la documentación: propósito del sistema, índice, glosario de dominio, guía "quiero hacer X → lee Y" y el índice maestro de brechas (`BR-xx`). **No cubre:** el detalle técnico de cada área (cada archivo `01`–`07` es autocontenido).
> **Fuentes:** todo el repositorio; en especial `contexto_proyecto.md`, `flujo_software.md`, `requistos_proyecto.md`, `AGENTS.md`, `backend/src/**`, `frontend/src/**`.
> **Verificado contra:** commit `c66929e` (rama `master`) · 2026-10-09. El árbol de trabajo tenía cambios sin commitear: `backend/src/common/enums/index.ts` (modificado) y archivos nuevos sin versionar `DEPLOYMENT_SOP.md`, `deploy.sh`, `backend/src/auth.middleware.ts` y `backend/src/common/enums/comunas.enum.ts`. `implementation_plan.md` se movió a `Documentacion/historico/implementation_plan_iter1.md` con `git mv` (cambio staged).
> **Lectores:** desarrolladores nuevos, agentes de IA, consumidores de la API.

## 1. Qué es este sistema

**Sello Verde** es un MVP para que el **SLEP** (Servicio Local de Educación Pública) haga seguimiento de la certificación de las **instalaciones de gas** de sus **establecimientos educacionales** ante la **SEC**. Reemplaza información dispersa y sin trazabilidad (multas por sellos vencidos, sellos rojos/amarillos perdidos de vista) por un tablero, un repositorio de expedientes y alertas de plazo (`contexto_proyecto.md`).

- **Usuario:** una sola persona, el encargado del proceso en el SLEP, que digitaliza la información que producen terceros (`flujo_software.md`).
- **Qué hace:** registra establecimientos y su levantamiento físico (Anexo 2), el seguimiento del proyecto TC6, las certificaciones y defectos (Anexo 3), genera alertas (sello verde vence a los 2 años; plazo de 90 días para regularizar) y guarda los documentos del expediente.
- **Qué NO hace:** no se integra con la SEC, no envía correos ni notificaciones (las alertas se ven solo en la plataforma), no tiene roles ni gestión de usuarios.
- **Stack:** Next.js 14 (frontend), NestJS 10 (backend), PostgreSQL 16, todo en Docker Compose (`01-arquitectura.md`).

## 2. Índice de documentos

| Archivo | Léelo cuando… |
|---|---|
| [`01-arquitectura.md`](01-arquitectura.md) | Necesitas entender contenedores, capas, flujo de una request o el despliegue |
| [`02-modelo-datos.md`](02-modelo-datos.md) | Vas a tocar tablas, entidades, enums o borrados |
| [`03-api-contract.md`](03-api-contract.md) | Vas a consumir o modificar la API (los 36 endpoints, convenciones, evolución) |
| [`04-seguridad-y-acceso.md`](04-seguridad-y-acceso.md) | Auditas o agregas autenticación, permisos, archivos o secretos |
| [`05-guia-de-extension.md`](05-guia-de-extension.md) | Vas a agregar un módulo o cambio; define límites arquitectónicos, deuda y Definition of Done |
| [`06-decisiones-adr.md`](06-decisiones-adr.md) | Quieres saber *por qué* algo es así antes de cambiarlo |
| [`07-operacion.md`](07-operacion.md) | Levantas el entorno, despliegas o haces rollback |
| [`historico/implementation_plan_iter1.md`](historico/implementation_plan_iter1.md) | Plan de la primera iteración: **intención histórica, no estado actual** |

Orden de lectura para un desarrollador nuevo: `00` → `01` → `02` → `07`. Para integrar contra la API: solo `03`. Para modificar código: `05` (y consultar `04` si toca seguridad).

## 3. Quiero hacer X → lee Y

| Quiero… | Lee |
|---|---|
| Levantar el sistema en mi máquina | `07` §2, §3 |
| Entender qué tablas hay y cómo se relacionan | `02` §2–§3 |
| Integrarme a la API desde otro sistema | `03` §1, §2.6 y §6–§7 |
| Saber cómo me autentico y cuánto dura el token | `03` §2.6, `04` §1 |
| Agregar un módulo de dominio nuevo | `05` §1 |
| Agregar un campo, un estado TC6, un tipo de alerta o un filtro | `05` §2 |
| Borrar datos (lógica o físicamente) sin romper reglas | `02` §6, `05` §3 (L1–L3), `AGENTS.md` |
| Saber qué reglas de negocio no puedo romper | `05` §6 |
| Cambiar algo en la autenticación o permisos | `04` §1–§4 |
| Subir/descargar documentos | `03` §7.8, `04` §6 |
| Desplegar a producción o volver atrás | `07` §6–§8 |
| Entender por qué hay JWT / `synchronize` / soft-delete parcial | `06` ADR-008, ADR-010, ADR-007 |
| Ver qué falla o está pendiente | §5 de este documento |
| Saber qué datos son sensibles | `02` §7, `04` §5 |

## 4. Glosario de dominio

Definiciones tomadas de `contexto_proyecto.md`, `flujo_software.md`, `requistos_proyecto.md` y del código. Los términos que el repo no define quedan marcados.

| Término | Significado | Dónde vive en el código |
|---|---|---|
| **SLEP** | Servicio Local de Educación Pública: entidad dueña del proceso y usuaria del sistema | — (contexto) |
| **SEC** | Superintendencia de Electricidad y Combustibles; regula las instalaciones de gas y emite la normativa (Resolución 29738 Exenta) | — |
| **EE** | Establecimiento Educacional | `Establecimiento` (`establecimientos`) |
| **RBD** | Rol Base de Datos: identificador oficial de un EE; un RBD puede tener varios locales | `Establecimiento.rbd` (varchar, único) |
| **Local** | Recinto/sucursal bajo un mismo RBD (Anexo 2, Tabla 1) | `Local` (`locales`) |
| **Instalación** | Instalación de gas de un local: tipo de gas, abastecimiento, zona, referencia, artefacto (Anexo 2, Tabla 2) | `Instalacion` (`instalaciones`) |
| **Anexo 2** | "Formulario de Levantamiento de Instalaciones de Gas": digitaliza el levantamiento en terreno | `components/forms/Anexo2Form.tsx` |
| **Anexo 3** | "Formulario de Comunicación de Defectos Críticos a Usuarios": checklist de defectos que acompaña un sello rojo/amarillo | `Defecto`, `components/forms/Anexo3Form.tsx` |
| **TC6** | Proyecto de diseño que se ingresa a la SEC para su aprobación. Estados: `sin_iniciar → en_elaboracion → ingresado_sec → observado → tc6_aprobado` | `EstadoTC6`, `Expediente.estado_tc6` |
| ⚠️ **TC6 (sigla)** | NO VERIFICADO: el repo no desarrolla el significado de la sigla | — |
| **Expediente** | Carpeta de seguimiento de un EE: empresa instaladora, estado TC6, montos, certificaciones, documentos, alertas | `Expediente` (`expedientes`) |
| **Hito TC6** | Registro histórico de un cambio de estado TC6 | `HitoTC6` (`hitos_tc6`) |
| **Empresa instaladora** | Contratista adjudicada por licitación que hace el levantamiento y regulariza | `Expediente.empresa_instaladora`, `rut_empresa`… |
| **Entidad certificadora / inspector** | Verificador externo que inspecciona y califica el sello | `Certificacion.entidad_certificadora`, `nombre_inspector`, `rut_inspector` |
| **Certificación** | Resultado de una inspección: tipo de sello, fecha, inspector, certificado, defectos | `Certificacion` (`certificaciones`) |
| **Sello Verde** | Sin defectos; aprobado. Genera alerta de vencimiento a **2 años** (el código usa 730 días) | `TipoSello.VERDE` |
| **Sello Amarillo** | Con defectos mayores/menores sin riesgo inminente. Genera plazo de regularización de **90 días** | `TipoSello.AMARILLO` |
| **Sello Rojo** | Con defectos críticos que implican riesgo. Genera plazo de **90 días** | `TipoSello.ROJO` |
| **Defecto** | Hallazgo marcado en el Anexo 3 (fugas, CO > 50 ppm, falta de conducto, etc.) | `TipoDefecto`, `Defecto` |
| **Alerta** | Aviso persistente de plazo (`vencimiento_sello_verde` o `plazo_regularizacion_90d`) con estados `activa/notificada/resuelta/vencida` | `Alerta` (`alertas`) |
| **Estado general** | Etapa global del EE/expediente: `sin_gestion`, `en_levantamiento`, `en_proyecto`, `en_certificacion`, `sello_verde/rojo/amarillo`, `en_regularizacion` | `EstadoGeneral` |
| **GLP / Gas Natural** | Tipos de gas de una instalación | `TipoGas` |
| **Abastecimiento** | Modalidad de suministro: `GDR`, `Equipo GLP`, `Cilindros 45 kg`, `Cilindros 11-15 kg`, `GRANEL` | `Abastecimiento` |
| ⚠️ **GDR** | NO VERIFICADO: el repo lista el valor pero no lo define | — |
| **Zona de abastecimiento** | Dónde está la instalación: Casino, Camarines, Sala de clases, Otros | `ZonaAbastecimiento` |
| **Comuna** | Texto libre en el EE (no hay catálogo ni lógica asociada; el enum `Comunas` está comentado) | `Establecimiento.comuna` |

**Términos que no existen en este repo:** el flujo no maneja área urbana/rural, IVE, ADP, microcentro, contraparte ni categoría; no los busques en el código.

## 5. Índice maestro de brechas (`BR-xx`)

Cada brecha está descrita en el documento indicado, con el marcador `> 🔸 BRECHA [BR-xx]:`. Este índice es la lista de control: ninguna tiene plan de arreglo (fuera del alcance de la documentación). Severidad orientativa: **A** alta (seguridad/pérdida de datos), **M** media, **B** baja.

| ID | Sev. | Resumen | Documento |
|---|---|---|---|
| BR-01 | A | `PUT` con `Partial<Dto>`: sin validación ni whitelist, asignación masiva (comprobado) | `04` §5, `03` |
| BR-02 | M | `rol` existe pero nadie lo aplica: no hay autorización por rol | `04` §2 |
| BR-03 | A | Secretos y credenciales por defecto embebidos en código y `docker-compose.yml` | `04` §7 |
| BR-04 | A | `/uploads` servido sin autenticación (y reexpuesto por Next); ruta posiblemente mal calculada | `04` §3 |
| BR-05 | A | El login registra el JWT completo en la consola del navegador | `04` §1 |
| BR-06 | M | JWT en `localStorage`, 24 h, sin refresh/revocación | `04` §1 |
| BR-07 | M | Subida: `req.params` crudo antes de `ParseIntPipe`, sin validar tipo/archivo, colisión de nombres | `04` §6 |
| BR-08 | M | Sin versionado de la API (`/api/v1`) | `03` §2.1 |
| BR-09 | M | Ningún listado pagina; `GET /establecimientos` filtra en memoria | `03` §2.2 |
| BR-10 | B | Envoltorio de respuesta inconsistente (`GET /establecimientos/:id` plano; DELETE variados) | `03` §2.3 |
| BR-11 | M | Sin forma de error estable; unicidad de `rbd` → 500; `message` string o arreglo | `03` §2.4 |
| BR-12 | M | No hay OpenAPI/Swagger | `03` §5 |
| BR-13 | A | Divergencias frontend↔backend (`zona`/`artefacto` descartados por whitelist, `tipo`, `monto_estimado`, `tc6_aprobado`, filtro de expedientes ignorado) | `03` §2.5, §4 |
| BR-14 | A | Soft-delete incompleto vs `AGENTS.md`; `DELETE /expedientes/:id` no borra el expediente | `02` §6, `03` §7.4 |
| BR-15 | M | Servicios inyectan repositorios de otros dominios (viola `AGENTS.md`) | `01` §4 |
| BR-16 | A | `synchronize: true` en producción, sin migraciones | `02` §1, `07` |
| BR-17 | A | Sin tests; Jest/ESLint no operativos; el QA gate de `deploy.sh` no puede pasar | `05` §1.1, `07` §5 |
| BR-18 | M | Operaciones multi-escritura sin transacción | `01` §5 |
| BR-19 | M | El cron deja alertas en `notificada` y el dashboard solo cuenta `activa`; no se envía nada | `03` §7.6 |
| BR-20 | A | Backend publicado en el puerto 3001 del host en producción | `04` §8 |
| BR-21 | B | `rbd` único incluye filas soft-deleted (inferido, no ejecutado) | `02` §6 |
| BR-22 | B | Código duplicado y muerto (`dias_restantes`, alertas, `auth.middleware.ts`, `bak.txt`, `UPLOADS_DIR`) | `05` §5 |
| BR-23 | M | El tablero muestra cifras ficticias si la API falla | `04` §8 |
| BR-24 | M | `estado_general` denormalizado; `en_regularizacion` nunca se asigna | `02` §5 |
| BR-25 | B | Sin plantillas versionadas de variables de entorno del backend/producción | `07` §1 |
| BR-26 | M | Sin DTOs de respuesta: las entidades son la API pública | `03` §4 |
| BR-27 | B | `NEXT_PUBLIC_API_URL` de desarrollo con sufijo `/api` en contradicción con el código | `01` §6.1 |
| BR-28 | M | `deploy.sh`/SOP usan la rama `main`; el repo usa `master` | `07` §6 |
| BR-29 | A | Sin respaldos automatizados ni procedimiento de rollback escrito | `07` §8 |
| BR-30 | B | Sin changelog ni procedimiento de deprecación de la API | `03` §3 |

## 6. Convenciones de esta documentación

- **Trazabilidad:** las afirmaciones citan `archivo`, `archivo:símbolo` o `archivo:línea`. Los símbolos son más estables que las líneas (por eso se prefieren).
- **`> ⚠️ NO VERIFICADO:`** = no se pudo confirmar (normalmente porque requiere ejecutar el sistema); dice qué falta para confirmarlo. **`> 🔸 BRECHA [BR-xx]:`** = el código no cumple la convención o la regla escrita; sin propuesta de solución.
- **Datos ficticios:** ningún secreto ni dato personal real aparece aquí; los ejemplos son inventados. Los valores por defecto sensibles del código se describen, no se reproducen.
- **Qué se ejecutó al documentar:** solo comprobaciones locales (compilados de `dist/`, `ValidationPipe`, Jest y ESLint, cálculos de rutas, lectura de lockfiles). **No** se levantó Docker, ni la base, ni el servidor HTTP.
- **Mantener al día:** la sección "Documentación" del Definition of Done (`05` §7) exige actualizar estos archivos junto con el código.
