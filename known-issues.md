# Incidencias de automation · KA$H v0.677

## QA-CUR-001 · Histórico inactivo sin tamaño visible en Chromium 127

- Caso: **TC-035**, `tests/03-currencies.spec.js`.
- Entorno donde se reprodujo: **Playwright 1.45.0**, Chromium **127.0.6533.17**, build Playwright **1124**, headless, Windows, viewport 1920 × 1080.
- Referencia de la app: **KA$H v0.677**. No se modificó su código para esta entrega.
- Resultado esperado: el desplegable de histórico de monedas inactivas se ve en Resumen, se puede abrir y muestra USD 89.50.
- Resultado observado: el nodo existe y contiene USD 89.50, pero el elemento `details.kashInactiveBalanceDetails` tiene ancho y alto cero. El usuario no puede abrirlo. La expectativa `toBeVisible()` falla.
- Los datos financieros se conservaron exactamente. El histórico en Ajustes sí se puede consultar y ese flujo pasa en TC-033.
- Contraste: **el mismo TC-035, sin cambios en el código de la prueba ni de la app, pasó en Edge 155.0.4283.45 con el runtime de herramientas 1.62.1**. Fue una comprobación diagnóstica separada; ese runtime no se agregó a `package.json` ni acredita que TC-035 pase con 1.45.0. La causa exacta de la diferencia de renderizado no quedó determinada.

### Reproducción sin depender de otros casos

1. Iniciar limpio, elegir inglés y crear un proyecto vacío.
2. En Ajustes, agregar USD y cargar saldo inicial USD 100.
3. Registrar un gasto USD 10.50 pagado, con descripción `Café & viaje <b>USD</b>`.
4. Agregar BRL, EUR y JPY: quedan cinco monedas activas.
5. Desactivar USD y agregar MXN. El histórico USD debe conservarse.
6. Abrir Resumen. Buscar `Inactive currencies · history (1)` debajo de las tarjetas.

```powershell
$env:KASH_BROWSER_CHANNEL = 'bundled'
npx playwright test tests/03-currencies.spec.js --grep 'TC-035 '
```

El test **permanece activo, con resultado esperado `passed`**. No se marca con `test.skip`, `test.fail`, clic forzado ni cambios de CSS. En el entorno afectado genera un fallo real y hace fallar el job de CI, para mantener visible la incidencia. En un navegador que la renderice correctamente debe pasar.

Se incluye la captura de la ejecución final en `evidence/TC-035-chromium127.png`. Cada ejecución local genera su propio reporte, trace y diagnóstico `inactive-currency-dom` con los tamaños y estilos observados.

## Inicio de Edge con el runner 1.45.0 en esta PC

En esta PC, el Edge instalado cerraba al arrancar con Playwright 1.45.0, antes de cargar la app. No se contabiliza como un defecto funcional de KA$H. Para ejecutar la verificación se usó el Chromium compatible instalado mediante `playwright install chromium` y `KASH_BROWSER_CHANNEL=bundled`. La configuración mantiene Edge por defecto para respetar el uso anterior; se documenta cómo seleccionar Chromium en el README.

La dependencia del proyecto sigue siendo exactamente **`"@playwright/test": "^1.45.0"`**.

## TC-033 · Timeout global reportado en el entorno del usuario · historial revisión 2

El usuario reportó `Test timeout of 30000ms exceeded` en TC-033, mientras TC-035 pasó en su entorno. La captura muestra USD inactiva en Ajustes, pero ese mismo estado puede corresponder a antes de abrir el histórico o a después de cerrarlo. No identifica la instrucción pendiente ni acredita una falla de Chromium. El navegador y runtime de esa ejecución del usuario no quedaron identificados.

Se revisó únicamente TC-033: presupuesto total 60 segundos para wizard, preparación de datos y varias pantallas; siete `test.step` para identificar la fase; expectativas de 5 segundos conservadas y controles del histórico y selección con esperas acotadas de 5 segundos. Se mantienen todas las comprobaciones financieras, y se agregan verificaciones de apertura y cierre del modal. Los otros nueve casos no cambian.

El caso revisado pasó por separado con Playwright 1.45.0 y Chromium 127.0.6533.17. Evidencia: `validation-tc033-rev2.json`. Esto valida el caso en el entorno local; no demuestra qué provocó el timeout original del usuario. Si vuelve a fallar, el nombre del paso, el `Call log` y el trace permiten continuar el diagnóstico. No se agregaron pausas fijas, reintentos ni fallos esperados.

