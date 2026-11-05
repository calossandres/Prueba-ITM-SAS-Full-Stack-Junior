BEGIN;
-- Solo se almacena la versión optimizada y validada, nunca el original de 500 MB.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('request-images','request-images',false,3145728,ARRAY['image/webp'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=3145728,allowed_mime_types=ARRAY['image/webp'];
-- El acceso se hace desde NestJS con la clave secreta. No se crean políticas públicas.
COMMIT;
