// Isolated PostgreSQL/PostgREST integration test. Never connects to Supabase.
// Docker's managed local socket, inherited registry proxy/CA settings only.
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {SupabaseClient} from '../src/supabase.js';
const env={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key];
const docker=(args,input)=>execFileSync('docker',['--host=unix:///var/run/docker.sock',...args],{env,input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const suffix=String(process.pid),network='calendar-conflict-'+suffix,db='calendar-conflict-db-'+suffix,api='calendar-conflict-api-'+suffix;
const pgImage='postgres:17-alpine@sha256:266d3c257594e195b309ae9d1805e54c788f1d7b375f56bf6c367aac6c917e7b';
// This older version exposes the 40001 retry behavior; custom PT409 also works
// with newer versions that no longer retry serialization errors automatically.
const apiImage='postgrest/postgrest:v12.2.12@sha256:5f4ce744539bbba786b4e24dbbd95bdb2a956dcf568c5374995a0ff4a68f5bd2';
const secret='local-fixture-only-not-a-production-secret-12345',a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const jwt=id=>{const head=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),body=Buffer.from(JSON.stringify({role:'authenticated',sub:id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),signed=head+'.'+body;return signed+'.'+createHmac('sha256',secret).update(signed).digest('base64url');};
const sql=(text,database='postgres')=>docker(['exec','-i',db,'psql','-h','127.0.0.1','-X','-A','-t','-v','ON_ERROR_STOP=1','-U','postgres','-d',database],text);
const setup=await readFile(new URL('../supabase/setup.sql',import.meta.url),'utf8'),repair=await readFile(new URL('../supabase/fix-document-conflict.sql',import.meta.url),'utf8'),admin=await readFile(new URL('../supabase/admin-setup.sql',import.meta.url),'utf8');
assert(setup.includes("errcode = 'PT409'"));
const init=`create schema auth; create table auth.users(id uuid primary key,banned_until timestamptz,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
insert into auth.users(id) values ('${a}'),('${b}');`;
let origin;
async function request(path,body,id=a){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{...(id?{Authorization:'Bearer '+jwt(id)}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});return {status:r.status,body:await r.json()};}
const data={version:2,days:{'2026-11-06':{note:'Synthetic history',items:[{id:'one',title:'Synthetic expense',amount:12.125,status:'paid',paymentMethod:'bank'}]}},incomes:{},savings:{},goals:{},regional:{vietnam:{version:2,days:{'2026-11-06':{note:'Independent VN fixture',items:[]}},incomes:{},savings:{},goals:{}}}};
const snapshot=()=>sql("select coalesce(jsonb_agg(to_jsonb(d) order by user_id),'[]'::jsonb) from public.calendar_documents d;");
const properties=()=>sql("select jsonb_build_object('owner',proowner,'acl',proacl,'config',proconfig,'definer',prosecdef) from pg_proc where oid='public.save_calendar_document(jsonb,bigint)'::regprocedure;");
const logs=()=>{const r=spawnSync('docker',['--host=unix:///var/run/docker.sock','logs',db],{env,encoding:'utf8'});assert.equal(r.status,0);return r.stdout+r.stderr;};
const retries=()=>[...logs().matchAll(/40001:.*Document changed on another device/g)].length;
try{
 docker(['info','--format','{{.ServerVersion}}']);
 // A private bridge with only the REST port bound to loopback; no DB host port.
 // Docker's internal-only bridge suppresses loopback port publication here.
 docker(['network','create',network]);
 docker(['run','-d','--name',db,'--network',network,'-e','POSTGRES_HOST_AUTH_METHOD=trust',pgImage,'postgres','-c','log_error_verbosity=verbose']);
 let ready=false;for(let i=0;i<100;i++){try{sql('select 1;');ready=true;break;}catch{await pause(200);}}assert(ready,'isolated PostgreSQL did not start');
 sql('create role anon nologin; create role authenticated nologin; create role service_role nologin;');sql(init);
 // Recreate the exact legacy server SQLSTATE in this disposable fixture only.
 sql(setup.replace("errcode = 'PT409'","errcode = '40001'"));sql(admin);
 sql("create function public.conflict_probe(p_data jsonb,p_expected_revision bigint) returns jsonb language plpgsql as $$ begin perform pg_sleep(0.05); return public.save_calendar_document(p_data,p_expected_revision); end $$; revoke all on function public.conflict_probe(jsonb,bigint) from public; grant execute on function public.conflict_probe(jsonb,bigint) to authenticated;");
 docker(['run','-d','--name',api,'--network',network,'-p','127.0.0.1::3000','-e','PGRST_DB_URI=postgres://postgres@'+db+'/postgres','-e','PGRST_DB_SCHEMAS=public','-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_JWT_SECRET='+secret,apiImage]);
 const address=docker(['port',api,'3000/tcp']);origin='http://'+address;
 ready=false;for(let i=0;i<100;i++){try{const r=await fetch(origin,{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}await pause(100);}assert(ready,'isolated PostgREST did not start');
 assert.deepEqual(await request('/rpc/save_calendar_document',{p_data:data,p_expected_revision:0}),{status:200,body:{revision:1}});
 assert.deepEqual(await request('/rpc/save_calendar_document',{p_data:data,p_expected_revision:1}),{status:200,body:{revision:2}});
 const before=snapshot(),meta=properties();
 // One HTTP request, multiple PostgreSQL errors, no browser retry involved.
 const pending=request('/rpc/conflict_probe',{p_data:data,p_expected_revision:1});let count=0;
 for(let i=0;i<30;i++){count=retries();if(count>=3)break;await pause(100);}assert(count>=3,'legacy 40001 did not reproduce automatic retries');
 assert.match(sql(repair),/\|t$/);const response=await pending;assert.equal(response.status,409);assert.equal(response.body.code,'PT409');assert.equal(snapshot(),before);assert.equal(properties(),meta);
 const stopped=retries();await pause(300);assert.equal(retries(),stopped);sql(repair);assert.equal(snapshot(),before);assert.equal(properties(),meta);
 const next=await request('/rpc/save_calendar_document',{p_data:data,p_expected_revision:1});assert.equal(next.status,409);assert.equal(next.body.code,'PT409');assert.equal(retries(),stopped);
 const store=new Map(),client=new SupabaseClient({url:origin,key:'local-publishable-fixture'},{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},(url,options)=>fetch(url.replace(origin+'/rest/v1/',origin+'/'),options));
 client.setSession({access_token:jwt(a),expires_at:Date.now()/1000+3600});await assert.rejects(client.save(data,1),error=>error.code==='40001');assert.equal(retries(),stopped);
 console.log('PASS one HTTP request reproduced '+count+' legacy serialization retries; targeted SQL repair stopped the in-flight loop and returned HTTP 409/PT409 without changing data, owner, ACL, search_path or SECURITY DEFINER; repeat repair is safe');
 assert.equal((await request('/rpc/save_calendar_document',{p_data:data,p_expected_revision:2},null)).status,401);
 assert.deepEqual((await request('/calendar_documents?select=user_id,data,revision',null,b)).body,[]);
 assert.equal((await request('/rpc/save_calendar_document',{p_data:data,p_expected_revision:2},b)).status,409);assert.equal(snapshot(),before);
 sql(`update auth.users set banned_until=now()+interval '1 day' where id='${a}';`);assert.equal((await request('/rpc/save_calendar_document',{p_data:data,p_expected_revision:2})).status,403);assert.deepEqual((await request('/calendar_documents?select=user_id')).body,[]);assert.equal(snapshot(),before);sql(`update auth.users set banned_until=null where id='${a}';`);
 assert.deepEqual(await request('/rpc/save_calendar_document',{p_data:data,p_expected_revision:2}),{status:200,body:{revision:3}});
 console.log('PASS ordinary valid saves, stale revisions, anonymous denial, owner RLS, inactive regional JSON and banned-account guard remain enforced');
 const def=sql("select pg_get_functiondef('public.save_calendar_document(jsonb,bigint)'::regprocedure);");sql(def.replaceAll('Document changed on another device','Unexpected fixture conflict'));const altered=sql("select prosrc from pg_proc where oid='public.save_calendar_document(jsonb,bigint)'::regprocedure;");assert.throws(()=>sql(repair));assert.equal(sql("select prosrc from pg_proc where oid='public.save_calendar_document(jsonb,bigint)'::regprocedure;"),altered);sql(def);
 sql('create database fresh_fixture;');assert.throws(()=>sql(repair,'fresh_fixture'));sql(init,'fresh_fixture');sql(setup,'fresh_fixture');
 sql(`begin; set local role authenticated; set local request.jwt.claims='{"sub":"${a}","role":"authenticated"}'; do $$ begin perform public.save_calendar_document('{"version":2,"days":{},"incomes":{},"savings":{},"goals":{}}',1); raise exception 'expected PT409'; exception when sqlstate 'PT409' then null; end $$; rollback;`,'fresh_fixture');
 console.log('PASS unexpected/missing function causes no patch, and a fresh setup raises PT409 instead of retryable 40001');
}catch(error){
 for(const name of [api,db]){
  const state=spawnSync('docker',['--host=unix:///var/run/docker.sock','inspect','--format','{{json .State}} {{json .NetworkSettings.Ports}}',name],{env,encoding:'utf8'});process.stderr.write(state.stdout);
  const result=spawnSync('docker',['--host=unix:///var/run/docker.sock','logs','--tail','12',name],{env,encoding:'utf8'});
  process.stderr.write(name+'\n'+result.stdout+result.stderr);
 }
 throw error;
}finally{
 for(const name of [api,db])try{docker(['rm','-f',name]);}catch{}
 try{docker(['network','rm',network]);}catch{}
}
