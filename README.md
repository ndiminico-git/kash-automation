# KA$H · Práctica de Playwright

Versión de referencia: **KA$H 0.677**. Este paquete reúne las cuatro primeras tandas:

- **`tests/01-onboarding.spec.js`**: TC-001 a TC-012, primer inicio y bienvenida.
- **`tests/02-language.spec.js`**: TC-013 a TC-026, idiomas y conservación de datos.
- **`tests/03-currencies.spec.js`**: TC-027 a TC-036, catálogo, activación e históricos.
- **`tests/04-expenses.spec.js`**: TC-037 a TC-054, Gastos y su efecto en la planilla.

## Qué hay en esta carpeta

```text
qa-automation/
  tests/01-onboarding.spec.js   Los 12 casos, en orden.
  tests/02-language.spec.js     Los 14 casos de idiomas, en orden.
  tests/03-currencies.spec.js   Los 10 casos de monedas, en orden.
  tests/04-expenses.spec.js     Los 18 casos de Gastos, en orden.
  helpers/onboarding.js        Acciones comunes de los wizards.
  helpers/language.js          Navegación, idioma y datos mínimos por UI.
  helpers/currencies.js        Monedas, dropdowns e histórico por UI.
  helpers/expenses.js          Formularios, filas, guardado y totales de Gastos.
  helpers/app-server.js        Sirve únicamente la interfaz en localhost.
  playwright.config.js        Configuración de ejecución y reportes.
  qa-progress.md              Seguimiento de los 195 casos del catálogo.
  package.json
```

## Usarlo en tu proyecto de automation existente

1. Copiá los cuatro archivos `spec.js` a tu carpeta `tests`. Si ya tenés las tres tandas anteriores con la revisión 3 de Monedas, agregá solamente `04-expenses.spec.js` y `helpers/expenses.js`.
2. Copiá la carpeta `helpers` a la raíz del mismo proyecto. Debe quedar al lado de `tests`.
3. Conservá tu configuración de Playwright. La configuración incluida sirve como referencia; no reemplaces la tuya si tiene otras suites o proyectos.
4. En la terminal de PowerShell de VS Code, indicá la ruta de la carpeta **App** del portable:

```powershell
$env:KASH_APP_DIR = 'C:\ruta\de\KA$H\App'
npx playwright test tests/01-onboarding.spec.js

# Segunda tanda solamente.
npx playwright test tests/02-language.spec.js

# Tercera tanda solamente.
npx playwright test tests/03-currencies.spec.js

# Cuarta tanda solamente.
npx playwright test tests/04-expenses.spec.js
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

# Las cuatro tandas, en orden.
npm test
```

Dentro del workspace donde se creó esta entrega, la ruta predeterminada ya apunta a `KASH_v0.677_PORTABLE/App`.
En otra ubicación, configurá `KASH_APP_DIR` como en los ejemplos.

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

Consultá `qa-progress.md` para saber qué está pendiente y qué se verificó. La siguiente suite será `05-expense-filters.spec.js`, TC-055 a TC-064.
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
