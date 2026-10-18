# KA$H · Seguimiento de automation

Versión de referencia: **0.677**. Catálogo: **195 casos**, con identificadores estables.
No renumerar los casos al agregar nuevos. Las pruebas nuevas reciben nuevos IDs.

**Restricción de dependencias indicada por el usuario:** en los `package.json` de KA$H, usar exactamente `"@playwright/test": "^1.45.0"`. No sustituir ese valor por la versión del runtime de herramientas. Los resultados históricos conservan la versión con la que realmente se ejecutaron y no se reinterpretan como pruebas con 1.45.0.

**Avance vigente: 156 implementados; 154 verificados sobre v0.677 con el parche TC-054, 2 con incidencia y 39 pendientes, de 195.** Los resultados de la app original y de las primeras tandas se conservan como evidencia histórica.

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

## Bloque 07: 07-monthly-budget.spec.js

| ID | Caso | Estado |
|---|---|---|
| TC-074 | Abrir planilla vacía con doce meses y totales cero sin movimientos inventados | Verificado |
| TC-075 | Crear rubros y servicios de ingreso y egreso separando importes ARS y USD | Verificado |
| TC-076 | Rechazar rubro vacío y duplicado sin impedir el mismo nombre en otra sección | Verificado |
| TC-077 | Rechazar servicio sin rubro o sin nombre sin crear filas ni celdas | Verificado |
| TC-078 | Cargar decimales con doble clic y reemplazarlos por teclado sin duplicar datos | Verificado |
| TC-079 | Escape descarta el borrador y salir del campo confirma una única modificación | Verificado |
| TC-080 | Confirmar y desmarcar pago cambia la tenencia calculada sin alterar el importe ni la proyección | Verificado |
| TC-081 | Poner cero o pulsar Delete limpia el importe y su pago conservando el servicio | Verificado |
| TC-082 | Conservar un egreso negativo como devolución y reflejar su signo en los totales | Verificado |
| TC-083 | Navegar con flechas respeta fila, mes y límites sin modificar movimientos | Verificado |
| TC-084 | Copiar y pegar una celda conserva importe y pago sin crear otro servicio | Verificado |
| TC-085 | Fila automática de Gastos conserva su nota y bloquea edición directa; el check paga todos sus ítems | Verificado |
| TC-086 | Detalle de pagos permite cancelar o guardar una selección parcial sin cambiar importes ni notas | Verificado |
| TC-087 | Renombrar el servicio trata símbolos como texto y conserva importes y pagos en todos los meses | Verificado |
| TC-088 | Navegar años y recargar conserva estructura, celdas e IDs sin repetir el wizard | Verificado |

## Bloque 08: 08-balances.spec.js

| ID | Caso | Estado |
|---|---|---|
| TC-089 | Distinguir cierre ausente de cero y no crear un cierre al abrir y salir sin editar | Verificado |
| TC-090 | Saldo inicial por moneda aparece en planilla y Resumen sin crear ingresos ni cierres | Verificado |
| TC-091 | Separar saldo calculado y proyección según ingresos cobrados y gastos pagados o pendientes | Verificado |
| TC-092 | Cierre manual no reemplaza el calculado del mismo mes y sí ancla el mes siguiente | Verificado |
| TC-093 | Cero confirmado en ARS es un cierre válido que reinicia el saldo del mes siguiente | Verificado |
| TC-094 | Ceros USD y EUR son independientes de ARS y borrar EUR elimina sólo su cierre | Verificado |
| TC-095 | Borrar un cierre ARS elimina su referencia y vuelve al saldo de movimientos | Verificado |
| TC-096 | Escape cancela cierres nuevos o existentes sin modificar el proyecto | Verificado |
| TC-097 | Reemplazar cierre con decimales o saldo negativo conserva una sola referencia | Verificado |
| TC-098 | El último cierre anterior manda y corregir uno más antiguo respeta el cierre posterior | Verificado |
| TC-099 | Cierre de diciembre continúa en enero del año siguiente sin reiniciar el saldo | Verificado |
| TC-100 | Tenencia calculada y remanente estimado son de sólo lectura en planilla y Resumen | Verificado |
| TC-101 | Desactivar USD conserva saldo inicial, cierre e histórico y bloquea editar su cierre | Verificado |
| TC-102 | Recargar conserva bases, cierre ARS cero, cierre USD y saldos por moneda sin duplicar datos | Verificado |

