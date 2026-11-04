import {creditOverview} from './cash-model.js';
import {addMoney} from './money.js';
import {financeView} from './credit-access.js';
import {accountBalances,sourceOpening} from './account-model.js';
import {availableCredit,cardDate,roundCard} from './card-model.js';
import {normalizeCurrencies} from './preferences.js';
import {moduleEnabled,simpleCards} from './region-model.js';
import {formatAmount} from './model.js';
export {tokyoToday as localToday} from './finance-date.js';
import {tokyoToday as localToday} from './finance-date.js';

// Stock as of today's local calendar date. Salary is already part of the source
// ledger: never add it here a second time or manufacture monthly recurrence.
export function currentWallet(book,{asOf=localToday(),creditAllowed=false}={}){
  if(!cardDate(asOf))throw Error('Ngày số dư hiện tại không hợp lệ.');
  const visible=financeView(book,creditAllowed===true),balance=accountBalances(visible,asOf),opening=sourceOpening(visible.accounts);
  const paypayVisible=creditAllowed===true&&moduleEnabled(book,'cards')&&!simpleCards(book);
  const pendingIncome=Object.entries(visible.incomes).filter(([month,row])=>(row.receivedOn||month+'-15').startsWith(asOf.slice(0,7))&&(row.status==='planned'||(row.receivedOn||month+'-15')>asOf)&&(row.salary||row.bonus))
    .map(([month,row])=>({date:row.receivedOn||month+'-15',amount:roundCard((row.salary||0)+(row.bonus||0)),source:row.account||'bank'})).sort((a,b)=>a.date.localeCompare(b.date));
  return {asOf,currency:normalizeCurrencies(book.currencies).cash,bank:balance?.bank??null,cash:balance?.cash??null,savings:balance?.savings??null,
    assets:balance?addMoney(balance.bank,balance.cash,balance.savings||0):null,
    paypayVisible,paypay:paypayVisible?availableCredit(visible,asOf,balance?.available??null):null,creditDebt:paypayVisible?balance?.creditDebt??null:null,
    credit:paypayVisible?creditOverview(visible,asOf):null,pendingIncome,reason:!visible.accounts?'missing':opening.date>asOf?'future':null};
}
const dateLabel=date=>date.split('-').reverse().join('/');
export function currentWalletContent(book,{asOf=localToday(),creditAllowed=false,signedIn=false,draft=false,expanded=true,updatedAt=null}={}){
  if(!signedIn)return '<h2>Tài sản hiện tại</h2><div class="current-wallet-empty">Đăng nhập để xem số dư tài sản hiện tại.</div>';
  const data=currentWallet(book,{asOf,creditAllowed}),unit=data.currency==='VND'?'VNĐ':data.currency;
  const money=value=>value==null?'Chưa thiết lập':`${formatAmount(value)} ${unit}`;
  const row=(key,title,value,kind='')=>`<article class="current-wallet-value"><span>${title}</span><strong data-current-balance="${key}" data-money-kind="${kind}" class="${value<0?'negative':''}">${money(value)}</strong></article>`;
  return `<details class="current-wallet-disclosure" ${expanded?'open':''}><summary><span class="current-wallet-title">Tài sản hiện tại</span><strong class="current-wallet-asset-total ${data.assets<0?'negative':''}" data-current-balance="assets">${money(data.assets)}</strong><span class="current-wallet-date">Tính đến hôm nay <time data-current-date datetime="${asOf}">${dateLabel(asOf)}</time></span></summary><div class="current-wallet-body">${updatedAt&&Number.isFinite(Date.parse(updatedAt))?`<p class="current-wallet-help">Kiểm tra bản đã lưu lúc ${new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(updatedAt))} JST</p>`:''}<div class="current-wallet-values">${row('bank','Ngân hàng',data.bank,'bank')}${row('cash','Tiền mặt',data.cash,'cash')}${data.savings!==null?row('savings','Tiết kiệm nguồn tiền',data.savings,'savings'):''}</div>${data.reason?`<p class="current-wallet-help">${data.reason==='future'?'Mốc nguồn tiền nằm sau hôm nay. Hãy kiểm tra ngày bắt đầu theo dõi.':'Thiết lập số dư đầu kỳ để theo dõi tài sản.'}</p>`:''}${data.pendingIncome.map(row=>`<p class="current-wallet-pending">Thu nhập chờ ngày nhận <time>${dateLabel(row.date)}</time>: <strong>${money(row.amount)}</strong></p>`).join('')}<p class="current-wallet-help">Tài sản gồm ngân hàng + tiền mặt + tiết kiệm nguồn tiền.</p>${moduleEnabled(book,'salary')||Object.keys(book.incomes).length?'<p class="current-wallet-help">Lương cộng vào nguồn nhận từ ngày thực nhận đã nhập, mặc định ngày 15.</p>':''}${data.paypayVisible?`<section class="current-credit" aria-label="Thông tin tín dụng"><h3>Thông tin tín dụng · không cộng vào tài sản</h3>${row('paypay','PayPay còn khả dụng',data.paypay,'card')}${row('ribo','Dư nợ リボ',data.credit.ribo,'card')}${row('liability','Tổng nghĩa vụ thẻ',data.credit.liability,'card')}${data.credit.cardCredit>0?row('card-credit','Số dư có trên thẻ (không phải tiền ngân hàng)',data.credit.cardCredit,'card'):''}<p>${data.credit.next?`Sao kê ${data.credit.next.month} · Hạn ${data.credit.next.dueDate} · Còn ${money(data.credit.next.remaining)}`:'Chưa có hóa đơn đã xác nhận còn phải trả.'}</p><button type="button" class="text-button" data-action="current-paypay">Cập nhật PayPay hôm nay</button></section>`:''}${draft?'<p class="current-wallet-draft" role="status">Bản nháp chưa lưu chưa được tính vào số dư</p>':''}<button type="button" class="button secondary current-wallet-settings" data-action="current-wallet-settings">Thiết lập số dư</button><button type="button" class="text-button" data-action="wallet-manage">Đối chiếu theo ngày lịch</button></div></details>`;
}
