# Bugs verificados — KA$H v0.690

Los cinco problemas reportados no se reprodujeron en la ejecución específica de sus nueve casos. Runtime: Playwright 1.45.0 + Chromium 127.0.6533.17; un worker, cero retries y cero casos omitidos. Se conservaron las expectativas anteriores.

| Incidencia | Problema | Casos que pasaron |
|---|---|---|
| QA-EXP-001 | Recordatorios al abrir/recargar | TC-054, TC-088, TC-164, TC-178, TC-184 |
| QA-UI-001 | Foco del modal | TC-194 |
| QA-UI-002 | Nombres del menú contraído | TC-195 |
| QA-BAL-001 | Cambio de mes con la app abierta | TC-213 |
| QA-CUR-001 | Histórico inactivo en Chromium 127 | TC-035 |

La ejecución completa de los 213 casos queda pendiente de tu corrida. No se declara que hayan pasado los 213 ni que se haya ejecutado el contraste con Edge en esta revisión. Tampoco se ejecutó el job remoto de GitHub ni se verificaron archivos físicos del host del portable.

```powershell
npm run test:bug-regression
npx playwright test
```
