import test from 'node:test';
import assert from 'node:assert/strict';
import {newRegionalBook,readBook,writeBook} from '../src/region-model.js';
import {normalizeData,monthSummary} from '../src/model.js';
import {accountBalances,setSourceOpening,sourceOpening,balanceUpdateCount,reconcileMonth} from '../src/account-model.js';
import {financeView,creditSnapshot} from '../src/credit-access.js';
import {saveStatement,settleStatement} from '../src/card-model.js';
import {SyncController} from '../src/sync.js';
const fixture=()=>{
 const data=newRegionalBook('JP');data.accounts={openedOn:'2026-11-01',bank:1000,cash:100,savings:500,creditDebt:200,creditLimit:5000,transfers:[]};
 data.incomes['2026-10']={salary:200,bonus:0,note:'Salary history',account:'bank',receivedOn:'2026-10-15'};
 data.days['2026-10-31']={note:'October note',items:[{id:'old',title:'Old spending',amount:50,status:'paid',paymentMethod:'bank'},{id:'old-card',title:'Older card purchase',amount:30,status:'paid',paymentMethod:'card',settlement:'oneoff',billingMonth:'2026-11'}]};
 data.days['2026-11-02']={note:'November note',items:[{id:'new',title:'New spending',amount:10,status:'paid',paymentMethod:'cash'},{id:'card',title:'Card purchase',amount:20,status:'paid',paymentMethod:'card',settlement:'oneoff',billingMonth:'2026-12'}]};
 return normalizeData(data);
};
const entry=(overrides={})=>({id:'opening',date:'2026-10-31',timing:'end',bank:2000,cash:200,savings:700,confirmedOn:'2026-11-04',note:'Mock actual closing',...overrides});
const set=(data,row=entry())=>setSourceOpening(data,row,{today:'2026-11-04'});

test('prior-month closing carries sources forward without replaying same-day expenses or creating income',()=>{
 const data=fixture(),before=structuredClone(data),credit=creditSnapshot(data);set(data);
 assert.deepEqual(accountBalances(data,'2026-10-31'),{bank:2000,cash:200,savings:700,creditDebt:null,available:null});
 assert.deepEqual(accountBalances(data,'2026-11-02'),{bank:2000,cash:190,savings:700,creditDebt:220,available:4780});
 assert.equal(accountBalances(data,'2026-10-30'),null);
 assert.equal(monthSummary(data,2026,9).salary,200);assert.deepEqual(data.incomes,before.incomes);assert.deepEqual(data.days,before.days);assert.equal(creditSnapshot(data),credit);
 assert.deepEqual(normalizeData(JSON.parse(JSON.stringify(data))),data);assert.equal(balanceUpdateCount(data.accounts,'2026-11'),1);
});

test('earlier start includes actual income/expenses and leaves credit anchored to its original day',()=>{
 const data=fixture();set(data,entry({date:'2026-10-01',timing:'start'}));
 assert.equal(accountBalances(data,'2026-10-31').bank,2150);assert.equal(accountBalances(data,'2026-11-02').creditDebt,220);
 data.incomes['2026-10'].salary=300;assert.equal(accountBalances(data,'2026-10-31').bank,2250);
 assert.equal(data.accounts.openedOn,'2026-11-01');assert.equal(data.accounts.creditDebt,200);
 // Moving the cash opening later also must not hide earlier card purchases.
 const noSavings=fixture();delete noSavings.accounts.savings;set(noSavings,entry({date:'2026-11-03',timing:'start',savings:undefined}));
 assert.equal(accountBalances(noSavings,'2026-11-04').creditDebt,220);
});

test('latest opening is active, old openings and later observed closes retain their history',()=>{
 const data=fixture();set(data);set(data,entry({id:'second',date:'2026-10-01',timing:'start',bank:3000}));
 assert.equal(data.accounts.openingHistory.length,2);assert.equal(sourceOpening(data.accounts).bank,3000);
 reconcileMonth(data,'2026-10-31',{bank:900,cash:80,savings:600},{id:'closing',today:'2026-11-04'});
 const history=structuredClone(data.accounts.reconciliations);set(data,entry({id:'third',date:'2026-10-01',timing:'start',bank:4000}));
 assert.equal(accountBalances(data,'2026-11-02').bank,900);assert.equal(accountBalances(data,'2026-11-02').cash,70);assert.deepEqual(data.accounts.reconciliations,history);
 const before=structuredClone(data);assert.throws(()=>set(data,entry({id:'fourth'})),/3 lượt/);assert.deepEqual(data,before);
});

