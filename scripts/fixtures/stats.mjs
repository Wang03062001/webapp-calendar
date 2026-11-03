// Mocked statistics only: previous-period purchases paid in the selected month.
import {newRegionalBook} from '../../src/region-model.js';
import {normalizeData,addDebt,repayDebt} from '../../src/model.js';
import {saveStatement,settleStatement} from '../../src/card-model.js';
export function statsFixture(){
 const d=newRegionalBook('JP');d.accounts={openedOn:'2026-01-01',bank:5000,cash:100,savings:500,creditDebt:200,creditLimit:5000,transfers:[]};
 d.days['2026-11-03']={note:'Keep note',items:[{id:'bank',title:'Bank cost',amount:30.125,status:'paid',paymentMethod:'bank'},{id:'card',title:'PRIVATE CARD PURCHASE',amount:20,status:'paid',paymentMethod:'card',settlement:'oneoff',billingMonth:'2026-12'},{id:'planned',title:'Planned cost',amount:12.5,status:'planned',paymentMethod:'cash'},{id:'move',title:'Internal movement',amount:50,status:'paid',paymentMethod:'bank',movement:'withdraw'}]};
 d.days['2026-11-10']={note:'',items:[{id:'obligation-expense',title:'Linked planned obligation',amount:15,status:'planned',paymentMethod:'bank',obligationId:'obligation'}]};
 d.days['2026-10-04']={note:'Old note',items:[{id:'old',title:'October cost',amount:11.33,status:'paid',paymentMethod:'cash'}]};
 d.days['2026-12-04']={note:'',items:[{id:'later',title:'December cost',amount:99,status:'paid',paymentMethod:'bank'}]};
 d.incomes['2026-11']={salary:200,bonus:10.125,earnedMonth:'2026-10',receivedOn:'2026-11-15',account:'bank',note:'Salary note'};
 d.incomes['2026-10']={salary:100,bonus:0,note:'October salary'};
 d.receivables=[{id:'receivable',title:'Opening receivable',amount:100}];
 d.receipts=[{id:'gift',date:'2026-11-03',type:'gift',source:'cash',amount:30.333,note:'Gift note'},{id:'interest',date:'2026-11-03',type:'interest',source:'bank',amount:1.002,note:'Interest note'},{id:'freelance',date:'2026-11-03',type:'freelance',source:'bank',amount:12,note:'Freelance note'},{id:'own',date:'2026-11-03',type:'own',source:'bank',amount:1000,note:'Own transfer excluded from income'},{id:'principal',date:'2026-11-03',type:'repayment',source:'bank',amount:5,receivableId:'receivable',note:'Principal excluded from income'}];
 addDebt(d,{id:'loan',title:'Ordinary loan',amount:100,type:'Khác'});repayDebt(d,'loan',{id:'repayment',date:'2026-11-03',amount:20,interest:0.125,source:'bank'});
 saveStatement(d,{month:'2026-10',priorBalance:200,newRibo:0,principal:17.655,fees:2.345,oneOff:80,dueDate:'2026-11-04',confirmedOn:'2026-10-20',status:'confirmed',note:'PRIVATE PAID STATEMENT'});d.cards.name='PRIVATE CREDIT CARD';settleStatement(d,'2026-10','2026-11-04','bank');
 saveStatement(d,{month:'2026-11',priorBalance:182.345,newRibo:0,principal:5,fees:1,oneOff:45,dueDate:'2026-11-27',confirmedOn:'2026-11-20',status:'confirmed',note:'PRIVATE UPCOMING STATEMENT'});
 saveStatement(d,{month:'2026-12',priorBalance:177.345,newRibo:0,principal:0,fees:0,oneOff:0,dueDate:'2026-11-29',confirmedOn:'',status:'draft',note:'PRIVATE UNKNOWN STATEMENT'});
 d.safety={funds:[],obligations:[{id:'obligation',date:'2026-11-10',dueDate:'2026-11-10',expenseId:'obligation-expense',history:[]}]};
 d.regional={vietnam:newRegionalBook('VN')};d.regional.vietnam.accounts={openedOn:'2026-01-01',bank:1000000,cash:500000,creditDebt:0,creditLimit:null,transfers:[]};d.regional.vietnam.days['2026-11-03']={note:'Vietnam note',items:[{id:'vn',title:'Vietnam cost',amount:123456.789,status:'paid',paymentMethod:'cash'}]};
 return normalizeData(d);
}
