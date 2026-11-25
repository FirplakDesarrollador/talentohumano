# Wiki interna — Talento Humano

Bitácora de lo que se va construyendo en la app, organizada por módulo. El objetivo es no perder el contexto de *por qué* existe cada cosa, sobre todo lo que vive fuera del código (automatizaciones en Supabase, permisos puntuales por correo, integraciones con Microsoft 365).

> Convención: cada entrada nueva va arriba de su sección, con fecha. No se borran entradas viejas salvo que la funcionalidad se haya quitado de verdad — en ese caso se marca como "Retirado" en vez de eliminarse, para conservar el historial.

---

## Contratación (`/contratacion`)

- **2026-11** — Pestaña **Alertas de Contrato**: cron diario (`/api/cron/alertas-contrato`, gateado por `CRON_SECRET`) que detecta contratos Temporales (3 meses) o Término Fijo (2 meses) sin decisión y le pide al jefe que decida (link con token, tabla `alertas_contrato`). Tiene una sub-vista **"Por revisar"** que calcula en vivo (directo de `empleados`, sin pasar por `alertas_contrato`) los contratos vencidos, para que Talento Humano corrija `fecha_inicio_contrato_actual`/`fecha_fin_contrato_actual` antes de que se dispare la alerta real. El cron quedó **pausado temporalmente** mientras se revisa el backlog inicial (~73 contratos) — hay que reactivarlo en `vercel.json` cuando el backlog quede al día.
- **2026-11** — **Archivo Digital**: bug de carpetas duplicadas por nombres con espacios sin `trim()` en `empleados.nombreCompleto` (corregido en los puntos donde se genera el nombre de carpeta). Se agregó añadir/eliminar archivos manualmente con confirmación (`/api/archivo-digital/subir`, `/api/archivo-digital/eliminar`).
- **2026-11-23/24** — **Sincronización con OneDrive** (proceso de transición de 2 semanas, con ambos sistemas activos en paralelo, antes de dejar solo la app):
  - *OneDrive → App*: botón **"Sincronizar"** en Archivo Digital (invoca la Edge Function `sync-archivo-digital`, ya desplegada; se autoencadena sola en el servidor vía `EdgeRuntime.waitUntil`, procesa las categorías `1.ACTIVOS`/`2.RETIRADOS` del OneDrive de `renata.lainez@firplak.com`). El conteo interno de la function (`archivo_digital_sync_log`) no es acumulativo entre invocaciones encadenadas — el botón calcula el total real comparando `migrado_at` contra el inicio de la corrida, no confía en ese contador.
  - *App → OneDrive*: helper compartido `src/lib/archivoDigital/pushToOneDrive.ts`. Todo lo que la app guarda en Archivo Digital (subida manual, contrato generado, documento de proceso disciplinario, documentos de postulación al aprobar un candidato) se espeja hacia la misma carpeta en OneDrive, y se guarda el `onedrive_item_id` resultante para que la sincronización en el otro sentido no lo traiga de vuelta como duplicado.
- **2026-11-23/24** — Kanban de **Candidatos**: al generar el contrato (o marcar "Es practicante" — el contrato de practicantes lo gestiona Talento Humano directamente, fuera de la app) el candidato pasa al estado `CONTRATADO` (agregado a la whitelist de `update_candidate_status`, tabla real `"BD_Postulacion"."Candidatos"`) y desaparece de "Listos para Contratar".
- **2026-11-25** — **Archivo Digital**: cargo como texto libre (sin lista desplegable) y funciones del cargo pegables en "Crear Contrato"; fecha de inicio/fin de contrato seleccionables; Dirección/Fecha/Lugar de Nacimiento capturados en el formulario público de postulación y mostrados en el expediente del candidato; botón de eliminar postulado con confirmación; nueva subcarpeta **"Soporte Afiliación"**.

## Selección (`/seleccion`)

