# Guía para estudiar y explicar la solución

## Recorrido recomendado

1. README: instala y ejecuta la aplicación.
2. `backend/src/dto.ts`: aprende qué datos acepta cada endpoint y por qué TypeScript por sí solo no valida JSON recibido.
3. `backend/src/app.module.ts`: sigue una ruta, su controlador y los proveedores inyectados.
4. `backend/src/requests.service.ts`: identifica cómo cada operación HTTP se convierte en una operación RPC.
5. `backend/src/database.ts`: revisa createClient, la clave de servidor y la traducción de errores.
6. `supabase/migrations/001_initial.sql`: entiende tablas, claves, índices y restricciones.
7. `supabase/migrations/002_supabase_rpc.sql`: sigue creación, edición y transición; observa cómo se escribe el historial en la misma transacción.
8. `frontend/components/SupportDashboard.tsx`: sigue formulario, fetch, estados React, filtros y detalle.
9. `backend/test/`: ejecuta los casos y modifica uno para comprobar una regla.

## Explica una creación

El usuario completa un formulario. El navegador comprueba campos básicos, envía POST a `/api/requests` y Next.js lo reenvía a NestJS. ValidationPipe transforma y valida el DTO. RequestsService llama a Database.rpc. supabase-js envía HTTPS al endpoint RPC de Supabase con una clave que permanece en el servidor. La función inserta la solicitud en Pendiente y su primer evento de historial. Ambas inserciones se confirman o revierten juntas. React vuelve a consultar listado y contadores.

## Explica un cambio de estado

La interfaz ofrece las opciones permitidas. El backend valida el cuerpo. La función SQL bloquea la fila con FOR UPDATE, consulta su estado actual y comprueba la transición. Si es crítica y se quiere resolver, exige observación. Actualiza el estado y registra responsable, estados, hora y observación. Un error revierte todo.

## Preguntas para la revisión técnica

**¿Por qué backend y frontend?** La interfaz gestiona interacción y presentación; NestJS concentra el contrato REST y mantiene la clave privilegiada fuera del navegador.

**¿Por qué Supabase?** Proporciona PostgreSQL administrado y una API compatible con el cliente conocido por el candidato. Se usan sus funciones RPC para operaciones atómicas.

**¿Qué diferencia hay entre clave publicable y secreta?** La publicable puede utilizarse en clientes sujetos a permisos y RLS. La secreta es privilegiada y se mantiene exclusivamente en NestJS.

**¿Por qué no dos inserts independientes con el SDK?** El primero podría tener éxito y el segundo fallar. La llamada a una función SQL preserva la transacción.

**¿Cómo evitas inyección SQL?** Filtros parametrizados, DTOs y listas cerradas para las expresiones de orden. No se acepta SQL proporcionado por el cliente.

**¿Por qué cancelar en lugar de eliminar?** El enunciado permite ambas alternativas. Cancelar conserva información e historial para seguimiento.

**¿Por qué validar en dos lugares?** La validación del navegador ayuda al usuario. La del servidor y la base protegen las reglas aunque alguien invoque la API sin interfaz.

**¿Es el responsable un usuario autenticado?** No. Es un nombre declarado; agregar autenticación y autorización sería una mejora antes de exponer esta aplicación públicamente.

**¿Qué prueban los tests?** Contrato HTTP y DTOs, consultas y reglas SQL en PostgreSQL embebido, historial y rollback, y transporte HTTP de supabase-js con una clave ficticia. No equivalen a una verificación del proyecto remoto ni de todas las condiciones de concurrencia.

## Ejercicios prácticos

- Crea una solicitud crítica y recorre sus estados; intenta resolverla sin observación.
- Cambia el tamaño de página coordinando el estado y el cálculo de paginación del frontend.
- Explica qué pasaría si quitaras la inserción del historial: los tests de integración deberían detectar la falta de eventos.
- Localiza cómo se decide el orden de prioridades; explica por qué no se ordena alfabéticamente.
- Agrega un filtro nuevo solo después de identificar los cambios en interfaz, DTO, SQL y pruebas.

No memorices respuestas sin ejecutar la aplicación. El uso de IA está permitido como apoyo; la responsabilidad de comprender y defender la entrega es del candidato.
