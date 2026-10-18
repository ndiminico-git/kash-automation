# KA$H · Práctica de Playwright

Versión de referencia: **KA$H 0.677**. Este paquete reúne las trece primeras tandas:

- **`tests/01-onboarding.spec.js`**: TC-001 a TC-012, primer inicio y bienvenida.
- **`tests/02-language.spec.js`**: TC-013 a TC-026, idiomas y conservación de datos.
- **`tests/03-currencies.spec.js`**: TC-027 a TC-036, catálogo, activación e históricos.
- **`tests/04-expenses.spec.js`**: TC-037 a TC-054, Gastos y su efecto en la planilla.
- **`tests/05-expense-filters.spec.js`**: TC-055 a TC-064, búsquedas, filtros y acciones sobre resultados.
- **`tests/06-recurring-expenses.spec.js`**: TC-065 a TC-073, generación, edición, detención y persistencia de recurrencias.
- **`tests/07-monthly-budget.spec.js`**: TC-074 a TC-088, servicios, celdas, pagos, teclado y persistencia de la planilla.
- **`tests/08-balances.spec.js`**: TC-089 a TC-102, saldos iniciales, calculados, proyecciones y cierres por moneda.
- **`tests/09-balance-adjustments.spec.js`**: TC-103 a TC-110, ajustes de saldo.
- **`tests/10-currency-exchange.spec.js`**: TC-111 a TC-122, cambio de divisas.
- **`tests/11-summary.spec.js`**: TC-123 a TC-134, Resumen, gráficos y tarjetas.
- **`tests/12-dates-notifications.spec.js`**: TC-135 a TC-146, cierres, vencimientos y avisos.
- **`tests/13-installments-notes.spec.js`**: TC-147 a TC-156, planes de cuotas y recordatorios propios.

## Qué hay en esta carpeta

```text
qa-automation/
  tests/01-onboarding.spec.js   Los 12 casos, en orden.
  tests/02-language.spec.js     Los 14 casos de idiomas, en orden.
  tests/03-currencies.spec.js   Los 10 casos de monedas, en orden.
  tests/04-expenses.spec.js     Los 18 casos de Gastos, en orden.
  tests/05-expense-filters.spec.js Los 10 casos de filtros, en orden.
  tests/06-recurring-expenses.spec.js Los 9 casos de recurrencias, en orden.
  tests/07-monthly-budget.spec.js Los 15 casos de planilla, en orden.
  tests/08-balances.spec.js     Los 14 casos de saldos y remanentes, en orden.
  tests/09-balance-adjustments.spec.js Los 8 casos de ajustes.
  tests/10-currency-exchange.spec.js Los 12 casos de divisas.
  tests/11-summary.spec.js      Los 12 casos de Resumen.
  tests/12-dates-notifications.spec.js Los 12 casos de fechas y avisos.
  tests/13-installments-notes.spec.js Los 10 casos de cuotas y notas.
  helpers/onboarding.js        Acciones comunes de los wizards.
  helpers/language.js          Navegación, idioma y datos mínimos por UI.
  helpers/currencies.js        Monedas, dropdowns e histórico por UI.
  helpers/expenses.js          Formularios, filas, guardado y totales de Gastos.
  helpers/expense-filters.js   Filas visibles, filtros y comprobaciones de sólo lectura.
  helpers/recurring-expenses.js Series y repeticiones por UI, persistencia y recarga.
  helpers/monthly-budget.js    Rubros, servicios, celdas y pagos de la planilla.
  helpers/balances.js          Saldos iniciales, cierres, comparaciones y recarga.
  helpers/balance-adjustments.js Ajustes de saldo por UI.
  helpers/currency-exchange.js Formularios, filas y filtros de divisas.
  helpers/summary.js           Tarjetas, gráficos, movimientos y arrastre.
  helpers/dates-notifications.js Fechas, reglas y avisos por UI.
  helpers/installments-notes.js Cuotas, teclado y recordatorios propios por UI.
  helpers/app-server.js        Sirve la interfaz de ../App en localhost.
  playwright.config.js        Configuración de ejecución y reportes.
  qa-progress.md              Seguimiento de los 195 casos del catálogo.
  package.json
```

## Usarlo en tu proyecto de automation existente

1. Si ya tenés las tandas 01–12, agregá únicamente `tests/13-installments-notes.spec.js` y `helpers/installments-notes.js`. El ZIP es acumulativo y conserva los casos anteriores. No hace falta reemplazar tu package ni tu lockfile.
2. `helpers` y `tests` deben estar en la raíz del proyecto. El servidor incluido ya apunta a `../App`; conservá tu helper si ya usa esa ruta. Para una instalación nueva, copiá los tests y helpers acumulados.
3. Conservá tu configuración de Playwright. La configuración incluida sirve como referencia; no reemplaces la tuya si tiene otras suites o proyectos.
4. Ejecutá desde la raíz `kash-automation`, que contiene `App/index.html`. Para esa estructura no necesitás definir `KASH_APP_DIR`. Si usás otra ubicación, esa variable puede indicar la carpeta App antes de ejecutar.

```powershell
npx playwright test tests/01-onboarding.spec.js

# Segunda tanda solamente.
npx playwright test tests/02-language.spec.js

# Tercera tanda solamente.
npx playwright test tests/03-currencies.spec.js

# Cuarta tanda solamente.
npx playwright test tests/04-expenses.spec.js

# Quinta tanda solamente.
npx playwright test tests/05-expense-filters.spec.js

# Sexta tanda solamente.
npx playwright test tests/06-recurring-expenses.spec.js

# Séptima tanda solamente.
npx playwright test tests/07-monthly-budget.spec.js

# Octava tanda solamente.
npx playwright test tests/08-balances.spec.js
```

Reemplazá la ruta del ejemplo por la real. Esa carpeta debe contener `index.html` y `kash-i18n.js`.
No debe apuntar al EXE ni a `Data`.

Si tu configuración ejecuta varios navegadores, los casos se ejecutarán en cada proyecto seleccionado.
Cada evidencia `validation*.json` identifica el navegador y runtime de su ejecución.

## Usar esta carpeta como proyecto separado

Abrí `qa-automation` en VS Code. Si Playwright no está instalado en ese proyecto, ejecutá `npm install` una vez.
La dependencia está fijada en `package.json`; si tu proyecto existente ya tiene Playwright, podés usarlo directamente.
La configuración incluida usa Edge instalado en Windows.

### Versión requerida de Playwright

Para este proyecto, la dependencia debe conservar exactamente este valor en `package.json`:

```json
"@playwright/test": "^1.45.0"
```

Es una restricción del proyecto para su integración con GitHub Actions. No reemplazarla por la versión del entorno de herramientas usado para generar o revisar los casos.
Si integrás estos archivos en tu repositorio, conservá su archivo de bloqueo compatible y no lo reemplaces por uno generado con otra configuración.
Este paquete de práctica no incluye `package-lock.json`.

Los archivos `validation*.json` registran el runtime de las ejecuciones anteriores; ese dato histórico no indica la dependencia requerida del proyecto ni acredita una nueva ejecución con 1.45.0.

```powershell
$env:KASH_APP_DIR = 'C:\ruta\de\KA$H\App'
npm run test:onboarding
npm run test:language
npm run test:currencies
npm run test:expenses
npm run test:expense-filters
npm run test:recurring-expenses
npm run test:monthly-budget
npm run test:balances

# Tanda 12 solamente.
npx playwright test tests/12-dates-notifications.spec.js

# Tanda 13 solamente.
npx playwright test tests/13-installments-notes.spec.js

# Las trece tandas, en orden.
npm test
```

El helper incluido busca la app en `App` dentro de la raíz del repositorio: `path.join(__dirname, '../App')`. Ejecutá los comandos desde la raíz `kash-automation`, sin una variable adicional si usás esa estructura. La app no se distribuye en el ZIP de QA. Para otra ubicación, `KASH_APP_DIR` sigue disponible. Si esa variable ya está definida, tiene prioridad sobre el valor predeterminado.

### Chromium compatible con la versión instalada

La configuración conserva Edge por defecto. Para usar el Chromium que corresponde a tu instalación de Playwright, instalalo una vez y elegí `bundled`:

```powershell
npx playwright install chromium
$env:KASH_BROWSER_CHANNEL = 'bundled'
npm run test:currencies
```

Es la opción usada para ejecutar esta tanda con Playwright **1.45.0**, porque el Edge de esta PC cerraba al iniciarse con ese runner. TC-035 presenta una incidencia de visibilidad en ese Chromium, detallada en `known-issues.md`; no se oculta el fallo. No cambia `package.json`. En GitHub Actions con Linux, `npx playwright install --with-deps chromium` instala también las dependencias del sistema; configurá `KASH_BROWSER_CHANNEL: bundled` en el entorno del job si usás esta configuración. Si usás tu configuración propia con Chromium, no necesitás esta variable.

Si tu repositorio tiene `package-lock.json`, conservá su versión compatible o actualizalo con `npm install` y subí ambos archivos. La dependencia declarada debe seguir siendo `^1.45.0`; no se entrega un lockfile nuevo.

## Practicar un caso por vez

```powershell
# Sólo el primer caso.
npx playwright test tests/01-onboarding.spec.js --grep 'TC-001 '

# Un caso independiente que crea su propio proyecto.
npx playwright test tests/01-onboarding.spec.js --grep 'TC-008 '

# Caso de saldos de la segunda tanda, sin ejecutar los anteriores.
npx playwright test tests/02-language.spec.js --grep 'TC-024 '

# Desactivar una moneda con histórico, sin ejecutar ningún caso previo.
npx playwright test tests/03-currencies.spec.js --grep 'TC-033 '

# Ver el navegador mientras se ejecuta el bloque.
npx playwright test tests/01-onboarding.spec.js --headed

# Depurar un caso paso a paso.
npx playwright test tests/01-onboarding.spec.js --grep 'TC-005 ' --debug

# Abrir el reporte de la última ejecución, usando la configuración incluida.
npx playwright show-report playwright-report
```

## Cómo se prepara cada prueba

