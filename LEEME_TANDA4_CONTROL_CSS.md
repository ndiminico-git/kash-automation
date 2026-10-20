# Tanda 4 · Control de crecimiento de CSS

Esta tanda no modifica la aplicación ni sus 213 casos. Activa una comprobación antes de ejecutarlos en Playwright. Funciona con la configuración actual de Visual Studio y el workflow de GitHub que ya llama a Playwright. No se ejecutó el workflow remoto.

## Dónde copiar

Extraé el ZIP aparte. Copiá playwright.config.js, la carpeta tools y este documento a C:/Nico/Misc/kash-automation, al mismo nivel que package.json, tests y App. Aceptá reemplazar playwright.config.js. Esta vez no se copia nada dentro de App. El archivo de configuración conserva todas tus opciones y solo agrega el control previo.

## Qué vas a ver

Al ejecutar casos aparece primero el resultado del control: alerts: 0 permite continuar. Los 213 casos siguen disponibles; no se modificaron sus pasos ni resultados esperados. Si detecta una línea nueva con important o IDs consecutivos repetidos como #v#v, detiene la corrida ANTES de los casos y muestra el archivo y la línea para revisar. Ese aviso no es un fallo funcional de la app. Listar o descubrir los casos no ejecuta el control.

Para comprobarlo solo, desde la raíz del proyecto: node tools/css-check.cjs. Respeta KASH_APP_DIR cuando está definido; de lo contrario usa App/index.html en automatización o index.html en la fuente. No instala paquetes, no guarda datos y no actualiza su referencia automáticamente.

## Si aparece una alerta

Primero revisá el cambio. Solo después de aprobarlo, actualizá la referencia con: node tools/css-guard.cjs --root App --write-baseline. Si KASH_APP_DIR apunta a otra copia, indicá esa carpeta como --root. No regenerar la referencia para esconder una alerta.

La referencia actual corresponde a la tanda 3: 2358 important y 728 repeticiones consecutivas de ID. Es un control conservador por líneas: reordenar o reformatear una regla existente puede pedir revisión. Incluye CSS y los bloques style de index.html; no evalúa CSS generado en JavaScript, atributos style ni todas las formas posibles de aumentar especificidad. Una alerta requiere revisión, no significa automáticamente que el cambio sea incorrecto.

## Verificación realizada

Los 32 recursos App permanecen idénticos a la tanda 3, que el usuario confirmó con 213/213 casos. Se conservaron los 40 archivos de tests/helpers actuales, package.json, los datos y la configuración original instalada. Dos casos existentes aprobados con el nuevo control; 213 casos descubiertos; siete comprobaciones del control aprobadas. Una prioridad agregada solo en una copia de prueba fue detectada y Playwright se detuvo antes de iniciar casos. No se volvió a ejecutar aquí la suite completa de 213.

La carpeta tools es de desarrollo: no va dentro del portable. Las capturas no cambian porque App no cambia. Con esta integración se cierra la etapa de limpieza de bajo riesgo. Capas, cambios de prioridad y reorganización de envoltorios JS quedan diferidos; no hay un bug demostrado que los justifique ahora. El portable final se arma con los archivos de aplicación ya validados.
