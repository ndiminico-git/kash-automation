# KA$H QA — v0.690

Suite de 213 casos en 19 módulos. Conserva los IDs TC-001 a TC-195 e incorpora TC-196 a TC-213.

## Reemplazar en tu repo

1. Extraé el ZIP dentro de `C:\Nico\Misc\kash-automation`, de modo que `tests`, `helpers`, `App` y `package.json` queden directamente en esa raíz. Reemplazá los archivos con el mismo nombre; no debe quedar otra carpeta contenedora adicional.
2. Desde la terminal abierta en esa raíz ejecutá:

```powershell
npm ci
npx playwright test
```

`npm ci` sincroniza las dependencias con el lockfile entregado. `package.json` mantiene exactamente `"@playwright/test": "^1.45.0"`; el lockfile fija la instalación comprobada a 1.45.0.

La configuración local conserva Edge como navegador predeterminado. Si querés usar el mismo Chromium de la validación completa:

```powershell
npx playwright install chromium
$env:KASH_BROWSER_CHANNEL = 'bundled'
npx playwright test
```

Para volver a la selección predeterminada:

```powershell
Remove-Item Env:KASH_BROWSER_CHANNEL -ErrorAction SilentlyContinue
```

No es necesario establecer `KASH_APP_DIR`: el helper usa `App` dentro del repo. Si habías definido esa variable con una ruta antigua en esta terminal, quitála una vez para usar la carpeta incluida:

```powershell
Remove-Item Env:KASH_APP_DIR -ErrorAction SilentlyContinue
```

## Comandos útiles

```powershell
npm run test:bug-regression
npx playwright test tests/18-monthly-closing.spec.js
npx playwright test tests/19-exports.spec.js
npx playwright show-report
```

Los scripts de los módulos anteriores siguen disponibles. Cada caso prepara sus datos y pasa por la bienvenida real de una instalación vacía. Un módulo no depende de haber ejecutado otro antes.

## Archivos incluidos

- `tests/`: los 19 specs completos, con los 213 IDs estables.
- `helpers/`: todos los helpers necesarios, incluido el servidor local.
- `App/`: recursos web exactos de la v0.690 recibida, incluidos sus JS/CSS; no se modificó la app.
- `package.json`, `package-lock.json` y `playwright.config.js`: dependencias y ejecución coherentes. La configuración de Playwright conserva un worker y cero reintentos.
- `.github/workflows/playwright.yml`: ejecuta los 19 módulos, instala Chromium y define las rutas y el navegador para CI. El workflow anterior ejecutaba solamente el módulo 1.
- `qa-progress.md`, `BUGS_VERIFICADOS_v0690.md`, `validation-v0690.json`: resultados y seguimiento.
- `app-resources-v0690.json`, `delivery-manifest-v0690.json`: hashes para comprobar la versión recibida y los archivos del ZIP.

El paquete es para automation web. No incluye ni reemplaza el EXE del portable, proyectos personales, Data, perfiles o node_modules. Para utilizar la app de escritorio, usá tu portable v0.690 completo.

## GitHub Actions

El workflow usa `npm ci`, instala sólo Chromium y ejecuta `npx playwright test --workers=1`, con `KASH_APP_DIR` apuntando a App y `KASH_BROWSER_CHANNEL=bundled`. Se fija Ubuntu 24.04 para mantener estable el entorno de la versión de Playwright utilizada; figura entre las [imágenes oficiales de GitHub Actions](https://github.com/actions/runner-images#available-images) y está contemplado en el mapa de dependencias de Playwright 1.45.0 instalado.

El resultado local no equivale a una ejecución ya realizada en GitHub: esa comprobación se producirá cuando subas los cambios. Se validó la instalación con `npm ci` en una carpeta aislada.

## Resultado disponible

Los nueve casos que reproducían los bugs pasaron en Chromium 127. La suite completa queda pendiente de tu ejecución; no se declara un resultado de 213/213.

## Alcance

Consultá `validation-v0690.json` y `qa-progress.md` para el resultado definitivo de esta entrega. Las pruebas web no comprueban backups físicos del portable, escritura .kash del host ni generación nativa de PDF. No se sustituyen esas operaciones con respuestas simuladas del host para declararlas aprobadas.