- Las tandas 01 y 02 usan `beforeAll` / `afterAll` para el servidor local. Las tandas 03 y 04 usan fixtures por worker que lo inician en un puerto libre y lo cierran al terminar.
- Playwright crea un contexto de navegador nuevo por prueba, con `storageState` vacío.
- Las tandas 01 y 02 usan `beforeEach`; las tandas 03 y 04 usan fixtures automáticas `cleanCurrencyProject` y `cleanExpensesProject`, ejecutadas para cada prueba. Comprueban que no exista un proyecto ni un idioma guardado.
  Desde la segunda tanda se crea un proyecto vacío por la UI y se desactivan las guías automáticas desde la ayuda. Así cada caso tiene su propio proyecto, sin necesitar las otras tandas.
- La única preferencia preparada es desactivar consultas online: las cotizaciones no forman parte de esta suite.
- Se bloquean las solicitudes a otros sitios. No se simulan respuestas de creación ni se inyectan registros financieros.
- Los nombres, monedas, saldos y cambios de idioma se cargan mediante los controles de la aplicación, salvo los dos casos de integración de idioma detallados más abajo.
- Al finalizar el wizard, el helper cierra la guía automática de Resumen usando su botón real.
- En la primera tanda, `page.evaluate` sólo lee el almacenamiento del navegador, salvo la preferencia de conexión indicada.
  Desde la segunda tanda también se lee la API pública de exportación `KASHGetProjectJson()` para comparar datos. No se accede a `D` ni se cargan registros mediante código.
- `expect.poll` espera el autoguardado real. No usamos pausas fijas para hacerlo pasar.
- `afterEach` comprueba que no haya errores JavaScript.

No hace falta abrir el EXE para ejecutar estos casos. El servidor lee los archivos de `App`; no escribe en esa carpeta, en `Data` ni en tus proyectos `.kash`.
Estas son pruebas de la **interfaz web de la app**. Los diálogos nativos de Windows y la recuperación de sesión del EXE se probarán aparte.

## Qué comprueba la segunda tanda

Los casos TC-013 a TC-026 siguen los IDs del catálogo original: cambios desde Ajustes, persistencia, navegación, meses, monedas, mensajes, ayuda, guías, alternancia repetida, textos propios, importes, indicador de cambios y borradores.

**TC-020 y TC-021 son pruebas de integración de componentes.** La ayuda y la guía abiertas tapan el selector de Ajustes. En esos dos casos se utiliza la API pública `KashI18n.setLanguage()` para comprobar que el componente abierto se actualiza sin cerrarse ni perder su tema o paso. No simulan un clic de usuario detrás de un modal. Los demás cambios de idioma se realizan por el selector real.

**TC-024 prepara sus datos por UI:** habilita USD, carga saldos iniciales de ARS 1000 y USD 100, registra gastos ARS de 150.75 pagado y 200.25 pendiente, y uno de USD 10.50 pagado. Comprueba ARS 849.25 de tenencia calculada, ARS 649 de remanente y USD 89.50. Al traducir cambia el separador decimal visible, conservando exactamente los importes y el proyecto.

**TC-025 distingue los dos avisos del navegador:** “Not saved / Sin guardar” indica que no hay una ruta de archivo nativa; “Unsaved changes / Cambios sin guardar” indica una edición pendiente. Cambiar el idioma no debe crear una edición ni habilitar Deshacer.

**TC-026 usa una ruta posible para el usuario:** completa un ajuste sin guardarlo, navega a Apariencia, cambia el idioma y vuelve al formulario. Verifica sus campos y que no se haya registrado el ajuste.

## Orden y resultados

Con la configuración incluida, los casos se ejecutan en el orden del archivo. También podés ejecutar cualquiera por su ID: ninguno depende del resultado del anterior.

Consultá `qa-progress.md` para saber qué está pendiente y qué se verificó. La siguiente suite pendiente es `14-settings.spec.js`, TC-157 a TC-166.
El estado verificado documenta la ejecución realizada al entregar este bloque; tu ejecución local generará su propio resultado.

Las evidencias resumidas se conservan por separado: `validation.json` documenta la entrega original del bloque 01; `validation-language.json`, el bloque 02; `validation-currencies.json`, el bloque 03; `validation-all.json`, la última ejecución conjunta. Los reportes HTML y traces se generan localmente y no van dentro del ZIP.

En caso de fallo, la configuración guarda captura, trace y reporte HTML. No cambies un resultado esperado para ocultar un fallo: primero comprobá si el problema está en la app, en el selector o en la preparación del caso.

## Qué comprueba la tercera tanda

| ID | Caso |
|---|---|
| TC-027 | Catálogo de 20 códigos, nombres y banderas locales que cargan sin conexión |
| TC-028 | Orden A–Z en Ajustes, Resumen y selectores de nuevas operaciones |
| TC-029 | Agregar USD y habilitar campos con saldo cero, sin inventar movimientos |
| TC-030 | Excluir duplicados del selector y no alterar datos con selección vacía |
| TC-031 | Permitir cinco monedas y deshabilitar la incorporación de una sexta |
| TC-032 | Rechazar la desactivación de la única moneda activa |
| TC-033 | Desactivar USD conservando saldo, gasto e histórico consultable |
| TC-034 | Reactivar USD y recuperar edición y saldo, sin duplicar el gasto |
| TC-035 | Reemplazar una moneda al límite de cinco, preservando su histórico |
| TC-036 | Conservar selección e histórico al recargar |

**Preparación independiente:** todos empiezan con un navegador limpio y recorren el idioma y wizard por UI. TC-033 a TC-036 crean USD con saldo inicial 100 y un gasto pagado de 10.50. La tenencia esperada es USD 89.50. Ninguno necesita los datos del caso anterior.

**Sin conversiones implícitas:** los casos comparan los registros financieros completos antes y después de desactivar, reactivar o sustituir una moneda. Además comprueban su representación en la pantalla, los formularios de nuevas operaciones y el histórico. Los selectores de histórico pueden conservar monedas inactivas; los de nuevas operaciones deben ofrecer sólo las activas.

**Tipos:** `[P]` positivo, `[N]` negativo, `[B]` borde y `[R]` regresión. Todos los casos de esta tanda operan por UI; las evaluaciones JavaScript son de lectura, salvo la preferencia de conexión preparada en `beforeEach`.

**Incidencia abierta:** TC-035 detectó que el histórico inactivo de Resumen queda sin tamaño visible en Chromium 127. Se conservó la expectativa y el test activo. Revisá `known-issues.md` antes de integrar: en ese entorno la suite produce un fallo real y el job de CI también debe reflejarlo. El contraste del mismo caso en Edge actual pasó; la causa exacta de la diferencia queda pendiente. No se aplicó un arreglo a la app ni se cambió la versión requerida de Playwright.

**Integrar sólo lo nuevo:** agregá `tests/03-currencies.spec.js` y `helpers/currencies.js`. Los tres helpers anteriores se reutilizan sin cambios. `package.json` agrega dos scripts `test:currencies`; su dependencia permanece exactamente `^1.45.0`. `playwright.config.js` agrega la opción `bundled`, sin cambiar el navegador predeterminado. README, seguimiento y evidencias se actualizan; no se modifica la app ni tus archivos `.kash`.

### Revisión 2 de TC-033 — historial, sustituida por la revisión 3

Si ya integraste la tanda 03 original, reemplazá **solamente `tests/03-currencies.spec.js`**. TC-033 ahora tiene 60 segundos de presupuesto total y pasos identificables para diagnosticar el timeout de 30 segundos reportado por el usuario. Conserva todas las verificaciones originales; los `expect` mantienen su límite de 5 segundos. El resto de los casos y helpers no cambia. No hay cambios de dependencias, configuración ni app.

```powershell
npx playwright test tests/03-currencies.spec.js --grep 'TC-033 '
```

El caso revisado se verificó individualmente con Playwright 1.45.0; `validation-tc033-rev2.json` documenta esa ejecución. Las evidencias conjuntas anteriores corresponden a la revisión original de la suite; no se reinterpretan como una nueva ejecución de los 36 casos. No se considera identificada la causa del timeout en la PC del usuario.

### Revisión 3 — preparación y esperas de toda la tanda de monedas

**Si ya tenés la tanda 03, reemplazá estos dos archivos juntos:**

- `tests/03-currencies.spec.js`
- `helpers/currencies.js`

No hace falta cambiar tu configuración, `package.json` ni los helpers anteriores. La dependencia sigue exactamente en `^1.45.0`.

La versión anterior hacía que el wizard de `beforeEach` y las acciones del caso compartieran 30 segundos. Eso podía agotar el presupuesto antes de terminar una comprobación, incluso en casos que habían pasado anteriormente. El mensaje aportado por el usuario en TC-030 es precisamente un timeout global durante la preparación de USD, antes de comprobar duplicados; no es una comparación fallida de monedas.

La revisión 3 usa una **fixture automática con 60 segundos propios** para abrir la app limpia, recorrer el idioma y wizard, y llegar a Ajustes. Cada caso mantiene **30 segundos**, incluido TC-033: ya no necesita el aumento puntual de la revisión 2. Las expectativas mantienen **5 segundos** y las acciones del caso también tienen un máximo de **5 segundos**. Si una acción o un guardado falla, ese fallo debe quedar visible; no se fuerzan clics ni se agregan reintentos.

Las esperas de monedas y saldo inicial ahora hacen **una lectura de localStorage por intento**, sin llamar a otro `expect.poll` por dentro. El error devuelve las monedas realmente persistidas, en lugar de un simple booleano. Se conserva la comprobación de guardado, además de la fila visible en la UI.

El reporte incorpora los pasos de preparación, el tiempo de esa preparación (`currency-setup-timing`) y, si hay fallo, el estado de monedas en memoria, almacenamiento y pantalla (`currency-save-diagnostic`). Esto permite distinguir agotamiento del presupuesto, un control bloqueado y un guardado incorrecto. No se ha demostrado que el guardado de KA$H fallara en la PC del usuario.

**Causa confirmada del TC-030 reportado:** se leyó el trace que quedó en el repositorio de automation del usuario, sin modificarlo. `Before Hooks` consumió **25,516 segundos**. La comprobación de la fila USD terminó a los **29,999 segundos** y la espera del guardado comenzó a los **30,002 segundos**, ya fuera del presupuesto. Falló en aproximadamente **2 ms**, sin llegar a leer localStorage. No fue un fallo de comparación de monedas. El resumen sin datos personales está en `diagnosis-tc030-user.json`.

