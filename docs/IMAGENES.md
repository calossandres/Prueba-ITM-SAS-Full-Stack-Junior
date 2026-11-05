# Imágenes del problema y de la solución

## Comportamiento

- **Imagen del problema:** opcional al crear la solicitud. Una vez guardada, no se reemplaza, no se elimina y tampoco se añade retroactivamente si no se adjuntó al crear.
- **Imagen de la solución:** otra imagen opcional, adjunta en el formulario de cambio de estado al seleccionar Resuelta. Se registra con responsable y fecha. Una vez confirmada tampoco se reemplaza ni elimina.
- Hasta dos imágenes, una para cada propósito. Ambas se pueden consultar y ampliar desde el detalle.
- Cada original admite JPG, PNG o WebP y hasta 500 MB (500000000 bytes). El navegador lo optimiza antes de enviarlo; NestJS valida el contenido y lo recodifica como WebP.
- Quitar o cambiar una selección antes de enviarla no modifica una evidencia ya guardada.

## Historial y consistencia

Crear con la imagen inicial produce un solo evento Creación. Resolver con captura genera el cambio de estado y un evento específico Evidencia de solución añadida, con responsable y fecha. No se presenta la imagen de solución como una edición de la imagen original.

El estado Resuelta, la referencia a la solución, su responsable/fecha y los dos eventos se confirman dentro de una misma transacción SQL con bloqueo de fila. Si falla alguno, todos se revierten. La observación para solicitudes críticas sigue siendo obligatoria aunque haya imagen.

Storage es externo a la transacción PostgreSQL: se sube el archivo validado antes de confirmar la referencia. Si la operación SQL falla, el backend intenta eliminar solo ese archivo nuevo. Si la limpieza externa falla, se registra para limpieza posterior. Nunca se elimina una evidencia ya confirmada al cambiar estados o editar los datos del caso.

## Configuración

Ejecutar las migraciones pendientes en orden hasta `006_problem_and_solution_images.sql`. La 004 crea el bucket privado `request-images`; la 006 separa las evidencias y añade protección de inmutabilidad en SQL. El backend comprueba la capacidad evidence_images de la ruta de salud antes de subir un archivo.

La 006 conserva el contenido actual de image_path como imagen del problema y mantiene el historial anterior. No reconstruye versiones que se hubieran sobrescrito o eliminado antes de esta regla.

No se necesitan nuevas claves: el backend usa SUPABASE_URL y SUPABASE_SECRET_KEY. Los enlaces de visualización están firmados durante 10 minutos; volver a abrir el detalle los renueva.

## API

- POST /api/requests: JSON sin imagen o multipart con title, description, requester, category, priority e image opcional para el problema.
- PATCH /api/requests/:id/status: JSON sin evidencia o multipart con status, actor, observation e image opcional. Un archivo solo se admite para En progreso → Resuelta.
- POST y DELETE /api/requests/:id/image: rechazan la operación con 409 para impedir que clientes anteriores alteren la imagen original.
- GET /api/requests/:id: añade solution_image_path, solution_image_url, solution_image_actor y solution_image_at. image_path e image_url representan la imagen del problema.

El límite de 500 MB corresponde al original en el equipo del usuario. El navegador envía una versión de hasta 2 MiB; backend y bucket admiten hasta 3 MiB de ese resultado. El original no se envía a Vercel ni se almacena sin optimizar. El dispositivo puede no procesar una imagen especialmente grande; se informa sin subirla.

## Comprobación manual

1. Crear con imagen: una Creación y ninguna opción para reemplazarla o borrarla después.
2. Editar título o descripción: la imagen inicial debe permanecer idéntica.
3. Pasar a En progreso, elegir Resuelta y adjuntar una captura de solución: aparecen las dos imágenes y el evento de evidencia.
4. Resolver sin captura: permitido. Resolver una crítica sin observación: rechazado.
5. Resolver con captura sin haber añadido imagen inicial: permitido; se identifican claramente los dos propósitos.
6. Consultar una resuelta: datos e imágenes disponibles para lectura; no hay reapertura ni modificación de evidencias.

La API de demostración no autentica usuarios. El responsable es un nombre declarado. Las reglas de evidencia son obligatorias para todos los usuarios del sistema; no constituyen autorización por identidad.
