# Incidencias de la tanda 03

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