```powershell
npx playwright test tests/03-currencies.spec.js
```

La evidencia de esta revisión se guarda por separado en `validation-currencies-rev3.json`. Los otros archivos `validation*.json` conservan sus ejecuciones históricas. Las tandas 01 y 02 y la app permanecen sin cambios.

## Tanda 04 · Gastos · TC-037 a TC-054

| ID | Caso |
|---|---|
| TC-037 | Iniciar Gastos vacío, sin movimientos ni importes de ejemplo |
| TC-038 | Crear gasto ARS pendiente y reflejarlo una sola vez en la planilla |
| TC-039 | Registrar ARS, EUR y USD sin mezclar sus importes |
| TC-040 | Conservar acentos, símbolos y etiquetas como texto literal |
| TC-041 | Admitir nota vacía y recortar espacios externos del concepto |
| TC-042 | Rechazar concepto vacío o compuesto por espacios |
| TC-043 | Rechazar monto vacío conservando el borrador |
| TC-044 | Rechazar mes vacío sin crear filas automáticas |
| TC-045 | Rechazar monto cero sin crear movimientos |
| TC-046 | Rechazar texto y un número de 310 dígitos no representable como importe finito |
| TC-047 | Registrar devolución negativa y comprobar su efecto en los saldos |
| TC-048 | Conservar precisión de entrada y redondear sólo la visualización |
| TC-049 | Marcar y desmarcar pagado; actualizar saldo calculado conservando la proyección |
| TC-050 | Editar concepto, monto y nota sin duplicar ni cambiar el ID |
| TC-051 | Cancelar edición preservando los datos y el pago originales |
| TC-052 | Mover el gasto de mes, actualizando las dos columnas sin duplicarlo |
| TC-053 | Cancelar y confirmar borrado; comprobar registros y totales |
| TC-054 | Recargar conservando gastos y proyecto sin insertar recordatorios predeterminados |

### Ejecutarla o practicar un caso

```powershell
npx playwright test tests/04-expenses.spec.js
npx playwright test tests/04-expenses.spec.js --grep 'TC-050 '
npx playwright test tests/04-expenses.spec.js --grep 'TC-052 ' --headed
```

La fixture de inicio dispone de **60 segundos propios**. El caso dispone de otros **60 segundos** para sus operaciones de alta, pago, edición, planilla o borrado; las acciones y expectativas están acotadas a **5 segundos**. Esto evita consumir el tiempo del caso en el wizard y define de antemano un presupuesto común para los recorridos de varias pantallas. No se agregan pausas fijas ni reintentos.

Cada caso crea los datos que necesita por UI. Por ejemplo, TC-050 crea su propio gasto antes de editarlo; TC-053 crea el gasto que luego intenta borrar. TC-039 agrega sus propias monedas. No se necesita ejecutar TC-037 antes de TC-054 ni importar un proyecto con datos.

**Qué se afirma sobre los importes:** los negativos se admiten en la versión actual como devoluciones o ajustes de egresos; TC-047 conserva el signo y verifica gasto -25.50 y saldo +25.50, sin crear un ingreso separado. TC-048 documenta el comportamiento actual: 150.7567 se conserva en datos y se muestra como 150.76. No presupone que se redondee a dos decimales al guardar. Los valores esperados de planilla se especifican en los casos, sin invocar el cálculo interno de la app para obtenerlos.

**Entradas inválidas:** la máscara del campo elimina letras antes de guardar. Se comprueba que abc, NaN e Infinity quedan vacíos y se rechazan. Para probar un desbordamiento se introducen 310 dígitos que permanecen visibles en el campo: no se usa `1e309`, porque el campo elimina la letra e y deja 1309, que ya es otro valor finito.

**Incidencia real detectada por TC-054:** al recargar un proyecto cuyos recordatorios estaban vacíos, la migración agrega Municipal Alsina, Municipal Belgrano y Patente. El caso conserva la expectativa de que no aparezcan datos no ingresados y por eso falla en ese punto. Los gastos, IDs, notas, pagos y totales se verifican por separado. Revisá `known-issues.md` (QA-EXP-001). El caso queda activo y puede dejar el workflow en rojo hasta que se corrija la app; no está omitido ni marcado como fallo esperado.

**Archivos para integrar:** agregá `tests/04-expenses.spec.js` y `helpers/expenses.js`, conservando los helpers y la suite 03 de la revisión 3. Si querés usar los comandos npm, incorporá los scripts `test:expenses` del package incluido; la dependencia se mantiene exactamente en **`^1.45.0`**. El ZIP acumulativo también trae las tandas anteriores. No copies este proyecto sobre la carpeta de la app o sus datos.

Las evidencias de la tanda 04 van en `validation-expenses.json`; las validaciones anteriores conservan sus resultados históricos y no significan que se hayan vuelto a ejecutar todos los casos del catálogo.

## Tanda 05 · Búsqueda y filtros de Gastos · TC-055 a TC-064

| ID | Caso |
|---|---|
| TC-055 | Inicio vacío, cero resultados, opciones disponibles y ausencia de datos inventados |
| TC-056 | Coincidencias parciales y mayúsculas; las notas no se buscan como conceptos |
| TC-057 | Tildes, ñ y espacios externos; conservar el texto registrado |
| TC-058 | Símbolos, etiquetas y caracteres de regex tratados como texto literal |
| TC-059 | Mes y año exactos; separar enero de dos años diferentes y ordenar períodos |
| TC-060 | Monedas A–Z, totales separados e histórico USD después de desactivarlo |
| TC-061 | Intersección de texto, período y moneda, sin resultados de otros filtros |
| TC-062 | Cero coincidencias, mensaje y total cero, conservando filtros y registros |
| TC-063 | Limpiar texto manteniendo dropdowns; restablecer todos los filtros sin duplicados |
| TC-064 | Editar y borrar la fila filtrada correcta, conservar IDs y filas ocultas, actualizar totales y planilla |

### Incorporación y ejecución

Si ya tenés la tanda 04, copiá únicamente `tests/05-expense-filters.spec.js` y `helpers/expense-filters.js`. Necesitan tus helpers anteriores `expenses.js`, `language.js`, `onboarding.js`, `app-server.js` y `currencies.js` de la revisión 3, incluidos sin cambios en el ZIP. Conservá tu configuración y tu archivo de bloqueo. Los scripts npm nuevos son opcionales; `package.json` sigue declarando exactamente `"@playwright/test": "^1.45.0"`.

Desde tu carpeta de automation, con la app en `App`:

```powershell
$env:KASH_APP_DIR = Join-Path (Get-Location) 'App'
npx playwright test tests/05-expense-filters.spec.js

# Practicar un caso por separado, con todos sus datos preparados por él mismo.
npx playwright test tests/05-expense-filters.spec.js --grep 'TC-064 '
npx playwright test tests/05-expense-filters.spec.js --grep 'TC-061 ' --headed
```

La fixture automática recorre idioma, bienvenida y guías en cada contexto limpio; tiene **60 segundos propios**. Cada caso dispone de **60 segundos** para registrar por UI solamente los gastos/monedas que necesita y ejecutar sus verificaciones. Acciones y expectativas: **5 segundos**. No depende de ejecutar casos anteriores ni de tener gastos personales, archivos importados o servicios online. No se inyectan registros en el almacenamiento ni se llama al motor interno de filtrado.

Los filtros sólo ocultan filas: el helper cuenta `tr[data-expense-index]:visible`, verifica los conceptos exactos, el contador de resultados y cada total por moneda. Contar todas las filas del DOM no alcanzaría para validar el resultado. Los importes esperados son valores explícitos, sin obtenerlos de la función de suma de la app. Se comprueba el proyecto completo en memoria y persistido después de filtrar; TC-064 cambia datos deliberadamente por las acciones de edición y borrado, y verifica qué registros deben quedar intactos. Incluye una devolución negativa y estados pagado/pendiente.

**Base usada para verificar:** v0.677 con el parche separado TC-054 aplicado. El ZIP de QA contiene pruebas y documentación; no trae ni reemplaza `App/index.html`. TC-054 y sus evidencias originales se conservan: ejecutar todas las suites contra el HTML original todavía detectará esa incidencia. La nueva tanda no implementa una sexta suite ni corrige la incidencia independiente TC-035 de Chromium 127.

`expense-filters-setup-timing` informa el tiempo del wizard. Ante un fallo se adjunta `expense-filters-diagnostic` con filtros, conceptos visibles, resumen y proyecto de prueba, además del trace y la captura de la configuración incluida. Los errores JavaScript también hacen fallar el caso. No se agregan `skip`, fallos esperados ni reintentos.

Resultados de esta tanda: `validation-expense-filters.json`. Las evidencias de tandas anteriores son históricas; no equivalen a una nueva ejecución de los 64 casos.

**Validación de la tanda 05:** 10/10 aprobados con Playwright **1.45.0** y Chromium **127.0.6533.17**, en **94.8 s**, sin reintentos, omitidos ni errores JavaScript. TC-064 también pasó solo con Edge y las dependencias existentes **1.64.1** en **13.1 s**. Esto no cambia la dependencia declarada `^1.45.0`. Los 24 archivos de la app con parche y todas las suites/helpers anteriores conservaron sus hashes.

## Tanda 06 · Gastos recurrentes · TC-065 a TC-073

| ID | Caso |
|---|---|
| TC-065 | Switch desactivado: un gasto, sin serie ni gastos futuros |
| TC-066 | Copias pendientes hasta diciembre, incluso con origen pagado; importes, notas e IDs |
| TC-067 | Inicio en diciembre sin enero automático; series idénticas separadas en ARS y USD |
| TC-068 | Editar sólo un mes conservando plantilla, demás meses e IDs |
| TC-069 | Editar este y siguientes pendientes, respetando anteriores, pagos y excepciones |
| TC-070 | Detener: cancelar, rechazar mes vacío/anterior al inicio, confirmar y conservar histórico, pagos y excepciones |
| TC-071 | Borrar sólo un mes, cancelar/confirmar y evitar que reaparezca al guardar la serie |
| TC-072 | Rechazar mover una repetición a un mes ocupado, sin mutar datos ni IDs |
| TC-073 | Recargar serie detenida, reactivar la misma y recargar sin duplicados ni pérdida de pagos |

