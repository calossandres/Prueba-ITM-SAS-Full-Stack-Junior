# Publicar la demo en Vercel

El repositorio es un monorepo con dos aplicaciones: `frontend` (Next.js) y `backend` (NestJS). Supabase es el servicio externo de base de datos y archivos. Se usan dos proyectos Vercel, vinculados al mismo repositorio.

## 1. Preparar Git y Supabase

- Ejecutar las pruebas y la compilación antes del commit.
- Guardar los avances en develop e integrar develop hacia main.
- Subir develop y main con Push origin en GitHub Desktop.
- En Supabase, ejecutar las migraciones en orden: 001, 002, 003, 004 y 005. Si las anteriores ya se ejecutaron, aplicar solo las pendientes.
- La 004 crea el bucket privado `request-images`; la 005 corrige el historial inicial para que adjuntar una imagen durante la creación no genere una edición adicional.
- No subir `.env.local`, claves, `node_modules`, `.next` ni `dist`.

## 2. Publicar primero NestJS

1. Vercel > Add New > Project > importar el repositorio.
2. Nombre sugerido: `mesa-api`.
3. Root Directory: `backend`.
4. Mantener la detección de NestJS y la configuración automática del framework. Node.js 24.
5. Variables del proyecto backend:

```dotenv
SUPABASE_URL=https://TU_PROYECTO.supabase.co
SUPABASE_SECRET_KEY=sb_secret_TU_CLAVE
```

6. No copiar `PORT` ni `DATABASE_URL` de la configuración local. Vercel administra el puerto y la ejecución.
7. Deploy. Copiar la URL de producción, por ejemplo `https://mesa-api.vercel.app`.
8. Visitar `https://mesa-api.vercel.app/api/health`. Debe devolver status ok; con la migración 005 también aparece image_creation_atomic true.

## 3. Publicar Next.js

1. Add New > Project > importar otra vez el mismo repositorio.
2. Nombre sugerido: `mesa-demo`.
3. Root Directory: `frontend`.
4. Framework: Next.js. Usar sus comandos y salida predeterminados; Node.js 24.
5. Añadir esta variable en el proyecto frontend, sustituyendo el ejemplo por el dominio real del backend:

```dotenv
API_URL=https://mesa-api.vercel.app
```

6. No añadir `/api` al final. No añadir la clave secreta de Supabase en el proyecto frontend.
7. Deploy. Copiar la URL pública del frontend.
8. En el proyecto backend, configurar FRONTEND_ORIGIN con esa URL y volver a desplegar el backend.

API_URL se evalúa al compilar el frontend. Después de modificarla, hacer Redeploy. Si falta en Vercel, la compilación avisa en lugar de generar un proxy hacia localhost.

El proxy usa la URL de producción pública del backend. Una URL de preview protegida puede responder 401/403; revisar Deployment Protection y el entorno seleccionado si ocurre.

## 4. Verificación pública

- Abrir la aplicación desde PC, tablet y celular.
- Crear una solicitud, recargar y comprobar persistencia.
- Crear otra con una captura: su historial inicial debe mostrar únicamente Creación.
- Reemplazar la imagen después: aparece Edición con responsable y fecha.
- Cambiar estados, revisar el historial, filtrar y paginar.
- Probar la regla de observación obligatoria para resolver una crítica.

La demo no implementa autenticación de usuarios. Usar datos de demostración y un proyecto Supabase destinado a ella. El responsable es un nombre declarado, no una identidad verificada.

## Imágenes y límites

El archivo original puede tener hasta 500 MB. El navegador comprueba su cabecera y dimensiones antes de intentar decodificarlo. Optimiza a un máximo de 2400 píxeles de lado y busca un resultado de hasta 2 MiB. Un dispositivo puede no procesar un original muy grande; se informa y no se sube el original.

El backend recibe el archivo optimizado, valida su contenido con Sharp y lo vuelve a codificar como WebP. El cuerpo multipart tiene un límite técnico de 3 MiB, inferior al límite de Vercel Functions de 4.5 MB. El bucket acepta solo WebP optimizado y tiene límite de 3 MiB. Esto no modifica el límite de selección original de 500 MB.

Los archivos se guardan en un bucket privado y se consultan mediante enlaces firmados de 10 minutos. Volver a abrir el detalle renueva el enlace. Se limpian los archivos sustituidos o retirados después de actualizar la base; si la limpieza externa falla, se registra y puede quedar un archivo huérfano que debe limpiarse posteriormente.

## Referencias oficiales

- [Monorepos en Vercel](https://vercel.com/docs/monorepos)
- [NestJS en Vercel](https://vercel.com/kb/guide/ship-a-nestjs-app-on-vercel)
- [Límites de Vercel Functions](https://vercel.com/docs/functions/limitations)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

Esta guía prepara el despliegue. La publicación y el funcionamiento de los dominios de producción deben verificarse en Vercel; no se presentan como ya realizados.
