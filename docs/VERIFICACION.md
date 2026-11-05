# Verificación manual y entrega

## Preparación

- Trabajar en develop, con `.env.local` ignorado por Git.
- Ejecutar las migraciones 001 y 002 en Supabase, sin borrar información existente.
- Configurar SUPABASE_URL y SUPABASE_SECRET_KEY del mismo proyecto.
- Iniciar una sola ejecución de `npm run dev`.
- Confirmar `/api/health` y que el listado no muestre errores.

## Casos manuales

| Caso | Pasos | Resultado esperado |
|---|---|---|
| Crear | Completar formulario válido | Pendiente; fecha e historial de creación |
| Validar | Dejar título vacío o descripción muy corta | No se acepta el formulario |
| Editar | Cambiar título de una pendiente e indicar responsable | Cambio visible e historial de campos |
| Iniciar atención | Pendiente a En progreso | Estado e historial actualizados |
| Resolver crítica | Intentar resolver sin observación | Operación rechazada; estado no cambia |
| Resolver crítica con detalle | Añadir observación válida | Resuelta y evento con responsable |
| Cierre final | Consultar resuelta | No ofrece edición ni reapertura |
| Cancelar | Crear otra pendiente y cancelar | Cancelada e historial conservado |
| Buscar | Buscar parte del título o solicitante | Solo coincidencias |
| Filtros | Combinar estado, categoría y prioridad | Cumplen los tres criterios |
| Orden | Alternar antigüedad, título y prioridad | Orden correspondiente |
| Páginas | Crear al menos 9 solicitudes | Segunda página sin duplicados |
| Persistencia | Recargar el navegador y reiniciar servidores | Datos conservados en Supabase |
| Móvil | Reducir ancho de ventana | Formularios utilizables y tabla desplazable |

## Solución de problemas

- `EADDRINUSE`: hay dos servidores en el mismo puerto. Detén las ejecuciones duplicadas antes de iniciar otra.
- `Cannot find module ts-node/register`: ejecuta `npm ci` en la raíz, con los servidores detenidos.
- Falta SUPABASE_URL o SUPABASE_SECRET_KEY: verifica archivo en la raíz, nombre sin `.txt`, y guarda antes de reiniciar.
- Código PGRST202: ejecuta 002 en el proyecto de la URL configurada; la función debe estar en el esquema público expuesto por Data API.
- Código 42501: revisa los permisos de la migración y que la clave sea secreta, no publicable.
- Clave inválida / 401: copia una clave secreta vigente del mismo proyecto, sin compartirla.
- `pg-pool`, error 28P01 o contraseña PostgreSQL: estás ejecutando una versión anterior a la migración a supabase-js. Detén y reinicia desde develop actualizado.
- Miles de archivos pendientes: comprueba rama y `.gitignore`; no subas `.env.local`, node_modules, .next ni dist.

## Cobertura de los requisitos

Crear, consultar, detalle, editar y cambiar estado: controlador y servicio de solicitudes.

Eliminar o cancelar: cancelación desde Pendiente, sin borrado físico.

Historial y reglas: función RPC, tablas y pruebas.

Buscar, filtrar, ordenar y paginar: interfaz, ListDto y rama list de la función SQL.

Validación frontend/backend: formularios, DTOs y restricciones SQL.

Base de datos, variables y ejecución: migraciones, `.env.example` y README.

Arquitectura y supuestos: ARQUITECTURA.md.

## Antes de entregar

1. Ejecutar tests, typecheck y build.
2. Completar los casos manuales en Supabase real. Los tests locales no prueban las claves del proyecto.
3. Revisar que ningún secreto figure en el diff ni en archivos versionables. Si una credencial real se publicó, rotarla; eliminarla del último archivo no la borra del historial.
4. Guardar commits coherentes en develop y subirlos con Push origin.
5. Con los servidores detenidos, integrar develop hacia main y subir main.
6. Confirmar ambas ramas, mínimo cinco commits y una integración en GitHub.
7. Confirmar que el repositorio sea público y entregar su URL.

La publicación remota y los resultados manuales deben verificarse antes de declarar la entrega completa.

## Imagen e historial inicial

- Crear con imagen: exactamente un evento Creación.
- Añadir o reemplazar una imagen después: nuevo evento Edición con responsable y fecha.
- Archivo inválido durante la creación: no debe quedar una solicitud creada parcialmente.
- Intentar una imagen original mayor de 500 MB: se rechaza antes de leerla completa.
- Verificar que el enlace de detalle abre la imagen ampliada y que el bucket no es público.

Aplicar primero las migraciones 003, 004 y 005. Las 34 pruebas automáticas actuales incluyen estas reglas.