## Bloque 09: 09-balance-adjustments.spec.js

| ID | Caso | Estado |
|---|---|---|
| TC-103 | Abrir ajustes vacíos muestra formulario y tabla sin crear movimientos | Verificado |
| TC-104 | Ajuste a favor con decimales y nota literal aumenta ARS sin crear ingresos ni cierres | Verificado |
| TC-105 | Tipo del ajuste define el signo aun con monto negativo y separa monedas y meses | Verificado |
| TC-106 | Rechazar fecha o monto ausente, cero y texto no numérico sin guardar el borrador | Verificado |
| TC-107 | Editar fecha, moneda, signo y nota del registro correcto conserva ID y recalcula ambos meses | Verificado |
| TC-108 | Cancelar una edición descarta fecha, moneda, importe y nota sin cambiar IDs ni saldos | Verificado |
| TC-109 | Cancelar y confirmar borrado en tabla ordenada elimina sólo el ajuste elegido y revierte su efecto | Verificado |
| TC-110 | Recargar conserva ajustes e IDs y un cierre anterior evita volver a sumar ajustes ya conciliados | Verificado |

## Bloque 10: 10-currency-exchange.spec.js

| ID | Caso | Estado |
|---|---|---|
| TC-111 | Cambio vacío requiere dos monedas activas y habilitarlas no crea operaciones | Verificado |
| TC-112 | Vender USD por ARS multiplica la tasa y descuenta la comisión sólo de USD | Verificado |
| TC-113 | Comprar USD con ARS divide por la cotización y cobra la comisión en ARS | Verificado |
| TC-114 | Cambiar USD por EUR aplica tasa directa sin convertir ni alterar ARS | Verificado |
| TC-115 | Conservar precisión en monto y comisión y redondear sólo la presentación de tres cambios | Verificado |
| TC-116 | Rechazar monedas iguales, mes ausente y monto o tasa vacíos, cero, negativos o no numéricos | Verificado |
| TC-117 | Editar una fila ordenada cambia mes, monedas, tasa y comisión sin duplicar ni tocar otro cambio | Verificado |
| TC-118 | Cancelar la edición descarta todo el borrador y conserva cambios y saldos originales | Verificado |
| TC-119 | Cancelar y confirmar borrado bajo filtros afecta al índice original y revierte sólo ese cambio | Verificado |
| TC-120 | Combinar filtros de mes, monedas, nota, tasa y comisión y limpiarlos no modifica el proyecto | Verificado |
| TC-121 | Desactivar USD conserva sus cambios e histórico consultable y bloquea editarlos hasta reactivarlo | Verificado |
| TC-122 | Recargar conserva cambios, gastos y cierre por moneda y mantiene saldos sin contar dos veces el pasado | Verificado |

## Bloque 11: 11-summary.spec.js

| ID | Caso | Estado |
|---|---|---|
| TC-123 | Resumen vacío muestra una moneda en cero, estados vacíos y gráficos sin NaN ni datos inventados | Verificado |
| TC-124 | Navegar períodos respeta el inicio y cruza diciembre/enero mostrando los saldos del mes elegido | Verificado |
| TC-125 | Movimientos confirmados separan monedas y no confunden flujo neto con saldo o remanente estimado | Verificado |
| TC-126 | Ojitos abren desgloses con pagos y cambios correctos y cerrar o pulsar Escape no altera datos | Verificado |
| TC-127 | Detalle de tenencia concilia base, pagos, cambio, ajuste y cierre sin reemplazar el calculado | Verificado |
| TC-128 | Variación mensual muestra subida, bajada y cero con tooltip propio y base anterior correcta | Verificado |
| TC-129 | Base anterior cero no divide por cero y una base negativa usa porcentaje sobre su valor absoluto | Verificado |
| TC-130 | Moneda de gráficos cambia distribución, barras y tendencia sin convertir tarjetas ni alterar el cotizador | Verificado |
| TC-131 | Período de distribución es independiente del Resumen y actualizarlo no cambia tarjetas ni datos | Verificado |
| TC-132 | Ocultar y restaurar gráficos, cotizador y variación conserva tarjetas, saldos y movimientos | Verificado |
| TC-133 | Arrastre visible y teclado intercambian tarjetas; Escape y límites conservan el orden y los datos | Verificado |
| TC-134 | Cinco tarjetas conservan importes, orden personalizado y preferencias al recargar sin duplicar datos | Verificado |

