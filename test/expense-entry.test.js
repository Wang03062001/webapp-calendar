import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData, normalizeData, monthSummary} from '../src/model.js';
import {accountBalances} from '../src/account-model.js';
import {newRegionalBook} from '../src/region-model.js';
import {confirmedExpenses, expenseConfirmed, protectedExpense} from '../src/expense-model.js';
import {SyncController} from '../src/sync.js';

const date = '2026-01-15';
const item = (id, title = id) => ({id, title, amount: 12.345, status: 'paid', paymentMethod: 'bank'});
function document() {
  const data = emptyData(); data.days[date] = {note: 'Preserve note', items: [item('existing')]};
  data.accounts = {openedOn:'2026-01-01', bank:1000, cash:100, savings:500, creditDebt:0, creditLimit:null, transfers:[]};
  data.regional = {vietnam:newRegionalBook('VN')};
  data.regional.vietnam.days[date] = {note:'VND note', items:[item('existing','Vietnam')]};
  return normalizeData(data);
}
function fixture(remote = document()) {
  const map = new Map(), storage = {getItem:k=>map.get(k)??null, setItem:(k,v)=>map.set(k,v)};
  let revision = 1, user = 'a', failure = null, delay = null, calls = 0, acknowledgements = 0;
  const client = {url:'https://example.test', user:async()=>({id:user}), load:async()=>({data:remote,revision}), signOut:async()=>{}, save:async(data,expected)=>{
    calls++; if(delay)await delay; if(failure)throw failure;
    assert.equal(expected,revision); remote=structuredClone(data);return {revision:++revision};
  }};
  const options = {onData:()=>{},onStatus:()=>{},onConfirmed:()=>acknowledgements++};
  const sync = new SyncController(client,storage,options);
  return {sync,client,storage,options, get remote(){return remote;},get calls(){return calls;},get acknowledgements(){return acknowledgements;}, fail:code=>{failure=code?Object.assign(Error(code),{code}):null;}, setUser:id=>{user=id;remote=emptyData();revision=0;}, wait:()=>{let resolve;delay=new Promise(r=>resolve=r);return ()=>{resolve();delay=null;};}};
}

test('acknowledgements hide entries without modifying costs, balances, notes or either book',async()=>{
  const f=fixture();await f.sync.open();const before=structuredClone(f.sync.data);
  assert(expenseConfirmed(f.sync.confirmedExpenses,'foreign',date,before.days[date].items[0]));
  assert(expenseConfirmed(f.sync.confirmedExpenses,'vietnam',date,before.regional.vietnam.days[date].items[0]));
  const next=structuredClone(before);next.days[date].items.push(item('new'));
  f.sync.save(next);assert(!expenseConfirmed(f.sync.confirmedExpenses,'foreign',date,item('new')));
  await f.sync.commit();assert(expenseConfirmed(f.sync.confirmedExpenses,'foreign',date,item('new')));
  assert.equal(monthSummary(f.remote,2026,0).expense,24.69);
  assert.equal(accountBalances(f.remote,date).bank,975.31);
  assert.equal(f.remote.days[date].note,'Preserve note');
  assert.deepEqual(f.remote.regional,before.regional);
  assert.equal(f.remote.days[date].items.length,2);
  const restored=new SyncController(f.client,f.storage,f.options);await restored.open();
  assert(expenseConfirmed(restored.confirmedExpenses,'foreign',date,item('new')));
});

test('server acknowledges only submitted row content, retaining later edits and new rows across reload',async()=>{
  const f=fixture();await f.sync.open();const next=structuredClone(f.sync.data);next.days[date].items.push(item('new','Submitted'));
  f.sync.save(next);const release=f.wait(),pending=f.sync.commit();
  const later=structuredClone(next);later.days[date].items[1].title='Later typing';later.days[date].items.push(item('later'));
  f.sync.save(later);release();await pending;
  assert.equal(f.remote.days[date].items[1].title,'Submitted');
  assert.equal(f.sync.data.days[date].items[1].title,'Later typing');
  assert(!expenseConfirmed(f.sync.confirmedExpenses,'foreign',date,later.days[date].items[1]));
  assert(!expenseConfirmed(f.sync.confirmedExpenses,'foreign',date,item('later')));
  const restored=new SyncController(f.client,f.storage,f.options);await restored.open();
  assert(!expenseConfirmed(restored.confirmedExpenses,'foreign',date,later.days[date].items[1]));
  assert.equal(f.calls,1);await restored.commit();
  assert(expenseConfirmed(restored.confirmedExpenses,'foreign',date,later.days[date].items[1]));
});

