import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PGlite } from '@electric-sql/pglite';
import request from 'supertest';
import sharp from 'sharp';
import { AppModule } from '../src/app.module';
import { Database, throwDatabaseError } from '../src/database';
import { STATUSES, TRANSITIONS } from '../src/domain';
let app:INestApplication;
let db:PGlite;
const storedImages=new Map<string,Buffer>();
const payload={ title:'Falla de conexión a red', description:'La conexión de la oficina deja de funcionar al iniciar.', requester:'Carlos Cabrera', category:'Red', priority:'Crítica' };
before(async()=>{
  db=new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
  await db.exec(readFileSync(resolve(__dirname,'../../supabase/migrations/001_initial.sql'),'utf8'));
  await db.exec(readFileSync(resolve(__dirname,'../../supabase/migrations/002_supabase_rpc.sql'),'utf8'));
  await db.exec(readFileSync(resolve(__dirname,'../../supabase/migrations/003_request_images.sql'),'utf8'));
  await db.exec(readFileSync(resolve(__dirname,'../../supabase/migrations/005_atomic_creation_image.sql'),'utf8'));
  app=await NestFactory.create(AppModule,{logger:false});
  const provider=app.get(Database);
  provider.rpc=(async(operation:string,payload:object={})=>{
    try { const result=await db.query<{data:any}>('SELECT public.support_api($1,$2::jsonb) AS data',[operation,JSON.stringify(payload)]); return result.rows[0].data; }
    catch(error) { throwDatabaseError(error as {code?:string;message?:string}); }
  }) as any;
  provider.uploadImage=async(path:string,contents:Buffer)=>{storedImages.set(path,contents);};
  provider.removeImage=async(path:string)=>{storedImages.delete(path);};
  provider.imageUrl=async(path:string)=>`https://images.example.test/${path}`;
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  await app.init();
});
after(async()=>{await app?.close();await db?.close();});
for(const from of STATUSES)for(const to of STATUSES)test(`SQL vía API: ${from} → ${to}`,async()=>{
  const server=app.getHttpServer();
  const created=await request(server).post('/api/requests').send({...payload,priority:'Media'}).expect(201);
  await db.query('UPDATE support_requests SET status=$2 WHERE id=$1',[created.body.id,from]);
  const allowed=TRANSITIONS[from].includes(to);
  await request(server).patch(`/api/requests/${created.body.id}/status`).send({status:to,actor:'Técnico de prueba'}).expect(allowed?200:400);
  const current=await request(server).get(`/api/requests/${created.body.id}`).expect(200);
  assert.equal(current.body.status,allowed?to:from);
  const history=await request(server).get(`/api/requests/${created.body.id}/history`).expect(200);
  assert.equal(history.body.length,allowed?2:1);
});
test('SQL vía API: crítica rechaza observación omitida, vacía o espacios',async()=>{
  const server=app.getHttpServer();
  const created=await request(server).post('/api/requests').send(payload).expect(201);
  await request(server).patch(`/api/requests/${created.body.id}/status`).send({status:'En progreso',actor:'Técnico de prueba'}).expect(200);
  for(const observation of [undefined,'','   ']){
    await request(server).patch(`/api/requests/${created.body.id}/status`).send({status:'Resuelta',actor:'Técnico de prueba',observation}).expect(400);
  }
});
test('API: creación, edición, reglas, resolución e historial persistido',async()=>{
  const server=app.getHttpServer();
  const created=await request(server).post('/api/requests').send(payload).expect(201);
  const id=created.body.id;assert.equal(created.body.status,'Pendiente');
  await request(server).put(`/api/requests/${id}`).send({...payload,title:'Falla de red en oficina',actor:'Técnico ITM'}).expect(200);
  await request(server).patch(`/api/requests/${id}/status`).send({status:'Resuelta',actor:'Técnico ITM'}).expect(400);
  await request(server).patch(`/api/requests/${id}/status`).send({status:'En progreso',actor:'Técnico ITM'}).expect(200);
  await request(server).patch(`/api/requests/${id}/status`).send({status:'Resuelta',actor:'Técnico ITM',observation:'   '}).expect(400);
  const afterFailure=await request(server).get(`/api/requests/${id}`).expect(200);assert.equal(afterFailure.body.status,'En progreso');
  const before=await request(server).get(`/api/requests/${id}/history`).expect(200);assert.equal(before.body.length,3);
  await request(server).patch(`/api/requests/${id}/status`).send({status:'Resuelta',actor:'Técnico ITM',observation:'Se reemplazó el cable y se verificó conectividad.'}).expect(200);
  await request(server).patch(`/api/requests/${id}/status`).send({status:'En progreso',actor:'Técnico ITM'}).expect(400);
  await request(server).put(`/api/requests/${id}`).send({...payload,actor:'Técnico ITM'}).expect(409);
  const history=await request(server).get(`/api/requests/${id}/history`).expect(200);
  assert.equal(history.body.length,4);assert.equal(history.body[0].from_status,'En progreso');assert.equal(history.body[0].to_status,'Resuelta');assert.equal(history.body[0].actor,'Técnico ITM');
  assert.equal(history.body.find((x:any)=>x.kind==='Edición').changes.title.before,payload.title);
});
test('API: cancelar conserva historial y no permite reapertura',async()=>{
  const server=app.getHttpServer();const created=await request(server).post('/api/requests').send({...payload,priority:'Baja'}).expect(201);
  await request(server).patch(`/api/requests/${created.body.id}/status`).send({status:'Cancelada',actor:'Carlos'}).expect(200);
  await request(server).patch(`/api/requests/${created.body.id}/status`).send({status:'En progreso',actor:'Carlos'}).expect(400);
  const events=await request(server).get(`/api/requests/${created.body.id}/history`).expect(200);assert.equal(events.body.length,2);
});
test('API: búsqueda, filtros, orden y paginación',async()=>{
  const server=app.getHttpServer();
  for(const [title,priority] of [['Impresora Alfa','Alta'],['Impresora Beta','Baja'],['Impresora Gamma','Media']])await request(server).post('/api/requests').send({...payload,title,category:'Hardware',priority}).expect(201);
  const first=await request(server).get('/api/requests').query({q:'Impresora',category:'Hardware',status:'Pendiente',sort:'title',order:'asc',limit:2,page:1}).expect(200);
  assert.equal(first.body.total,3);assert.equal(first.body.items.length,2);assert.equal(first.body.items[0].title,'Impresora Alfa');
  const second=await request(server).get('/api/requests').query({q:'Impresora',limit:2,page:2,sort:'title',order:'asc'}).expect(200);assert.equal(second.body.items[0].title,'Impresora Gamma');
  const high=await request(server).get('/api/requests').query({category:'Hardware',priority:'Alta'}).expect(200);assert.equal(high.body.total,1);
  const sorted=await request(server).get('/api/requests').query({category:'Hardware',sort:'priority',order:'desc'}).expect(200);assert.deepEqual(sorted.body.items.map((x:any)=>x.priority),['Alta','Media','Baja']);
  const injection=await request(server).get('/api/requests').query({q:"' OR 1=1 --"}).expect(200);assert.equal(injection.body.total,0);
});
test('API: DTO rechaza tipos, campos extra, valores y parámetros inválidos',async()=>{
  const server=app.getHttpServer();
  for(const body of [{},{...payload,title:12},{...payload,title:'  '},{...payload,category:'Inventada'},{...payload,status:'Resuelta'},{...payload,description:'corta'},{...payload,requester:null}])await request(server).post('/api/requests').send(body).expect(400);
  for(const query of [{page:0},{page:1.5},{limit:101},{sort:'title; DROP TABLE support_requests'},{order:'oops'},{status:'Cerrada'}])await request(server).get('/api/requests').query(query).expect(400);
  await request(server).get('/api/requests/no-es-uuid').expect(400);
  await request(server).get('/api/requests/00000000-0000-4000-8000-000000000000').expect(404);
});
test('SQL: historial y solicitud se revierten juntos si falla la auditoría',async()=>{
  const created=await request(app.getHttpServer()).post('/api/requests').send(payload).expect(201);
  await assert.rejects(db.transaction(async tx=>{
    await tx.query("UPDATE support_requests SET status='En progreso' WHERE id=$1",[created.body.id]);
    await tx.query("INSERT INTO request_history(request_id,kind,to_status,actor) VALUES($1,'Estado','En progreso','')",[created.body.id]);
  }));
  const current=await request(app.getHttpServer()).get(`/api/requests/${created.body.id}`).expect(200);assert.equal(current.body.status,'Pendiente');
});


