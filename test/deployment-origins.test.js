import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoginHandler} from '../supabase/functions/_shared/login-handler.js';
import {createAdminHandler} from '../supabase/functions/_shared/admin-handler.js';
import {createAccountHandler} from '../supabase/functions/_shared/account-handler.js';
const old='https://wang03062001.github.io',next='https://quanlychitieu03062001.vercel.app';
for(const [name,create] of [['login',createLoginHandler],['admin',createAdminHandler],['account',createAccountHandler]]){
 test(`${name}: exact configured production origins work without opening preview/foreign sites`,async()=>{
  let calls=0;const handler=create({url:'https://fixture.supabase.co',publicKey:'public-fixture',serviceKey:'private-fixture',allowedOrigins:[old,next],fetcher:async()=>{calls++;throw Error('unexpected backend request');}});
  for(const origin of [old,next]){const r=await handler(new Request('https://fixture.test',{method:'OPTIONS',headers:{origin}}));assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),origin);assert.equal(r.headers.get('vary'),'Origin');}
  for(const origin of ['https://quanlychitieu.vercel.app','https://unknown-preview.vercel.app',next+'.evil.test','https://evil.test']){const r=await handler(new Request('https://fixture.test',{method:'OPTIONS',headers:{origin}}));assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);}
  const post=await handler(new Request('https://fixture.test',{method:'POST',headers:{origin:next},body:'{}'}));assert.equal(post.status,name==='login'?400:401);assert.equal(calls,0);
 });
 test(`${name}: unchanged default rejects new deployment until explicitly configured`,async()=>{const handler=create({});assert.equal((await handler(new Request('https://fixture.test',{method:'OPTIONS',headers:{origin:next}}))).status,403);assert.equal((await handler(new Request('https://fixture.test',{method:'OPTIONS',headers:{origin:old}}))).status,204);});
}
