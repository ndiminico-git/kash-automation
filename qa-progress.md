# KA$H · Seguimiento de automation

Versión de referencia: **0.677**. Catálogo: **195 casos**, con identificadores estables.
No renumerar los casos al agregar nuevos. Las pruebas nuevas reciben nuevos IDs.

**Restricción de dependencias indicada por el usuario:** en los `package.json` de KA$H, usar exactamente `"@playwright/test": "^1.45.0"`. No sustituir ese valor por la versión del runtime de herramientas. Los resultados históricos conservan la versión con la que realmente se ejecutaron y no se reinterpretan como pruebas con 1.45.0.

**Avance vigente: 73 implementados; 72 verificados sobre v0.677 con el parche TC-054, 1 con incidencia y 122 pendientes, de 195.** Los resultados de la app original y de las primeras tandas se conservan como evidencia histórica.

**Parche TC-054, 16/10/2026:** sobre v0.677 con `KASH_v0.677_PATCH_TC054.zip` aplicado, los 18 casos de Gastos pasan sin cambios en las pruebas. Al entregar ese parche, antes de la tanda 05, quedaban 53 verificados y una incidencia abierta (TC-035). El portable original y las evidencias anteriores conservan sus resultados. La verificación adicional de ocho escenarios de recordatorios no agrega IDs al catálogo. Ver `validation-tc054-fix.json`.

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


## Bloque 03: 03-currencies.spec.js

| ID | Caso | Estado |
|---|---|---|
| TC-027 | Ofrecer 20 códigos con nombre y bandera local cargada | Verificado |
| TC-028 | Ordenar códigos A–Z en Ajustes, Resumen y nuevas operaciones | Verificado |
| TC-029 | Agregar USD y habilitar sus campos sin crear movimientos | Verificado |
| TC-030 | Impedir duplicados y no alterar datos al agregar sin selección | Verificado |
| TC-031 | Permitir cinco monedas y bloquear la incorporación de una sexta | Verificado |
| TC-032 | Rechazar la desactivación de la última moneda | Verificado |
| TC-033 | Desactivar USD conservando gastos, saldo e histórico consultable | Verificado |
| TC-034 | Reactivar USD recuperando edición y saldo sin duplicar gastos | Verificado |
| TC-035 | Sustituir una moneda al límite de cinco sin convertir su histórico | Con incidencia · QA-CUR-001 |
| TC-036 | Conservar monedas activas e histórico después de recargar | Verificado |


## Bloque 04: 04-expenses.spec.js

| ID | Caso | Estado |
|---|---|---|
| TC-037 | Iniciar Gastos sin registros ni importes de ejemplo | Verificado |
| TC-038 | Agregar un gasto ARS pendiente y reflejarlo una sola vez en la planilla | Verificado |
| TC-039 | Registrar ARS, EUR y USD sin mezclar importes ni monedas | Verificado |
| TC-040 | Conservar acentos, símbolos y etiquetas como texto literal | Verificado |
| TC-041 | Permitir notas vacías y recortar espacios externos del concepto | Verificado |
| TC-042 | Rechazar concepto vacío o compuesto únicamente por espacios | Verificado |
| TC-043 | Rechazar un gasto sin monto y conservar el borrador | Verificado |
| TC-044 | Rechazar un gasto sin mes sin crear filas automáticas | Verificado |
| TC-045 | Rechazar monto cero sin generar movimientos | Verificado |
| TC-046 | Rechazar texto e importes no finitos | Verificado |
| TC-047 | Conservar un gasto negativo como devolución y su efecto en los saldos | Verificado |
| TC-048 | Conservar varios decimales en los datos y redondear sólo su visualización | Verificado |
| TC-049 | Marcar y desmarcar pagado actualizando el saldo calculado | Verificado |
| TC-050 | Editar concepto, monto y nota conservando el ID sin duplicar | Verificado |
| TC-051 | Cancelar una edición conserva el registro y su estado de pago | Verificado |
| TC-052 | Cambiar el mes mueve el gasto y actualiza ambas columnas sin duplicar | Verificado |
| TC-053 | Cancelar y confirmar el borrado conserva o elimina el gasto correctamente | Verificado |
| TC-054 | Recargar conserva gastos y proyecto sin insertar recordatorios predeterminados | Verificado con parche TC-054; falla en HTML original |

