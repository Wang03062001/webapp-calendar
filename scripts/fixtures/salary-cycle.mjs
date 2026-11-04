// Synthetic salary-cycle example; no real account or financial data.
import {newRegionalBook} from '../../src/region-model.js';
import {normalizeData} from '../../src/model.js';
export function salaryCycleFixture(){
  const d=newRegionalBook('JP');d.accounts={openedOn:'2026-10-01',bank:10000,cash:0,savings:0,creditDebt:0,creditLimit:5000,transfers:[]};
  d.incomes['2026-10']={salary:190000,bonus:0,earnedMonth:'2026-09',note:'October salary'};
  d.incomes['2026-11']={salary:190000,bonus:0,earnedMonth:'2026-10',note:'November salary'};
  for(const [date,value]of [['2026-10-14',999],['2026-10-15',200],['2026-10-31',1000],['2026-11-01',1500],['2026-11-04',3171],['2026-11-15',25.5],['2026-11-20',50]]){
    d.days[date]={note:'Keep historical note',items:[{id:`cost-${date}`,title:`Cost ${date}`,amount:value,status:'paid',paymentMethod:'bank'}]};
  }
  d.regional={vietnam:newRegionalBook('VN')};
  d.regional.vietnam.days['2026-11-03']={note:'Vietnam note',items:[{id:'vn',title:'Vietnam cost',amount:123456.789,status:'paid',paymentMethod:'cash'}]};
  return normalizeData(d);
}