for(const code of ['NETWORK','40001'])test(`${code} preserves drafts and acknowledged rows`,async()=>{
  const f=fixture();await f.sync.open();const before=structuredClone(f.sync.confirmedExpenses);
  const next=structuredClone(f.sync.data);next.days[date].items.push(item('new'));f.sync.save(next);f.fail(code);await f.sync.commit();
  assert.deepEqual(f.sync.confirmedExpenses,before);assert.equal(f.acknowledgements,0);
  assert.equal(f.sync.data.days[date].items.length,2);
  const restored=new SyncController(f.client,f.storage,f.options);await restored.open();
  assert(!expenseConfirmed(restored.confirmedExpenses,'foreign',date,item('new')));
  assert(expenseConfirmed(restored.confirmedExpenses,'foreign',date,item('existing')));
});

test('old dirty caches recover acknowledgements by read without uploading or changing revision',async()=>{
  const f=fixture();const next=document();next.days[date].items.push(item('new'));
  f.storage.setItem('lich-cloud:example.test:a',JSON.stringify({data:next,revision:1,dirty:true,queued:null}));
  await f.sync.open();assert.equal(f.calls,0);assert.equal(f.sync.revision,1);
  assert(expenseConfirmed(f.sync.confirmedExpenses,'foreign',date,item('existing')));
  assert(!expenseConfirmed(f.sync.confirmedExpenses,'foreign',date,item('new')));
  assert.equal(f.sync.data.days[date].items.length,2);
});

test('acknowledgement cache is scoped to account, region, date and complete content',async()=>{
  const f=fixture();await f.sync.open();const confirmed=f.sync.confirmedExpenses;
  assert(!expenseConfirmed(confirmed,'foreign',date,item('existing','Vietnam')));
  assert(!expenseConfirmed(confirmed,'foreign','2026-01-16',item('existing')));
  assert(expenseConfirmed(confirmed,'foreign',date,{...item('existing'),date}));
  await f.sync.logout();assert.equal(f.sync.confirmedExpenses,null);f.setUser('b');await f.sync.open();
  assert(!expenseConfirmed(f.sync.confirmedExpenses,'foreign',date,item('existing')));
});

test('linked repayment, statements, fees, obligations and legacy transfers remain protected',()=>{
  for(const link of ['debtId','debtPaymentId','cardPaymentMonth','cardFeeMonth','obligationId','legacyTransferId'])assert(protectedExpense({...item('protected'),[link]:'link'}));
  assert(!protectedExpense(item('ordinary')));
  const data=document();const confirmed=confirmedExpenses(data);
  assert(!expenseConfirmed(confirmed,'foreign',date,{...item('existing'),amount:12.346}));
});

test('local invalid input text survives acknowledgement/reload but is never sent as finance data',async()=>{
  const f=fixture();await f.sync.open();const next=structuredClone(f.sync.data);next.days[date].items.push(item('partial'));f.sync.save(next);
  const release=f.wait(),pending=f.sync.commit(),key=JSON.stringify(['foreign',date,'partial']);
  f.sync.expenseInputs[key]={amount:{value:'.',message:'Invalid amount'}};f.sync.cache();release();await pending;
  assert.equal(f.remote.days[date].items.at(-1).amount,12.345);assert(!('expenseInputs' in f.remote));
  const restored=new SyncController(f.client,f.storage,f.options);await restored.open();assert.equal(restored.expenseInputs[key].amount.value,'.');
  await restored.logout();assert.deepEqual(restored.expenseInputs,{});f.setUser('b');await restored.open();assert.deepEqual(restored.expenseInputs,{});
});
