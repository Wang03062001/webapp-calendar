import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminHandler} from '../supabase/functions/_shared/admin-handler.js';
import {createLoginHandler} from '../supabase/functions/_shared/login-handler.js';
const A='11111111-1111-1111-1111-111111111111', B='22222222-2222-2222-2222-222222222222';
function fixture({admin=true,banned=false,valid=true,deleteFailure=false}={}){
 const calls=[];
 const fetcher=async(url,options)=>{
  const u=new URL(url),path=u.pathname;calls.push({url,options});let body;
  if(options.method==='DELETE' && path===`/auth/v1/admin/users/${B}` && deleteFailure)return new Response('{}',{status:503});
  if(path==='/auth/v1/user')return new Response(JSON.stringify({id:A,user_metadata:{role:'admin'}}),{status:valid?200:401});
  if(path==='/rest/v1/calendar_admins')body=options.method==='POST'||options.method==='DELETE'?null:admin?[{user_id:A}]:[];
  else if(path===`/auth/v1/admin/users/${A}`)body={id:A,email:'admin@example.com',banned_until:banned?'2999-01-01':null};
  else if(path===`/auth/v1/admin/users/${B}`)body={id:B,email:'b@example.com',user_metadata:{display_name:'Name'},encrypted_password:'never-return'};
  else if(path==='/auth/v1/admin/users')body={users:[{id:B,email:'b@example.com',encrypted_password:'never-return',user_metadata:{display_name:'Name',private:'hidden'}}]};
  else if(path==='/rest/v1/calendar_profiles')body=[{user_id:B,username:'user_b',display_name:'Name'}];
  else if(path==='/auth/v1/recover')body={};
  else throw new Error('Unexpected path');
  return new Response(body===null?'':JSON.stringify(body),{status:200});
 };
 const handler=createAdminHandler({url:'https://example.supabase.co',serviceKey:'server-only-secret',publicKey:'public',fetcher});
 const request=(body,token='user-token',origin='https://wang03062001.github.io')=>handler(new Request('https://example.supabase.co/functions/v1/admin-accounts',{method:'POST',headers:{origin,...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)}));
 return {request,calls};
}
test('admin endpoint rejects missing/invalid identity, forged metadata and blocked admins',async()=>{
 for(const [options,token,expected] of [[{},'',401],[{valid:false},'token',401],[{admin:false},'token',403],[{banned:true},'token',403]]){
  const {request,calls}=fixture(options);assert.equal((await request({action:'list'},token)).status,expected);
  assert.equal(calls.some(c=>new URL(c.url).pathname==='/auth/v1/admin/users'),false);
 }
});
test('admin rejects foreign origins and never leaks private user metadata or service keys',async()=>{
 const {request}=fixture();assert.equal((await request({action:'list'},'token','https://evil.example')).status,403);
 const response=await request({action:'list'});const text=await response.text();
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 for(const secret of ['server-only-secret','never-return','private','encrypted_password'])assert.equal(text.includes(secret),false);
 assert.equal(JSON.parse(text).users[0].username,'user_b');
});
test('admin updates only supported fields and refuses role/password metadata injection',async()=>{
 const {request,calls}=fixture();
 for(const extra of [{password:'hack'},{app_metadata:{role:'admin'}},{user_metadata:{role:'admin'}}])assert.equal((await request({action:'update',user_id:B,email:'new@example.com',...extra})).status,400);
 assert.equal((await request({action:'update',user_id:B,email:'NEW@example.com'})).status,400);
 assert.equal(calls.some(c=>c.options.method==='PUT'),false);
});
test('admin cannot ban or revoke its own active administrator',async()=>{
 const {request}=fixture();
 assert.equal((await request({action:'ban',user_id:A,banned:true})).status,400);
 assert.equal((await request({action:'role',user_id:A,admin:false})).status,400);
 assert.equal((await request({action:'__proto__'})).status,400);
});
test('admin role grant, profile edit and recovery target the verified account',async()=>{
 const {request,calls}=fixture();
 assert.equal((await request({action:'role',user_id:B,admin:true})).status,200);
 assert.equal((await request({action:'profile',user_id:B,username:'new_name',display_name:'New'})).status,200);
 assert.equal((await request({action:'recovery',user_id:B})).status,200);
 const mail=calls.find(c=>new URL(c.url).pathname==='/auth/v1/recover');assert.deepEqual(JSON.parse(mail.options.body),{email:'b@example.com'});
 assert.equal((await request({action:'recovery',user_id:B,email:'unrelated@example.com'})).status,400);
});
test('username login still verifies the password with Supabase Auth',async()=>{
 let password,lookup;
 const handler=createLoginHandler({url:'https://example.supabase.co',serviceKey:'server',publicKey:'public',fetcher:async(url,options)=>{
  const path=new URL(url).pathname;
  if(path==='/rest/v1/calendar_profiles'){lookup=url;return new Response(JSON.stringify([{user_id:A}]))}
  if(path.includes('/admin/users/'))return new Response(JSON.stringify({id:A,email:'admin@calendar.invalid'}));
  password=JSON.parse(options.body);return new Response(JSON.stringify({access_token:'session',refresh_token:'refresh',expires_in:3600}));
 }});
 const response=await handler(new Request('https://example.supabase.co',{method:'POST',body:JSON.stringify({username:'admin',password:'private-user-password'})}));
 assert.equal(response.status,200);assert.match(lookup,/username=eq.admin/);assert.deepEqual(password,{email:'admin@calendar.invalid',password:'private-user-password'});
});
test('unknown username does not leak an email or yield a session',async()=>{
 const handler=createLoginHandler({url:'https://example.supabase.co',serviceKey:'server',publicKey:'public',fetcher:async url=>new Response(JSON.stringify(url.includes('calendar_profiles')?[]:{error:'invalid_credentials'}),{status:url.includes('calendar_profiles')?200:400})});
 const response=await handler(new Request('https://example.supabase.co',{method:'POST',body:JSON.stringify({username:'unknown',password:'anything'})}));
 assert.equal(response.status,401);assert.equal((await response.text()).includes('@'),false);
});

