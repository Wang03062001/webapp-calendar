import {financeView} from './credit-access.js';
import {accountBalances,sourceOpening} from './account-model.js';
import {availableCredit,cardDate,roundCard} from './card-model.js';
import {normalizeCurrencies} from './preferences.js';
import {moduleEnabled,simpleCards} from './region-model.js';
import {formatAmount} from './model.js';
export const localToday=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

// Stock as of today's local calendar date. Salary is already part of the source
// ledger: never add it here a second time or manufacture monthly recurrence.
export function currentWallet(book,{asOf=localToday(),creditAllowed=false}={}){
  if(!cardDate(asOf))throw Error('Ngày số dư hiện tại không hợp lệ.');
  const visible=financeView(book,creditAllowed===true),balance=accountBalances(visible,asOf),opening=sourceOpening(visible.accounts);
  const paypayVisible=creditAllowed===true&&moduleEnabled(book,'cards')&&!simpleCards(book);
  const pendingIncome=Object.entries(visible.incomes).filter(([month,row])=>(row.receivedOn||month+'-15').startsWith(asOf.slice(0,7))&&(row.receivedOn||month+'-15')>asOf&&(row.salary||row.bonus))
    .map(([month,row])=>({date:row.receivedOn||month+'-15',amount:roundCard((row.salary||0)+(row.bonus||0)),source:row.account||'bank'})).sort((a,b)=>a.date.localeCompare(b.date));
  return {asOf,currency:normalizeCurrencies(book.currencies).cash,bank:balance?.bank??null,cash:balance?.cash??null,savings:balance?.savings??null,
    assets:balance?roundCard(balance.bank+balance.cash+(balance.savings||0)):null,
    paypayVisible,paypay:paypayVisible?availableCredit(visible,asOf,balance?.available??null):null,creditDebt:paypayVisible?balance?.creditDebt??null:null,
    pendingIncome,reason:!visible.accounts?'missing':opening.date>asOf?'future':null};
}
const dateLabel=date=>date.split('-').reverse().join('/');
export function currentWalletContent(book,{asOf=localToday(),creditAllowed=false,signedIn=false,draft=false,expanded=true}={}){
  if(!signedIn)return '<h2>Tài sản hiện tại</h2><div class="current-wallet-empty">Đăng nhập để xem số dư tài sản hiện tại.</div>';
  const data=currentWallet(book,{asOf,creditAllowed}),unit=data.currency==='VND'?'VNĐ':data.currency;
  const money=value=>value==null?'Chưa thiết lập':`${formatAmount(value)} ${unit}`;
  const row=(key,title,value,kind='')=>`<article class="current-wallet-value"><span>${title}</span><strong data-current-balance="${key}" data-money-kind="${kind}" class="${value<0?'negative':''}">${money(value)}</strong></article>`;
  return `<details class="current-wallet-disclosure" ${expanded?'open':''}><summary><span class="current-wallet-title">Tài sản hiện tại</span><strong class="current-wallet-asset-total ${data.assets<0?'negative':''}" data-current-balance="assets">${money(data.assets)}</strong><span class="current-wallet-date">Tính đến hôm nay <time data-current-date datetime="${asOf}">${dateLabel(asOf)}</time></span></summary><div class="current-wallet-body"><div class="current-wallet-values">${row('bank','Ngân hàng',data.bank,'bank')}${row('cash','Tiền mặt',data.cash,'cash')}${data.savings!==null?row('savings','Tiết kiệm nguồn tiền',data.savings,'savings'):''}${data.paypayVisible?row('paypay','PayPay còn khả dụng',data.paypay,'card'):''}</div>${data.reason?`<p class="current-wallet-help">${data.reason==='future'?'Mốc nguồn tiền nằm sau hôm nay. Hãy kiểm tra ngày bắt đầu theo dõi.':'Thiết lập số dư đầu kỳ để theo dõi tài sản.'}</p>`:''}${data.pendingIncome.map(row=>`<p class="current-wallet-pending">Thu nhập chờ ngày nhận <time>${dateLabel(row.date)}</time>: <strong>${money(row.amount)}</strong></p>`).join('')}<p class="current-wallet-help">Tài sản gồm ngân hàng + tiền mặt + tiết kiệm nguồn tiền.</p>${moduleEnabled(book,'salary')||Object.keys(book.incomes).length?'<p class="current-wallet-help">Lương cộng vào nguồn nhận từ ngày thực nhận đã nhập, mặc định ngày 15.</p>':''}${data.paypayVisible?'<p class="current-wallet-help">Hạn mức PayPay được theo dõi riêng với tài sản.</p><button type="button" class="text-button" data-action="current-paypay">Cập nhật PayPay hôm nay</button>':''}${draft?'<p class="current-wallet-draft" role="status">Gồm bản nháp chưa lưu</p>':''}<button type="button" class="button secondary current-wallet-settings" data-action="current-wallet-settings">Thiết lập số dư</button><button type="button" class="text-button" data-action="wallet-manage">Đối chiếu theo ngày lịch</button></div></details>`;
}