## TC-030 · Timeout en preparación compartida · revisión 3 vigente

Tras pasar TC-033, el usuario reportó que TC-030 agotó el límite global de 30 segundos en `addCurrency`, mientras esperaba leer USD en el proyecto persistido. El test ya había visto la fila de USD, pero aún no había llegado a sus verificaciones de duplicados.

Se identificaron dos problemas de diseño de la suite: wizard y caso compartían el mismo presupuesto, y la espera del guardado de monedas llamaba a otro `expect.poll` dentro de su propio `expect.poll`. Se corrigen separando la preparación en una fixture con su propio timeout y usando una lectura por intento. Se mantienen las verificaciones de persistencia y las expectativas de 5 segundos; no se cambia KA$H ni se reintenta automáticamente el caso.

Todos los casos de la tanda vuelven a tener un límite de 30 segundos para su ejecución. La preparación limpia tiene 60 segundos propios. El reporte identifica la fase y adjunta datos para distinguir lentitud de una inconsistencia real. El aumento puntual de TC-033 en la revisión 2 queda sustituido por esta organización.

**El trace del usuario permitió confirmar el agotamiento del presupuesto:** la preparación consumió 25,516 s; la fila USD terminó de verificarse a los 29,999 s y la espera del guardado empezó a los 30,002 s. Esa espera falló en unos 2 ms, sin llegar a leer el almacenamiento. No hubo una comparación fallida de persistencia. Resumen: `diagnosis-tc030-user.json`. Se consultaron los archivos del repositorio del usuario únicamente para lectura.

La corrección separa los presupuestos para que ese tiempo de preparación no se reste del caso. No se determina con esto qué factor del equipo produjo cada demora de ejecución. QA-CUR-001/TC-035 es una incidencia separada de visibilidad y no se oculta con esta revisión.

## QA-EXP-001 · Recargar crea tres recordatorios no ingresados

- Caso: **TC-054**, `tests/04-expenses.spec.js`.
- App: **KA$H v0.677**, interfaz web con proyecto creado desde cero por su wizard.
- Resultado esperado: al recargar se conservan gastos, notas, pagos, IDs y configuración del proyecto. Un proyecto sin recordatorios debe seguir sin recordatorios.
- Resultado observado: aparecen **Municipal Alsina**, **Municipal Belgrano** y **Patente** en `recConfig` y `recMonthly`, aunque estaban vacíos antes de recargar. Los dos gastos originales se conservan con sus IDs, importes, notas y estados de pago, y los totales de planilla siguen correctos. El fallo es la inserción de datos no ingresados.
- Causa identificada en el código: `migrate()` en `App/index.html` interpreta `recConfig` vacío como un proyecto antiguo y entra en la rama que crea recordatorios heredados. Esa rama también se ejecuta al cargar un proyecto nuevo vacío en ese aspecto.
- La normalización del contador interno `nid` no se considera pérdida de IDs: el caso verifica los IDs de gastos existentes y admite que el contador del próximo ID se recalcule. La expectativa que falla señala específicamente `recConfig`.

### Reproducción

1. Iniciar limpio, elegir inglés y crear proyecto vacío con ARS.
2. Registrar un gasto pagado ARS 10.25 con nota y uno pendiente ARS 20.50.
3. Comprobar que `recConfig` no contiene recordatorios. No crearlos desde la app.
4. Recargar y abrir Consumos Mensuales: aparecen los tres recordatorios heredados.

```powershell
npx playwright test tests/04-expenses.spec.js --grep 'TC-054 '
```

El caso prepara sus propios datos y funciona ejecutado solo. Se adjunta `reload-project-diff` al reporte, con los nombres de recordatorios antes y después, los IDs existentes y el contador interno. La verificación de datos usa la API pública de exportación únicamente para lectura.

**Permanece activo y fallará mientras la app inserte esos recordatorios.** No se agregan `skip`, `test.fail`, reintentos ni una recarga anticipada en la fixture para ocultarlo. El job de CI puede quedar en rojo por esta incidencia. No se modificó la app al preparar las pruebas.

Evidencia y entornos ejecutados: `validation-expenses.json`. La captura se entrega en `evidence/TC-054-default-reminders.png`. Los traces completos se generan localmente y no se incluyen en el ZIP.