### Incorporación y ejecución

Con las tandas anteriores ya instaladas, agregá solamente `tests/06-recurring-expenses.spec.js` y `helpers/recurring-expenses.js`. Se reutilizan los helpers anteriores, incluido `expense-filters.js` de la tanda 05; no se reemplazan. Conservá la ruta de `App` ya configurada en tu `helpers/app-server.js`, tu configuración, dependencias y archivo de bloqueo.

Desde la terminal del proyecto, con la ruta de la app ya resuelta:

```powershell
npx playwright test tests/06-recurring-expenses.spec.js

# Un caso independiente, incluyendo su preparación desde cero.
npx playwright test tests/06-recurring-expenses.spec.js --grep 'TC-070 '
npx playwright test tests/06-recurring-expenses.spec.js --grep 'TC-073 ' --headed
```

Si todavía no configuraste la ubicación de la app, `KASH_APP_DIR` sigue siendo una alternativa. No hace falta volver a configurarla por cada caso en la misma terminal. Los scripts npm `test:recurring-expenses` y `test:recurring-expenses:headed` son opcionales. `package.json` mantiene exactamente `"@playwright/test": "^1.45.0"`; el ZIP no trae un lockfile nuevo.

### Preparación y verificaciones

Cada caso inicia con navegador limpio, elige inglés y recorre el wizard por UI. La fixture tiene **60 s propios**; cada caso otros **60 s**, con acciones y expectativas de **5 s**. Sólo se crean las monedas y los gastos que requiere ese caso; no depende de pruebas anteriores, archivos personales ni servicios online. Se pulsa el switch visible y se usan filtros reales para elegir cada repetición por **moneda, mes y concepto**, evitando confundir filas con el mismo nombre.

Los meses se construyen con el año del formulario y meses explícitos de agosto a diciembre. Así se verifican las mismas cantidades y excepciones aunque se ejecute en enero o diciembre, sin alterar el reloj del sistema. Diciembre no crea enero del año siguiente: la política actual genera hasta diciembre del año de inicio. Las copias son pendientes; el estado pagado del origen no se propaga.

Las expectativas usan meses, importes y estados explícitos, sin invocar el generador interno para obtener lo esperado. Se comparan registros completos e IDs antes/después de cada operación, vínculo con la serie, meses omitidos, configuración persistida y totales de planilla. TC-069 reserva meses distintos para un pago y una excepción individual: ninguno debe sobrescribirse al aplicar una tarifa futura. TC-070 conserva ambos y elimina sólo las copias automáticas pendientes elegibles. TC-071 verifica el mes omitido y que volver a guardar no lo regenere. TC-073 comprueba que reaparecen sólo las copias retiradas y que dos recargas conservan los IDs existentes.

La recarga puede normalizar `nid`, contador para IDs nuevos; se admite ese contador mayor o igual, pero se exige que los IDs de gastos existentes y el resto del proyecto no cambien. La app usada para validar incluye el parche separado TC-054. La tanda 06 no modifica la app ni vuelve a distribuir su HTML.

Ante fallos se adjunta `recurring-expenses-diagnostic` con proyecto de prueba en memoria y persistido, filtros y modal; el reporte conserva el trace y la captura cuando tu configuración los habilita. `recurring-expenses-setup-timing` registra el wizard. Los errores JavaScript hacen fallar el caso. Sin `skip`, `test.fail`, retries ni pausas fijas.

La evidencia de esta tanda se entrega en `validation-recurring-expenses.json`. Las otras validaciones conservan su alcance histórico; no significan que se haya vuelto a ejecutar todo el catálogo.

**Validación de la tanda 06:** 9/9 aprobados con Playwright **1.45.0** y Chromium **127.0.6533.17**, en **134.5 s**. TC-070 y TC-073 también pasaron en una ejecución separada con Edge y las dependencias existentes **1.64.1**, en **31.0 s**. Cero fallos, omisiones, reintentos y errores JavaScript en ambas ejecuciones. Los 24 archivos de la app con parche y las suites/helpers anteriores no se modificaron. La dependencia del proyecto continúa en **`^1.45.0`**.

## Tanda 07 · Consumos Mensuales · TC-074 a TC-088

| ID | Caso |
|---|---|
| TC-074 | Planilla vacía con doce meses, totales cero y cierres sin registrar |
| TC-075 | Crear rubros/servicios de ingresos y egresos, separando ARS y USD |
| TC-076 | Rechazar rubros vacíos o duplicados; permitir mismo nombre en distinto tipo |
| TC-077 | Rechazar servicio sin rubro o con nombre vacío |
| TC-078 | Editar decimales con doble clic y Enter sin duplicar datos |
| TC-079 | Escape descarta el borrador; salir del campo confirma la edición |
| TC-080 | Pago y desmarcado modifican la tenencia calculada conservando el importe y la proyección |
| TC-081 | Cero y Delete limpian importe/pago sin borrar el servicio |
| TC-082 | Egreso negativo como devolución, conservando signo y efecto en totales |
| TC-083 | Navegar con flechas sin modificar datos ni cruzar límites de columnas |
| TC-084 | Copiar/pegar importe y estado de pago a otro mes, sin crear servicios |
| TC-085 | Fila automática de Gastos de sólo lectura, nota generada y check que paga todos los ítems |
| TC-086 | Detalle de pagos: cancelar o guardar una selección parcial sin alterar importes/notas |
| TC-087 | Renombrar con símbolos como texto literal, conservando celdas y pagos |
| TC-088 | Navegar años y recargar sin perder estructura, celdas o IDs ni repetir wizards |

### Incorporación y ejecución

Si ya tenés las seis tandas, agregá sólo `tests/07-monthly-budget.spec.js` y `helpers/monthly-budget.js`. No reemplaces tu `app-server.js` si ya configuraste `../App`, ni tu configuración o lockfile. Los helpers anteriores se reutilizan sin modificaciones. El ZIP mantiene `"@playwright/test": "^1.45.0"`; sólo agrega dos scripts npm opcionales.

```powershell
npx playwright test tests/07-monthly-budget.spec.js
npx playwright test tests/07-monthly-budget.spec.js --grep 'TC-080 '
npx playwright test tests/07-monthly-budget.spec.js --grep 'TC-086 ' --headed
```

La app debe estar en la ruta que tu `app-server.js` ya tiene configurada. `KASH_APP_DIR` sigue disponible como alternativa, sin necesidad de establecerla antes de cada caso en la misma terminal.

### Preparación y alcance

Cada caso recorre idioma y wizard en un contexto limpio. La fixture dispone de **60 s propios**, y cada caso de otros **60 s**; acciones y expectativas: **5 s**. Los rubros, servicios, monedas y gastos de prueba se crean mediante la UI. No se importa un proyecto preparado, no se inyecta `D` ni se llama al editor o al cálculo interno desde las pruebas. Los datos esperados de celdas y totales son explícitos; la API pública de exportación se usa sólo para lectura.

Las celdas se localizan por ID real del servicio y mes (`data-key`). Los importes se editan con doble clic o Enter y se confirman con Enter o pérdida de foco; Escape conserva el valor original. Se verifican registros en memoria y autoguardados, además de las cantidades visibles. Una celda con importe cero no se marca como pagada. Borrar su importe conserva el servicio; no equivale a borrar un gasto detallado.

TC-083 prueba navegación de teclado en el año siguiente para disponer siempre de doce meses editables, aunque se ejecute en diciembre. TC-084 concede permiso de clipboard al contexto aislado y usa Ctrl+C/Ctrl+V reales; no escribe la variable interna de clipboard. Los casos con dos meses usan el siguiente mes calendario y contemplan el salto de diciembre a enero.

Las filas automáticas se preparan desde Gastos. TC-085 intenta doble clic, Enter y Delete y comprueba que el total siga intacto, que conserve la nota descriptiva generada y que el check principal pague todos los ítems. TC-086 usa botón derecho → Edit expenses para abrir el detalle fijo, comprueba pagado/pendiente, cancela un borrador y luego guarda otra selección. Conserva nombres, importes y notas originales; no presenta el detalle automático como una celda manual editable.

TC-087 comprueba que el nombre se actualiza en todos los períodos sin tocar importes, pagos ni notas de celdas. TC-088 compara el proyecto completo después de recargar, admitiendo sólo la normalización del contador `nid`; los IDs existentes deben ser los mismos. La app usada para verificar es v0.677 con el parche TC-054 ya aplicado. No se cambia ni redistribuye la app para esta tanda.

Ante un fallo, `monthly-budget-diagnostic` adjunta proyecto de prueba en memoria/persistido, año, celda seleccionada, borrador y modal. `monthly-budget-setup-timing` identifica el tiempo del wizard. Se conservan capturas/traces según tu configuración. Los errores JavaScript hacen fallar el caso. Sin pausas fijas, reintentos, skips ni fallos esperados.

La evidencia nueva corresponde a `validation-monthly-budget.json`; las validaciones de las tandas anteriores conservan su alcance histórico.

**Validación de la tanda 07:** 15/15 aprobados con Playwright **1.45.0** y Chromium **127.0.6533.17**, en **158.6 s**. TC-084, TC-086 y TC-088 pasaron también en una ejecución separada con Edge y las dependencias existentes **1.64.1**, en **43.5 s**. Sin fallos, omisiones, reintentos ni errores JavaScript en ambas ejecuciones. Los 24 archivos de la app con parche y las suites/helpers anteriores conservaron sus hashes. La dependencia declarada continúa en **`^1.45.0`**.

## Tanda 08 · Saldos y remanentes · TC-089 a TC-102

