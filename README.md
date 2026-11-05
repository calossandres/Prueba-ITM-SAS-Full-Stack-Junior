# Mesa · Gestión de soporte interno

**Español** | [English](README.en.md)

Prueba técnica Full Stack Junior: aplicación para registrar y seguir solicitudes internas de soporte tecnológico.

## Tecnologías

- Next.js App Router, React, TypeScript y Tailwind CSS para el frontend.
- NestJS y DTOs con class-validator para la API REST.
- Supabase PostgreSQL, accedido desde NestJS mediante `@supabase/supabase-js`.
- Función RPC SQL para transacciones, bloqueo de filas e historial consistente.
- Node Test Runner, Supertest y PGlite para pruebas sin credenciales ni datos de producción.

Se eligieron estas tecnologías por su relación con la experiencia del candidato. La prueba permite elegir el stack; Vue y Express son recomendaciones, no restricciones.

## Requisitos

- Node.js 24 y npm.
- Un proyecto de Supabase destinado a esta prueba.
- Git.

## Instalación

```powershell
git clone https://github.com/calossandres/Prueba-ITM-SAS-Full-Stack-Junior.git
cd "Prueba-ITM-SAS-Full-Stack-Junior"
git switch develop
npm ci
Copy-Item .env.example .env.local
```

Si `.env.local` ya existe, edítalo; no lo sobrescribas con la plantilla.

## Variables de entorno

Archivo `.env.local` en la raíz, junto al `package.json` principal:

```dotenv
SUPABASE_URL=https://TU_PROYECTO.supabase.co
SUPABASE_SECRET_KEY=sb_secret_TU_CLAVE
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
```

| Variable | Origen | Uso |
|---|---|---|
| SUPABASE_URL | Supabase > Settings > Data API > Project URL | Dirección del proyecto |
| SUPABASE_SECRET_KEY | Supabase > Settings > API Keys > Secret keys | Acceso exclusivo desde NestJS |
| PORT | Configuración local: 3001 | Puerto de la API |
| FRONTEND_ORIGIN | Configuración local: http://localhost:3000 | Origen permitido por CORS |

La clave secreta nunca usa el prefijo `NEXT_PUBLIC_`. El frontend llama a NestJS y no necesita claves de Supabase. La clave publicable no reemplaza a la secreta para estas operaciones. No se necesita `DATABASE_URL`, ni la contraseña de PostgreSQL.

`.env.local` y sus variantes están excluidos de Git. `.env.example` contiene únicamente marcadores de ejemplo. Para cambiar el destino de la API en otro entorno, configura `API_URL` en el entorno de Next.js antes de compilar; localmente usa `http://127.0.0.1:3001`.

## Configurar Supabase

En el SQL Editor del proyecto de la prueba, ejecuta en este orden:

1. `supabase/migrations/001_initial.sql`: tablas, índices y RLS.
2. `supabase/migrations/002_supabase_rpc.sql`: función transaccional y permisos de ejecución.
3. `supabase/migrations/003_request_images.sql`: referencias de imagen y cambios auditados.
4. `supabase/migrations/004_image_storage.sql`: bucket privado de imágenes.
5. `supabase/migrations/005_atomic_creation_image.sql`: creación con imagen sin edición automática.

Si ya creaste `support_requests` y `request_history` con el esquema de esta aplicación, ejecuta las migraciones pendientes en orden. No necesitas borrar tablas ni datos para cambiar al cliente de Supabase.

Estas migraciones se ejecutan en el SQL Editor con privilegios de administración. La función `support_api` solo es ejecutable por `service_role`; no se habilita acceso anónimo. La clave secreta permanece en el backend.

## Ejecutar

Desde la raíz:

```powershell
npm run dev
```

- Aplicación: http://localhost:3000
- Salud: http://localhost:3001/api/health
- Listado API: http://localhost:3001/api/requests

La salud debe responder `{"status":"ok","database":"Supabase PostgreSQL"}`. Esta comprobación llama a la función RPC y comprueba acceso a las dos tablas.

También puedes ejecutar cada parte en una terminal diferente:

```powershell
npm run dev -w backend
npm run dev -w frontend
```

Usa una modalidad a la vez. Ejecutar el comando combinado mientras hay un backend abierto causa `EADDRINUSE`.

