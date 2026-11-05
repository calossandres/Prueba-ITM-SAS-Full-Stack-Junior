import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { imageDimensions, MAX_ORIGINAL_IMAGE_BYTES, prepareImage } from '../../frontend/lib/image-upload';
test('Imagen original: máximo 500 MB y rechazo antes de leer archivos mayores',async()=>{
  assert.equal(MAX_ORIGINAL_IMAGE_BYTES,500_000_000);
  let read=false;
  await assert.rejects(prepareImage({size:500_000_001,slice:()=>{read=true;}} as any),/500 MB/);
  assert.equal(read,false);
  await assert.rejects(prepareImage({size:0} as File),/vacía/);
});
test('Cabeceras reales JPG, PNG y WebP; rechazo a SVG disfrazado y resolución excesiva',async()=>{
  for(const format of ['jpeg','png','webp'] as const){
    const data=await sharp({create:{width:73,height:45,channels:3,background:'#fff'}}).toFormat(format).toBuffer();
    assert.deepEqual(imageDimensions(new Uint8Array(data)),{width:73,height:45});
  }
  assert.throws(()=>imageDimensions(new TextEncoder().encode('<svg width="73" height="45"></svg>')),/válida/);
  const huge=Buffer.from(await sharp({create:{width:2,height:2,channels:3,background:'#fff'}}).png().toBuffer());huge.writeUInt32BE(100000,16);huge.writeUInt32BE(100000,20);
  assert.throws(()=>imageDimensions(new Uint8Array(huge)),/resolución/);
});
