import test from 'node:test';
import assert from 'node:assert/strict';
import { SupabaseClient, CloudError } from '../src/supabase.js';
import { SyncController, LOCAL_KEY } from '../src/sync.js';
import { emptyData } from '../src/model.js';
const storage = () => {
 const map = new Map(); return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
};
const doc = value => ({...emptyData(),goals:{'2026':value}});
const deferred = () => {let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function setup(t, overrides={}) {
 const store=storage(), updates=[];
 const client={url:'https://example.supabase.co',user:async()=>({id:'user-a',email:'a@example.com'}),load:async()=>null,save:async()=>({revision:1}),signOut:async()=>{},...overrides};
 const sync=new SyncController(client,store,{onData:data=>updates.push(data),onStatus:()=>{}});
 t.after(()=>clearTimeout(sync.timer)); return {sync,store,updates,client};
}
test('REST uses public apikey separately from a user token and scopes document reads', async()=>{
 const store=storage(),requests=[];
 const client=new SupabaseClient({url:'https://example.supabase.co',key:'sb_publishable_example'},store,async(url,options)=>{
  requests.push({url,options});return new Response(JSON.stringify([]),{status:200});
 });
 client.setSession({access_token:'user-token',refresh_token:'refresh',expires_at:Date.now()/1000+3600});
 await client.load('user-a');
 assert.match(requests[0].url,/user_id=eq.user-a/);
 assert.equal(requests[0].options.headers.apikey,'sb_publishable_example');
 assert.equal(requests[0].options.headers.Authorization,'Bearer user-token');
});
test('expired sessions refresh once for concurrent requests and persist the replacement',async()=>{
 const store=storage();let refreshes=0;
 const client=new SupabaseClient({url:'https://example.supabase.co',key:'public'},store,async(url)=>{
  if(url.includes('refresh_token')){refreshes++;return new Response(JSON.stringify({access_token:'new',refresh_token:'new-refresh',expires_in:3600}));}
  return new Response(JSON.stringify({id:'user-a'}));
 });
 client.setSession({access_token:'expired',refresh_token:'old-refresh',expires_at:0});
 await Promise.all([client.user(),client.user()]);
 assert.equal(refreshes,1);assert.equal(JSON.parse(store.getItem(client.sessionKey)).access_token,'new');
});
test('REST distinguishes conflict and missing schema without hiding server errors',async()=>{
 const client=new SupabaseClient({url:'https://example.supabase.co',key:'public'},storage(),async()=>new Response(JSON.stringify({code:'40001'}),{status:409}));
 await assert.rejects(client.request('/rest/v1/rpc/save_calendar_document'),error=>error.code==='40001');
 client.fetcher=async()=>new Response(JSON.stringify({code:'PGRST205'}),{status:404});
 await assert.rejects(client.request('/rest/v1/calendar_documents'),/supabase\/setup.sql/);
});
test('sign-in loads cloud data without silently uploading local-only finances',async t=>{
 let writes=0;const {sync,store}=setup(t,{load:async()=>({data:doc(200),revision:2}),save:async()=>{writes++;}});
 store.setItem(LOCAL_KEY,JSON.stringify(doc(999)));
 await sync.open();assert.equal(sync.data.goals['2026'],200);assert.equal(sync.revision,2);assert.equal(writes,0);
 assert.equal(JSON.parse(store.getItem(LOCAL_KEY)).goals['2026'],999);
});
test('edits made during an in-flight save are retained for the next revision',async t=>{
 const first=deferred();let calls=0;const revisions=[];
 const {sync}=setup(t,{save:async(data,revision)=>{revisions.push(revision);calls++;return calls===1?first.promise:{revision:2};}});
 await sync.open();sync.save(doc(100));const pending=sync.flush();
 sync.save(doc(200));first.resolve({revision:1});await pending;
 assert.equal(sync.dirty,true);assert.equal(sync.data.goals['2026'],200);
 await sync.flush();assert.equal(sync.dirty,false);assert.deepEqual(revisions,[0,1]);
});
test('conflicting offline draft survives reload and cannot silently overwrite another device',async t=>{
 const {sync,store}=setup(t,{save:async()=>{throw new CloudError('Conflict','40001');}});
 store.setItem('lich-cloud:example.supabase.co:user-a',JSON.stringify({data:doc(99),revision:1,dirty:true}));
 await sync.open();assert.equal(sync.status,'conflict');assert.equal(sync.dirty,true);
 assert.equal(sync.data.goals['2026'],99);assert.equal(JSON.parse(store.getItem(sync.cacheKey)).dirty,true);
 sync.save(doc(100));assert.equal(sync.status,'conflict');assert.equal(sync.data.goals['2026'],100);
});
test('a remote refresh cannot replace edits made while the request was in flight',async t=>{
 const remote=deferred();const {sync,client}=setup(t);await sync.open();
 client.load=async()=>remote.promise;const pending=sync.refresh();sync.save(doc(123));
 remote.resolve({data:doc(900),revision:9});await pending;
 assert.equal(sync.data.goals['2026'],123);assert.equal(sync.revision,0);
});
test('logout returns to local mode and account caches remain separate',async t=>{
 const {sync,store,client}=setup(t);store.setItem(LOCAL_KEY,JSON.stringify(doc(50)));
 await sync.open();sync.save(doc(100));await sync.flush();const aKey=sync.cacheKey;
 await sync.logout();assert.equal(sync.user,null);assert.equal(sync.data.goals['2026'],50);
 client.user=async()=>({id:'user-b'});await sync.open();assert.equal(sync.data.goals['2026'],undefined);
 assert.notEqual(sync.cacheKey,aKey);assert.equal(JSON.parse(store.getItem(aKey)).data.goals['2026'],100);
});
test('network save failure keeps the draft dirty and reports failure',async t=>{
 const {sync,store}=setup(t,{save:async()=>{throw new CloudError('Offline','NETWORK');}});
 await sync.open();sync.save(doc(321));await sync.flush();
 assert.equal(sync.status,'error');assert.equal(sync.dirty,true);assert.equal(JSON.parse(store.getItem(sync.cacheKey)).data.goals['2026'],321);
});
test('logout hides cloud data even when old local data is corrupt',async t=>{
 const {sync,store}=setup(t,{load:async()=>({data:doc(999),revision:1})});
 await sync.open();store.setItem(LOCAL_KEY,'corrupt original');await sync.logout();
 assert.equal(sync.user,null);assert.deepEqual(sync.data,emptyData());assert.equal(sync.localReadError,true);
 assert.equal(store.getItem(LOCAL_KEY),'corrupt original');
});
