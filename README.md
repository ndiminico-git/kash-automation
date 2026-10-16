# KA$H · Práctica de Playwright

Versión de referencia: **KA$H 0.677**. Este paquete reúne las tres primeras tandas:

- **`tests/01-onboarding.spec.js`**: TC-001 a TC-012, primer inicio y bienvenida.
- **`tests/02-language.spec.js`**: TC-013 a TC-026, idiomas y conservación de datos.
- **`tests/03-currencies.spec.js`**: TC-027 a TC-036, catálogo, activación e históricos.

## Qué hay en esta carpeta

```text
qa-automation/
  tests/01-onboarding.spec.js   Los 12 casos, en orden.
  tests/02-language.spec.js     Los 14 casos de idiomas, en orden.
  tests/03-currencies.spec.js   Los 10 casos de monedas, en orden.
  helpers/onboarding.js        Acciones comunes de los wizards.
  helpers/language.js          Navegación, idioma y datos mínimos por UI.
  helpers/currencies.js        Monedas, dropdowns e histórico por UI.
  helpers/app-server.js        Sirve únicamente la interfaz en localhost.
  playwright.config.js        Configuración de ejecución y reportes.
  qa-progress.md              Seguimiento de los 195 casos del catálogo.
  package.json
```

## Usarlo en tu proyecto de automation existente

1. Copiá los tres archivos `spec.js` a tu carpeta `tests`. Si ya tenés las tandas anteriores, agregá solamente `03-currencies.spec.js`.
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

# Las tres tandas, en orden.
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

- `beforeAll` inicia un servidor HTTP local en un puerto libre. `afterAll` lo cierra.
- Playwright crea un contexto de navegador nuevo por prueba, con `storageState` vacío.
- `beforeEach` abre la app y comprueba que no exista un proyecto ni un idioma guardado.
  En las tandas segunda y tercera también crea un proyecto vacío por la UI y desactiva las guías automáticas desde la ayuda. Así cada caso tiene su propio proyecto, sin necesitar las otras tandas.
- La única preferencia preparada es desactivar consultas online: las cotizaciones no forman parte de esta suite.
- Se bloquean las solicitudes a otros sitios. No se simulan respuestas de creación ni se inyectan registros financieros.
- Los nombres, monedas, saldos y cambios de idioma se cargan mediante los controles de la aplicación, salvo los dos casos de integración de idioma detallados más abajo.
- Al finalizar el wizard, el helper cierra la guía automática de Resumen usando su botón real.
- En la primera tanda, `page.evaluate` sólo lee el almacenamiento del navegador, salvo la preferencia de conexión indicada.
  La segunda y la tercera también leen la API pública de exportación `KASHGetProjectJson()` para comparar datos. No acceden a `D` ni cargan registros mediante código.
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

Consultá `qa-progress.md` para saber qué está pendiente y qué se verificó. La siguiente suite será `04-expenses.spec.js`, TC-037 a TC-054.
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
