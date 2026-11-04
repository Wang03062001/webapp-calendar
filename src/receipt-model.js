import {sumMoney,subtractMoney} from './money.js';
import {cardMoney,cardDate,roundCard} from './card-model.js';
export const RECEIPT_TYPES={gift:'Tiền được cho',freelance:'Làm thêm',interest:'Tiền lãi',own:'Tiền của bản thân gửi về',repayment:'Thu hồi nợ gốc',borrow:'Tiền vay nhận về',refund:'Hoàn tiền thực nhận',other:'Thu nhập khác'};
export const CASH_SOURCES=['bank','cash','savings'];
export function normalizeCashEntries(raw){
 if(!Array.isArray(raw))throw Error('Danh sách tiền vào không hợp lệ.');
 const result=[];
 for(const r of raw){
  if(!r||!String(r.id||'').trim()||result.some(x=>x.id===String(r.id))||!cardDate(r.date)||!Object.hasOwn(RECEIPT_TYPES,r.type)||!CASH_SOURCES.includes(r.source)||cardMoney(r.amount)<=0||r.type==='repayment'&&!String(r.receivableId||'').trim())throw Error('Khoản tiền vào không hợp lệ.');
  result.push({id:String(r.id),date:r.date,type:r.type,source:r.source,amount:cardMoney(r.amount),note:String(r.note||'').slice(0,500),...(r.type==='repayment'?{receivableId:String(r.receivableId)}:{})});
 }
 return result;
}
export const receiptTotals=(data,prefix)=>{
 const rows=(data.receipts||[]).filter(r=>r.date.startsWith(prefix));
 return {income:sumMoney(rows.filter(r=>!['own','repayment','borrow','refund'].includes(r.type)).map(r=>r.amount)),nonIncome:sumMoney(rows.filter(r=>['own','repayment','borrow','refund'].includes(r.type)).map(r=>r.amount))};
};
export const receivableRemaining=(data,id)=>{const loan=(data.receivables||[]).find(r=>r.id===id);return loan?subtractMoney(loan.amount,sumMoney((data.receipts||[]).filter(r=>r.type==='repayment'&&r.receivableId===id).map(r=>r.amount))):NaN;};
export function normalizeReceivables(raw,receipts){
 if(!Array.isArray(raw))throw Error('Khoản phải thu không hợp lệ.');const result=[];
 for(const r of raw){if(!r||!String(r.id||'').trim()||result.some(x=>x.id===String(r.id))||!String(r.title||'').trim()||cardMoney(r.amount)<=0)throw Error('Khoản phải thu không hợp lệ.');result.push({id:String(r.id),title:String(r.title).slice(0,500),amount:cardMoney(r.amount)});}
 for(const r of receipts.filter(r=>r.type==='repayment'))if(!result.some(x=>x.id===r.receivableId))throw Error('Không tìm thấy khoản phải thu.');
 for(const r of result)if(receivableRemaining({receivables:result,receipts},r.id)<0)throw Error('Tiền thu hồi vượt nợ gốc còn lại.');
 return result;
}
export function addReceipt(data,row){const next=normalizeCashEntries([...(data.receipts||[]),row]);normalizeReceivables(data.receivables||[],next);data.receipts=next;if(Array.isArray(data.years)&&!data.years.includes(Number(row.date.slice(0,4))))data.years.push(Number(row.date.slice(0,4)));}
