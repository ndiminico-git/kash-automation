# KA$H v0.690 — correcciones de estabilidad de automation

Este ZIP es un parche para el repositorio que ya contiene los 213 casos en 19 módulos. Extraer directamente en `C:\Nico\Misc\kash-automation` y reemplazar los archivos coincidentes. No incluye ni modifica `App`, el EXE ni datos personales. No crea otro módulo ni cambia los IDs.

## Qué cambia

- **TC-086:** el fallo recibido ocurre al buscar **Edit expenses**, antes de leer los importes. El helper desplaza primero la celda, espera geometría/scroll estables y verifica que el menú esté visible y habilitado antes de abrir el editor. Después verifica el diálogo de edición y su total cargado. Se conservan las expectativas exactas de ARS 150, ARS 100 y ARS 50 y la validación de cancelar/guardar sin alterar importes ni notas.
- **TC-145:** se prepara el ancla antes del hover, saliendo con el puntero y desplazando el elemento a la vista. Se espera que fuentes, posición y scroll se estabilicen antes del gesto, y se permite hasta 10 segundos para observar el popover. Se mantienen las pruebas separadas de hover, foco, clic fijado, Escape y ausencia de escrituras. La app cierra este popover al recibir scroll: esperar únicamente después del hover puede dejarlo ya cerrado.
- **TC-194:** se miden botón y SVG juntos, en una única lectura del DOM, después de estabilizar el layout. La tolerancia del centrado es **2 píxeles CSS** en cada eje. No se redondean las coordenadas ni se relajan las verificaciones de foco.
- **TC-188:** se espera layout estable y se repite sólo la lectura de ajuste del texto durante hasta 5 segundos. La tolerancia de desborde se mantiene en **2 px**. El informe `ui-measurements` conserva mediciones incluso si falla: cantidad de monedas, viewport, moneda, fuente CSS, clase del texto, ancho disponible y ancho requerido.
- El workflow usa **`npm install`**. `package.json` conserva literalmente **`"@playwright/test": "^1.45.0"`** y el lockfile fija la instalación a **1.45.0**.

No se agregan reintentos de casos, `skip`, clics forzados, invocaciones directas a funciones de la app ni pausas fijas para encubrir fallos. Las esperas de aserciones repiten lecturas del estado visible; los gestos y las escrituras no se repiten automáticamente.

## Ejecutar

Como se incluyen el package y el lockfile coherentes, ejecutar una vez después de reemplazar:

```powershell
npm install
npx playwright test --grep 'TC-(086|145|188|194) '
```

Luego ejecutar todos:

```powershell
npx playwright test
```

Para contrastar localmente con el navegador utilizado en GitHub, manteniendo los mismos casos:

```powershell
npx playwright install chromium
$env:KASH_BROWSER_CHANNEL = 'bundled'
npx playwright test --grep 'TC-(086|145|188|194) '
```

Para volver al Edge predeterminado de la configuración:

```powershell
Remove-Item Env:KASH_BROWSER_CHANNEL -ErrorAction SilentlyContinue
```

`KASH_APP_DIR` sólo se necesita si se desea probar una carpeta App diferente de la que está en el repositorio. Este parche conserva la configuración existente.

## Qué falta confirmar en GitHub

Los resultados locales específicos se detallan en `validation-stability.json`. No equivalen a haber ejecutado Linux/GitHub Actions ni la suite completa modificada.

**TC-188 no debe darse por resuelto únicamente por aumentar una tolerancia.** El error recibido indica ancho requerido 358 px frente a 306 px disponibles (límite con tolerancia: 308), es decir, 52 px de desborde. Si vuelve a fallar después de esperar el layout, corresponde revisar el diseño de la app en ese entorno. Ver `INCIDENCIAS_ESTABILIDAD.md` y el adjunto `ui-measurements` del reporte. El test sigue activo y puede dejar CI en rojo si detecta ese problema.