## Bloque 12: 12-dates-notifications.spec.js

| ID | Caso | Estado |
|---|---|---|
| TC-135 | Proyecto vacío no inventa fechas ni avisos y la campana vacía se cierra con X y Escape | Verificado |
| TC-136 | Guardar cierre y vencimiento puntuales conserva mes, nombre literal y datos financieros | Verificado |
| TC-137 | Fecha obligatoria y días 0 o 32 se rechazan sin guardar parcialmente la configuración | Verificado |
| TC-138 | Repetir el día 31 usa fin de mes en febrero, año bisiesto y abril sin perder la regla original | Verificado |
| TC-139 | Cierre del mes anterior y vencimiento del siguiente cruzan diciembre sin mover la columna financiera | Verificado |
| TC-140 | Buscar sin acentos y alternar tags carga el servicio correcto y conserva borradores sin guardar por un clic | Verificado |
| TC-141 | Avisos respetan anticipación, límite de siete días vencidos y no se duplican al consultar | Verificado |
| TC-142 | Filtros leído y sin leer, leer todos y borrar conservan avisos sin recrear el eliminado | Verificado |
| TC-143 | Leer no paga y Ver en planilla abre la columna asociada aunque el vencimiento sea de otro mes | Verificado |
| TC-144 | Modificar o desactivar una fecha cancela el aviso anterior y reactivarla conserva su identidad y lectura | Verificado |
| TC-145 | Popover de fechas admite hover, foco y fijación por clic con diseño propio y cierre sin escrituras | Verificado |
| TC-146 | Recargar conserva fechas ARS y USD, avisos y pagos; cambiar idioma no traduce nombres del usuario | Verificado |

## Bloque 13: 13-installments-notes.spec.js

| ID | Caso | Estado |
|---|---|---|
| TC-147 | Inicio vacío muestra formularios sin cuotas ni notas y no permite retroceder antes del proyecto | Verificado |
| TC-148 | Agregar compra con caracteres especiales muestra seis avances sin crear gastos ni pagos | Verificado |
| TC-149 | Nombre vacío, cantidad vacía o no positiva y mes ausente se rechazan sin insertar planes | Verificado |
| TC-150 | Cuota única, redondeo de cantidad y planes futuros respetan fin de plan y diciembre a enero | Verificado |
| TC-151 | Editar por botón y doble clic reemplaza sólo el plan elegido y Cancelar o Escape descarta borradores | Verificado |
| TC-152 | Borrar una cuota exige confirmación y renumera acciones sin editar o eliminar el plan vecino | Verificado |
| TC-153 | Flechas, Enter, F2 y Escape operan sólo sobre filas visibles aunque sus índices no sean consecutivos | Verificado |
| TC-154 | Notas por botón y Enter conservan texto literal; vacío se rechaza y borrar respeta la nota vecina | Verificado |
| TC-155 | Editar nota vacía conserva el texto y permite continuar con Enter sin reabrir validaciones anteriores | Con incidencia QA-NOTE-001 |
| TC-156 | Ocultar y restaurar sección, cambiar idioma y recargar conserva cuotas, notas, gastos y saldos | Verificado |

## Próximos bloques

| Orden | Archivo previsto | Casos | Estado |
|---|---|---|---|
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

## Verificación de la tanda 07 · Consumos Mensuales