## Bloque 05: 05-expense-filters.spec.js

| ID | Caso | Estado |
|---|---|---|
| TC-055 | Iniciar filtros vacíos con cero resultados y sin crear datos | Verificado |
| TC-056 | Buscar coincidencias parciales sin distinguir mayúsculas ni buscar en notas | Verificado |
| TC-057 | Buscar con tildes, ñ y espacios externos manteniendo el texto original | Verificado |
| TC-058 | Tratar símbolos y etiquetas como búsqueda literal sin regex ni HTML | Verificado |
| TC-059 | Filtrar por mes y año sin mezclar períodos de distinto año | Verificado |
| TC-060 | Filtrar monedas A–Z y consultar USD inactivo conservando sus totales | Verificado |
| TC-061 | Combinar texto, período y moneda con intersección de resultados | Verificado |
| TC-062 | Mostrar cero y estado vacío sin borrar gastos cuando no hay coincidencias | Verificado |
| TC-063 | Limpiar búsqueda conserva los dropdowns y restablecerlos recupera todos los gastos | Verificado |
| TC-064 | Editar y borrar bajo filtros afecta sólo al gasto visible y actualiza los totales | Verificado |

## Bloque 06: 06-recurring-expenses.spec.js

| ID | Caso | Estado |
|---|---|---|
| TC-065 | Repetición desactivada crea sólo el gasto elegido sin series ni meses futuros | Verificado |
| TC-066 | Crear copias pendientes hasta diciembre aunque el gasto inicial esté pagado | Verificado |
| TC-067 | Iniciar en diciembre respeta el límite anual y separa series ARS y USD idénticas | Verificado |
| TC-068 | Editar sólo una repetición conserva la plantilla, los otros meses y todos los IDs | Verificado |
| TC-069 | Editar este y siguientes actualiza pendientes sin tocar anteriores, pagados ni excepciones | Verificado |
| TC-070 | Detener exige mes válido y confirmación; conserva histórico, pagos y excepciones | Verificado |
| TC-071 | Borrar un mes conserva la serie y no regenera esa repetición al volver a guardar | Verificado |
| TC-072 | Rechazar mover una repetición a un mes ocupado sin alterar datos ni IDs | Verificado |
| TC-073 | Recargar y reactivar conserva la serie original sin duplicar gastos ni perder pagos | Verificado |

## Próximos bloques

| Orden | Archivo previsto | Casos | Estado |
|---|---|---|---|
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
- **Avance al entregar la tanda 02: 26 de 195 verificados; 169 pendientes; sin incidencias abiertas entonces.**
- Al entregar la tanda 02 quedaba pendiente **03-currencies.spec.js**, implementada en la tanda siguiente.

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

## Verificación conjunta de las tandas 01, 02 y 03

- Fecha local de inicio: **16/10/2026, 02:13:02**, America/Buenos_Aires.
- Playwright real: **1.45.0**. Dependencia declarada: **^1.45.0**.
- Navegador: **Chromium 127.0.6533.17**, build 1124, headless.
- Resultado conjunto: **35 aprobados y 1 fallido**, de 36, en **262.8 segundos**.
- Tanda 03: **9 aprobados y 1 con incidencia de visibilidad**, TC-035. No se oculta ni se marca como fallo esperado.
- 0 omitidos, inestables, reintentos y errores JavaScript.
- TC-035 también reprodujo el fallo ejecutado solo con 1.45.0; el mismo caso pasó en un contraste separado en Edge con runtime 1.62.1.
- La causa exacta de la diferencia de renderizado queda pendiente. Detalles: **known-issues.md**, QA-CUR-001.
- Los 24 archivos de la interfaz conservan sus hashes originales. No se modificó la app ni datos personales.
- **Avance actual: 36 casos implementados; 35 verificados, 1 con incidencia y 159 pendientes de implementar, de 195.**
- Próxima tanda de implementación: **04-expenses.spec.js**, TC-037 a TC-054.

