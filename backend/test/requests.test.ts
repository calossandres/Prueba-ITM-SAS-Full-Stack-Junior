import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PGlite } from '@electric-sql/pglite';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Database } from '../src/database';
import { STATUSES, TRANSITIONS, validateTransition } from '../src/domain';
let app:INestApplication;
let db:PGlite;
const payload={ title:'Falla de conexión a red', description:'La conexión de la oficina deja de funcionar al iniciar.', requester:'Carlos Cabrera', category:'Red', priority:'Crítica' };
before(async()=>{
  db=new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
  await db.exec(readFileSync(resolve(__dirname,'../../supabase/migrations/001_initial.sql'),'utf8'));
  app=await NestFactory.create(AppModule,{logger:false});
  const provider=app.get(Database);
  provider.query=((sql:string,values:unknown[]=[])=>db.query(sql,values)) as any;
  provider.transaction=((fn:any)=>db.transaction(async tx=>fn({query:(sql:string,values:unknown[]=[])=>tx.query(sql,values)}))) as any;
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  await app.init();
});
after(async()=>{await app?.close();await db?.close();});
for(const from of STATUSES)for(const to of STATUSES)test(`Transición ${from} → ${to}`,()=>{
  if(TRANSITIONS[from].includes(to))assert.doesNotThrow(()=>validateTransition(from,to,'Media'));
  else assert.throws(()=>validateTransition(from,to,'Media'));
});
test('Crítica requiere observación no vacía para resolver',()=>{
  for(const value of [undefined,'','   '])assert.throws(()=>validateTransition('En progreso','Resuelta','Crítica',value));
  assert.doesNotThrow(()=>validateTransition('En progreso','Resuelta','Crítica','Se restauró la conexión.'));
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
