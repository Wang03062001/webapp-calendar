// Synthetic data only. Shared by file-format and mocked browser checks.
import {newRegionalBook} from '../../src/region-model.js';
import {normalizeData,addDebt,repayDebt,cancelDebtPayment} from '../../src/model.js';
import {reconcileMonth} from '../../src/account-model.js';
import {saveStatement,settleStatement} from '../../src/card-model.js';
export const exportAsOf='2026-11-04';
export function excelFixture(){
 const data=newRegionalBook('JP');data.currencies.savings='VND';
 data.accounts={openedOn:'2026-01-01',bank:5000,cash:100,savings:500,creditDebt:200,creditLimit:5000,transfers:[{id:'transfer',date:'2026-10-15',from:'savings',to:'bank',amount:5}],openingHistory:[{id:'opening',date:'2026-10-01',timing:'start',bank:5000,cash:100,savings:500,confirmedOn:'2026-11-01',note:'Opening audit'}]};
 data.days['2024-01-01']={note:'Archived year',items:[{id:'archived',title:'Archived cost',amount:5,status:'paid',paymentMethod:'bank'}]};
 data.days['2026-10-15']={note:'Tiếng Việt 日本語 한국어 繁體中文 😀 & <tag>\nKeep newline',items:[{id:'00123',title:'=HYPERLINK("https://example.invalid","text")',amount:10.345,status:'paid',paymentMethod:'bank',category:'Ăn uống'},{id:'planned',title:'Planned expense',amount:12.5,status:'planned',paymentMethod:'cash'},{id:'movement',title:'Cash withdrawal',amount:20,status:'paid',movement:'withdraw',paymentMethod:'bank'},{id:'fund-cost',title:'Fund expense',amount:20,status:'paid',paymentMethod:'savings',fundId:'fund'}]};
 data.days['2026-10-20']={note:'Obligation note',items:[{id:'obligation-cost',title:'Planned obligation',amount:15,status:'planned',paymentMethod:'savings',fundId:'fund',obligationId:'obligation'}]};
 data.days['2026-10-10']={note:'',items:[{id:'card',title:'PRIVATE CARD PURCHASE',amount:20,status:'paid',paymentMethod:'card',settlement:'oneoff',billingMonth:'2026-11'}]};
 data.incomes['2026-10']={salary:100,bonus:1.125,note:'Salary note',earnedMonth:'2026-09',receivedOn:'2026-10-15',account:'bank'};
 data.receivables=[{id:'receivable',title:'Opening receivable',amount:100}];
 data.receipts=[{id:'gift',date:'2026-10-15',type:'gift',source:'bank',amount:30,note:'Gift note'},{id:'own',date:'2026-10-15',type:'own',source:'cash',amount:40,note:'Own money'},{id:'collect',date:'2026-10-15',type:'repayment',source:'bank',amount:5,receivableId:'receivable',note:'Principal collection'}];
 data.savings['2026-10']=100000;data.goals['2024']=500000;
 addDebt(data,{id:'loan',title:'Ordinary loan',type:'Khác',amount:100,dueDate:'2026-10-31'});repayDebt(data,'loan',{id:'payment',date:'2026-10-15',amount:10,interest:0.125,source:'bank'});repayDebt(data,'loan',{id:'voided',date:'2026-10-16',amount:5,source:'bank'});cancelDebtPayment(data,'loan','voided');
 addDebt(data,{id:'credit-loan',title:'PRIVATE CREDIT LOAN',type:'Thẻ tín dụng',amount:200});repayDebt(data,'credit-loan',{id:'credit-payment',date:'2026-10-15',amount:5,source:'bank'});
 saveStatement(data,{month:'2026-10',priorBalance:200,newRibo:0,principal:10,fees:1.5,oneOff:20,dueDate:'2026-10-27',confirmedOn:'2026-10-20',status:'confirmed',note:'PRIVATE STATEMENT NOTE'});data.cards.name='PRIVATE CARD NAME';settleStatement(data,'2026-10','2026-10-27','cash');data.cards.availableCreditHistory=[{id:'private-limit',date:'2026-10-31',amount:4000}];data.cards.safetyPlan={asOf:exportAsOf,principal:200,apr:15,minimum:20};
 data.safety={funds:[{id:'fund',name:'Savings fund',source:'savings',kind:'goal',target:100,entries:[{id:'allocate',date:'2026-10-01',direction:'allocate',amount:100,note:'Fund audit'}]}],budgets:[{month:'2026-10',category:'Ăn uống',amount:500}],obligations:[{id:'obligation',date:'2026-10-20',dueDate:'2026-10-20',expenseId:'obligation-cost',history:[{id:'audit',date:'2026-10-19',action:'undo',amount:15,source:'savings',expenseDate:'2026-10-20'}]}],debtTerms:[{debtId:'loan',apr:0,minimum:null,nextDueDate:'2026-10-31',source:'bank'},{debtId:'credit-loan',apr:15,minimum:10,nextDueDate:'2026-10-31',source:'bank'}]};
 data.regional={vietnam:newRegionalBook('VN')};data.regional.vietnam.days['2026-10-15']={note:'Vietnam note',items:[{id:'vn',title:'Vietnam cost',amount:123456.789,status:'paid',paymentMethod:'cash'}]};data.regional.vietnam.accounts={openedOn:'2026-01-01',bank:2000000,cash:500000,creditDebt:0,creditLimit:null,transfers:[]};
 reconcileMonth(data,'2026-10-31',{bank:5000,cash:120,savings:470},{id:'close',today:'2026-11-04',currency:'JPY'});
 return normalizeData(data);
}