- Inicio local: **16/10/2026, 15:44:19**, America/Buenos_Aires. App **v0.677 con parche TC-054**, sin modificaciones adicionales.
- **15/15 aprobados** en **158.6 s** con Playwright real **1.45.0** y Chromium **127.0.6533.17**, build 1124. Cero fallos, omitidos, inestables, reintentos y errores JavaScript.
- **TC-084, TC-086 y TC-088 también pasaron en ejecución separada** con Edge y las dependencias existentes **1.64.1**, en **43.5 s**. El repositorio del usuario se usó sólo para lectura de esas dependencias; no se modificó.
- Cubre planilla vacía, rubros/servicios, entradas inválidas, decimales, confirmar/cancelar/blur, pagos, cero/Delete, devolución negativa, flechas y límites, copiar/pegar, filas automáticas, detalle de pagos parciales, renombrado y recarga/navegación anual.
- Los datos se crean por UI después del wizard. Las expectativas de importes y totales son explícitas. El clipboard se prepara con Ctrl+C real y permiso de navegador aislado; no se escribe el estado interno de la app. Se compara la persistencia y se preservan los IDs existentes.
- Fixture **60 s propios**, caso **60 s**, acciones/expectativas **5 s**. Sin pausas fijas, force, skips, fallos esperados ni retries.
- Se agregan `tests/07-monthly-budget.spec.js`, `helpers/monthly-budget.js` y `validation-monthly-budget.json`. Dos scripts npm opcionales; dependencia exacta declarada **^1.45.0**, sin lockfile nuevo.
- Los 24 assets de la app con parche y los specs/helpers/evidencias de las primeras seis tandas conservan sus bytes. Integrar sólo los dos archivos nuevos y conservar la ruta ya configurada en `app-server.js`.
- No se reejecutaron juntos los 88 casos: los resultados previos son históricos. Incidencia TC-035 independiente conservada.
- Avance sobre la base con parche: **88 implementados, 87 verificados, 1 con incidencia y 107 pendientes**, de 195.
- Próxima implementación: **08-balances.spec.js**, TC-089–TC-102; pendiente.

## Verificación de la tanda 08 · Saldos y remanentes

- Inicio local: **16/10/2026, 16:05:57**, America/Buenos_Aires. App **v0.677 con parche TC-054**, sin cambios adicionales.
- **14/14 aprobados** en **168.5 s** con Playwright real **1.45.0** y Chromium **127.0.6533.17**, build 1124. Cero fallos, omitidos, inestables, reintentos y errores JavaScript.
- **TC-093, TC-098 y TC-102 también pasaron por separado** con Edge y las dependencias existentes **1.64.1**, en **42.1 s**. El repositorio del usuario se usó sólo para lectura de esas dependencias.
- Cubre bases en tres monedas, calculado/proyectado según pagos/cobros, cierre manual separado del cálculo actual, cero confirmado ARS/USD/EUR, eliminar cierre, Escape/blur/Enter, decimales/negativos, ancla más reciente, diciembre/enero, valores calculados de sólo lectura, USD inactivo y recarga conservando IDs.
- Los datos se crean por UI después del wizard. Expectativas con meses/importes explícitos; ninguna llamada al cálculo interno para obtener lo esperado. Los cierres no crean ingresos o gastos. Se compara persistencia y se verifica que no cambien las transacciones al modificar el cierre.
- Fixture **60 s propios**, caso **60 s**, acciones/expectativas **5 s**. Sin pausas fijas, force, skips, fallos esperados ni retries.
- Agrega `tests/08-balances.spec.js`, `helpers/balances.js` y `validation-balances.json`. Dos scripts npm opcionales, misma dependencia declarada **^1.45.0**, sin lockfile nuevo.
- Los 24 assets de la app corregida y los specs/helpers/evidencias de las primeras siete tandas permanecen sin cambios. Integrar sólo los dos archivos nuevos; conservar la ruta de `app-server.js` ya configurada.
- No se reejecutaron juntos los 102 casos; las evidencias anteriores son históricas. La incidencia independiente TC-035 sigue documentada.
- Catálogo: **102 implementados, 101 verificados sobre la base con parche, 1 con incidencia y 93 pendientes**, de 195.
- Próxima implementación: **09-balance-adjustments.spec.js**, TC-103–TC-110; pendiente.

## Revisión 2 · Timeout TC-090

- Se examinó el reporte y trace del usuario, sólo para lectura. Runtime reportado: 1.64.1. Habilitar USD/EUR consumió 34,2 s del caso; el timeout ocurrió durante la comprobación EUR, sin un error de comparación de saldo registrado.
- Se modifica únicamente el spec 08: fixture UI de monedas exclusiva de TC-090, 60 s propios; entradas y verificaciones agrupadas por sección. El caso sigue en 60 s, acciones/expectativas en 5 s. Todos los controles financieros originales se conservan y los otros trece cuerpos de casos permanecen intactos.
- Nueva ejecución: **14/14 aprobados en 232.9 s**, Playwright real 1.45.0 y Chromium 127.0.6533.17. TC-090 independiente con slowMo 500 ms: **1/1 aprobado en 36.8 s**. Sin retries, skips, fallos esperados o errores JavaScript.
- Evidencia nueva: `validation-balances-rev2.json`, `diagnosis-tc090-user.json`. No se sobrescriben las evidencias históricas. Los 24 assets de app, todos los helpers y package mantienen sus bytes anteriores; dependencia declarada ^1.45.0.
- Integración sobre tanda 08: **reemplazar sólo tests/08-balances.spec.js**. No se toca el proyecto del usuario, su app-server ni la app. El catálogo sigue en 102 implementados / 101 verificados sobre la base con parche / 1 incidencia TC-035 / 93 pendientes; no se reejecutaron los 102 juntos. Tanda 09 pendiente.

