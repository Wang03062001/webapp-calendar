// Synthetic current-stock/payday fixture, never a real financial account.
import {newRegionalBook} from '../../src/region-model.js';
import {normalizeData} from '../../src/model.js';
export function walletFixture(){
 const d=newRegionalBook('JP');d.currencies.savings='VND';d.accounts={openedOn:'2026-10-01',bank:1000,cash:100,savings:200,creditDebt:200,creditLimit:5000,transfers:[]};
 d.incomes['2026-10']={salary:200,bonus:10,account:'bank',receivedOn:'2026-10-15',earnedMonth:'2026-09',note:'Salary history'};
 d.days['2026-10-20']={note:'Keep old note',items:[{id:'old-bank',title:'Old bank cost',amount:50,status:'paid',paymentMethod:'bank'},{id:'old-cash',title:'Old cash cost',amount:10,status:'paid',paymentMethod:'cash'}]};
 d.days['2026-11-03']={note:'Keep note',items:[{id:'bank',title:'Bank cost',amount:20,status:'paid',paymentMethod:'bank'},{id:'cash',title:'Cash cost',amount:5,status:'paid',paymentMethod:'cash'},{id:'move',title:'Internal movement',amount:10,status:'paid',paymentMethod:'bank',movement:'withdraw'},{id:'planned',title:'Planned cost',amount:999,status:'planned',paymentMethod:'bank'}]};
 d.days['2026-11-05']={note:'',items:[{id:'card',title:'PRIVATE CARD PURCHASE',amount:20,status:'paid',paymentMethod:'card',settlement:'oneoff',billingMonth:'2026-12'}]};
 d.days['2026-11-16']={note:'',items:[{id:'future-card',title:'PRIVATE LATER PURCHASE',amount:12.345,status:'paid',paymentMethod:'card',settlement:'oneoff',billingMonth:'2026-12'}]};
 d.receipts=[{id:'gift',date:'2026-10-25',type:'gift',source:'cash',amount:25,note:'Gift history'}];
 d.cards={name:'PRIVATE PAYPAY CARD',paymentDay:27,weekend:'previous',statements:[],availableCreditHistory:[{id:'available',date:'2026-11-10',amount:4000}]};
 d.savings['2026-11']=1000000;d.goals['2026']=5000000;
 d.regional={vietnam:newRegionalBook('VN')};d.regional.vietnam.accounts={openedOn:'2026-01-01',bank:1000000,cash:100000,savings:0,creditDebt:0,creditLimit:null,transfers:[]};
 return normalizeData(d);
}