| ID | Caso |
|---|---|
| TC-089 | Cierre ausente es guion; abrir y salir sin editar no confirma cero |
| TC-090 | Saldos iniciales independientes en ARS, USD y EUR, sin crear ingresos ni cierres |
| TC-091 | Distinguir calculado de proyectado al confirmar ingresos y gastos |
| TC-092 | Cierre manual separado del calculado actual y referencia para el mes siguiente |
| TC-093 | Cero ARS confirmado es válido y reinicia la referencia del mes siguiente |
| TC-094 | Ceros USD/EUR independientes; borrar EUR no elimina USD ni confirma ARS |
| TC-095 | Borrar cierre ARS vuelve al cálculo por movimientos sin modificar transacciones |
| TC-096 | Escape cancela cierres nuevos y cambios sobre cierres existentes |
| TC-097 | Reemplazar un cierre con decimales/negativos sin duplicar su referencia |
| TC-098 | Usar el último cierre anterior; modificar uno antiguo respeta otro posterior |
| TC-099 | Continuidad de diciembre a enero sin reiniciar saldos |
| TC-100 | Calculado y estimado son de sólo lectura en planilla y Resumen |
| TC-101 | Desactivar USD conserva bases, cierre e histórico y bloquea editar su cierre |
| TC-102 | Recargar bases y cierres por moneda, incluido ARS cero, conservando datos e IDs |

### Incorporación y ejecución

Agregá sólo `tests/08-balances.spec.js` y `helpers/balances.js` si ya tenés las siete tandas anteriores. Se reutilizan, sin cambios, los helpers de monedas, idioma, Gastos y planilla. Conservá el `app-server.js` con la ruta de `App` que ya configuraste, tu configuración y tu lockfile. Los scripts npm nuevos son opcionales; `package.json` sigue declarando exactamente `"@playwright/test": "^1.45.0"`.

```powershell
npx playwright test tests/08-balances.spec.js
npx playwright test tests/08-balances.spec.js --grep 'TC-093 '
npx playwright test tests/08-balances.spec.js --grep 'TC-098 ' --headed
```

Cada caso elige idioma y recorre el wizard en un contexto limpio. Preparación: **60 s propios**. Caso: **60 s**. Acciones/expectativas: **5 s**. Bases, ingresos, gastos, pagos y cierres se cargan exclusivamente por UI; no depende de casos previos, servicios online ni datos personales. Se verifica la persistencia real y la API pública se usa sólo para leer el proyecto. No se invocan los cálculos internos para producir las expectativas.

### Qué comprueban los números

- **Saldo inicial:** punto de partida de cada moneda. No crea un ingreso, un gasto ni un cierre mensual.
- **Tenencia calculada:** parte de la base o del último cierre anterior e incorpora movimientos confirmados. El cierre manual del mismo mes se mantiene separado.
- **Remanente estimado:** incluye lo registrado para el período, aunque todavía esté pendiente. Por ejemplo, base ARS 1.000, ingreso pendiente 300, gasto pagado 100 y pendiente 50 dan calculado 900 y proyectado 1.150. Confirmar los pagos/cobros cambia el calculado y conserva lo planificado.
- **Saldo comprobado:** referencia manual del cierre. Si el calculado del mes es 900 y se registra un cierre 850, el calculado del mismo mes sigue en 900 y el siguiente parte de 850. La diferencia no se registra como una transacción inventada.
- **Vacío y cero:** guion significa sin cierre. Cero ingresado es una referencia válida, incluida su marca de confirmación ARS. Borrar el campo quita la referencia y recupera el cálculo por movimientos.

Las expectativas de importes y meses son explícitas. TC-098 usa tres meses, dos cierres y pagos concretos: corregir el primero modifica el mes intermedio pero no salta por encima del cierre más reciente. TC-099 cruza diciembre/enero sin tocar el reloj del sistema. TC-094 prueba la eliminación de una moneda en el mapa de cierres conservando la de otra. TC-102 combina un cierre ARS cero, un cierre USD con decimales y pagos/pendientes en dos meses.

Los meses futuros en los que se comprueba una proyección ARS tienen gastos de prueba registrados. La versión de referencia muestra cero en proyecciones ARS futuras sin movimientos; la suite no interpreta ese estado de presentación como un cierre en cero ni como una pérdida de la base. La base probada sigue siendo v0.677 con el parche separado TC-054. No se modifica ni redistribuye la app.

Ante un fallo se adjunta `balances-diagnostic` con proyecto de prueba en memoria/persistido, año, borrador, filas de totales y modal. `balances-setup-timing` informa el tiempo del wizard. Se mantienen captura/trace según tu configuración y los errores JavaScript hacen fallar el caso. Sin pausas fijas, force, omisiones, fallos esperados ni reintentos.

La evidencia nueva va en `validation-balances.json`. Las otras validaciones conservan su alcance histórico; no indican una nueva ejecución de todo el catálogo.

**Validación de la tanda 08:** 14/14 aprobados con Playwright **1.45.0** y Chromium **127.0.6533.17**, en **168.5 s**. TC-093, TC-098 y TC-102 pasaron también en ejecución separada con Edge y las dependencias existentes **1.64.1**, en **42.1 s**. Cero fallos, omitidos, reintentos y errores JavaScript en ambas ejecuciones. Los 24 archivos de la app con parche y todas las suites/helpers anteriores conservaron sus hashes. La dependencia del proyecto continúa en **`^1.45.0`**.

## Revisión 2 de la tanda 08 · TC-090

Si ya instalaste la tanda 08, **reemplazá únicamente `tests/08-balances.spec.js`**. Conservá `helpers/balances.js`, tu `app-server.js`, la app, configuración, `package.json` y lockfile. No hay cambios de dependencias.

El trace del fallo registrado muestra 34,2 s para habilitar USD/EUR, incluidos 28,0 s de EUR. Ese trabajo compartía los 60 s del caso con varias visitas repetidas a Ajustes, Planilla y Resumen. El timeout llegó durante la comprobación de EUR; no se registró una comparación de saldo fallida. Las comprobaciones que terminaron durante la limpieza no convierten el resultado original en aprobado. No se determinó qué provocó la lentitud del equipo.

Ahora TC-090 solicita una fixture de monedas con **60 s propios**, después del wizard limpio. El cuerpo del caso conserva **60 s** y las acciones/expectativas **5 s**. Carga las tres bases antes de comparar las tres monedas en Planilla y luego las tres tarjetas en Resumen. Esto también detecta si cargar una base altera otra. Se mantienen todos los controles de saldos, ausencia de ingresos/gastos/cierres y persistencia; se añade la ausencia de confirmaciones ARS. Los otros trece casos no ejecutan la fixture nueva y sus cuerpos permanecen intactos. Sin retries, sleeps ni cambios en la app.

```powershell
npx playwright test tests/08-balances.spec.js --grep 'TC-090 '
npx playwright test tests/08-balances.spec.js
```

Validación REV2: **14/14 aprobados en 232.9 s**, con Playwright **1.45.0** y Chromium **127.0.6533.17**. TC-090 pasó además en una ejecución independiente con acciones ralentizadas 500 ms, en **36.8 s** de ejecución completa. Cero fallos, omisiones, reintentos y errores JavaScript. Los 24 assets de la app con parche permanecen intactos. Evidencia: `validation-balances-rev2.json` y `diagnosis-tc090-user.json`; los reportes anteriores conservan su alcance histórico.

## Tanda 09 · Ajustes de saldo · TC-103 a TC-110

| ID | Caso |
|---|---|
| TC-103 | Abrir ajustes vacíos muestra formulario y tabla sin crear movimientos |
| TC-104 | Ajuste a favor con decimales y nota literal aumenta ARS sin crear ingresos ni cierres |
| TC-105 | Tipo del ajuste define el signo aun con monto negativo y separa monedas y meses |
| TC-106 | Rechazar fecha o monto ausente, cero y texto no numérico sin guardar el borrador |
| TC-107 | Editar fecha, moneda, signo y nota del registro correcto conserva ID y recalcula ambos meses |
| TC-108 | Cancelar una edición descarta fecha, moneda, importe y nota sin cambiar IDs ni saldos |
| TC-109 | Cancelar y confirmar borrado en tabla ordenada elimina sólo el ajuste elegido y revierte su efecto |
| TC-110 | Recargar conserva ajustes e IDs y un cierre anterior evita volver a sumar ajustes ya conciliados |

### Incorporación y ejecución

Si ya tenés la tanda 08, agregá **únicamente** `tests/09-balance-adjustments.spec.js` y `helpers/balance-adjustments.js`. Los helpers de idiomas, monedas, Gastos, Planilla y Saldos se reutilizan sin cambios. Conservá tu `app-server.js`, la ruta `App`, configuración, `package.json` y lockfile. Los scripts npm nuevos son opcionales; el paquete mantiene exactamente **"@playwright/test": "^1.45.0"**.

```powershell
npx playwright test tests/09-balance-adjustments.spec.js
npx playwright test tests/09-balance-adjustments.spec.js --grep 'TC-107 '
npx playwright test tests/09-balance-adjustments.spec.js --grep 'TC-110 ' --headed
```

### Preparación independiente

La fixture automática equivale a la preparación común de un `beforeEach`: cada caso abre un contexto limpio, elige inglés, crea el proyecto vacío desde el wizard y desactiva las guías automáticas mediante F1. No importa archivos con datos ya preparados ni reutiliza registros de otro caso. Su presupuesto es **60 s propios**. Los casos que reciben `withUSD` agregan USD por los controles reales en una fixture opcional separada, de **60 s propios**. El cuerpo conserva **60 s**, acciones y expectativas **5 s**.

La preferencia de conexión y el bloqueo de solicitudes externas mantienen los casos independientes del cotizador online. Ningún dato financiero se inyecta. Se usan la exportación pública y el almacenamiento local sólo para lectura. No se llama a los cálculos internos para producir lo esperado. Los errores JavaScript hacen fallar el caso; ante un fallo se adjunta `adjustments-diagnostic` con proyecto de prueba, formulario, tabla y modal. `adjustments-setup-timing` y, cuando corresponde, `adjustments-currency-timing` separan los tiempos de preparación. Captura/trace siguen tu configuración habitual.

### Reglas financieras y puntos para practicar

