# Seguimiento — KA$H v0.690

213 casos en 19 módulos. Los nueve casos que reproducían los bugs pasaron en una ejecución específica con Playwright 1.45.0 y Chromium 127, cero reintentos. La corrida general no tiene un informe final y queda pendiente de tu ejecución. Los casos sin resultado final se marcan pendientes; no se presentan como fallidos.

| ID | Spec | Estado de entrega | Caso |
|---|---|---|---|
| TC-001 | 01-onboarding.spec.js | Pendiente de corrida general | [P] Mostrar el selector de idioma en una instalación limpia |
| TC-002 | 01-onboarding.spec.js | Pendiente de corrida general | [P] Elegir inglés y continuar |
| TC-003 | 01-onboarding.spec.js | Pendiente de corrida general | [P] Elegir español y continuar |
| TC-004 | 01-onboarding.spec.js | Pendiente de corrida general | [P] Crear un proyecto vacío |
| TC-005 | 01-onboarding.spec.js | Pendiente de corrida general | [P] Completar todos los pasos de bienvenida |
| TC-006 | 01-onboarding.spec.js | Pendiente de corrida general | [P] Omitir la bienvenida y acceder a la aplicación |
| TC-007 | 01-onboarding.spec.js | Pendiente de corrida general | [N] Impedir continuar con un nombre de proyecto vacío |
| TC-008 | 01-onboarding.spec.js | Pendiente de corrida general | [B] Conservar caracteres especiales en el nombre del proyecto |
| TC-009 | 01-onboarding.spec.js | Pendiente de corrida general | [P] Seleccionar varias monedas durante la bienvenida |
| TC-010 | 01-onboarding.spec.js | Pendiente de corrida general | [B] Permitir cinco monedas e impedir agregar una sexta |
| TC-011 | 01-onboarding.spec.js | Pendiente de corrida general | [R] Omitir la bienvenida sin cargar movimientos de ejemplo |
| TC-012 | 01-onboarding.spec.js | Pendiente de corrida general | [R] Mantener el estimador fuera de la bienvenida y desactivado |
| TC-013 | 02-language.spec.js | Pendiente de corrida general | [P] Cambiar de inglés a español desde Ajustes |
| TC-014 | 02-language.spec.js | Pendiente de corrida general | [P] Cambiar de español a inglés desde Ajustes |
| TC-015 | 02-language.spec.js | Pendiente de corrida general | [R] Conservar el idioma elegido después de recargar |
| TC-016 | 02-language.spec.js | Pendiente de corrida general | [R] No repetir la selección inicial al abrir otra pestaña de la misma sesión |
| TC-017 | 02-language.spec.js | Pendiente de corrida general | [R] Traducir los nombres de las secciones de navegación |
| TC-018 | 02-language.spec.js | Pendiente de corrida general | [R] Actualizar meses y nombres de monedas |
| TC-019 | 02-language.spec.js | Pendiente de corrida general | [R] Traducir mensajes de validación y confirmaciones |
| TC-020 | 02-language.spec.js | Pendiente de corrida general | [R] Integración: actualizar la ayuda F1 mientras sigue abierta |
| TC-021 | 02-language.spec.js | Pendiente de corrida general | [R] Integración: actualizar una guía activa sin reiniciarla |
| TC-022 | 02-language.spec.js | Pendiente de corrida general | [B] Alternar repetidamente entre ambos idiomas |
| TC-023 | 02-language.spec.js | Pendiente de corrida general | [R] Conservar nombres, notas y comentarios del usuario |
| TC-024 | 02-language.spec.js | Pendiente de corrida general | [R] Mantener importes y saldos al cambiar de idioma |
| TC-025 | 02-language.spec.js | Pendiente de corrida general | [R] No generar cambios pendientes por cambiar sólo el idioma |
| TC-026 | 02-language.spec.js | Pendiente de corrida general | [B] Conservar un formulario parcial al cambiar el idioma desde Ajustes |
| TC-027 | 03-currencies.spec.js | Pendiente de corrida general | [P] Ofrecer 20 códigos con nombre y bandera local cargada |
| TC-028 | 03-currencies.spec.js | Pendiente de corrida general | [R] Ordenar códigos A–Z en Ajustes, Resumen y nuevas operaciones |
| TC-029 | 03-currencies.spec.js | Pendiente de corrida general | [P] Agregar USD y habilitar sus campos sin crear movimientos |
| TC-030 | 03-currencies.spec.js | Pendiente de corrida general | [N] Impedir duplicados y no alterar datos al agregar sin selección |
| TC-031 | 03-currencies.spec.js | Pendiente de corrida general | [B] Permitir cinco monedas y bloquear la incorporación de una sexta |
| TC-032 | 03-currencies.spec.js | Pendiente de corrida general | [B] Rechazar la desactivación de la última moneda |
| TC-033 | 03-currencies.spec.js | Pendiente de corrida general | [R] Desactivar USD conservando gastos, saldo e histórico consultable |
| TC-034 | 03-currencies.spec.js | Pendiente de corrida general | [R] Reactivar USD recuperando edición y saldo sin duplicar gastos |
| TC-035 | 03-currencies.spec.js | Pasó en regresión de bugs | [B] Sustituir una moneda al límite de cinco sin convertir su histórico |
| TC-036 | 03-currencies.spec.js | Pendiente de corrida general | [R] Conservar monedas activas e histórico después de recargar |
| TC-037 | 04-expenses.spec.js | Pendiente de corrida general | [P] Iniciar Gastos sin registros ni importes de ejemplo |
| TC-038 | 04-expenses.spec.js | Pendiente de corrida general | [P] Agregar un gasto ARS pendiente y reflejarlo una sola vez en la planilla |
| TC-039 | 04-expenses.spec.js | Pendiente de corrida general | [R] Registrar ARS, EUR y USD sin mezclar importes ni monedas |
| TC-040 | 04-expenses.spec.js | Pendiente de corrida general | [B] Conservar acentos, símbolos y etiquetas como texto literal |
| TC-041 | 04-expenses.spec.js | Pendiente de corrida general | [P] Permitir notas vacías y recortar espacios externos del concepto |
| TC-042 | 04-expenses.spec.js | Pendiente de corrida general | [N] Rechazar concepto vacío o compuesto únicamente por espacios |
| TC-043 | 04-expenses.spec.js | Pendiente de corrida general | [N] Rechazar un gasto sin monto y conservar el borrador |
| TC-044 | 04-expenses.spec.js | Pendiente de corrida general | [N] Rechazar un gasto sin mes sin crear filas automáticas |
| TC-045 | 04-expenses.spec.js | Pendiente de corrida general | [N] Rechazar monto cero sin generar movimientos |
| TC-046 | 04-expenses.spec.js | Pendiente de corrida general | [N] Rechazar texto e importes no finitos |
| TC-047 | 04-expenses.spec.js | Pendiente de corrida general | [B] Conservar un gasto negativo como devolución y su efecto en los saldos |
| TC-048 | 04-expenses.spec.js | Pendiente de corrida general | [B] Conservar varios decimales en los datos y redondear sólo su visualización |
| TC-049 | 04-expenses.spec.js | Pendiente de corrida general | [R] Marcar y desmarcar pagado actualizando el saldo calculado |
| TC-050 | 04-expenses.spec.js | Pendiente de corrida general | [R] Editar concepto, monto y nota conservando el ID sin duplicar |
| TC-051 | 04-expenses.spec.js | Pendiente de corrida general | [R] Cancelar una edición conserva el registro y su estado de pago |
| TC-052 | 04-expenses.spec.js | Pendiente de corrida general | [R] Cambiar el mes mueve el gasto y actualiza ambas columnas sin duplicar |
| TC-053 | 04-expenses.spec.js | Pendiente de corrida general | [R] Cancelar y confirmar el borrado conserva o elimina el gasto correctamente |
| TC-054 | 04-expenses.spec.js | Pasó en regresión de bugs | [R] Recargar conserva gastos y proyecto sin insertar recordatorios predeterminados |
| TC-055 | 05-expense-filters.spec.js | Pendiente de corrida general | [P] Iniciar filtros vacíos con cero resultados y sin crear datos |
| TC-056 | 05-expense-filters.spec.js | Pendiente de corrida general | [P] Buscar coincidencias parciales sin distinguir mayúsculas ni buscar en notas |
| TC-057 | 05-expense-filters.spec.js | Pendiente de corrida general | [B] Buscar con tildes, ñ y espacios externos manteniendo el texto original |
| TC-058 | 05-expense-filters.spec.js | Pendiente de corrida general | [B] Tratar símbolos y etiquetas como búsqueda literal sin regex ni HTML |
| TC-059 | 05-expense-filters.spec.js | Pendiente de corrida general | [P] Filtrar por mes y año sin mezclar períodos de distinto año |
| TC-060 | 05-expense-filters.spec.js | Pendiente de corrida general | [R] Filtrar monedas A–Z y consultar USD inactivo conservando sus totales |
| TC-061 | 05-expense-filters.spec.js | Pendiente de corrida general | [P] Combinar texto, período y moneda con intersección de resultados |
| TC-062 | 05-expense-filters.spec.js | Pendiente de corrida general | [N] Mostrar cero y estado vacío sin borrar gastos cuando no hay coincidencias |
| TC-063 | 05-expense-filters.spec.js | Pendiente de corrida general | [R] Limpiar búsqueda conserva los dropdowns y restablecerlos recupera todos los gastos |
| TC-064 | 05-expense-filters.spec.js | Pendiente de corrida general | [R] Editar y borrar bajo filtros afecta sólo al gasto visible y actualiza los totales |
| TC-065 | 06-recurring-expenses.spec.js | Pendiente de corrida general | [P] Repetición desactivada crea sólo el gasto elegido sin series ni meses futuros |
| TC-066 | 06-recurring-expenses.spec.js | Pendiente de corrida general | [P] Crear copias pendientes hasta diciembre aunque el gasto inicial esté pagado |
| TC-067 | 06-recurring-expenses.spec.js | Pendiente de corrida general | [B] Iniciar en diciembre respeta el límite anual y separa series ARS y USD idénticas |
| TC-068 | 06-recurring-expenses.spec.js | Pendiente de corrida general | [P] Editar sólo una repetición conserva la plantilla, los otros meses y todos los IDs |
| TC-069 | 06-recurring-expenses.spec.js | Pendiente de corrida general | [R] Editar este y siguientes actualiza pendientes sin tocar anteriores, pagados ni excepciones |
| TC-070 | 06-recurring-expenses.spec.js | Pendiente de corrida general | [R] Detener exige mes válido y confirmación; conserva histórico, pagos y excepciones |
| TC-071 | 06-recurring-expenses.spec.js | Pendiente de corrida general | [R] Borrar un mes conserva la serie y no regenera esa repetición al volver a guardar |
| TC-072 | 06-recurring-expenses.spec.js | Pendiente de corrida general | [N] Rechazar mover una repetición a un mes ocupado sin alterar datos ni IDs |
| TC-073 | 06-recurring-expenses.spec.js | Pendiente de corrida general | [R] Recargar y reactivar conserva la serie original sin duplicar gastos ni perder pagos |
| TC-074 | 07-monthly-budget.spec.js | Pendiente de corrida general | [P] Abrir planilla vacía con doce meses y totales cero sin movimientos inventados |
| TC-075 | 07-monthly-budget.spec.js | Pendiente de corrida general | [P] Crear rubros y servicios de ingreso y egreso separando importes ARS y USD |
| TC-076 | 07-monthly-budget.spec.js | Pendiente de corrida general | [N] Rechazar rubro vacío y duplicado sin impedir el mismo nombre en otra sección |
| TC-077 | 07-monthly-budget.spec.js | Pendiente de corrida general | [N] Rechazar servicio sin rubro o sin nombre sin crear filas ni celdas |
| TC-078 | 07-monthly-budget.spec.js | Pendiente de corrida general | [P] Cargar decimales con doble clic y reemplazarlos por teclado sin duplicar datos |
| TC-079 | 07-monthly-budget.spec.js | Pendiente de corrida general | [R] Escape descarta el borrador y salir del campo confirma una única modificación |
| TC-080 | 07-monthly-budget.spec.js | Pendiente de corrida general | [R] Confirmar y desmarcar pago cambia la tenencia calculada sin alterar el importe ni la proyección |
| TC-081 | 07-monthly-budget.spec.js | Pendiente de corrida general | [B] Poner cero o pulsar Delete limpia el importe y su pago conservando el servicio |
| TC-082 | 07-monthly-budget.spec.js | Pendiente de corrida general | [B] Conservar un egreso negativo como devolución y reflejar su signo en los totales |
| TC-083 | 07-monthly-budget.spec.js | Pendiente de corrida general | [R] Navegar con flechas respeta fila, mes y límites sin modificar movimientos |
| TC-084 | 07-monthly-budget.spec.js | Pendiente de corrida general | [R] Copiar y pegar una celda conserva importe y pago sin crear otro servicio |
| TC-085 | 07-monthly-budget.spec.js | Pendiente de corrida general | [R] Fila automática de Gastos conserva su nota y bloquea edición directa; el check paga todos sus ítems |
| TC-086 | 07-monthly-budget.spec.js | Pendiente de corrida general | [R] Detalle de pagos permite cancelar o guardar una selección parcial sin cambiar importes ni notas |
| TC-087 | 07-monthly-budget.spec.js | Pendiente de corrida general | [R] Renombrar el servicio trata símbolos como texto y conserva importes y pagos en todos los meses |
| TC-088 | 07-monthly-budget.spec.js | Pasó en regresión de bugs | [R] Navegar años y recargar conserva estructura, celdas e IDs sin repetir el wizard |
| TC-089 | 08-balances.spec.js | Pendiente de corrida general | [P] Distinguir cierre ausente de cero y no crear un cierre al abrir y salir sin editar |
| TC-090 | 08-balances.spec.js | Pendiente de corrida general | [P] Saldo inicial por moneda aparece en planilla y Resumen sin crear ingresos ni cierres |
| TC-091 | 08-balances.spec.js | Pendiente de corrida general | [R] Separar saldo calculado y proyección según ingresos cobrados y gastos pagados o pendientes |
| TC-092 | 08-balances.spec.js | Pendiente de corrida general | [R] Cierre manual no reemplaza el calculado del mismo mes y sí ancla el mes siguiente |
| TC-093 | 08-balances.spec.js | Pendiente de corrida general | [B] Cero confirmado en ARS es un cierre válido que reinicia el saldo del mes siguiente |
| TC-094 | 08-balances.spec.js | Pendiente de corrida general | [B] Ceros USD y EUR son independientes de ARS y borrar EUR elimina sólo su cierre |
| TC-095 | 08-balances.spec.js | Pendiente de corrida general | [R] Borrar un cierre ARS elimina su referencia y vuelve al saldo de movimientos |
| TC-096 | 08-balances.spec.js | Pendiente de corrida general | [R] Escape cancela cierres nuevos o existentes sin modificar el proyecto |
| TC-097 | 08-balances.spec.js | Pendiente de corrida general | [B] Reemplazar cierre con decimales o saldo negativo conserva una sola referencia |
| TC-098 | 08-balances.spec.js | Pendiente de corrida general | [R] El último cierre anterior manda y corregir uno más antiguo respeta el cierre posterior |
| TC-099 | 08-balances.spec.js | Pendiente de corrida general | [R] Cierre de diciembre continúa en enero del año siguiente sin reiniciar el saldo |
| TC-100 | 08-balances.spec.js | Pendiente de corrida general | [N] Tenencia calculada y remanente estimado son de sólo lectura en planilla y Resumen |
| TC-101 | 08-balances.spec.js | Pendiente de corrida general | [R] Desactivar USD conserva saldo inicial, cierre e histórico y bloquea editar su cierre |
| TC-102 | 08-balances.spec.js | Pendiente de corrida general | [R] Recargar conserva bases, cierre ARS cero, cierre USD y saldos por moneda sin duplicar datos |
| TC-103 | 09-balance-adjustments.spec.js | Pendiente de corrida general | [P] Abrir ajustes vacíos muestra formulario y tabla sin crear movimientos |
| TC-104 | 09-balance-adjustments.spec.js | Pendiente de corrida general | [P] Ajuste a favor con decimales y nota literal aumenta ARS sin crear ingresos ni cierres |
| TC-105 | 09-balance-adjustments.spec.js | Pendiente de corrida general | [B] Tipo del ajuste define el signo aun con monto negativo y separa monedas y meses |
| TC-106 | 09-balance-adjustments.spec.js | Pendiente de corrida general | [N] Rechazar fecha o monto ausente, cero y texto no numérico sin guardar el borrador |
| TC-107 | 09-balance-adjustments.spec.js | Pendiente de corrida general | [R] Editar fecha, moneda, signo y nota del registro correcto conserva ID y recalcula ambos meses |
| TC-108 | 09-balance-adjustments.spec.js | Pendiente de corrida general | [N] Cancelar una edición descarta fecha, moneda, importe y nota sin cambiar IDs ni saldos |
| TC-109 | 09-balance-adjustments.spec.js | Pendiente de corrida general | [R] Cancelar y confirmar borrado en tabla ordenada elimina sólo el ajuste elegido y revierte su efecto |
| TC-110 | 09-balance-adjustments.spec.js | Pendiente de corrida general | [R] Recargar conserva ajustes e IDs y un cierre anterior evita volver a sumar ajustes ya conciliados |
| TC-111 | 10-currency-exchange.spec.js | Pendiente de corrida general | [P] Cambio vacío requiere dos monedas activas y habilitarlas no crea operaciones |
| TC-112 | 10-currency-exchange.spec.js | Pendiente de corrida general | [P] Vender USD por ARS multiplica la tasa y descuenta la comisión sólo de USD |
| TC-113 | 10-currency-exchange.spec.js | Pendiente de corrida general | [P] Comprar USD con ARS divide por la cotización y cobra la comisión en ARS |
| TC-114 | 10-currency-exchange.spec.js | Pendiente de corrida general | [P] Cambiar USD por EUR aplica tasa directa sin convertir ni alterar ARS |
| TC-115 | 10-currency-exchange.spec.js | Pendiente de corrida general | [B] Conservar precisión en monto y comisión y redondear sólo la presentación de tres cambios |
| TC-116 | 10-currency-exchange.spec.js | Pendiente de corrida general | [N] Rechazar monedas iguales, mes ausente y monto o tasa vacíos, cero, negativos o no numéricos |
| TC-117 | 10-currency-exchange.spec.js | Pendiente de corrida general | [R] Editar una fila ordenada cambia mes, monedas, tasa y comisión sin duplicar ni tocar otro cambio |
| TC-118 | 10-currency-exchange.spec.js | Pendiente de corrida general | [N] Cancelar la edición descarta todo el borrador y conserva cambios y saldos originales |
| TC-119 | 10-currency-exchange.spec.js | Pendiente de corrida general | [R] Cancelar y confirmar borrado bajo filtros afecta al índice original y revierte sólo ese cambio |
| TC-120 | 10-currency-exchange.spec.js | Pendiente de corrida general | [R] Combinar filtros de mes, monedas, nota, tasa y comisión y limpiarlos no modifica el proyecto |
| TC-121 | 10-currency-exchange.spec.js | Pendiente de corrida general | [R] Desactivar USD conserva sus cambios e histórico consultable y bloquea editarlos hasta reactivarlo |
| TC-122 | 10-currency-exchange.spec.js | Pendiente de corrida general | [R] Recargar conserva cambios, gastos y cierre por moneda y mantiene saldos sin contar dos veces el pasado |
| TC-123 | 11-summary.spec.js | Pendiente de corrida general | [P] Resumen vacío muestra una moneda en cero, estados vacíos y gráficos sin NaN ni datos inventados |
| TC-124 | 11-summary.spec.js | Pendiente de corrida general | [R] Navegar períodos respeta el inicio y cruza diciembre/enero mostrando los saldos del mes elegido |
| TC-125 | 11-summary.spec.js | Pendiente de corrida general | [R] Movimientos confirmados separan monedas y no confunden flujo neto con saldo o remanente estimado |
| TC-126 | 11-summary.spec.js | Pendiente de corrida general | [P] Ojitos abren desgloses con pagos y cambios correctos y cerrar o pulsar Escape no altera datos |
| TC-127 | 11-summary.spec.js | Pendiente de corrida general | [R] Detalle de tenencia concilia base, pagos, cambio, ajuste y cierre sin reemplazar el calculado |
| TC-128 | 11-summary.spec.js | Pendiente de corrida general | [P] Variación mensual muestra subida, bajada y cero con tooltip propio y base anterior correcta |
| TC-129 | 11-summary.spec.js | Pendiente de corrida general | [B] Base anterior cero no divide por cero y una base negativa usa porcentaje sobre su valor absoluto |
| TC-130 | 11-summary.spec.js | Pendiente de corrida general | [R] Moneda de gráficos cambia distribución, barras y tendencia sin convertir tarjetas ni alterar el cotizador |
| TC-131 | 11-summary.spec.js | Pendiente de corrida general | [R] Período de distribución es independiente del Resumen y actualizarlo no cambia tarjetas ni datos |
| TC-132 | 11-summary.spec.js | Pendiente de corrida general | [R] Ocultar y restaurar gráficos, cotizador y variación conserva tarjetas, saldos y movimientos |
| TC-133 | 11-summary.spec.js | Pendiente de corrida general | [R] Arrastre visible y teclado intercambian tarjetas; Escape y límites conservan el orden y los datos |
| TC-134 | 11-summary.spec.js | Pendiente de corrida general | [R] Cinco tarjetas conservan importes, orden personalizado y preferencias al recargar sin duplicar datos |
| TC-135 | 12-dates-notifications.spec.js | Pendiente de corrida general | [P] Proyecto vacío no inventa fechas ni avisos y la campana vacía se cierra con X y Escape |
| TC-136 | 12-dates-notifications.spec.js | Pendiente de corrida general | [P] Guardar cierre y vencimiento puntuales conserva mes, nombre literal y datos financieros |
| TC-137 | 12-dates-notifications.spec.js | Pendiente de corrida general | [N] Fecha obligatoria y días 0 o 32 se rechazan sin guardar parcialmente la configuración |
| TC-138 | 12-dates-notifications.spec.js | Pendiente de corrida general | [B] Repetir el día 31 usa fin de mes en febrero, año bisiesto y abril sin perder la regla original |
| TC-139 | 12-dates-notifications.spec.js | Pendiente de corrida general | [B] Cierre del mes anterior y vencimiento del siguiente cruzan diciembre sin mover la columna financiera |
| TC-140 | 12-dates-notifications.spec.js | Pendiente de corrida general | [R] Buscar sin acentos y alternar tags carga el servicio correcto y conserva borradores sin guardar por un clic |
| TC-141 | 12-dates-notifications.spec.js | Pendiente de corrida general | [B] Avisos respetan anticipación, límite de siete días vencidos y no se duplican al consultar |
| TC-142 | 12-dates-notifications.spec.js | Pendiente de corrida general | [R] Filtros leído y sin leer, leer todos y borrar conservan avisos sin recrear el eliminado |
| TC-143 | 12-dates-notifications.spec.js | Pendiente de corrida general | [R] Leer no paga y Ver en planilla abre la columna asociada aunque el vencimiento sea de otro mes |
| TC-144 | 12-dates-notifications.spec.js | Pendiente de corrida general | [R] Modificar o desactivar una fecha cancela el aviso anterior y reactivarla conserva su identidad y lectura |
| TC-145 | 12-dates-notifications.spec.js | Pendiente de corrida general | [R] Popover de fechas admite hover, foco y fijación por clic con diseño propio y cierre sin escrituras |
| TC-146 | 12-dates-notifications.spec.js | Pendiente de corrida general | [R] Recargar conserva fechas ARS y USD, avisos y pagos; cambiar idioma no traduce nombres del usuario |
| TC-147 | 13-installments-notes.spec.js | Pendiente de corrida general | [P] Inicio vacío muestra formularios sin cuotas ni notas y no permite retroceder antes del proyecto |
| TC-148 | 13-installments-notes.spec.js | Pendiente de corrida general | [P] Agregar compra con caracteres especiales muestra seis avances sin crear gastos ni pagos |
| TC-149 | 13-installments-notes.spec.js | Pendiente de corrida general | [N] Nombre vacío, cantidad vacía o no positiva y mes ausente se rechazan sin insertar planes |
| TC-150 | 13-installments-notes.spec.js | Pendiente de corrida general | [B] Cuota única, redondeo de cantidad y planes futuros respetan fin de plan y diciembre a enero |
| TC-151 | 13-installments-notes.spec.js | Pendiente de corrida general | [R] Editar por botón y doble clic reemplaza sólo el plan elegido y Cancelar o Escape descarta borradores |
| TC-152 | 13-installments-notes.spec.js | Pendiente de corrida general | [R] Borrar una cuota exige confirmación y renumera acciones sin editar o eliminar el plan vecino |
| TC-153 | 13-installments-notes.spec.js | Pendiente de corrida general | [R] Flechas, Enter, F2 y Escape operan sólo sobre filas visibles aunque sus índices no sean consecutivos |
| TC-154 | 13-installments-notes.spec.js | Pendiente de corrida general | [P] Notas por botón y Enter conservan texto literal; vacío se rechaza y borrar respeta la nota vecina |
| TC-155 | 13-installments-notes.spec.js | Pendiente de corrida general | [N] Editar nota vacía conserva el texto y permite continuar con Enter sin reabrir validaciones anteriores |
| TC-156 | 13-installments-notes.spec.js | Pendiente de corrida general | [R] Ocultar y restaurar sección, cambiar idioma y recargar conserva cuotas, notas, gastos y saldos |
| TC-157 | 14-settings.spec.js | Pendiente de corrida general | [P] Secciones y subsecciones navegan con selección accesible y teclado sin modificar el proyecto |
| TC-158 | 14-settings.spec.js | Pendiente de corrida general | [R] Ocultar Cuotas conserva sus registros y mantiene disponibles las secciones principales, guardado y ayuda |
| TC-159 | 14-settings.spec.js | Pendiente de corrida general | [R] Gráficos se ocultan y restauran con deshacer y rehacer sin alterar importes ni registros |
| TC-160 | 14-settings.spec.js | Pendiente de corrida general | [N] Cotizador requiere dos monedas y su switch controla visibilidad sin registrar cambios de divisas |
| TC-161 | 14-settings.spec.js | Pendiente de corrida general | [R] Variación mensual cambia sólo la presentación y conserva saldo, remanente y movimientos |
| TC-162 | 14-settings.spec.js | Pendiente de corrida general | [R] Ocultar avisos conserva fechas e historial leído y restaurarlos no crea notificaciones duplicadas |
| TC-163 | 14-settings.spec.js | Pendiente de corrida general | [R] Conexión es una preferencia local y respeta el switch del cotizador sin bloquear datos offline |
| TC-164 | 14-settings.spec.js | Pasó en regresión de bugs | [P] Tema claro y oscuro se aplican al instante, se guardan en esta PC y no modifican el proyecto |
| TC-165 | 14-settings.spec.js | Pendiente de corrida general | [R] Preferencia de guías, manual y recorrido de Ajustes funcionan sin insertar datos de ejemplo |
| TC-166 | 14-settings.spec.js | Pendiente de corrida general | [R] Recargar conserva funciones del proyecto y preferencias locales con gastos, cuotas, notas y dos monedas intactos |
| TC-167 | 15-estimator-access.spec.js | Pendiente de corrida general | [P] Inicio limpio mantiene estimador oculto y ofrece activación protegida sin alterar el proyecto |
| TC-168 | 15-estimator-access.spec.js | Pendiente de corrida general | [N] Cancelar y Escape descartan el intento y el borrador sin autorizar ni guardar cambios |
| TC-169 | 15-estimator-access.spec.js | Pendiente de corrida general | [N] Contraseña vacía usa validación obligatoria sin desbloquear ni mostrar éxito |
| TC-170 | 15-estimator-access.spec.js | Pendiente de corrida general | [N] Claves incorrectas, mayúsculas y espacios no equivalen a la contraseña exacta |
| TC-171 | 15-estimator-access.spec.js | Pendiente de corrida general | [P] Contraseña correcta muestra estimador de noviembre y conserva saldos, gastos y notas |
| TC-172 | 15-estimator-access.spec.js | Pendiente de corrida general | [R] Reintentar tras rechazo permite activar con Enter sin duplicar diálogo ni registros |
| TC-173 | 15-estimator-access.spec.js | Pendiente de corrida general | [R] Desactivar oculta el panel, revoca autorización y exige contraseña para volver a habilitar |
| TC-174 | 15-estimator-access.spec.js | Pendiente de corrida general | [R] Recargar conserva activación y datos; tras desactivar la recarga no restaura el acceso |
| TC-175 | 15-estimator-access.spec.js | Pendiente de corrida general | [E] Autorizar con ARS no agrega USD; el panel aparece al incorporar la moneda requerida |
| TC-176 | 15-estimator-access.spec.js | Pendiente de corrida general | [R] Importar proyecto habilitado en contexto limpio no transfiere autorización y diálogo respeta idioma y teclado |
| TC-177 | 16-project-persistence.spec.js | Pendiente de corrida general | [P] Autoguardado, Guardar y Guardar como conservan el proyecto completo en la sesión web |
| TC-178 | 16-project-persistence.spec.js | Pasó en regresión de bugs | [R] Recargar reanuda el proyecto con monedas, pagos, notas, cuotas y divisas sin datos agregados |
| TC-179 | 16-project-persistence.spec.js | Pendiente de corrida general | [P] Abrir el mismo proyecto como JSON y KASH conserva IDs y no duplica registros |
| TC-180 | 16-project-persistence.spec.js | Pendiente de corrida general | [N] Archivos corruptos, esquema inválido y extensión no permitida no reemplazan el proyecto |
| TC-181 | 16-project-persistence.spec.js | Pendiente de corrida general | [N] Cancelar el selector de archivo conserva proyecto, sesión e historial |
| TC-182 | 16-project-persistence.spec.js | Pendiente de corrida general | [N] Cancelar o Escape en cambios pendientes impide Nuevo y Abrir sin perder datos |
| TC-183 | 16-project-persistence.spec.js | Pendiente de corrida general | [R] Nuevo tras descartar crea proyecto vacío sin heredar monedas, saldos, registros ni deshacer |
| TC-184 | 16-project-persistence.spec.js | Pasó en regresión de bugs | [R] Alternar proyectos A y B abre cada copia completa y reinicia el historial sin mezclar datos |
| TC-185 | 16-project-persistence.spec.js | Pendiente de corrida general | [R] Deshacer y rehacer creación y edición restaura cada estado completo, pagos y saldos |
| TC-186 | 16-project-persistence.spec.js | Pendiente de corrida general | [E] Atajos deshacen y rehacen; una acción nueva invalida rehacer y editar texto no deshace el proyecto |
| TC-187 | 17-ui-regression.spec.js | Pendiente de corrida general | [R] Seis secciones mantienen cabeceras legibles sin superposición ni desborde en escritorio |
| TC-188 | 17-ui-regression.spec.js | Pendiente de corrida general | [E] Una a cinco monedas acomodan tarjetas e importes grandes sin tapar textos ni otras tarjetas |
| TC-189 | 17-ui-regression.spec.js | Pendiente de corrida general | [R] Inglés y español con zoom 80 y 125 conservan títulos, acciones y filtros dentro de su espacio |
| TC-190 | 17-ui-regression.spec.js | Pendiente de corrida general | [P] Campos y acciones de Gastos tienen nombre accesible y permiten registrar con Tab, Espacio y Enter |
| TC-191 | 17-ui-regression.spec.js | Pendiente de corrida general | [P] Tabs de Ajustes conectan nombres y paneles y muestran foco al navegar con teclado |
| TC-192 | 17-ui-regression.spec.js | Pendiente de corrida general | [R] Textos principales y secundarios mantienen contraste básico en temas claro y oscuro |
| TC-193 | 17-ui-regression.spec.js | Pendiente de corrida general | [R] Ayudas al pasar el mouse y enfocar usan tooltip temático, relación accesible y Escape |
| TC-194 | 17-ui-regression.spec.js | Pasó en regresión de bugs | [R] Detalle modal centra su cierre, contiene el foco y lo devuelve al botón de origen |
| TC-195 | 17-ui-regression.spec.js | Pasó en regresión de bugs | [R] Desplazar Gastos y colapsar navegación conserva cabecera, filtros, accesos y datos con movimiento reducido |
| TC-196 | 14-settings.spec.js | Pendiente de corrida general | [R] Sistema sigue al SO y una elección manual ignora los cambios del SO |
| TC-197 | 14-settings.spec.js | Pendiente de corrida general | [P] Tema en panel contraído permite teclado, selección y Escape con foco restaurado |
| TC-198 | 07-monthly-budget.spec.js | Pendiente de corrida general | [R] Selección con Shift suma un negativo y un cero cargado sin editar datos |
| TC-199 | 07-monthly-budget.spec.js | Pendiente de corrida general | [R] Selección discontinua con Ctrl separa ARS y USD y Escape la limpia |
| TC-200 | 11-summary.spec.js | Pendiente de corrida general | [R] Tasa manual valida cero y negativos, convierte offline y no crea transacciones |
| TC-201 | 18-monthly-closing.spec.js | Pendiente de corrida general | [P] El aviso comienza al terminar el mes y sólo avisa el último mes finalizado |
| TC-202 | 18-monthly-closing.spec.js | Pendiente de corrida general | [R] Marcar leído cambia sólo el aviso y no confirma ni completa el cierre |
| TC-203 | 18-monthly-closing.spec.js | Pendiente de corrida general | [N] Vacío y texto inválido no cierran el mes; cero sí confirma una moneda |
| TC-204 | 18-monthly-closing.spec.js | Pendiente de corrida general | [R] Confirmar una moneda conserva el borrador de otra y completar todas retira el aviso |
| TC-205 | 18-monthly-closing.spec.js | Pendiente de corrida general | [B] Sin movimientos se sugiere el cierre previo pero no se confirma automáticamente |
| TC-206 | 18-monthly-closing.spec.js | Pendiente de corrida general | [R] Ir a planilla conserva el mes de Resumen y selecciona la moneda editada |
| TC-207 | 19-exports.spec.js | Pendiente de corrida general | [N] Gastos vacíos o filtros sin resultados deshabilitan CSV sin crear registros |
| TC-208 | 19-exports.spec.js | Pendiente de corrida general | [B] CSV respeta filtros y protege fórmulas, comillas y separadores |
| TC-209 | 19-exports.spec.js | Pendiente de corrida general | [R] CSV de totales distingue un cierre cero de un cierre ausente y conserva el cálculo |
| TC-210 | 19-exports.spec.js | Pendiente de corrida general | [R] Documento mensual muestra saldos independientes y cierre ausente sin ejecutar impresoras |
| TC-211 | 19-exports.spec.js | Pendiente de corrida general | [R] Exportación española usa coma decimal y cerrar restaura el foco sin guardar cambios |
| TC-212 | 16-project-persistence.spec.js | Pendiente de corrida general | [R] Copias y recuperación informa el alcance web y cerrar conserva proyecto y foco |
| TC-213 | 08-balances.spec.js | Pasó en regresión de bugs | [R] Al cambiar de mes con la app abierta ARS deja de tratar el mes actual como futuro |