test('RPC: anon y authenticated no pueden ejecutar la función; service_role sí',async()=>{
  for(const role of ['anon','authenticated']){
    await db.exec(`SET ROLE ${role}`);
    try{await assert.rejects(db.query("SELECT public.support_api('health')"),(error:any)=>error.code==='42501');}
    finally{await db.exec('RESET ROLE');}
  }
  await db.exec('SET ROLE service_role');
  try{const result=await db.query<{data:any}>("SELECT public.support_api('health') AS data");assert.equal(result.rows[0].data.status,'ok');}
  finally{await db.exec('RESET ROLE');}
});
test('RPC real revierte estado cuando un trigger impide escribir el historial',async()=>{
  const server=app.getHttpServer();
  const created=await request(server).post('/api/requests').send(payload).expect(201);
  await db.exec("CREATE FUNCTION public.test_reject_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo simulado de auditoría'; END; $$; CREATE TRIGGER test_history_failure BEFORE INSERT ON public.request_history FOR EACH ROW EXECUTE FUNCTION public.test_reject_history();");
  try{await request(server).patch(`/api/requests/${created.body.id}/status`).send({status:'En progreso',actor:'Técnico de prueba'}).expect(503);}
  finally{await db.exec('DROP TRIGGER test_history_failure ON public.request_history; DROP FUNCTION public.test_reject_history();');}
  const current=await request(server).get(`/api/requests/${created.body.id}`).expect(200);assert.equal(current.body.status,'Pendiente');
  const history=await request(server).get(`/api/requests/${created.body.id}/history`).expect(200);assert.equal(history.body.length,1);
});

