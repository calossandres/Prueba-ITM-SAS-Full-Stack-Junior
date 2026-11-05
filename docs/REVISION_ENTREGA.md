# Revisión de entrega frente al enunciado

Fecha: 4 de noviembre de 2026.

## Resultado

La implementación cubre los requisitos funcionales obligatorios revisados en el PDF. La conexión real a Supabase y la consulta del listado están verificadas. La entrega Git aún requiere guardar y subir el avance final e integrar develop hacia main.

## Matriz de cumplimiento

| Requisito del PDF | Implementación / evidencia | Estado |
|---|---|---|
| Datos de solicitud y fechas | support_requests; formulario; detalle | Implementado |
| Cinco categorías, cuatro prioridades y cuatro estados | DTOs, restricciones SQL y selectores | Implementado |
| Crear y consultar | POST/GET /api/requests; prueba de integración | Verificado por pruebas |
| Consultar detalle | GET /api/requests/:id; ventana de detalle | Verificado por pruebas |
| Editar | PUT /api/requests/:id; historial con valores anterior y nuevo | Verificado por pruebas |
| Cambiar estado | PATCH /api/requests/:id/status y función RPC | Verificado por pruebas |
| Eliminar o cancelar | Cancelación de pendientes, conservando historial | Cumple la alternativa de cancelación |
| Historial de cambios | GET /api/requests/:id/history; responsable, estados, fecha y observación | Verificado por pruebas |
| Buscar | Subcadena de título, descripción o solicitante | Verificado por pruebas |
| Filtrar estado, prioridad y categoría | ListDto y consulta RPC con filtros combinables | Verificado por pruebas |
| Ordenar | Creación, actualización, título y nivel de prioridad | Verificado por pruebas |
| Paginar | Página/tamaño validados; total y orden estable por UUID | Verificado por pruebas |
| Pendiente a En progreso | RPC con bloqueo de fila | Verificado por pruebas |
| En progreso a Resuelta | RPC con bloqueo de fila | Verificado por pruebas |
| Pendiente a Cancelada | RPC con bloqueo de fila | Verificado por pruebas |
| No reabrir resueltas/canceladas | Estados finales | Verificado por pruebas |
| Observación para resolver críticas | Rechaza omisión, vacío y espacios | Verificado por pruebas |
| Tecnología elegida y justificada | Next.js, NestJS, Supabase PostgreSQL; README y arquitectura | Documentado |
| Separación de responsabilidades | Controlador, DTO, servicio, adaptador y función SQL | Documentado |
| Validaciones frontend y backend | Formularios, ValidationPipe, DTOs y restricciones | Implementado; API verificada por pruebas |
| README con instalación y ejecución | README.md | Completado |
| Variables y configuración de base | .env.example y migraciones 001/002 | Completado |
| Supuestos y reglas adicionales | ARQUITECTURA.md | Documentado |
| Código frontend/backend y scripts SQL | frontend/, backend/, supabase/migrations/ | Disponibles localmente |
| main y develop | Ambas existen localmente | Verificado |
| Mínimo cinco commits | Seis commits anteriores al avance actual | Cumplido localmente |
| Integración develop hacia main | main todavía señala Initial commit | PENDIENTE |
| Repositorio disponible y público | Remoto configurado; visibilidad no confirmada por el conector | PENDIENTE DE CONFIRMAR |

## Comprobaciones ejecutadas

- `npm test`: 25 pruebas aprobadas, 0 fallos.
- Las 16 combinaciones de estados se prueban por HTTP contra la función SQL en PGlite.
- Se verifica que la prioridad crítica requiera observación, el historial de edición y estado, filtros, búsqueda, orden y paginación.
- Se verifica rechazo a anon/authenticated y acceso de service_role en el motor de prueba.
- Se fuerza un fallo de historial mediante trigger y se comprueba que la misma llamada RPC revierta el cambio de estado.
- Se verifica el transporte HTTP del SDK y la traducción de errores con claves ficticias.
- `npm run typecheck`: aprobado en frontend y backend.
- Compilación de Next.js y NestJS: aprobada. El backend se recompila después del ajuste final de pruebas.
- API real: GET /api/health devolvió HTTP 200 y status ok con Supabase PostgreSQL.
- API real: GET /api/requests?limit=1 devolvió HTTP 200 y total 1.
- Capturas del usuario: creación exitosa y solicitud visible en el listado.
- `.env.local` está ignorado y no aparece entre los archivos seguidos por Git.
- `.env.example` contiene marcadores de ejemplo, no credenciales reales.

Los tests automáticos usan una base aislada; no reemplazan todas las pruebas de interfaz con Supabase real. No se alteraron solicitudes reales durante esta revisión de lectura.

## Límites y comprobación manual

Falta recorrer manualmente desde el navegador edición, cambios de estado, cancelación, resolución crítica, historial y persistencia tras recargar; los casos automáticos correspondientes sí pasan. Consulta VERIFICACION.md para los pasos.

No hay autenticación de usuarios ni despliegue remoto. No se exigen en el enunciado. Swagger, Docker y notificaciones externas son opcionales y no se presentan como implementados.

## Commit propuesto en develop

Summary:

```text
feat: integrar Supabase por API y documentar la entrega
```

Description:

```text
Sustituye la conexión PostgreSQL directa por supabase-js.
Configura SUPABASE_URL y SUPABASE_SECRET_KEY solo en NestJS.
Añade funciones RPC transaccionales para solicitudes e historial.
Verifica reglas, permisos y rollback con 25 pruebas automatizadas.
Documenta instalación, arquitectura, API, revisión y guía de estudio.
Añade el flujo de verificación automática en GitHub Actions.
```

## Finalizar en GitHub Desktop

1. En develop, revisar los archivos y confirmar que .env.local y node_modules no están seleccionados.
2. Crear el commit anterior y pulsar Push origin.
3. Detener los servidores antes de cambiar de rama.
4. Cambiar a main; Branch > Merge into current branch > develop. Si se permite elegir, usar una integración que cree un commit de merge; desde terminal, `git merge --no-ff develop`.
5. Subir main con Push origin.
6. Confirmar en GitHub ambas ramas, el historial y la visibilidad Public.
7. Entregar la URL del repositorio con main mostrando el código y el README completo.

No declarar la entrega completa hasta comprobar esos últimos pasos. El usuario conserva el control de los commits y de la subida mediante GitHub Desktop.