## Verificación de la tanda 09 · Ajustes de saldo

- Inicio UTC: **2026-10-16T19:52:48.294Z**. App **v0.677 con parche TC-054**, sin modificaciones adicionales.
- **8/8 aprobados en 118.2 s**, Playwright real **1.45.0**, Chromium **127.0.6533.17**, build 1124. Cero fallos, omitidos, inestables, reintentos y errores JavaScript.
- TC-107 y TC-110 también pasaron por separado con Edge y las dependencias existentes **1.64.1**, en **31.8 s**. El repositorio del usuario sólo se leyó para usar esas dependencias; no se modificó.
- Cada caso arranca vacío por idioma/wizard y crea sus datos por UI. La fixture de proyecto limpio tiene 60 s propios. Habilitar USD es otra fixture opcional, también de 60 s propios; únicamente la solicitan los casos que la necesitan. Cuerpo del caso: 60 s; acciones y expectativas: 5 s. Sin sleeps, force, skips, fallos esperados ni retries.
- Se verifican filas visibles, IDs, importes explícitos en Planilla/Resumen, persistencia y conservación de los campos ajenos a los ajustes. Cambiar el signo del texto no duplica el signo: manda el selector Increase/Decrease. Cancelar o rechazar un ajuste conserva el proyecto completo.
- TC-107 y TC-109 preparan fechas cuyo orden visual difiere del array de registros. TC-110 combina ajuste anterior al cierre, ajuste posterior, gasto pendiente USD, recarga y continuidad mensual (incluido diciembre/enero si corresponde).
- Recargar admite que el contador interno del próximo ID se normalice; se exige conservar todos los IDs existentes y el resto del proyecto financiero, tanto en memoria como persistido.
- Agrega sólo `tests/09-balance-adjustments.spec.js`, `helpers/balance-adjustments.js` y `validation-balance-adjustments.json`. Dos scripts npm opcionales; dependencia declarada exacta **^1.45.0**. No se entrega lockfile.
- Los 24 assets de la app corregida y todos los specs/helpers/evidencias de las primeras ocho tandas conservan sus bytes, incluida la corrección TC-090 REV2. Conservar el `app-server.js` configurado por el usuario. No se cambia la app ni el EXE.
- Catálogo: **110 implementados, 109 verificados sobre la base con parche, 1 incidencia independiente TC-035 y 85 pendientes**, de 195. No se reejecutaron los 110 juntos; las evidencias anteriores son históricas.
- Próxima implementación: **10-currency-exchange.spec.js**, TC-111–TC-122; pendiente.

## Verificación del módulo 10 · Cambio de divisas

- Inicio UTC: **2026-10-16T20:15:33.653Z**. App **v0.677 con parche TC-054**, sin modificaciones adicionales.
- **12/12 aprobados en 233.6 s**, Playwright real **1.45.0**, Chromium **127.0.6533.17**, build 1124. Cero fallos, omitidos, inestables, reintentos y errores JavaScript.
- TC-117, TC-119 y TC-122 pasaron también por separado con Edge y las dependencias existentes **1.64.1**, en **74.0 s**. El repositorio del usuario sólo se leyó para usar esas dependencias; no se modificó.
- Proyecto vacío desde idioma/wizard, sin servicios online. Fixture limpia 60 s propios; USD y EUR son fixtures opcionales independientes de 60 s cada una. Caso 60 s; acciones y expectativas 5 s. Las bases y operaciones se cargan por UI.
- Cubre tasa directa/inversa, comisión de origen, notas literales, redondeo sólo visual, validaciones, edición, cancelación, borrado filtrado, seis filtros combinados, histórico inactivo y recarga con gastos/cierre. Los importes esperados son explícitos.
- Los cambios de esta versión no tienen ID. Se verifica el contenido y orden del array original y se usa `data-fx-index` para editar/borrar; los IDs de gastos ya existentes permanecen iguales tras recargar. Se admite sólo normalizar el contador `nid`, no cambiar registros financieros.
- Agrega `tests/10-currency-exchange.spec.js`, `helpers/currency-exchange.js` y `validation-currency-exchange.json`. Dos scripts npm opcionales; misma dependencia exacta declarada **^1.45.0**, sin lockfile nuevo.
- Los 24 assets de la app con parche y todos los specs/helpers/evidencias de las primeras nueve tandas conservan sus bytes, incluida TC-090 REV2. Conservar el `app-server.js` ya configurado, la app y el EXE.
- Catálogo: **122 implementados, 121 verificados sobre la base con parche, 1 incidencia TC-035 y 73 pendientes**, de 195. No se reejecutaron los 122 juntos; las evidencias anteriores son históricas.
- Próxima implementación: **11-summary.spec.js**, TC-123–TC-134; pendiente.