test('Imagen: subir, reemplazar y retirar conserva una sola referencia e historial',async()=>{
  const server=app.getHttpServer();const created=await request(server).post('/api/requests').send({...payload,priority:'Media'}).expect(201);const id=created.body.id;
  const image=await sharp({create:{width:48,height:32,channels:3,background:'#226947'}}).png().toBuffer();
  const initial=await request(server).post(`/api/requests/${id}/image`).field('actor','Carlos').attach('image',image,{filename:'captura.png',contentType:'image/png'}).expect(201);
  assert.match(initial.body.image_path,new RegExp(`^${id}/.+\\.webp$`));assert.ok(storedImages.has(initial.body.image_path));
  const bytes=storedImages.get(initial.body.image_path)!;assert.equal((await sharp(bytes).metadata()).format,'webp');
  const replaced=await request(server).post(`/api/requests/${id}/image`).field('actor','Carlos').attach('image',image,{filename:'otra.png',contentType:'image/png'}).expect(201);
  assert.notEqual(replaced.body.image_path,initial.body.image_path);assert.equal(storedImages.has(initial.body.image_path),false);
  const detail=await request(server).get(`/api/requests/${id}`).expect(200);assert.ok(detail.body.image_url.startsWith('https://images.example.test/'));
  await request(server).delete(`/api/requests/${id}/image`).send({actor:'Carlos'}).expect(200);
  assert.equal(storedImages.has(replaced.body.image_path),false);
  const cleared=await request(server).get(`/api/requests/${id}`).expect(200);assert.equal(cleared.body.image_path,null);assert.equal(cleared.body.image_url,null);
  const history=await request(server).get(`/api/requests/${id}/history`).expect(200);assert.equal(history.body.length,4);assert.ok(history.body[0].changes.image_path);
});
test('Imagen: rechaza contenido falso, archivos múltiples, actor inválido y exceso de payload',async()=>{
  const server=app.getHttpServer();const created=await request(server).post('/api/requests').send(payload).expect(201);const url=`/api/requests/${created.body.id}/image`;
  await request(server).post(url).field('actor','Carlos').attach('image',Buffer.from('<script>alert(1)</script>'),{filename:'fake.png',contentType:'image/png'}).expect(400);
  await request(server).post(url).field('actor','Carlos').expect(400);
  const image=await sharp({create:{width:8,height:8,channels:3,background:'#fff'}}).png().toBuffer();
  await request(server).post(url).field('actor','x').attach('image',image,'a.png').expect(400);
  await request(server).post(url).field('actor','Carlos').attach('image',image,'a.png').attach('image',image,'b.png').expect(400);
  await request(server).post(url).field('actor','Carlos').attach('image',Buffer.alloc(3*1024*1024+1),'grande.png').expect(413);
});
test('Imagen: no se modifica una solicitud cerrada',async()=>{
  const server=app.getHttpServer();const created=await request(server).post('/api/requests').send(payload).expect(201);const id=created.body.id;
  await request(server).patch(`/api/requests/${id}/status`).send({status:'Cancelada',actor:'Carlos'}).expect(200);
  const image=await sharp({create:{width:8,height:8,channels:3,background:'#fff'}}).png().toBuffer();
  await request(server).post(`/api/requests/${id}/image`).field('actor','Carlos').attach('image',image,'a.png').expect(409);
  await request(server).delete(`/api/requests/${id}/image`).send({actor:'Carlos'}).expect(409);
});
test('Imagen: si falla la asociación se elimina el archivo recién subido',async()=>{
  const server=app.getHttpServer();const created=await request(server).post('/api/requests').send(payload).expect(201);
  const provider=app.get(Database);const original=provider.rpc;const count=storedImages.size;
  provider.rpc=(async(operation:string,data:object)=>{if(operation==='image')throw new Error('Fallo simulado');return original(operation,data);}) as any;
  const image=await sharp({create:{width:8,height:8,channels:3,background:'#fff'}}).png().toBuffer();
  try{await request(server).post(`/api/requests/${created.body.id}/image`).field('actor','Carlos').attach('image',image,'a.png').expect(500);}
  finally{provider.rpc=original;}
  assert.equal(storedImages.size,count);
  const detail=await request(server).get(`/api/requests/${created.body.id}`).expect(200);assert.equal(detail.body.image_path,null);
});

