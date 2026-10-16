# KA$H · Seguimiento de automation

Versión de referencia: **0.677**. Catálogo: **195 casos**, con identificadores estables.
No renumerar los casos al agregar nuevos. Las pruebas nuevas reciben nuevos IDs.

## Estados

- **Pendiente:** todavía no hay código.
- **Implementado:** tiene código, falta verificar su ejecución.
- **Verificado:** se ejecutó y pasó.
- **Con incidencia:** hay un fallo pendiente de revisar.

## Bloque 01: 01-onboarding.spec.js

| ID | Caso | Estado |
|---|---|---|
| TC-001 | Mostrar selector de idioma en inicio limpio | Verificado |
| TC-002 | Elegir inglés y continuar | Verificado |
| TC-003 | Elegir español y continuar | Verificado |
| TC-004 | Crear proyecto vacío | Verificado |
| TC-005 | Completar los tres pasos de bienvenida | Verificado |
| TC-006 | Omitir bienvenida y acceder a Resumen | Verificado |
| TC-007 | Rechazar nombre vacío o compuesto por espacios | Verificado |
| TC-008 | Conservar caracteres especiales en el nombre | Verificado |
| TC-009 | Seleccionar varias monedas | Verificado |
| TC-010 | Permitir cinco monedas e impedir una sexta | Verificado |
| TC-011 | Iniciar sin movimientos de ejemplo | Verificado |
| TC-012 | Mantener estimador fuera del wizard y desactivado | Verificado |

## Bloque 02: 02-language.spec.js

| ID | Caso | Estado |
|---|---|---|
| TC-013 | Cambiar de inglés a español desde Ajustes | Verificado |
| TC-014 | Cambiar de español a inglés desde Ajustes | Verificado |
| TC-015 | Conservar el idioma después de recargar | Verificado |
| TC-016 | No repetir la selección inicial en otra pestaña | Verificado |
| TC-017 | Traducir los nombres de las secciones | Verificado |
| TC-018 | Actualizar meses y nombres de monedas | Verificado |
| TC-019 | Traducir validaciones y confirmaciones | Verificado |
| TC-020 | Integración: traducir ayuda F1 abierta | Verificado |
| TC-021 | Integración: traducir guía activa conservando el paso | Verificado |
| TC-022 | Alternar repetidamente ambos idiomas | Verificado |
| TC-023 | Conservar nombres, notas y comentarios propios | Verificado |
| TC-024 | Conservar importes y saldos en dos monedas | Verificado |
| TC-025 | No generar cambios pendientes al traducir | Verificado |
| TC-026 | Conservar formulario parcial sin registrarlo | Verificado |

## Próximos bloques

| Orden | Archivo previsto | Casos | Estado |
|---|---|---|---|
| 03 | `03-currencies.spec.js` | TC-027–TC-036 | Pendiente |
| 04 | `04-expenses.spec.js` | TC-037–TC-054 | Pendiente |
| 05 | `05-expense-filters.spec.js` | TC-055–TC-064 | Pendiente |
| 06 | `06-recurring-expenses.spec.js` | TC-065–TC-073 | Pendiente |
| 07 | `07-monthly-budget.spec.js` | TC-074–TC-088 | Pendiente |
| 08 | `08-balances.spec.js` | TC-089–TC-102 | Pendiente |
| 09 | `09-balance-adjustments.spec.js` | TC-103–TC-110 | Pendiente |
| 10 | `10-currency-exchange.spec.js` | TC-111–TC-122 | Pendiente |
| 11 | `11-summary.spec.js` | TC-123–TC-134 | Pendiente |
| 12 | `12-dates-notifications.spec.js` | TC-135–TC-146 | Pendiente |
| 13 | `13-installments-notes.spec.js` | TC-147–TC-156 | Pendiente |
| 14 | `14-settings.spec.js` | TC-157–TC-166 | Pendiente |
| 15 | `15-estimator-access.spec.js` | TC-167–TC-176 | Pendiente |
| 16 | `16-project-persistence.spec.js` | TC-177–TC-186 | Pendiente |
| 17 | `17-ui-regression.spec.js` | TC-187–TC-195 | Pendiente |

## Observaciones

- La portada en español usa el nombre accesible **Abrir Proyecto**, con P mayúscula. La prueba usa ese texto real.
- En el EXE, recuperar una sesión anterior es distinto de iniciar desde cero. Esta suite usa contextos de navegador limpios; no borra sesiones de la instalación personal.
- No se ha modificado la app para hacer pasar estos casos.

## Verificación original del bloque 01

- Fecha local: **15/10/2026, 22:36:40**, America/Buenos_Aires.
- Resultado: **12/12 aprobados**, 0 fallidos, 0 omitidos, 0 inestables y 0 reintentos.
- Duración del archivo completo: **43.9 segundos**.
- Navegador: Microsoft Edge (Chromium); Playwright 1.62.1; un worker.
- TC-008 también pasó ejecutado solo, sin correr los casos anteriores.
- Los 24 archivos de la interfaz de la app conservan sus hashes originales.
- Evidencia resumida: **validation.json**. El reporte completo local está en **playwright-report**.
- Avance al entregar aquel bloque: **12 de 195 verificados; 183 pendientes; sin incidencias abiertas**.
- En aquella entrega quedó pendiente el bloque **02-language.spec.js**, implementado en la segunda tanda.

El primer intento tuvo un selector con capitalización incorrecta en TC-003.
Se corrigió el selector de la prueba; no se cambió la app ni se debilitó la verificación.
Después se ejecutó el bloque completo de nuevo con el resultado indicado arriba.

## Verificación conjunta de las tandas 01 y 02

- Fecha local de inicio: **16/10/2026, 00:08:55**, America/Buenos_Aires.
- Resultado conjunto: **26/26 aprobados** en **125.8 segundos**.
- Bloque 02: **14/14 aprobados**, con 12 pruebas de UI y 2 de integración de componentes.
- 0 fallidos, 0 omitidos, 0 inestables y 0 reintentos. Sin errores JavaScript.
- TC-024 también pasó ejecutado solo, preparando sus propios saldos y gastos.
- Los 24 archivos de la interfaz conservan sus hashes originales.
- Evidencias resumidas: validation-language.json y validation-all.json.
- **Avance actual: 26 de 195 verificados; 169 pendientes; sin incidencias abiertas.**
- Próximo bloque: **03-currencies.spec.js**, TC-027 a TC-036, todavía pendiente.

La primera ejecución del bloque 02 detectó dos errores de preparación: acceso
a localStorage desde about:blank en una pestaña nueva, y capitalización incorrecta
en un texto de la ayuda española. Se corrigieron en las pruebas, manteniendo
los asserts y la captura de errores. Después se ejecutaron ambos bloques completos.
No se modificó la aplicación para hacer pasar la suite.

TC-020 y TC-021 utilizan únicamente la API pública de idioma para actualizar
una ayuda o guía que permanece abierta. No se presentan como una interacción
de usuario con un selector tapado por un modal. Los datos de los demás casos
se preparan mediante la UI; la exportación pública del proyecto se usa sólo
para lectura y comparación de datos.
