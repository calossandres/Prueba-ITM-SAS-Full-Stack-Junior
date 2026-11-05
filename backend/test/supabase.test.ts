import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Database } from '../src/database';
test('SDK envía la clave solo al servidor Supabase y traduce errores de RPC', async()=>{
  const originalUrl=process.env.SUPABASE_URL,originalKey=process.env.SUPABASE_SECRET_KEY;
  const server=createServer((req,res)=>{
    assert.equal(req.url,'/rest/v1/rpc/support_api');
    assert.equal(req.headers.apikey,'sb_secret_test_only');
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{
      const payload=JSON.parse(body);assert.equal(payload.p_payload.id,'test-id');
      res.setHeader('Content-Type','application/json');
      if(payload.p_operation==='detail'){res.end(JSON.stringify({id:'test-id'}));}
      else {res.statusCode=400;res.end(JSON.stringify({code:'PT400',message:'Transición no permitida.'}));}
    });
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  process.env.SUPABASE_URL=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.SUPABASE_SECRET_KEY='sb_secret_test_only';
  try{
    const client=new Database();assert.deepEqual(await client.rpc('detail',{id:'test-id'}),{id:'test-id'});
    await assert.rejects(client.rpc('status',{id:'test-id'}),(error:any)=>error.getStatus()===400);
  }finally{
    await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
    if(originalUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=originalUrl;
    if(originalKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=originalKey;
  }
});
