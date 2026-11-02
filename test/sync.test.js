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
 await sync.open();sync.save(doc(100));const pending=sync.commit();
 sync.save(doc(200));first.resolve({revision:1});await pending;
 assert.equal(sync.dirty,true);assert.equal(sync.data.goals['2026'],200);
 await sync.commit();assert.equal(sync.dirty,false);assert.deepEqual(revisions,[0,1]);
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
test('logout clears the screen and account caches remain separate',async t=>{
 const {sync,store,client}=setup(t);store.setItem(LOCAL_KEY,JSON.stringify(doc(50)));
 await sync.open();sync.save(doc(100));await sync.commit();const aKey=sync.cacheKey;
 await sync.logout();assert.equal(sync.user,null);assert.deepEqual(sync.data,emptyData());
 client.user=async()=>({id:'user-b'});await sync.open();assert.equal(sync.data.goals['2026'],undefined);
 assert.notEqual(sync.cacheKey,aKey);assert.equal(JSON.parse(store.getItem(aKey)).data.goals['2026'],100);
});
test('network save failure keeps the draft dirty and reports failure',async t=>{
 const {sync,store}=setup(t,{save:async()=>{throw new CloudError('Offline','NETWORK');}});
 await sync.open();sync.save(doc(321));await sync.commit();
 assert.equal(sync.status,'error');assert.equal(sync.dirty,true);assert.equal(JSON.parse(store.getItem(sync.cacheKey)).data.goals['2026'],321);
});
test('logout never displays legacy guest data, even if it is corrupt',async t=>{
 const {sync,store}=setup(t,{load:async()=>({data:doc(999),revision:1})});
 await sync.open();store.setItem(LOCAL_KEY,'corrupt original');await sync.logout();
 assert.equal(sync.user,null);assert.deepEqual(sync.data,emptyData());
 assert.equal(store.getItem(LOCAL_KEY),'corrupt original');
});
test('guests cannot create data or overwrite legacy guest storage',t=>{
 const {sync,store}=setup(t);store.setItem(LOCAL_KEY,'original');
 assert.throws(()=>sync.save(doc(100)),/đăng nhập/);
 assert.deepEqual(sync.data,emptyData());assert.equal(store.getItem(LOCAL_KEY),'original');
});
test('typing and polling do not submit a draft; it restores privately after reauthentication',async t=>{
 let writes=0;const {sync,store,client}=setup(t,{save:async()=>{writes++;return {revision:1}}});
 await sync.open();sync.save(doc(123));await sync.refresh();
 assert.equal(writes,0);assert.equal(sync.status,'draft');assert.equal(JSON.parse(store.getItem(sync.cacheKey)).queued,null);
 await sync.logout();assert.deepEqual(sync.data,emptyData());await sync.open();
 assert.equal(sync.data.goals['2026'],123);assert.equal(sync.status,'draft');assert.equal(writes,0);
 await sync.commit();assert.equal(writes,1);assert.equal(sync.status,'ready');
});
test('retry submits the last explicitly saved snapshot, never later unsaved typing',async t=>{
 const submitted=[];const {sync,client}=setup(t,{save:async()=>{throw new CloudError('Offline','NETWORK')}});
 await sync.open();sync.save(doc(100));await sync.commit();sync.save(doc(200));
 client.save=async data=>{submitted.push(data.goals['2026']);return {revision:1}};
 await sync.refresh();assert.deepEqual(submitted,[100]);assert.equal(sync.data.goals['2026'],200);assert.equal(sync.status,'draft');
});
test('a second explicit save queues behind the first without capturing subsequent typing',async t=>{
 const first=deferred(),values=[];const {sync}=setup(t,{save:async data=>{values.push(data.goals['2026']);return values.length===1?first.promise:{revision:2}}});
 await sync.open();sync.save(doc(100));const pending=sync.commit();sync.save(doc(200));const next=sync.commit();sync.save(doc(300));first.resolve({revision:1});
 await Promise.all([pending,next]);assert.deepEqual(values,[100,200]);assert.equal(sync.data.goals['2026'],300);assert.equal(sync.status,'draft');
});
test('a previously submitted offline save retries on sign-in and becomes clean',async t=>{
 const {sync,client}=setup(t,{save:async()=>{throw new CloudError('Offline','NETWORK')}});
 await sync.open();sync.save(doc(123));await sync.commit();await sync.logout();
 let written;client.save=async data=>{written=data;return {revision:1}};
 await sync.open();assert.equal(written.goals['2026'],123);assert.equal(sync.dirty,false);assert.equal(sync.status,'ready');
});
test('invalid sessions never load private cached data or allow editing',async t=>{
 const {sync,store}=setup(t,{user:async()=>{throw new CloudError('Expired','401')}});
 store.setItem('lich-cloud:example.supabase.co:user-a',JSON.stringify({data:doc(999),dirty:false,revision:1}));
 await sync.open();assert.equal(sync.user,null);assert.deepEqual(sync.data,emptyData());assert.throws(()=>sync.save(doc(1)),/đăng nhập/);
});
test('corrupt account caches stay intact and do not echo private fragments into guest errors',async t=>{
 const {sync,store}=setup(t);const key='lich-cloud:example.supabase.co:user-a';store.setItem(key,'SECRET_FINANCIAL_NOTE invalid json');
 await sync.open();assert.equal(sync.user,null);assert.equal(sync.message.includes('SECRET_FINANCIAL_NOTE'),false);assert.equal(store.getItem(key),'SECRET_FINANCIAL_NOTE invalid json');
});