Antes de las pruebas funcionales, el Edge instalado no pudo iniciarse con el runner 1.45.0 en esta PC. Se instaló Chromium compatible en un entorno aislado y se agregó la opción documentada KASH_BROWSER_CHANNEL=bundled. Los registros históricos de las tandas previas se conservan con su runtime original; la nueva ejecución conjunta sí usa 1.45.0.

## Revisión 2 de TC-033: presupuesto y diagnóstico

- Reporte del usuario: TC-033 agotó 30 segundos; TC-035 pasó en su entorno. No atribuir este timeout a Chromium.
- Sólo TC-033 pasa a presupuesto total de 60 segundos y siete pasos con nombre. Se mantienen los asserts originales y su espera de 5 segundos; no se agregan reintentos ni pausas fijas.
- Verificación individual local: **16/10/2026, 02:27:32**, America/Buenos_Aires, Playwright **1.45.0**, Chromium 127.0.6533.17. **1/1 aprobado** en **18.7 segundos** de caso.
- No se reprodujo la causa exacta del timeout del usuario. Evidencia: validation-tc033-rev2.json.
- No se reejecutaron los otros 35 casos para esta revisión. Los resultados conjuntos previos son históricos; el avance del catálogo no cambia.
- 24 archivos de interfaz sin cambios; package.json conserva ^1.45.0. Para integrar, reemplazar sólo tests/03-currencies.spec.js.

## Revisión 3: presupuesto de preparación y esperas de monedas

- Reporte del usuario: TC-033 pasó con la revisión 2; después TC-030 agotó 30 s al preparar USD, antes de verificar duplicados.
- Se sustituye el beforeEach de la tanda 03 por una fixture automática con 60 s propios. Cada prueba conserva 30 s, incluido TC-033; expectativas y acciones del caso: 5 s.
- Se eliminan los expect.poll anidados en helpers/currencies.js para monedas y saldo inicial; se conserva la comprobación de persistencia. Se agregan pasos y diagnósticos.
- Ejecución de toda la tanda: **16/10/2026, 02:40:47**, America/Buenos_Aires, **Playwright 1.45.0**, Chromium 127.0.6533.17. **9 aprobados y 1 fallidos**, sin reintentos ni omitidos, en 258.5 s.
- TC-030 y TC-033 pasaron. TC-035 conserva la incidencia separada QA-CUR-001 de visibilidad.
- TC-030 también pasó **3/3** con interacciones ralentizadas **500 ms** por acción; son repeticiones independientes con contexto limpio, no retries.
- Evidencia: validation-currencies-rev3.json. No se reejecutaron las tandas 01 ni 02. 24 archivos de interfaz con hashes intactos.
- Reemplazar juntos tests/03-currencies.spec.js y helpers/currencies.js. package.json sigue exactamente en ^1.45.0.

## Verificación de la tanda 04 · Gastos

- Inicio local: **16/10/2026, 03:11:30**, America/Buenos_Aires. App v0.677. **Playwright 1.45.0** real y Chromium 127.0.6533.17. Dependencia declarada **^1.45.0**.
- **17 aprobados y 1 fallido de 18** en **116.2 s**. 0 reintentos, omitidos, inestables y errores JavaScript.
- TC-054 conserva el fallo real QA-EXP-001: al recargar aparecen tres recordatorios no ingresados. Los gastos existentes conservan IDs, importes, notas, pagos y totales. No confundir contador de próximos IDs con IDs de gastos.
- TC-052 pasó y TC-054 reprodujo el mismo fallo ejecutados aparte con **Edge** y las dependencias existentes **1.64.1**. No se cambió ese repositorio ni la dependencia requerida.
- La preparación limpia dispone de 60 s separados; cada caso de CRUD tiene un presupuesto común de 60 s. Acciones y expects: 5 s. No se precargan registros ni se omite la bienvenida mediante código interno.
- 24 archivos de interfaz con hashes intactos. Las suites y helpers de tandas anteriores no cambian. Evidencia: validation-expenses.json; known-issues.md; evidence/TC-054-default-reminders.*.
- No se reejecutaron todos los 54 casos; los resultados de tandas previas son históricos. Catálogo: **54 implementados, 52 verificados, 2 con incidencia y 141 pendientes**.
- Siguiente implementación: **05-expense-filters.spec.js**, TC-055–TC-064; no iniciada.