test('opening changes share monthly quota with manual updates and preserve inactive books/admin projections',()=>{
 const data=fixture();data.regional={vietnam:newRegionalBook('VN')};const vietnam=structuredClone(data.regional);
 set(data);reconcileMonth(data,'2026-11-02',{bank:2000,cash:190,savings:700},{id:'manual',manual:true,today:'2026-11-04',creditAllowed:false});
 set(data,entry({id:'third'}));assert.equal(balanceUpdateCount(data.accounts,'2026-11'),3);assert.equal(balanceUpdateCount(data.regional.vietnam.accounts,'2026-11'),0);
 assert.equal(accountBalances(financeView(data,false),'2026-11-02').creditDebt,0);assert.equal(accountBalances(data,'2026-11-02').creditDebt,220);
 assert.deepEqual(data.regional,vietnam);assert.deepEqual(normalizeData(data),data);
 const book=readBook(data,'foreign');assert.deepEqual(writeBook(data,'foreign',book).regional,vietnam);
});

test('malformed/future/duplicate openings, hidden reconciliation and insufficient savings/funds fail atomically',()=>{
 const data=fixture();for(const bad of [{date:'2026-11-05'},{date:'2026-10-30'},{bank:'bad'},{confirmedOn:'2026-10-01'},{timing:'invalid'}]){
  const before=structuredClone(data);assert.throws(()=>set(data,entry(bad)));assert.deepEqual(data,before);
 }
 set(data);let before=structuredClone(data);assert.throws(()=>set(data,entry()),/không hợp lệ/);assert.deepEqual(data,before);
 reconcileMonth(data,'2026-10-31',{bank:2000,cash:200,savings:700},{id:'closing',today:'2026-11-04'});
 before=structuredClone(data);assert.throws(()=>set(data,entry({id:'late',date:'2026-11-01',timing:'start'})),/đối chiếu đầu tiên/);assert.deepEqual(data,before);
 const stock=fixture();stock.days['2026-11-02'].items.push({id:'saving',title:'Savings expense',amount:100,status:'paid',paymentMethod:'savings'});before=structuredClone(stock);assert.throws(()=>set(stock,entry({savings:99.999})),/tiết kiệm không đủ/);assert.deepEqual(stock,before);
 const fund=fixture();fund.safety={funds:[{id:'f',name:'Mock fund',source:'bank',kind:'goal',target:500,entries:[{id:'earmark',date:'2026-11-01',direction:'allocate',amount:500,note:'Keep'}]}]};before=structuredClone(fund);assert.throws(()=>set(fund,entry({bank:499.999})),/vượt số dư/);assert.deepEqual(fund,before);
});

test('savings withdrawals and statement payments reduce sources once while original credit history stays unchanged',()=>{
 const data=fixture();saveStatement(data,{month:'2026-11',priorBalance:200,newRibo:0,principal:10,fees:1,oneOff:30,dueDate:'2026-11-03',confirmedOn:'2026-11-01',status:'confirmed',note:'Keep statement'});settleStatement(data,'2026-11','2026-11-03','savings');
 const credit=creditSnapshot(data);set(data);assert.equal(accountBalances(data,'2026-11-04').savings,659);assert.equal(accountBalances(data,'2026-11-04').creditDebt,180);assert.equal(creditSnapshot(data),credit);assert.deepEqual(normalizeData(data),data);
});

test('failed/canceled/conflicting confirmed writes consume no slot and keep full document untouched',async()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},data=fixture();let fail=true,remote=data;
 const client={url:'https://opening.example.test',user:async()=>({id:'mock'}),load:async()=>({data:remote,revision:1}),save:async(next)=>{if(fail)throw Object.assign(Error('conflict'),{code:'40001'});remote=next;return {revision:2};}};
 const sync=new SyncController(client,storage,{onData:()=>{},onStatus:()=>{}});await sync.open();const next=structuredClone(sync.data);set(next);assert.equal(balanceUpdateCount(sync.data.accounts,'2026-11'),0);
 await assert.rejects(sync.commitConfirmed(next));assert.deepEqual(sync.data,data);assert.equal(balanceUpdateCount(sync.data.accounts,'2026-11'),0);
 fail=false;await sync.useRemote();await sync.commitConfirmed(next);assert.equal(balanceUpdateCount(sync.data.accounts,'2026-11'),1);assert.deepEqual(sync.data,remote);
});

test('a savings source opened after a historical cash baseline may start before the legacy credit baseline',()=>{
 const data=fixture();delete data.accounts.savings;set(data,entry({date:'2026-10-01',timing:'start',savings:undefined}));
 data.accounts.savings=100;data.accounts.savingsOpenedOn='2026-10-01';
 const normalized=normalizeData(data);assert.equal(accountBalances(normalized,'2026-10-31').savings,100);assert.equal(accountBalances(normalized,'2026-11-04').creditDebt,220);
 const legacy=fixture();legacy.accounts.savingsOpenedOn='2026-10-01';assert.throws(()=>normalizeData(legacy),/Ngày tiết kiệm/);
});