- El saldo inicial es la base; el ajuste corrige una diferencia desde el mes de su fecha. El registro conserva su fecha exacta, pero la planilla calcula por mes. No se presenta un saldo diario.
- TC-104 parte de ARS 1.000 y suma 75,25: calculado y estimado actuales son 1.075,25. Un gasto pendiente de 20 al mes siguiente deja calculado 1.075,25 y estimado 1.055,25. La nota con `<b>`, comillas, acentos y `&` permanece como texto literal.
- El selector define el signo. En TC-105, USD 200 menos 25,50 más 10,25 da USD 184,75, aunque el usuario escriba el importe con signo negativo en ambos formularios. La nota puede estar vacía. No se confunde un ajuste con un gasto ni con un cierre.
- Editar conserva el ID y reemplaza el ajuste. La tabla ordena por fecha y conserva índices originales en sus botones: TC-107 comprueba que editar la segunda fila visual afecte al registro correcto, pueda mover moneda/mes/signo y no altere el otro ajuste. TC-109 prueba lo mismo al borrar, incluida la cancelación del diálogo.
- Los intentos inválidos y las ediciones canceladas comparan el proyecto completo con el anterior. Los ajustes guardados comparan todos los campos ajenos a `tenAdjustments`; así se detecta si aparecen ingresos, gastos, cierres o cambios de base inesperados.
- TC-110 parte de USD 200, suma 10,25 y registra un cierre de 150,25. El calculado de ese mes sigue en 210,25, separado del cierre. Al mes siguiente se parte del cierre, se resta un nuevo ajuste de 5,50 y queda calculado 144,75; un gasto pendiente de 10 lleva el estimado a 134,75. El ajuste previo al cierre no se suma otra vez. Recargar conserva IDs, fechas, notas, cierres y el gasto original.

Al recargar se admite que el contador interno `nid` del próximo ID se normalice en memoria. Los IDs existentes, la lista completa de ajustes y todos los demás campos financieros deben seguir iguales; también se comparan con los datos persistidos. Esa normalización no equivale a cambiar IDs de registros.

La suite no agrega pausas fijas, force, retries, skips ni fallos esperados. Las expectativas de moneda, signo, meses y valores son explícitas. Los meses siguientes contemplan el salto de diciembre a enero. La base es v0.677 con el parche separado TC-054; no se modifica ni redistribuye la app.

**Validación de la tanda 09:** **8/8 aprobados en 118.2 s**, Playwright **1.45.0** y Chromium **127.0.6533.17**. TC-107 y TC-110 pasaron además en una ejecución separada con Edge y las dependencias existentes **1.64.1**, en **31.8 s**. Sin fallos, omitidos, reintentos o errores JavaScript. Evidencia nueva: `validation-balance-adjustments.json`. Los 24 assets de la app y todas las suites/helpers/evidencias anteriores permanecen intactos, incluida la revisión TC-090. Las evidencias anteriores mantienen su alcance histórico; no se ejecutó todo el catálogo de 110 casos en esta tanda.

## Tanda 10 · Cambio de divisas · TC-111 a TC-122

| ID | Caso |
|---|---|
| TC-111 | Cambio vacío requiere dos monedas activas y habilitarlas no crea operaciones |
| TC-112 | Vender USD por ARS multiplica la tasa y descuenta la comisión sólo de USD |
| TC-113 | Comprar USD con ARS divide por la cotización y cobra la comisión en ARS |
| TC-114 | Cambiar USD por EUR aplica tasa directa sin convertir ni alterar ARS |
| TC-115 | Conservar precisión en monto y comisión y redondear sólo la presentación de tres cambios |
| TC-116 | Rechazar monedas iguales, mes ausente y monto o tasa vacíos, cero, negativos o no numéricos |
| TC-117 | Editar una fila ordenada cambia mes, monedas, tasa y comisión sin duplicar ni tocar otro cambio |
| TC-118 | Cancelar la edición descarta todo el borrador y conserva cambios y saldos originales |
| TC-119 | Cancelar y confirmar borrado bajo filtros afecta al índice original y revierte sólo ese cambio |
| TC-120 | Combinar filtros de mes, monedas, nota, tasa y comisión y limpiarlos no modifica el proyecto |
| TC-121 | Desactivar USD conserva sus cambios e histórico consultable y bloquea editarlos hasta reactivarlo |
| TC-122 | Recargar conserva cambios, gastos y cierre por moneda y mantiene saldos sin contar dos veces el pasado |

### Incorporación y ejecución

Si ya tenés las nueve tandas anteriores, agregá **únicamente** `tests/10-currency-exchange.spec.js` y `helpers/currency-exchange.js`. Se reutilizan sin cambios los helpers de idiomas, monedas, Gastos, Planilla y Saldos. Conservá la ruta que configuraste en `app-server.js`, tu configuración, `package.json` y lockfile. El paquete incluye dos scripts npm opcionales y mantiene exactamente **"@playwright/test": "^1.45.0"**.

```powershell
npx playwright test tests/10-currency-exchange.spec.js
npx playwright test tests/10-currency-exchange.spec.js --grep 'TC-119 '
npx playwright test tests/10-currency-exchange.spec.js --grep 'TC-122 ' --headed
```

### Preparación y selectores

Cada caso abre un contexto limpio, elige inglés y crea su proyecto vacío desde el wizard. La fixture común tiene **60 s propios**. `withUSD` habilita USD por UI en otra fixture de **60 s propios**; `withEUR` depende de ella y agrega EUR en una tercera, también con **60 s propios**. Únicamente se ejecutan cuando el caso las solicita. El cuerpo conserva **60 s**, acciones y expectativas **5 s**. TC-111 comprueba el bloqueo con una sola moneda y habilita USD dentro del caso para verificar el cambio de estado del botón.

Las operaciones usan los controles reales `#m1`, `#m2`, `#fa`, `#ft`, `#fc`, `#fd` y `#fn`. La tabla publica `data-fx-index`, que apunta al array original aun cuando las filas estén filtradas u ordenadas por mes. Esta versión no asigna ID al cambio: se compara el registro completo, su posición original y los demás registros. No se inventan IDs ni se busca por la posición visual de la fila.

Todos los datos financieros se cargan por UI. La exportación pública y el almacenamiento local se usan sólo para lectura. Las tasas son manuales y las conexiones externas se bloquean para hacer la suite independiente del cotizador. Los errores JavaScript hacen fallar el caso. Ante un fallo se adjunta `exchange-diagnostic` con proyecto de prueba, formulario, filtros, tabla y modal. `exchange-setup-timing`, `exchange-currency-timing` y `exchange-extra-currency-timing` identifican cada preparación. Capturas y traces siguen tu configuración habitual. Sin sleeps, force, retries, skips ni fallos esperados.

### Qué comprueban los importes

- **Vender USD:** TC-112 parte de ARS 10.000 y USD 1.000. Entregar USD 100 a tasa 1.500 recibe ARS 150.000; una comisión de USD 2,50 deja USD 897,50 y ARS 160.000. La comisión se descuenta de la moneda de origen. La nota conserva espacios, acentos, comillas, `&` y etiquetas como texto literal.
- **Comprar USD con ARS:** TC-113 parte de ARS 200.000 y USD 100. Entregar ARS 150.000 a cotización 1.500 recibe USD 100. Una comisión ARS 1.000 deja ARS 49.000 y USD 200. Esta combinación usa división, según la convención visible de la app: ARS por USD.
- **Cruce entre monedas:** TC-114 entrega USD 100 a tasa EUR 0,80 por USD y recibe EUR 80. Con bases USD 500/EUR 50 y comisión USD 1,25 quedan USD 398,75 y EUR 130; ARS conserva cero. La tasa directa se distingue de la convención de compra con ARS.
- **Precisión:** TC-115 crea tres cambios de USD 1,23456 a EUR 0,8, con comisión USD 0,00004 cada uno. Cada fila muestra EUR 0,99, pero el acumulado exacto es EUR 2,962944 y debe mostrar **EUR 2,96**. Sumar importes redondeados por fila daría 2,97 y fallaría el caso. Se verifica que los importes originales sigan completos en los datos.
- **Validaciones:** TC-116 conserva un cambio válido mientras rechaza monto/tasa vacíos, cero, negativos y texto no numérico, un mes ausente y monedas iguales. Compara el proyecto completo después de cada rechazo y conserva el borrador. La app permite registrar operaciones que dejan saldos negativos; el registro previo de esta prueba refleja esa regla.
- **Edición y cancelación:** TC-117 cambia mes, par de monedas, tasa, comisión y nota en una fila cuyo índice original difiere de su posición visual. Debe reemplazar un único registro y recalcular ambos períodos. TC-118 cancela un borrador completo y comprueba que reabrir recupere los valores originales.
- **Borrado con filtros:** TC-119 deja visible sólo el índice original 1, cancela una vez y luego confirma. Deben conservarse los registros originales 0 y 2, revertirse el efecto financiero del eliminado y actualizarse el contador/estado vacío filtrado. Limpiar filtros recupera las filas restantes con sus índices actuales.
- **Consulta:** TC-120 combina mes, monedas de origen/destino, nota, tasa y comisión por intersección. Prueba cero resultados, búsqueda sin distinguir mayúsculas y etiquetas literales; limpiar restablece todos los controles. Se compara el proyecto completo para detectar escrituras inesperadas por filtrar.
- **Moneda inactiva:** TC-121 conserva USD en el histórico y sus filtros, lo excluye de nuevas operaciones y deshabilita la edición. La reactivación por UI recupera los controles sin duplicar ni convertir registros.
- **Cierre y recarga:** TC-122 combina tres cambios, un gasto ARS pagado, uno USD pendiente y un cierre manual USD 160. El calculado del mes del cierre sigue en USD 174,50; al mes siguiente parte del cierre y queda calculado USD 154,75 y estimado USD 149,75. Las operaciones anteriores al cierre no vuelven a sumarse. Se conservan registros, notas, comisiones, monedas, tasas e IDs de gastos. Recargar puede normalizar el contador interno `nid`; los registros financieros y sus IDs existentes deben seguir iguales.

Se contemplan meses de diciembre/enero sin cambiar el reloj del sistema. Los importes esperados son explícitos, sin llamar al cálculo interno de cambios o saldos. Las comprobaciones de altas, edición y borrado comparan todos los campos ajenos a `fx`: no deben aparecer gastos, ingresos, ajustes, cierres o cambios de base por registrar una operación. La base es **v0.677 con el parche separado TC-054**; no se modifica ni redistribuye la app.