## Verificación de la tanda 05 · Búsqueda y filtros de Gastos

- Inicio local: **16/10/2026, 12:17:00**, America/Buenos_Aires. App **v0.677 con parche TC-054**, sin cambios adicionales en la app.
- **10/10 aprobados** en **94.8 s**, Playwright real **1.45.0**, Chromium **127.0.6533.17**, build 1124. 0 fallidos, omitidos, inestables, reintentos y errores JavaScript.
- **TC-064 también pasó por separado** en Edge, con las dependencias existentes del usuario **1.64.1**, en **13.1 s** de ejecución completa. El repositorio del usuario sólo se leyó para usar esas dependencias; no se modificó.
- Los datos de cada caso se crean por UI después de recorrer idioma y wizard. Se verifican filas visibles, conceptos, contador y totales independientes por moneda; los filtros de consulta conservan el proyecto completo. TC-064 comprueba edición y borrado sobre índices de filas filtradas y los totales en la planilla.
- Preparación: **60 s propios**. Caso: **60 s**. Acciones/expectativas: **5 s**. Sin pausas fijas, preinyección de gastos, skips, fallos esperados ni retries.
- Las suites 01–04, sus helpers y sus evidencias conservan sus bytes anteriores. Los 24 archivos de la app corregida también permanecen sin cambios. El paquete nuevo agrega `tests/05-expense-filters.spec.js` y `helpers/expense-filters.js`; los scripts npm son opcionales.
- Evidencia nueva: **validation-expense-filters.json**. La evidencia del parche TC-054 se incluye como **validation-tc054-fix.json**. No se reejecutaron los 64 casos juntos.
- Catálogo sobre la base con parche: **64 implementados, 63 verificados, 1 con incidencia (TC-035) y 131 pendientes**. El HTML original sigue afectado por TC-054.
- Próxima implementación: **06-recurring-expenses.spec.js**, TC-065–TC-073; pendiente.

## Verificación de la tanda 06 · Gastos recurrentes

- Inicio local: **16/10/2026, 12:37:00**, America/Buenos_Aires. App **v0.677 con parche TC-054**. No hay cambios nuevos en la app.
- **9/9 aprobados** en **134.5 s**, con Playwright real **1.45.0** y Chromium **127.0.6533.17**, build 1124. 0 fallos, omisiones, inestables, reintentos y errores JavaScript.
- **TC-070 y TC-073 pasaron también en ejecución separada** con Edge y las dependencias existentes **1.64.1**, en **31.0 s**. Se usaron esas dependencias sólo para lectura y ejecución aislada; no se modificó el repositorio del usuario.
- Cada caso arranca limpio y crea sus datos por UI. Se verifica el límite anual, copias pendientes, separación de monedas, alcance de edición, conservación de pagos/excepciones, cancelaciones, cutoff inválido, borrado de un solo mes, colisión de meses, reactivación y dos recargas sin duplicar IDs.
- Preparación **60 s propios**; caso **60 s**; acciones y expects **5 s**. No se llama al generador interno para crear datos ni obtener expectativas. Sin pausas fijas, skips, fallos esperados ni retries.
- Se agregan sólo `tests/06-recurring-expenses.spec.js`, `helpers/recurring-expenses.js` y la evidencia nueva. El package suma dos scripts opcionales; mantiene exactamente **^1.45.0**. Las suites/helpers/evidencias anteriores permanecen sin cambios.
- 24 archivos de la app corregida con hashes intactos. No se cambia el EXE ni el `app-server.js` configurado por el usuario. Integrar sólo los dos archivos nuevos.
- Evidencia: **validation-recurring-expenses.json**. No se reejecutaron juntos los 73 casos del catálogo; los resultados previos son históricos.
- Avance sobre la base con parche: **73 implementados, 72 verificados, 1 con incidencia (TC-035) y 122 pendientes**.
- Próxima implementación: **07-monthly-budget.spec.js**, TC-074–TC-088; pendiente.