test('only an active server-verified admin can delete other accounts',async()=>{
 for(const [options,token,status] of [[{},'',401],[{valid:false},'token',401],[{admin:false},'token',403],[{banned:true},'token',403]]){
  const f=fixture(options);assert.equal((await f.request({action:'delete',user_id:B,confirmation:'b@example.com'},token)).status,status);assert.equal(f.calls.some(c=>c.options.method==='DELETE'),false);
 }
 const f=fixture();const response=await f.request({action:'delete',user_id:B,confirmation:'b@example.com'});assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{ok:true,deleted_user_id:B});
 const deletions=f.calls.filter(c=>c.options.method==='DELETE');assert.equal(deletions.length,1);assert.equal(new URL(deletions[0].url).pathname,`/auth/v1/admin/users/${B}`);assert.deepEqual(JSON.parse(deletions[0].options.body),{should_soft_delete:false});
});
test('delete refuses self, stale or missing confirmation, malformed targets and extra fields',async()=>{
 const f=fixture();
 for(const [input,status] of [[{user_id:A,confirmation:'admin@example.com'},400],[{user_id:B},400],[{user_id:B,confirmation:'old@example.com'},409],[{user_id:'../users',confirmation:'b@example.com'},400],[{user_id:B,confirmation:'b@example.com',should_soft_delete:true},400]])assert.equal((await f.request({action:'delete',...input})).status,status);
 assert.equal(f.calls.some(c=>c.options.method==='DELETE'),false);
});
test('failed Auth deletion reports failure without falling through to other mutations',async()=>{
 const f=fixture({deleteFailure:true});const response=await f.request({action:'delete',user_id:B,confirmation:'b@example.com'});assert.equal(response.status,502);
 assert.equal(f.calls.filter(c=>c.options.method==='DELETE').length,1);assert.equal(f.calls.some(c=>['PATCH','PUT'].includes(c.options.method)),false);
});