test('Crear con imagen genera solo Creación; reemplazar después genera Edición',async()=>{
  const server=app.getHttpServer();const image=await sharp({create:{width:32,height:24,channels:3,background:'#226947'}}).png().toBuffer();
  let creation=request(server).post('/api/requests');for(const [field,value] of Object.entries(payload))creation=creation.field(field,value);
  const result=await creation.attach('image',image,{filename:'inicial.png',contentType:'image/png'}).expect(201);
  assert.ok(result.body.image_path);assert.ok(storedImages.has(result.body.image_path));
  const initial=await request(server).get(`/api/requests/${result.body.id}/history`).expect(200);
  assert.equal(initial.body.length,1);assert.equal(initial.body[0].kind,'Creación');
  assert.match(initial.body[0].observation,/con imagen/);
  await request(server).post(`/api/requests/${result.body.id}/image`).field('actor','Técnico').attach('image',image,{filename:'solucion.png',contentType:'image/png'}).expect(201);
  const later=await request(server).get(`/api/requests/${result.body.id}/history`).expect(200);
  assert.equal(later.body.length,2);assert.equal(later.body[0].kind,'Edición');assert.equal(later.body[0].actor,'Técnico');
});
test('Crear con imagen inválida no crea solicitud ni historial',async()=>{
  const server=app.getHttpServer();const before=await db.query<{total:number}>('SELECT count(*)::int AS total FROM support_requests');
  let creation=request(server).post('/api/requests');for(const [field,value] of Object.entries(payload))creation=creation.field(field,value);
  await creation.attach('image',Buffer.from('no es una imagen'),{filename:'falso.png',contentType:'image/png'}).expect(400);
  const after=await db.query<{total:number}>('SELECT count(*)::int AS total FROM support_requests');assert.equal(after.rows[0].total,before.rows[0].total);
});

test('Imagen inicial: exige migración atómica antes de subir o crear datos',async()=>{
  const server=app.getHttpServer();const provider=app.get(Database);const original=provider.rpc;const count=storedImages.size;
  provider.rpc=(async(operation:string,data:object)=>operation==='health'?{status:'ok'}:original(operation,data)) as any;
  const image=await sharp({create:{width:8,height:8,channels:3,background:'#fff'}}).png().toBuffer();
  let creation=request(server).post('/api/requests');for(const [field,value] of Object.entries(payload))creation=creation.field(field,value);
  try{const result=await creation.attach('image',image,{filename:'inicial.png',contentType:'image/png'}).expect(503);assert.match(result.body.message,/005_atomic/);}
  finally{provider.rpc=original;}
  assert.equal(storedImages.size,count);
});
