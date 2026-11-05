import test from 'node:test';
import assert from 'node:assert/strict';
import {SyncController} from '../src/sync.js';
import {normalizeData} from '../src/model.js';
import {cleanupFixture} from '../scripts/fixtures/safety-cleanup.mjs';
const clone=structuredClone;
function fixture(){
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 let remote=cleanupFixture(),revision=1,mode=null,reads=0,writes=0,user='owner',releaseRead=null;
 const client={url:'https://conflict.example.test',user:async()=>({id:user}),signOut:async()=>{},load:async()=>{reads++;if(releaseRead)await releaseRead;if(mode==='read-offline')throw Error('Synthetic offline read');return {data:clone(remote),revision};},save:async(data,expected)=>{
  writes++;if(mode==='conflict'||expected!==revision)throw Object.assign(Error('Document changed on another device'),{code:'40001'});
  remote=normalizeData(clone(data));revision++;
  if(mode==='lost-ack')throw Object.assign(Error('Synthetic lost response'),{code:'NETWORK'});
  return {revision};
 }};
 const create=()=>new SyncController(client,storage,{onData:()=>{},onStatus:()=>{}});
 return {storage,map,client,create,get remote(){return remote;},get revision(){return revision;},get reads(){return reads;},get writes(){return writes;},mode:value=>mode=value,setRemote:(d,r)=>{remote=d;revision=r;},setUser:id=>{user=id;remote=cleanupFixture();revision=1;},holdRead:p=>releaseRead=p};
}
const edit=s=>{const d=clone(s.data);d.days['2026-11-04']={note:'Keep draft note',items:[{id:'new',title:'Keep expense',amount:12,status:'paid',paymentMethod:'cash'}]};s.save(d);s.expenseInputs={raw:{amount:{value:'.',message:'Keep unfinished amount'}}};s.cache();};
test('conflict blocks every write route and survives reload, further typing, polling and reauthentication',async()=>{
 const f=fixture();let s=f.create();await s.open();edit(s);f.mode('conflict');await s.commit();assert.equal(f.writes,1);const baseline=s.revision,confirmed=clone(s.confirmedData),draft=clone(s.data),queued=clone(s.queued);
 assert.equal(s.conflicted,true);assert.equal(JSON.parse(f.storage.getItem(s.cacheKey)).conflict,true);
 for(let n=0;n<3;n++){
  s=f.create();await s.open();assert.equal(s.status,'conflict');assert.equal(s.revision,baseline);assert.deepEqual(s.data,draft);assert.deepEqual(s.queued,queued);assert.deepEqual(s.confirmedData,confirmed);assert.equal(s.expenseInputs.raw.amount.value,'.');
  await s.refresh();await s.refresh({checkDraft:true});await s.commit();await s.flush();await assert.rejects(s.commitConfirmed(draft),/thiết bị khác/);await assert.rejects(s.resetConfirmed(draft));assert.equal(f.writes,1);
 }
 s.statusChanged('error','A later UI failure');s.save(draft);await s.commit();await s.refresh();assert.equal(s.status,'conflict');assert.equal(f.writes,1);
 await s.logout();await s.open();assert.equal(s.status,'conflict');assert.equal(f.writes,1);
});
test('a restored legacy stale queue is checked by read and never sent to the save RPC',async()=>{
 const f=fixture(),s=f.create(),d=cleanupFixture();d.days['2026-11-04']={note:'Legacy draft',items:[]};
 f.storage.setItem('lich-cloud:conflict.example.test:owner',JSON.stringify({data:d,revision:1,dirty:true,counter:1,queued:{data:d,counter:1}}));
 const remote=cleanupFixture();remote.days['2026-11-04']={note:'New remote note',items:[]};f.setRemote(remote,2);await s.open();assert.equal(s.status,'conflict');assert.equal(f.writes,0);assert.equal(s.data.days['2026-11-04'].note,'Legacy draft');assert.equal(s.revision,1);
 for(let n=0;n<15;n++){await s.refresh();await s.commit();}assert.equal(f.writes,0);
});
test('lost acknowledgement is recovered by an exact read without duplicate expense or extra revision',async()=>{
 const f=fixture();let s=f.create();await s.open();edit(s);f.mode('lost-ack');await s.commit();const submitted=clone(f.remote);assert.equal(f.writes,1);assert.equal(s.status,'error');assert.equal(f.revision,2);assert.equal(s.revision,1);
 const later=clone(s.data);later.days['2026-11-04'].items[0].title='Later unsent title';s.save(later);
 // PostgreSQL jsonb need not preserve object property insertion order.
 const reorder=v=>Array.isArray(v)?v.map(reorder):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).reverse().map(k=>[k,reorder(v[k])])):v;
 f.setRemote(reorder(submitted),2);s=f.create();await s.open();assert.equal(f.writes,1);assert.equal(s.revision,2);assert.equal(s.status,'draft');assert.equal(s.dirty,true);assert.equal(s.data.days['2026-11-04'].items[0].title,'Later unsent title');assert.equal(s.confirmedData.days['2026-11-04'].items[0].title,'Keep expense');assert.equal(s.expenseInputs.raw.amount.value,'.');assert.deepEqual(s.confirmedData.regional,submitted.regional);assert.equal(s.queued,null);
 f.mode(null);await s.commit();assert.equal(f.writes,2);assert.equal(f.revision,3);assert.equal(s.status,'ready');assert.equal(f.remote.days['2026-11-04'].items.length,1);
});
test('uncertain writes never rebase a differing inactive book or skip multiple remote revisions',async()=>{
 for(const difference of ['inactive-book','same-content-later-revision']){
  const f=fixture(),s=f.create();await s.open();edit(s);f.mode('lost-ack');await s.commit();const draft=clone(s.data),remote=clone(f.remote);
  if(difference==='inactive-book')remote.regional.vietnam.days['2026-11-02'].note='Other device updated VN';
  f.setRemote(remote,difference==='inactive-book'?2:3);await s.refresh();assert.equal(s.status,'conflict');assert.equal(s.revision,1);assert.equal(f.writes,1);assert.deepEqual(s.data,draft);assert.deepEqual(f.remote,remote);
 }
});
test('retry after a save failed before reaching the server checks the original base and keeps raw input',async()=>{
 const f=fixture(),s=f.create();await s.open();edit(s);const realSave=f.client.save;f.client.save=async()=>{throw Object.assign(Error('Network'),{code:'NETWORK'});};await s.commit();assert.equal(s.verifyQueued,true);
 const before=f.reads;f.client.save=realSave;await s.refresh();assert(f.reads>before);assert.equal(f.writes,1);assert.equal(s.status,'ready');assert.equal(s.expenseInputs.raw.amount.value,'.');
});
test('failed recovery read preserves the persistent conflict; explicit successful remote load clears it',async()=>{
 const f=fixture(),s=f.create();await s.open();edit(s);f.mode('conflict');await s.commit();const draft=clone(s.data);f.mode('read-offline');await assert.rejects(s.useRemote());assert.equal(s.status,'conflict');assert.equal(s.conflicted,true);assert.deepEqual(s.data,draft);assert.equal(JSON.parse(f.storage.getItem(s.cacheKey)).conflict,true);
 f.mode(null);await s.useRemote();assert.equal(s.status,'ready');assert.equal(s.conflicted,false);assert.equal(s.verifyQueued,false);assert.equal(s.queued,null);assert.deepEqual(s.data,f.remote);assert.equal(JSON.parse(f.storage.getItem(s.cacheKey)).conflict,false);
 edit(s);await s.commit();assert.equal(s.status,'ready');assert.equal(f.writes,2);
});
test('conflict recovery cannot apply a late response to another signed-in account',async()=>{
 const f=fixture(),s=f.create();await s.open();edit(s);f.mode('conflict');await s.commit();f.mode(null);let release;f.holdRead(new Promise(r=>release=r));const recovery=s.useRemote();await s.logout();f.setUser('other-owner');f.holdRead(null);await s.open();const other=clone(s.data);release();await recovery;assert.equal(s.user.id,'other-owner');assert.deepEqual(s.data,other);assert.equal(s.conflicted,false);assert.equal(f.writes,1);
});