**Validación del módulo 10:** **12/12 aprobados en 233.6 s**, Playwright **1.45.0** y Chromium **127.0.6533.17**. TC-117, TC-119 y TC-122 pasaron además por separado con Edge y las dependencias existentes **1.64.1**, en **74.0 s**. Sin fallos, omitidos, reintentos ni errores JavaScript. Evidencia: `validation-currency-exchange.json`. Los 24 assets de la app y todas las suites/helpers/evidencias anteriores conservan sus bytes. Las evidencias anteriores son históricas; no se ejecutó el catálogo completo de 122 casos en esta tanda.

## Tanda 11 · Resumen · TC-123 a TC-134

| ID | Caso |
|---|---|
| TC-123 | Resumen vacío muestra una moneda en cero, estados vacíos y gráficos sin NaN ni datos inventados |
| TC-124 | Navegar períodos respeta el inicio y cruza diciembre/enero mostrando los saldos del mes elegido |
| TC-125 | Movimientos confirmados separan monedas y no confunden flujo neto con saldo o remanente estimado |
| TC-126 | Ojitos abren desgloses con pagos y cambios correctos y cerrar o pulsar Escape no altera datos |
| TC-127 | Detalle de tenencia concilia base, pagos, cambio, ajuste y cierre sin reemplazar el calculado |
| TC-128 | Variación mensual muestra subida, bajada y cero con tooltip propio y base anterior correcta |
| TC-129 | Base anterior cero no divide por cero y una base negativa usa porcentaje sobre su valor absoluto |
| TC-130 | Moneda de gráficos cambia distribución, barras y tendencia sin convertir tarjetas ni alterar el cotizador |
| TC-131 | Período de distribución es independiente del Resumen y actualizarlo no cambia tarjetas ni datos |
| TC-132 | Ocultar y restaurar gráficos, cotizador y variación conserva tarjetas, saldos y movimientos |
| TC-133 | Arrastre visible y teclado intercambian tarjetas; Escape y límites conservan el orden y los datos |
| TC-134 | Cinco tarjetas conservan importes, orden personalizado y preferencias al recargar sin duplicar datos |

### Incorporación y ejecución

Si ya tenés las diez tandas anteriores, agregá **únicamente** `tests/11-summary.spec.js` y `helpers/summary.js`. Se reutilizan sus helpers sin modificarlos. Conservá el `app-server.js` con tu ruta App, configuración, `package.json` y lockfile. Los dos scripts npm incluidos son opcionales; la dependencia mantiene exactamente **"@playwright/test": "^1.45.0"**.

```powershell
npx playwright test tests/11-summary.spec.js
npx playwright test tests/11-summary.spec.js --grep 'TC-126 '
npx playwright test tests/11-summary.spec.js --grep 'TC-133 ' --headed
```

### Preparación desde cero

Cada caso usa un contexto limpio, elige inglés y crea el proyecto vacío desde el wizard. Los gráficos comienzan desactivados en esta versión: la fixture los activa **por la UI de Ajustes**, sin insertar datos de ejemplo. La preparación común tiene **60 s propios**. USD, EUR, cinco monedas y el conjunto de movimientos confirmados son fixtures opcionales, cada una con **60 s propios**, que se ejecutan únicamente cuando el caso las solicita. El cuerpo conserva **60 s** y las acciones/expectativas **5 s**. No se depende de casos anteriores.

La fixture `confirmedSummary` carga por UI base ARS 1.000/USD 100, ingreso cobrado ARS 200 y pendiente 300, gasto pagado ARS 50 y pendiente 75, venta USD 10 a tasa 2 con comisión USD 1, y ajuste ARS +5. Los casos leen esas transacciones para identificarlas; los valores esperados de las tarjetas son explícitos, sin invocar el cálculo interno.

Se bloquean solicitudes externas. Cuando se necesita ver el cotizador, la opción de conexión se habilita desde Ajustes; no se prueban precios online ni se inventan respuestas de cotización. Los datos financieros se crean por UI y la exportación pública/localStorage se usan sólo para leer y comparar. Errores JavaScript hacen fallar el caso. Ante un fallo se adjunta `summary-diagnostic` con proyecto, tarjetas, selectores, detalle, tooltip y estado del arrastre. Los adjuntos `summary-*-timing` muestran cuánto consume cada fixture. Capturas/traces siguen tu configuración. Sin esperas fijas, force, omisiones ni retries.

### Qué practicar con los casos

- TC-123 comprueba ARS cero, ausencia de movimientos y estados vacíos de gráficos. Los atributos SVG y textos deben conservar valores finitos; un gráfico vacío no debe introducir movimientos.
- TC-124 impide navegar antes del inicio y cruza diciembre/enero con las flechas. USD 100 menos un pago de 10 en diciembre muestra 90; un gasto pendiente de 5 en enero mantiene calculado 90 y estimado 85. Los selectores de año y mes deben acompañar el período y la consulta conserva todo el proyecto.
- TC-125 separa flujo del mes, dinero acumulado y planificación. La mezcla preparada da **entradas ARS 220, salidas 50 y neto 170**, pero **tenencia ARS 1.175 y remanente estimado 1.400**. USD muestra salidas 11, neto −11 y saldo 89. Ingresos/gastos pendientes no entran en movimientos confirmados; el ajuste afecta al saldo, sin convertirse en ingreso.
- TC-126 usa los botones de ojito y comprueba filas/importes del modal de ingresos, egresos y neto. Excluye el ingreso pendiente y el gasto sin pagar. La salida USD incluye su comisión. Las etiquetas del usuario permanecen como texto literal; cerrar con X o Escape conserva el proyecto.
- TC-127 registra un cierre manual ARS 1.180 y abre el desglose por mouse y Enter. Debe mostrar base 1.000, ingreso 200, egreso −50, cambio neto +20, ajuste +5, calculado 1.175, comprobado 1.180 y diferencia +5. El cierre no reemplaza el cálculo actual. Cerrar devuelve el foco a la tarjeta.
- TC-128 verifica +10%, −20% y 0% entre meses, además del tooltip propio `#kashAppTooltip`, su relación accesible, el saldo anterior y la variación monetaria. No debe conservar un `title` nativo ni fondo blanco de Windows en el tema oscuro de prueba. Escape lo cierra sin escrituras.
- TC-129 parte de USD −100 y suma 50: una mejora a −50 representa +50% usando el valor absoluto de la base. Una devolución EUR de 10 desde base cero muestra **No baseline**, sin NaN o Infinity. Un saldo sin cambio conserva 0%.
- TC-130 cambia la moneda de gráficos de ARS a USD/EUR. Verifica el total del donut, ranking, valor del tooltip de barras y del punto de tendencia. Los gráficos USD muestran gasto 25 y remanente 75, mientras las tarjetas ARS siguen en calculado 970/estimado 900 y USD 100/75. El cotizador conserva su propio par y aparece antes del selector de gráficos.
- TC-131 cambia sólo el mes/año de Distribución: el donut pasa de 100 a 50, mientras el período principal, las tarjetas y el ranking del mes del Resumen siguen iguales. Regresar recupera el total anterior.
- TC-132 oculta y restaura gráficos, cotizador y variación desde sus switches. Las tarjetas y movimientos esenciales siguen disponibles y los datos financieros se conservan. Sólo cambia `displayOptions`.
- TC-133 usa movimiento real del mouse, comprueba la tarjeta fantasma visible, su opacidad positiva y presencia en el viewport, y el destino resaltado; suelta y verifica el nuevo orden. Usa Alt + flechas, prueba el límite y cancela otro arrastre con Escape. Sólo puede cambiar `summaryCurrencyOrder`; Ajustes y dropdowns de nuevas operaciones conservan A–Z.
- TC-134 prepara cuatro y cinco monedas por UI, carga bases y un gasto pendiente USD, coloca USD en el medio por teclado y cambia preferencias. Tras recargar conserva los cinco importes, la posición elegida, los estados de funciones y el gasto/ID original. Se admite normalizar sólo el contador nid; no modificar registros financieros.

Los controles usan los selectores reales `.summaryPeriodSelect`, `[data-estimate-currency]`, `[data-flow-kind]`, `.flowEyeBtn`, `#holdingDetails`, `.kashChartCurrency` y los switches de Ajustes. Los gráficos se prueban por sus datos visibles y tooltips, con SVG sin NaN/Infinity; no por capturas de píxeles ni dimensiones internas del cálculo. Las tarjetas se ejercitan con una, dos, tres, cuatro y cinco monedas, pero esto no sustituye la futura revisión visual de ventanas/tamaños del módulo 17. La base sigue siendo **v0.677 con el parche separado TC-054**. No se modifica ni redistribuye la app.

**Validación de la tanda 11:** **12/12 aprobados en 226.2 s**, Playwright **1.45.0** y Chromium **127.0.6533.17**. Después se añadieron a la función de arrastre los controles de viewport y opacidad positiva, usados sólo por TC-133, y ese caso pasó por separado en **13.7 s**. El spec y las otras funciones no cambiaron. TC-126, TC-130, TC-133 y TC-134 pasaron además por separado con Edge y las dependencias existentes **1.64.1**, en **71.4 s**, incluidos los controles reforzados de arrastre. Sin fallos, omisiones, reintentos ni errores JavaScript. Evidencia nueva: `validation-summary.json`. Los 24 assets de app y todas las suites/helpers/evidencias anteriores mantienen sus bytes. No se reejecutó el catálogo completo de 134 casos; los otros resultados son históricos.


## Tanda 12 · Cierres, vencimientos y avisos

Si tenés las once tandas anteriores, agregá **sólo** `tests/12-dates-notifications.spec.js` y `helpers/dates-notifications.js`. El ZIP acumulativo incluye `helpers/app-server.js` corregido a `../App`: si ya hiciste ese cambio, conservá tu helper. Si todavía apunta a `../../KASH_v0.677_PORTABLE/App`, reemplazalo por el incluido o corregí esa línea. No copies nada sobre tu carpeta App, configuración ni lockfile. Los scripts npm nuevos son opcionales; se mantiene **"@playwright/test": "^1.45.0"**.

Desde la raíz del repositorio, con `App/index.html` y sus assets:

```powershell
npx playwright test tests/12-dates-notifications.spec.js
npx playwright test tests/12-dates-notifications.spec.js --grep 'TC-138 '
npx playwright test tests/12-dates-notifications.spec.js --grep 'TC-145 ' --headed
```