## Verificación de la tanda 11 · Resumen

- Inicio UTC: **2026-10-17T00:14:57.832Z**. App **v0.677 con parche TC-054**, sin cambios adicionales.
- **12/12 aprobados en 226.2 s**, Playwright real **1.45.0** y Chromium **127.0.6533.17**, build 1124. Cero fallos, omisiones, inestables, reintentos y errores JavaScript.
- TC-133 pasó además en ejecución independiente de **13.7 s**, reforzado con viewport y opacidad positiva de la tarjeta fantasma. Sólo se añadieron esos controles en la función que usa TC-133; el spec y las demás funciones/casos conservaron sus bytes.
- TC-126, TC-130, TC-133 y TC-134 pasaron además por separado con Edge y dependencias existentes **1.64.1**, en **71.4 s**. El repositorio del usuario sólo se leyó para ejecutar esas dependencias.
- Cada caso crea el proyecto vacío desde idioma/wizard y activa Gráficos desde Ajustes. Las fixtures opcionales habilitan USD/EUR, cuatro/cinco tarjetas o una mezcla de transacciones creadas por UI. Cada fixture tiene 60 s propios; cuerpo 60 s; acciones/expectativas 5 s. Sin sleeps, force, retries, skips ni fallos esperados.
- Cubre estados vacíos, diciembre/enero, movimientos confirmados por moneda, detalles de flujo/tenencia, reconciliación, variaciones con base cero/negativa, gráficos y sus selectores independientes, preferencias, arrastre visible/teclado/Escape y cinco tarjetas después de recargar.
- Las expectativas monetarias son explícitas. La API pública y localStorage se leen para comparar; no se inyectan registros ni se invocan cálculos internos. La navegación y los detalles comparan el proyecto completo; cambiar preferencias u orden sólo permite modificar esos metadatos. Recargar admite normalizar nid, conservando todos los IDs existentes y los demás datos.
- Gráficos usan valores y tooltips SVG visibles; se revisan atributos finitos, sin comparación de píxeles. Los estados de cuatro/cinco tarjetas se comprueban durante su preparación UI. No se presenta esto como una revisión visual exhaustiva en todos los tamaños de ventana.
- Agrega `tests/11-summary.spec.js`, `helpers/summary.js` y `validation-summary.json`. Dos scripts npm opcionales; dependencia exacta declarada **^1.45.0**, sin lockfile nuevo. Los 24 assets de app y todos los specs/helpers/evidencias anteriores mantienen sus bytes.
- Integrar sólo los dos archivos nuevos; conservar `app-server.js`, su ruta App, configuración, package y lockfile. La app y el EXE quedan sin cambios.
- Catálogo: **134 implementados, 133 verificados sobre base con parche, 1 incidencia TC-035 y 61 pendientes**, de 195. No se reejecutaron los 134 juntos; las evidencias anteriores son históricas.
- Próxima implementación: **12-dates-notifications.spec.js**, TC-135–TC-146; pendiente.


## Verificación del bloque 12 · Cierres, vencimientos y avisos