## Verificar

```powershell
npm test
npm run typecheck
npm run build
```

Las pruebas usan PostgreSQL embebido y un servidor HTTP local para comprobar el cliente de Supabase. No leen `.env.local`, no requieren claves reales y no modifican Supabase.

Para ejecutar una compilación de producción local, tras `npm run build`:

```powershell
npm start -w backend
npm start -w frontend
```

Ejecuta esos comandos en dos terminales y detén primero los servidores de desarrollo. Consulta la guía de Vercel para publicar ambos proyectos.

## Funcionalidades y reglas

- Crear solicitudes con título, descripción, solicitante, categoría y prioridad. Estado inicial: Pendiente.
- Consultar listado y detalle; editar solicitudes abiertas.
- Buscar por título, descripción y solicitante sin distinguir mayúsculas.
- Filtrar por estado, prioridad y categoría; ordenar y paginar.
- Registrar creación, edición y cambios de estado, con responsable, fecha y observación.
- Cancelar una solicitud pendiente conservando el historial. Se eligió cancelación en lugar de borrado físico, opción permitida por el enunciado.

Transiciones permitidas:

```text
Pendiente -> En progreso -> Resuelta
Pendiente -> Cancelada
```

Resuelta y Cancelada son estados finales. Una solicitud crítica requiere una observación no vacía para resolverse. No se permiten cambios de estado a través de la edición general.

## Estructura y documentación

```text
backend/src/              Controladores, DTOs, servicio y cliente Supabase
backend/test/             Pruebas de API, SQL y transporte HTTP del SDK
frontend/app/             Interfaz, layout y estilos
supabase/migrations/      Esquema y función RPC
docs/                     Explicación, API y verificación manual
.github/workflows/        Verificación automática en GitHub
```

- [Arquitectura y decisiones](docs/ARQUITECTURA.md)
- [Guía para comprender y explicar el código](docs/GUIA_ESTUDIO.md)
- [API REST](docs/API.md)
- [Verificación manual y entrega](docs/VERIFICACION.md)
- [Revisión frente al enunciado y estado de entrega](docs/REVISION_ENTREGA.md)

## Git y entrega

El desarrollo se realiza en `develop`. La prueba exige `main`, `develop`, al menos cinco commits y una integración de develop hacia main. Haz commits por avances coherentes; verifica la aplicación antes de integrar.

Con GitHub Desktop: commit en develop, Push origin, cambiar a main con los servidores detenidos, Branch > Merge into current branch > develop, confirmar y Push origin. Comprueba ambas ramas en GitHub y que el repositorio sea público.

Las dependencias `node_modules` y las compilaciones `.next` y `dist` no se suben. Cambiar a una rama anterior sin `.gitignore` puede hacer que aparezcan como archivos sin seguimiento. No los incluyas en commits ni uses Discard all changes para resolverlo.

## Alcance y límites

No se implementó inicio de sesión, porque no lo exige la prueba. El nombre del responsable es declarado por el usuario y no constituye identidad autenticada. La API está pensada para evaluación local y no debe exponerse como una mesa de ayuda pública sin autenticación y autorización adicionales.

Se utilizó asistencia de IA para implementación y revisión. El candidato debe estudiar, ejecutar y verificar el código y ser capaz de explicarlo y modificarlo durante la revisión técnica.

## Imágenes y demo en Vercel

Una imagen opcional por solicitud, con un máximo original de 500 MB. El navegador la optimiza antes de enviarla; NestJS valida y recodifica el archivo y Supabase lo guarda en un bucket privado. Crear con imagen genera un solo evento Creación; los cambios posteriores de imagen generan Edición.

`npm run dev` espera a que la API esté disponible antes de iniciar Next.js. El frontend también muestra el estado de conexión durante el arranque.

Se publican dos proyectos Vercel del mismo monorepo: `backend` (NestJS) y `frontend` (Next.js). Las claves de Supabase quedan solo en el backend; el frontend usa `API_URL`.

- [Pasos para publicar en Vercel](docs/VERCEL.md)
- [Configuración y comportamiento de imágenes](docs/IMAGENES.md)
- [Enunciado original de la prueba](docs/PRUEBA_TECNICA.pdf)
