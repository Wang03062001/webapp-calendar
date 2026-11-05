// Synthetic balances and records only; shared by isolated model/browser checks.
import {newRegionalBook} from '../../src/region-model.js';
import {normalizeData,addDebt,repayDebt} from '../../src/model.js';
export function cleanupFixture(){
 const d=newRegionalBook('JP');
 d.accounts={openedOn:'2026-11-01',bank:1000,cash:100,savings:500,creditDebt:0,creditLimit:null,transfers:[]};
 d.days['2026-11-02']={note:'Keep day note',items:[
  {id:'ordinary',title:'Ordinary expense',amount:25.125,status:'paid',paymentMethod:'bank',fundId:'fund',category:'Food'},
  {id:'paid-row',title:'Paid bill',amount:40,status:'paid',paymentMethod:'bank',fundId:'fund',obligationId:'paid',category:'Utilities'},
  {id:'card',title:'Credit tracking',amount:9,status:'paid',paymentMethod:'card',creditTracking:true,category:'Food'}
 ]};
 d.days['2026-11-13']={note:'Keep planned day note',items:[{id:'bill-row',title:'Synthetic bill',amount:4500,status:'planned',paymentMethod:'bank',fundId:'fund',obligationId:'bill',category:'Utilities'}]};
 d.days['2026-11-14']={note:'Other calendar plan',items:[{id:'unlinked',title:'Calendar plan',amount:10,status:'planned',paymentMethod:'cash',category:'Food'}]};
 addDebt(d,{id:'loan',title:'Loan',amount:200,type:'Khác',dueDate:'2026-11-20'});
 repayDebt(d,'loan',{id:'repayment',date:'2026-11-03',amount:5,interest:1,source:'bank'});
 addDebt(d,{id:'credit-loan',title:'Legacy credit loan',amount:100,type:'Thẻ tín dụng',dueDate:'2026-11-25'});
 d.incomes['2026-11']={salary:50.125,bonus:0,note:'Keep salary',receivedOn:'2026-11-01',account:'bank'};
 d.savings['2026-11']=100;d.goals['2026']=1000;
 d.safety={funds:[
  {id:'fund',name:'Bank reserve',source:'bank',kind:'emergency',target:0,entries:[{id:'allocation',date:'2026-11-01',direction:'allocate',amount:200,note:'Keep allocation history'}]},
  {id:'cash-fund',name:'Cash reserve',source:'cash',kind:'goal',target:100,entries:[{id:'cash-allocation',date:'2026-11-01',direction:'allocate',amount:20,note:'Cash allocation'}]}
 ],budgets:[{month:'2026-11',category:'Food',amount:100},{month:'2026-12',category:'Utilities',amount:200}],
 obligations:[{id:'bill',date:'2026-11-13',dueDate:'2026-11-13',expenseId:'bill-row',history:[{id:'old-paid',date:'2026-11-02',action:'paid',amount:4500,source:'bank',expenseDate:'2026-11-02'},{id:'old-undo',date:'2026-11-03',action:'undo',amount:4500,source:'bank',expenseDate:'2026-11-13'}]},
 {id:'paid',date:'2026-11-02',dueDate:'2026-11-01',expenseId:'paid-row',history:[{id:'paid-audit',date:'2026-11-02',action:'paid',amount:40,source:'bank',expenseDate:'2026-11-02'}]}],
 debtTerms:[{debtId:'loan',apr:0,minimum:10,source:'bank',nextDueDate:'2026-11-20'},{debtId:'credit-loan',apr:12,minimum:5,source:'bank',nextDueDate:'2026-11-25'}],essentialMonthly:50,reserveMonths:6,monthlyDebtBudget:30,cardSource:'cash'};
 const vn=newRegionalBook('VN');vn.accounts={openedOn:'2026-11-01',bank:200000,cash:50000,savings:100000,creditDebt:0,creditLimit:null,transfers:[]};
 vn.days['2026-11-02']={note:'Independent region',items:[{id:'vn-expense',title:'Vietnam expense',amount:5000,status:'paid',paymentMethod:'cash'}]};
 d.regional={vietnam:vn};return normalizeData(d);
}
