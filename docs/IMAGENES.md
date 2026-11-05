# Imagen opcional de una solicitud

## Comportamiento

- Una imagen opcional por solicitud.
- JPG, PNG o WebP como original, hasta 500 MB (500000000 bytes).
- Vista previa, optimización local y validación adicional del contenido en el servidor.
- Se puede cambiar o retirar mientras la solicitud esté abierta. Una captura de la solución puede adjuntarse antes de cerrar el caso.
- El detalle permite abrir la imagen ampliada en otra pestaña.
- Una imagen adjunta al registrar la solicitud forma parte del evento Creación: no genera una Edición automática.
- Añadir, reemplazar o retirar una imagen posteriormente sí se registra como Edición, con responsable y fecha.

## Consistencia

La API recibe los campos y la imagen optimizada en la misma petición multipart al crear. El archivo se valida y sube primero a Storage. La función SQL crea solicitud e historial juntos, incluyendo la referencia. Si falla esa creación, el backend intenta eliminar el archivo recién subido. La transacción PostgreSQL no incluye Storage, por lo que la eliminación externa es compensatoria y puede requerir limpieza posterior si el proveedor falla.

Para cambios posteriores, la referencia y la auditoría se actualizan en una transacción con bloqueo de fila. Se limpia la imagen anterior después de confirmar. Las ediciones previas del historial no se eliminan.

## Configuración

Ejecutar las migraciones 003, 004 y 005 sobre la base configurada con 001/002. El bucket `request-images` es privado y el backend accede con SUPABASE_SECRET_KEY. No se necesitan claves nuevas en el frontend.

La migración 005 añade una comprobación de capacidad a la salud de la API. El backend rechaza la creación con imagen si esta migración está pendiente, en lugar de crear una solicitud cuya imagen no quede asociada.

## API

- POST /api/requests: acepta JSON sin imagen o multipart con title, description, requester, category, priority e image opcional.
- POST /api/requests/:id/image: multipart con actor e image; añade o reemplaza la imagen después del registro inicial.
- DELETE /api/requests/:id/image: JSON con actor; retira la imagen de una solicitud abierta.
- GET /api/requests/:id: incluye image_path e image_url, este último firmado durante 10 minutos.

El límite de 500 MB es para el original local. El resultado enviado es de hasta 2 MiB; el backend y el bucket tienen un límite técnico de 3 MiB para ese resultado. Un archivo de 500 MB no se envía por el proxy de Vercel ni se almacena como original.

## Verificar

1. Crear con imagen: exactamente un evento Creación.
2. Cambiar la imagen de una solicitud abierta: un nuevo evento Edición.
3. Retirar la imagen: desaparece del detalle y queda el evento correspondiente.
4. Probar texto disfrazado de PNG: rechazo sin crear una solicitud.
5. Probar una solicitud cerrada: no se modifica su imagen.

Sin autenticación, el nombre del responsable no garantiza identidad. La demo conserva el alcance original de evaluación; antes de uso organizacional se necesitarían usuarios y permisos.
