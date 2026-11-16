import {cardDate,cardMoney} from './card-model.js';
export const separateWallets=book=>book.wallets?.enabled===true;
export const fundWallet=id=>'fund:'+id;
export const walletFund=(book,key)=>(book.safety?.funds||[]).find(f=>fundWallet(f.id)===key);
export const walletName=(book,key)=>({bank:'Ngân hàng',cash:'Tiền mặt',savings:'Tiết kiệm',card:'Thẻ tín dụng'}[key]||walletFund(book,key)?.name||(key?.startsWith('fund:')?'Quỹ không còn tồn tại':''));
export const walletSource=(book,item)=>separateWallets(book)&&item.fundId?fundWallet(item.fundId):item.paymentMethod==='card'?'card':item.paymentMethod==='bank'?'bank':item.paymentMethod==='savings'?'savings':'cash';
export function walletSources(book,{includeArchived=false}={}){return ['bank','cash',...(book.accounts?.savings!==undefined?['savings']:[]),...(book.safety?.funds||[]).filter(f=>includeArchived||!f.archived).map(f=>fundWallet(f.id))];}
export function walletUnderlying(book,key){if(['bank','cash','savings'].includes(key))return key;const f=walletFund(book,key);if(!f)throw Error('Ví tiền không tồn tại.');return f.source;}
export function normalizeWallets(raw,book){
 if(!raw||raw.version!==1||raw.enabled!==true||!Array.isArray(raw.transfers))throw Error('Thiết lập ví riêng không hợp lệ.');
 const allowed=walletSources(book,{includeArchived:true}),transfers=[];
 for(const r of raw.transfers){
  if(!r||!String(r.id||'').trim()||transfers.some(t=>t.id===String(r.id))||!cardDate(r.date)||r.from===r.to||!allowed.includes(r.from)||!allowed.includes(r.to)||cardMoney(r.amount)<=0||r.voided!==undefined&&typeof r.voided!=='boolean'||r.voided&&(!cardDate(r.voidedOn)||r.voidedOn<r.date))throw Error('Chuyển tiền giữa các ví không hợp lệ.');
  transfers.push({id:String(r.id),date:r.date,from:r.from,to:r.to,amount:cardMoney(r.amount),note:String(r.note||'').slice(0,500),...(r.voided?{voided:true,voidedOn:r.voidedOn}:{})});
 }
 return {version:1,enabled:true,transfers};
}
export const activeWalletTransfers=book=>(book.wallets?.transfers||[]).filter(t=>!t.voided);