- **12/12 aprobados en 173.5 s**, Playwright **1.45.0**, Chromium **127.0.6533.17**, un worker, sin reintentos, omisiones, fallos ni errores JavaScript.
- Contraste independiente: **TC-138, TC-142 y TC-146**, **3/3 con Edge**, runtime existente **1.64.1**, en **56.4 s**. No se reemplaza la dependencia declarada `^1.45.0`.
- Inicio limpio por caso y datos creados sólo por UI. La fecha se fija con `page.clock.setFixedTime` y zona Buenos Aires; los timers siguen corriendo. Los avisos se habilitan por UI porque el wizard los trae apagados. Preparación común y fixtures opcionales de servicios/monedas: 60 s propios cada una; cuerpo 60 s, acciones/expectativas 5 s.
- Fechas puntuales; validaciones sin guardado parcial; día 31 en febrero común/bisiesto y abril; offsets anterior/siguiente cruzando año; búsqueda sin acentos, tags y borradores; ventana de anticipación y -7/-8 días; no duplicación; filtros/lectura/borrado; lectura independiente del pago y columna distinta de fecha; cancelación/reactivación; hover/foco/clic; ARS/USD y ES/EN tras recargar.
- El valor de fecha se compara con expectativas explícitas. Se conserva el resto del proyecto al modificar sólo metadatos. Se permite normalizar sólo nid al recargar. No se llama a handlers ni calculadores internos para escribir/validar.
- **Corrección de ruta de QA:** el helper distribuido ahora usa `path.join(__dirname, '../App')`. Así evita repetir el error de la tanda 11, que buscaba una carpeta portable externa. No cambia la app ni los tests anteriores. Conserva `KASH_APP_DIR` para otras estructuras.
- Evidencia: `validation-dates-notifications.json`. Los 24 assets de app conservan sus hashes; los 11 specs anteriores, sus helpers de dominio y evidencias mantienen sus bytes. No se modificó el repositorio del usuario.
- Catálogo: **146 implementados, 145 verificados sobre base con parche, 1 incidencia TC-035 y 49 pendientes**. Los resultados previos son históricos; no se reejecutaron los 146 juntos.
- Próximo: **13-installments-notes.spec.js**, TC-147–TC-156; todavía pendiente.


## Verificación del bloque 13 · Cuotas y notas

- **9 aprobados y 1 con incidencia activa**, en **123.0 s**, Playwright **1.45.0**, Chromium **127.0.6533.17**, un worker. Sin reintentos, omisiones ni errores JavaScript.
- Contraste independiente TC-150, TC-155 y TC-156: **2 aprobados y 1 con la misma incidencia**, en **60.4 s**, Edge/runtime existente **1.64.1**. No se cambia `^1.45.0`.
- Contexto limpio por caso, wizard real, inglés y guías automáticas desactivadas por F1. Fecha fija 15/10/2026, zona Buenos Aires; timers de UI activos. Cada fixture limpia/dos planes/dos notas/datos financieros tiene 60 s propios; cuerpo 60 s; acciones/expectativas 5 s.
- Seis avances explícitos; una cuota; cantidad 2,5 normalizada a 3 por el comportamiento actual; futura/terminada no visible pero conservada; diciembre/enero; edición/cancelación; eliminación y posiciones reasignadas; flechas/Enter/F2/Escape con índices visibles no consecutivos; notas literales por botón/Enter, vacío, edición y borrado; ocultar/restaurar, ES y recarga con gastos pagados/pendientes.
- Selectores ES/EN reales: `data-cuota-index` / `data-installment-index`. Sin alterar DOM ni llamar a handlers internos para preparar datos.
- Al recargar en español sólo se admite normalizar nid y el texto resumen automático de la celda de gastos identificada explícitamente (punto/coma). Las notas manuales y todos los demás campos/IDs/importes/pagos deben permanecer exactos. Saldo calculado ARS 949,75 y estimado ARS 929,25 antes/después, a partir de base 1.000, pago 50,25 y pendiente 20,50.
- Evidencia: `validation-installments-notes.json`. App y EXE sin cambios, 24 assets con hashes intactos. Los 12 specs/helpers de dominio/evidencias anteriores, app-server y config conservan sus bytes.
- Integrar sólo `tests/13-installments-notes.spec.js` y `helpers/installments-notes.js`. Próximo bloque 14, TC-157–TC-166, pendiente. No se reejecutó el catálogo completo.

**TC-155 detecta QA-NOTE-001 y seguirá fallando hasta corregir la app; no es un timeout del runner. Ver known-issues.md.**
