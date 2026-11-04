import {cardDate,cardMoney,validMonth,defaultCards,normalizeCards} from './card-model.js';
import {cardPayments} from './card-ledger.js';
import {sumMoney} from './money.js';
import {tokyoToday} from './finance-date.js';
import {isTrackingCardPayment} from './credit-types.js';
const actual=item=>!['planned','draft','cancelled'].includes(item.status);
export function normalizeTrackingMonths(raw){
 if(!Array.isArray(raw))throw Error('Dữ liệu theo dõi tín dụng tháng không hợp lệ.');
 const rows=[];
 for(const r of raw){
  if(!r||!validMonth(r.month)||rows.some(x=>x.month===r.month))throw Error('Tháng theo dõi tín dụng bị trùng hoặc không hợp lệ.');
  rows.push({month:r.month,fees:r.fees==null?null:cardMoney(r.fees),monthlyPrincipal:r.monthlyPrincipal==null?null:cardMoney(r.monthlyPrincipal),note:String(r.note||'').slice(0,2000)});
 }
 return rows;
}
export function normalizeRiboHistory(raw){
 if(!Array.isArray(raw))throw Error('Lịch sử số dư リボ không hợp lệ.');const rows=[];
 for(const r of raw){if(!r||!String(r.id||'').trim()||rows.some(x=>x.id===String(r.id))||!cardDate(r.date))throw Error('Mốc số dư リボ không hợp lệ.');rows.push({id:String(r.id),date:r.date,amount:cardMoney(r.amount)});}
 return rows;
}
export function saveTrackingMonth(data,entry){
 const cards=normalizeCards(data.cards||defaultCards());
 data.cards=normalizeCards({...cards,trackingMonths:[...(cards.trackingMonths||[]).filter(r=>r.month!==entry.month),entry]});
}
export function saveTrackingBalances(data,{id,date,available,ribo}){
 if(!id||!cardDate(date)||available==null&&ribo==null)throw Error('Nhập ít nhất một số dư tín dụng và ngày xác nhận hợp lệ.');
 const cards=normalizeCards(data.cards||defaultCards()),next={...cards};
 if(available!=null)next.availableCreditHistory=[...(cards.availableCreditHistory||[]),{id:id+'-available',date,amount:cardMoney(available)}];
 if(ribo!=null)next.riboBalanceHistory=[...(cards.riboBalanceHistory||[]),{id:id+'-ribo',date,amount:cardMoney(ribo)}];
 data.cards=normalizeCards(next);
}
const latest=(rows,date)=>(rows||[]).filter(r=>r.date<=date).reduce((last,r)=>!last||r.date>=last.date?r:last,null);
export function trackingBalances(book,asOf=tokyoToday()){
 return {available:latest(book.cards?.availableCreditHistory,asOf),ribo:latest(book.cards?.riboBalanceHistory,asOf)};
}
export function trackingMonth(book,month,{asOf=tokyoToday()}={}){
 if(!validMonth(month)||!cardDate(asOf))throw Error('Tháng theo dõi tín dụng không hợp lệ.');
 const inPeriod=date=>date.startsWith(month+'-')&&date<=asOf;
 const purchases=[],payments=[];
 for(const [date,day]of Object.entries(book.days))if(inPeriod(date))for(const item of day.items)if(actual(item)){
  if(item.paymentMethod==='card'&&!item.cardFeeMonth&&!item.movement)purchases.push({...item,date});
  if(isTrackingCardPayment(item)&&!item.movement)payments.push({...item,date,source:item.paymentMethod||'cash',legacy:false});
 }
 for(const p of cardPayments(book))if(inPeriod(p.date))payments.push({...p,creditPeriod:p.month,title:'Thanh toán thẻ · '+p.month,legacy:true});
 const saved=book.cards?.trackingMonths?.find(r=>r.month===month),old=book.cards?.statements?.find(r=>r.month===month&&r.status!=='draft'&&r.confirmedOn<=asOf);
 return {month,purchases,payments:payments.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)),purchaseTotal:sumMoney(purchases.map(r=>r.amount)),paymentTotal:sumMoney(payments.map(r=>r.amount)),
  fees:saved?saved.fees:old?.fees??null,monthlyPrincipal:saved?saved.monthlyPrincipal:old?.principal??null,note:saved?.note||'',fromLegacy:!saved&&Boolean(old)};
}
