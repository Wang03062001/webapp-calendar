import test from 'node:test';import assert from 'node:assert/strict';import {createAccountHandler} from '../supabase/functions/_shared/account-handler.js';
const A='11111111-1111-1111-1111-111111111111',B='22222222-2222-2222-2222-222222222222';
function fixture({admin=false,banned=false,rpcError=false,configured=true}={}){
 let stage='start',hash='',currentEmail='old@example.test',newEmail='',id,wrong=0;const calls=[],codes=[];
 const fetcher=async(url,options={})=>{
  const path=new URL(url).pathname,body=options.body?JSON.parse(options.body):{};calls.push({path,method:options.method,body});let result={};let status=200;
  if(url==='https://api.resend.com/emails'){codes.push(body.text.match(/code: (\d+)/)[1]);return new Response('{}');}
  if(path==='/auth/v1/user')result={id:A,user_metadata:{role:'admin'}};
  else if(path==='/rest/v1/calendar_admins')result=admin?[{user_id:A}]:[];
  else if(path.startsWith('/auth/v1/admin/users/')){if(options.method==='PUT')currentEmail=body.email;result={id:path.split('/').at(-1),email:currentEmail,banned_until:banned?'2999-01-01':null};}
  else if(path==='/rest/v1/calendar_profiles')result=[{username:'new_name'}];
  else if(path==='/rest/v1/rpc/calendar_email_step'){
   if(rpcError)return new Response('{}',{status:404});
   if(body.p_action==='start'){stage='old_pending';hash=body.p_hash;id=body.p_id;result={ok:true,stage};}
   else if(body.p_id!==id)result={error:'invalid'};
   else if(body.p_action==='verify_old'){if(stage!=='old_pending')result={error:'order'};else if(body.p_hash!==hash){wrong++;result={error:'invalid'};}else{stage='old_verified';result={ok:true,stage};}}
   else if(body.p_action==='new'){if(stage!=='old_verified')result={error:'order'};else{stage='new_pending';hash=body.p_hash;newEmail=body.p_email;result={ok:true,stage};}}
   else if(body.p_action==='verify_new'){if(stage!=='new_pending')result={error:'order'};else if(body.p_hash!==hash){wrong++;result={error:'invalid'};}else{stage='applying';result={ok:true,stage,old_email:currentEmail,new_email:newEmail};}}
   else if(body.p_action==='finish'){stage='done';result={ok:true};}
  } else throw new Error('Unexpected path '+path);
  return new Response(JSON.stringify(result),{status});
 };
 const handler=createAccountHandler({url:'https://example.supabase.co',publicKey:'public',serviceKey:'server-secret',...(configured?{mailKey:'mail-secret',mailFrom:'app@example.test'}:{}),fetcher});
 const request=body=>handler(new Request('https://example.supabase.co/functions/v1/account-settings',{method:'POST',headers:{Authorization:'Bearer user-token',origin:'https://wang03062001.github.io'},body:JSON.stringify(body)}));
 return {request,calls,codes,getEmail:()=>currentEmail};
}
test('self profile works; arbitrary targets and forged admin metadata are rejected',async()=>{
 const f=fixture();assert.equal((await f.request({action:'profile',user_id:B,username:'renamed',display_name:'Name'})).status,403);
 assert.equal((await f.request({action:'profile',username:'renamed',display_name:'Name'})).status,200);
 assert.equal((await f.request({action:'profile',username:'renamed',display_name:'Name',email:'bypass@example.test'})).status,400);
 assert.equal((await fixture({banned:true}).request({action:'start'})).status,403);
 assert.equal((await fixture({admin:true}).request({action:'profile',user_id:B,username:'renamed',display_name:'Name'})).status,200);
});
test('email remains unchanged through old proof and all failed new proofs; only new proof updates Auth',async()=>{
 const f=fixture();let response=await f.request({action:'start'});assert.equal(response.status,200);const {id}=await response.json();
 assert.equal((await f.request({action:'new',id,email:'new@example.test'})).status,400);
 assert.equal((await f.request({action:'verify_old',id,code:'bad'})).status,400);
 assert.equal((await f.request({action:'verify_old',id,code:f.codes[0]})).status,200);assert.equal(f.getEmail(),'old@example.test');
 assert.equal((await f.request({action:'new',id,email:'NEW@example.test'})).status,200);
 assert.equal((await f.request({action:'verify_new',id,code:f.codes[1]==='000000'?'111111':'000000'})).status,400);assert.equal(f.getEmail(),'old@example.test');
 assert.equal(f.calls.filter(c=>c.method==='PUT').length,0);
 response=await f.request({action:'verify_new',id,code:f.codes[1]});assert.equal(response.status,200);assert.equal(f.getEmail(),'new@example.test');
 assert.deepEqual(f.calls.find(c=>c.method==='PUT').body,{email:'new@example.test',email_confirm:true});
 const publicBody=JSON.stringify(await response.json());for(const secret of ['server-secret','mail-secret',f.codes[0],f.codes[1]])assert.ok(!publicBody.includes(secret));
 assert.equal((await f.request({action:'verify_new',id,code:f.codes[1]})).status,400);
});
test('missing migration or mail configuration fails closed without changing Auth',async()=>{
 for(const options of [{configured:false},{rpcError:true}]){const f=fixture(options);assert.ok((await f.request({action:'start'})).status>=500);assert.equal(f.calls.some(c=>c.method==='PUT'),false);}
});
