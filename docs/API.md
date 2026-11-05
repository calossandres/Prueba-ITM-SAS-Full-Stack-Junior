# API REST

Base local: `http://localhost:3001/api`. Los cuerpos son JSON.

| Método | Ruta | Operación |
|---|---|---|
| GET | /health | Verificar acceso RPC y tablas |
| GET | /requests | Listado, búsqueda, filtros, orden y páginas |
| GET | /requests/:id | Detalle |
| GET | /requests/:id/history | Historial, más reciente primero |
| POST | /requests | Crear |
| PUT | /requests/:id | Reemplazar campos editables |
| PATCH | /requests/:id/status | Cambiar estado o cancelar |

## Crear

```json
{
  "title": "Sin acceso al correo",
  "description": "Al iniciar sesión aparece un error de acceso desde esta mañana.",
  "requester": "Carlos Cabrera",
  "category": "Accesos",
  "priority": "Alta"
}
```

Título: 3 a 120 caracteres; descripción: 10 a 5000; solicitante: 2 a 100. Los textos se recortan antes de validarse. Categorías: Hardware, Software, Red, Accesos, Otros. Prioridades: Baja, Media, Alta, Crítica.

Devuelve 201 con el objeto completo, UUID, estado Pendiente y fechas. No acepta estado ni fechas en el cuerpo.

## Editar

PUT requiere todos los campos de creación más `actor`, de 2 a 100 caracteres. El estado se cambia mediante la ruta específica. Editar una solicitud cerrada devuelve 409.

## Cambiar estado

```json
{
  "status": "En progreso",
  "actor": "Técnico de soporte",
  "observation": "Se inicia la revisión de acceso."
}
```

Observación opcional, máximo 2000 caracteres; obligatoria y no vacía para resolver una solicitud crítica. Cancelar usa la misma ruta con status Cancelada, desde Pendiente.

## Consultar

Ejemplo: `/requests?q=correo&status=Pendiente&category=Accesos&priority=Alta&page=1&limit=8&sort=created_at&order=desc`

| Parámetro | Valores / defecto |
|---|---|
| q | Subcadena literal, máximo 120 caracteres |
| status | Pendiente, En progreso, Resuelta, Cancelada |
| category | Las cinco categorías permitidas |
| priority | Las cuatro prioridades permitidas |
| page | Entero 1 a 1000000; defecto 1 |
| limit | Entero 1 a 100; defecto 8 |
| sort | created_at, updated_at, title, priority; defecto created_at |
| order | asc o desc; defecto desc |

Respuesta:

```json
{"items": [], "total": 0, "page": 1, "limit": 8}
```

El historial devuelve una lista de eventos con kind, from_status, to_status, actor, observation, changes y created_at.

## Errores

- 400: DTO inválido, UUID inválido, transición no permitida u observación obligatoria ausente.
- 404: solicitud inexistente. GET `/` de NestJS también devuelve 404 porque la API comienza en `/api`.
- 409: edición de una solicitud cerrada.
- 503: Supabase no disponible, clave/URL incorrecta o función RPC pendiente de configurar.

La API no implementa autenticación de usuarios; el campo actor es declarativo. La clave del proveedor nunca forma parte de las respuestas.

## Imágenes de problema y solución

POST /requests acepta JSON o multipart con los cinco campos de creación e image opcional. Esa imagen del problema se conserva sin posibilidad de reemplazarla o eliminarla.

PATCH /requests/:id/status acepta también multipart con status, actor, observation e image opcional, únicamente al pasar de En progreso a Resuelta. La referencia de solución y el cierre se confirman juntos, con un evento Evidencia de solución añadida. La observación de críticas sigue siendo obligatoria.

Las antiguas rutas POST/DELETE /requests/:id/image responden 409. GET /requests/:id devuelve ambas referencias, URLs firmadas y responsable/fecha de la solución. Consultar [IMAGENES.md](IMAGENES.md).