- **2026-11** — Unificado en **una sola pantalla con pestañas** (Vacantes / Candidatos Inscritos / Practicantes), reemplazando el menú de "apartados" y las rutas separadas que había antes.
- **2026-11** — **Vacantes** (`seleccion_vacantes`) absorbió **Solicitudes de Personal** (`solicitudes_personal`, sincronizada desde Planner): cada solicitud crea automáticamente su vacante vinculada (`solicitud_personal_id`), y la tarjeta de la vacante muestra los datos de la solicitud (motivo, perfil, salario, horario, link a Planner) cuando existen.
- **2026-11** — Formulario público `/solicitar-personal`: agregado campo obligatorio **"Descripción del Cargo (Funciones)"** (texto o archivo), separado de "Perfil/Requisitos" (que sigue siendo opcional).
- **2026-11** — **Activo/Inactivo gestionado por el jefe**: columna `seleccion_vacantes.activo`. El jefe que solicitó el cargo ahora tiene acceso al módulo de Selección (antes solo admins — ver menú, gateado por `tienePersonalACargo`) y ve una pestaña **"Mis Solicitudes"** con solo sus propios cargos, donde puede marcar Activo/Inactivo sin tocar el resto del registro.

## Aumentos Salariales (`/aumentossalariales`)

- **Notificación de creación**: al crear una solicitud se notifica al aprobador (Teams + correo, con botones de Aprobar/Rechazar vía token) y a Renata (Teams + correo, informativo). Cron diario (`/api/cron/aumentos-salariales-recordatorio`) reenvía recordatorio una sola vez a los 8 días si sigue Pendiente (`aumentosSalariales.recordatorio_enviado`).
- **2026-11-24 — Fix**: Renata no recibía notificación al **aprobar/rechazar**. Causa: hay dos caminos para decidir (el link público por token `/decision-aumento/[token]` — el que realmente se usa, llega por correo/Teams al aprobador — y la pantalla interna de Aumentos Salariales). Solo el segundo notificaba a Renata. Se unificó la lógica en `src/lib/aumentosSalariales/notificarDecision.ts`, usada por ambos caminos, y se le agregó correo a Renata (antes solo Teams).
- El acceso de planta extra (`AUMENTOS_SALARIALES_PLANTAS_EXTRA`) no debe tapar a los jefes directos — ver `src/lib/constants/roles.ts`.

## HILU (`/seleccion-hilu`, `/entrenamiento`, `/hilu-administrativa`)

- Brian Stiven Sánchez Hernández: agregado a la excepción de "HILU de Sistemas de Producción" aunque su planta (I+D+I) es administrativa (`EMPLEADOS_ADMINISTRATIVOS_CON_HILU_SISTEMA`), porque coordina Moldes en la práctica.
- Maria Isabel Escobar (`supervisorcalidad3@firplak.com`): override puntual (`HILU_ADMIN_EDIT_OVERRIDES`, `HILU_OPERATIVA_EDIT_OVERRIDES`) para ver/editar específicamente el registro de Brian, sin ampliar el resto de sus permisos (ella es de Calidad/RR Moldes).

## Permisos por planta/jefe (`src/lib/constants/roles.ts`)

Patrón: casi todo acceso restringido por planta se resuelve en `getPlantasPermitidas(email)`, acumulando plantas de varias listas (un mismo correo puede aparecer en más de una). Overrides puntuales a un empleado específico (no a una planta completa) van en diccionarios `Record<email, id[]>` como `HILU_ADMIN_EDIT_OVERRIDES`.

- Juliana Ramírez (`juliana.ramirez@firplak.com`): Muebles, Cefi, Calidad y Mármol Sintético.

## Automatizaciones fuera del repo (viven en Supabase, no en git)

- **`sync-personal-con-jefe`** (Edge Function + pg_cron, día 10 de cada mes, `0 17 10 * *`): lee el Excel `ListadoVacaciones.xlsx` de SharePoint (sitio TalentoHumano) y reemplaza por completo la tabla `PersonalConJefe` (snapshot mensual, no histórico). Lee un **rango fijo** (`A1:D10000`) en vez de `usedRange()` porque formatear de más en el Excel puede disparar `RangeExceedsLimit` en Graph.
- **`sync-archivo-digital`** (Edge Function): ver sección de Contratación arriba.
- **`sync-planner`** (Edge Function): sincroniza tareas de Planner, usada por el dashboard de Desempeño y por Solicitudes de Personal.

## Pendientes conocidos

- Backlog de ~73 contratos vencidos por revisar en Alertas de Contrato antes de reactivar ese cron (ver sección Contratación).
- 255 empleados con espacios sueltos en `nombreCompleto` (detectado al investigar el bug de carpetas duplicadas) — no se ha limpiado masivamente, solo se corrigió el código para que no vuelva a pasar.
- ~~Confirmar permiso de Graph para escribir en el OneDrive de Archivo Digital~~ — confirmado el 2026-11-24 con un archivo de prueba real (subido y eliminado correctamente vía Graph, status 201/204).