### Preparación y estabilidad

Cada caso empieza en un contexto vacío, elige inglés y crea un proyecto vacío mediante el wizard. Se deshabilitan las guías automáticas desde F1 y se habilitan **Fechas y avisos** desde Ajustes. El setup no inserta fechas ni avisos. Los servicios de prueba se crean por UI sólo en los casos que los requieren; segundo servicio y USD son fixtures opcionales. Cada preparación tiene 60 s propios; el cuerpo tiene 60 s y las acciones/expectativas 5 s. Los adjuntos `dates-*-timing` permiten revisar el costo de cada parte. Los casos pueden ejecutarse solos.

Se fija **15/10/2026 al mediodía, Buenos Aires**, mediante `page.clock.setFixedTime`, disponible en **Playwright 1.45.0**. Los timers de interfaz y autoguardado siguen funcionando. TC-141 avanza la fecha un día, sin cambiar registros ni llamar a funciones internas: abrir la campana realiza la sincronización real. Las peticiones externas permanecen bloqueadas.

### Casos

- **TC-135**: Proyecto vacío no inventa fechas ni avisos y la campana vacía se cierra con X y Escape.
- **TC-136**: Guardar cierre y vencimiento puntuales conserva mes, nombre literal y datos financieros.
- **TC-137**: Fecha obligatoria y días 0 o 32 se rechazan sin guardar parcialmente la configuración.
- **TC-138**: Repetir el día 31 usa fin de mes en febrero, año bisiesto y abril sin perder la regla original.
- **TC-139**: Cierre del mes anterior y vencimiento del siguiente cruzan diciembre sin mover la columna financiera.
- **TC-140**: Buscar sin acentos y alternar tags carga el servicio correcto y conserva borradores sin guardar por un clic.
- **TC-141**: Avisos respetan anticipación, límite de siete días vencidos y no se duplican al consultar.
- **TC-142**: Filtros leído y sin leer, leer todos y borrar conservan avisos sin recrear el eliminado.
- **TC-143**: Leer no paga y Ver en planilla abre la columna asociada aunque el vencimiento sea de otro mes.
- **TC-144**: Modificar o desactivar una fecha cancela el aviso anterior y reactivarla conserva su identidad y lectura.
- **TC-145**: Popover de fechas admite hover, foco y fijación por clic con diseño propio y cierre sin escrituras.
- **TC-146**: Recargar conserva fechas ARS y USD, avisos y pagos; cambiar idioma no traduce nombres del usuario.

La planilla se prepara con importes explícitos: ARS **125,50** en la columna noviembre con vencimiento el **15 de octubre** para comprobar que el aviso abre noviembre; ARS **100** pendiente y USD **20,25** pagado para persistencia multimoneda. Leer un aviso sólo modifica su lectura; pagar cambia el estado financiero por el check real de la planilla. Un aviso borrado conserva su identidad en los metadatos y no se vuelve a crear al abrir la campana o recargar.

La búsqueda y los tags no guardan un borrador por sí solos; el test distingue **● Unsaved changes** del estado de fechas aplicadas al proyecto. Desactivar una fecha cancela el aviso anterior, y reactivarla con la misma clave conserva ID y lectura. El popover se prueba moviendo el mouse desde el icono a su contenido, mediante foco, clic para fijarlo, X y Escape; se valida texto literal y tema oscuro, sin capturas comparadas por píxeles. No es una medición de todas las resoluciones ni reemplaza el módulo 17.

Los datos se ingresan sólo por UI. La exportación pública y `localStorage` se leen para comparar el proyecto, sin modificarlos. Configurar fechas puede cambiar `serviceDates` y `serviceNotifications`; el resto del proyecto debe conservarse. Tras recargar se admite únicamente la normalización del contador `nid`, conservando IDs y datos existentes. El diagnóstico de fallo tolera que la app no haya cargado: no intenta leer `localStorage` sin protección sobre `about:blank`.

**Validación:** **12/12 aprobados en 173.5 s**, con **Playwright 1.45.0 / Chromium 127.0.6533.17**. TC-138, TC-142 y TC-146 pasaron además con **Edge / runtime existente 1.64.1**, **3/3 en 56.4 s**. Sin reintentos, omisiones, fallos ni errores JavaScript. Evidencia: `validation-dates-notifications.json`. App **0.677 + parche TC-054**, 24 assets intactos; sin cambios a la app, EXE ni repositorio personal. Los resultados de tandas anteriores siguen siendo históricos.


## Tanda 13 · Cuotas y notas

Con las doce tandas previas instaladas, agregá **únicamente** `tests/13-installments-notes.spec.js` y `helpers/installments-notes.js`. El ZIP es acumulativo. Conservá la ruta `../App` de `app-server.js`, tu configuración, package y lockfile. Los dos scripts npm nuevos son opcionales; la dependencia mantiene exactamente **"@playwright/test": "^1.45.0"**.

```powershell
npx playwright test tests/13-installments-notes.spec.js
npx playwright test tests/13-installments-notes.spec.js --grep 'TC-150 '
npx playwright test tests/13-installments-notes.spec.js --grep 'TC-155 ' --headed
```

### Qué se prueba

En v0.677, **Cuotas** es un seguimiento del número de cuota por mes: no registra importes ni confirma pagos en Consumos. Las notas de esta sección se llaman **Custom reminders / Recordatorios propios**, se guardan en `rec` y no son las notas de celdas (`notes`) ni los recordatorios mensuales (`recConfig`/`recMonthly`). Crear/editar/borrar se compara contra todos los campos ajenos al registro correspondiente para detectar efectos secundarios.

Cada caso empieza desde cero con su contexto, idioma y wizard real. F1 desactiva guías automáticas mediante UI. Fecha fija **15/10/2026, Buenos Aires**, con `page.clock.setFixedTime` de Playwright **1.45.0**; los timers siguen funcionando. Dos planes, dos notas y datos financieros son fixtures opcionales, con **60 s propios** cada una, igual que el setup limpio. Cuerpo **60 s**, acciones/expectativas **5 s**. Los adjuntos `tracker-*-timing` separan preparación y ejecución. No hay dependencias entre casos, sleeps, force ni reintentos.

- **TC-147**: Inicio vacío muestra formularios sin cuotas ni notas y no permite retroceder antes del proyecto.
- **TC-148**: Agregar compra con caracteres especiales muestra seis avances sin crear gastos ni pagos.
- **TC-149**: Nombre vacío, cantidad vacía o no positiva y mes ausente se rechazan sin insertar planes.
- **TC-150**: Cuota única, redondeo de cantidad y planes futuros respetan fin de plan y diciembre a enero.
- **TC-151**: Editar por botón y doble clic reemplaza sólo el plan elegido y Cancelar o Escape descarta borradores.
- **TC-152**: Borrar una cuota exige confirmación y renumera acciones sin editar o eliminar el plan vecino.
- **TC-153**: Flechas, Enter, F2 y Escape operan sólo sobre filas visibles aunque sus índices no sean consecutivos.
- **TC-154**: Notas por botón y Enter conservan texto literal; vacío se rechaza y borrar respeta la nota vecina.
- **TC-155**: Editar nota vacía conserva el texto y permite continuar con Enter sin reabrir validaciones anteriores **Con incidencia QA-NOTE-001.**
- **TC-156**: Ocultar y restaurar sección, cambiar idioma y recargar conserva cuotas, notas, gastos y saldos.

### Detalles para practicar

- La tabla muestra seis meses desde el período elegido. Sólo aparecen los planes activos en el primer mes visible; un plan futuro o finalizado queda guardado aunque su fila no se muestre. TC-150 verifica esa regla, cruza diciembre/enero y comprueba el resaltado de la última cuota. La cantidad decimal **2.5** se guarda como **3**, de acuerdo con la normalización actual; no se inventa un requisito de rechazo.
- Los planes y recordatorios propios no tienen IDs en esta versión: se identifican por posición del array. TC-152 y TC-154 comprueban que eliminar una fila reajuste sus acciones sin editar/borrar al vecino. TC-153 usa índices visibles **1 y 3**, separados por un plan finalizado y otro futuro, para verificar que las flechas no seleccionen filas ocultas.
- La UI en inglés genera `data-installment-index`; en español genera `data-cuota-index`. El helper acepta ambos atributos reales. Los valores de avance son expectativas explícitas; no usa calculadores internos de la app.
- TC-156 parte de base **ARS 1.000**, gasto pagado **50,25** y pendiente **20,50**, con nota manual literal. Cuotas y recordatorios no deben cambiar el calculado **949,75**, el estimado **929,25**, IDs, importes ni estados de pago. Al recargar en español, el resumen automático de la única celda agregada de gastos pasa de punto a coma decimal. Se admite sólo esa cadena derivada identificada y la normalización de nid; las notas manuales se comparan literalmente y todo lo demás permanece exacto.
- Los diagnósticos de fallo toleran que la app no llegue a cargar. Exportación pública y almacenamiento se leen, sin escribir datos por APIs internas. Peticiones externas bloqueadas; no se usan proyectos personales.

**Resultado:** **9 aprobados y 1 con incidencia activa**, **123.0 s**, con Playwright **1.45.0 / Chromium 127.0.6533.17**. Contraste TC-150/155/156 con Edge/runtime existente **1.64.1**: **2 aprobados y 1 con la misma incidencia**, **60.4 s**. Sin omisiones, reintentos ni errores JavaScript. App base **v0.677 + parche TC-054**, 24 assets intactos; app-server y casos/helpers anteriores sin cambios. Evidencia: `validation-installments-notes.json`. Los resultados anteriores son históricos, no una reejecución de los 156 casos juntos.


**TC-155 queda activo y fallará en esta app.** Después de rechazar una edición vacía y cerrar la advertencia, agregar una nota válida con Enter reabre la advertencia anterior. La nota sí se agrega una vez. Se reprodujo en ambos navegadores; la causa es un listener de teclado que no se retira en `editOwnReminder`. No se altera la expectativa, no se omite el caso ni se recarga a mitad del flujo para ocultarlo. **La suite y CI pueden quedar en rojo por QA-NOTE-001.** Ver `known-issues.md` y `evidence/TC-155-stale-validation.png`. La app no fue modificada al entregar las pruebas.
