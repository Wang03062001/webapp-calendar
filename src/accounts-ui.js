import { formatAmount } from './model.js';
import { accountBalances, normalizeAccounts, moneyOut } from './account-model.js';
import { currencyLabel } from './preferences.js';
const money=value=>`${formatAmount(value)} ${currencyLabel()}`;
const dateLabel=value=>value.split('-').reverse().join('/');
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export const sourceName=source=>source==='bank'?'Tài khoản ngân hàng':source==='card'?'PayPay / thẻ tín dụng':'Tiền mặt';
export function accountsPanel(data,date,creditAllowed) {
  const b=accountBalances(data,date), a=data.accounts;
  return `<section class="card accounts-panel"><div class="card-heading"><div><h2>Số dư theo nguồn tiền</h2><p>Tính đến cuối ngày ${dateLabel(date)} · ${a?`Số dư đầu ngày ${dateLabel(a.openedOn)}`:'Chưa thiết lập số dư đầu ngày'}</p></div><button class="button secondary" data-action="account-balances">Thiết lập số dư</button></div><div class="account-balances"><article><span>Tài khoản ngân hàng</span><strong data-balance="bank">${b?money(b.bank):'Chưa thiết lập'}</strong></article><article><span>Tiền mặt</span><strong data-balance="cash">${b?money(b.cash):'Chưa thiết lập'}</strong></article>${creditAllowed?`<article><span>Hạn mức khả dụng PayPay</span><strong data-balance="credit">${b?.available!=null?money(b.available):'Cần nhập / đối chiếu hạn mức'}</strong><small>Dư nợ ghi sổ: ${b?money(b.creditDebt):'Chưa thiết lập'}</small></article>`:''}</div><p class="account-note">Số dư dựa trên các giao dịch đã ghi; không kết nối trực tiếp với ngân hàng. Khoản cũ chưa có nguồn được tính là tiền mặt. Thu nhập chưa chọn nơi nhận được tính vào ngân hàng.</p>${b && b.creditDebt<0 && creditAllowed?'<p class="account-note negative">Cần đối chiếu dư nợ đầu kỳ và giao dịch thẻ: tiền đã trả vượt dư nợ ghi sổ.</p>':''}<div class="account-period"><span>Tiền ra ngân hàng / tiền mặt trong tháng <strong data-money-out>${money(moneyOut(data,date.slice(0,7)))}</strong></span><small>Gồm trả sao kê; chi phí mua bằng thẻ không bị cộng hai lần.</small></div>${a?`<div class="account-transfers"><button class="button secondary" data-action="account-transfer">Chuyển ngân hàng ↔ tiền mặt</button><details><summary>Lịch sử chuyển tiền</summary>${a.transfers.map(t=>`<div><span>${dateLabel(t.date)} · ${sourceName(t.from)} → ${sourceName(t.to)} · ${money(t.amount)}</span><button class="text-button danger" data-remove-transfer="${encodeURIComponent(t.id)}">Xóa</button></div>`).join('')||'<p>Chưa có chuyển tiền.</p>'}</details></div>`:''}</section>`;
}
export function showAccountLedger(context,mode='balances',transferId) {
  if(!context.canEdit())return;
  document.querySelector('#ledger-dialog')?.remove();
  const original=context.getData().accounts, snapshot=JSON.stringify(original), currencies=JSON.stringify(context.getData().currencies), user=context.getUserId(), credit=context.canUseCredit();
  if(mode!=='balances'&&!original)return;
  const dialog=document.createElement('dialog');dialog.id='ledger-dialog';dialog.className='account-dialog ledger-dialog';
  const field=(name,label,type,value='',extra='')=>`<label>${label}<input type="${type}" name="${name}" value="${value}" ${extra}></label>`;
  const cash=(name,label,value)=>field(name,`${label} · ${currencyLabel()}`,'text',value==null?'':formatAmount(value),'data-money inputmode="decimal" maxlength="32"');
  const source=(name,label,value)=>`<label>${label}<select name="${name}"><option value="bank" ${value==='bank'?'selected':''}>Tài khoản ngân hàng</option><option value="cash" ${value==='cash'?'selected':''}>Tiền mặt</option></select></label>`;
  dialog.innerHTML=`<button class="dialog-close" aria-label="Đóng">×</button><h2>${mode==='balances'?'Thiết lập số dư':mode==='transfer'?'Chuyển tiền nội bộ':'Xóa chuyển tiền'}</h2><form>${mode==='balances'?`${field('openedOn','Ngày bắt đầu theo dõi','date',original?.openedOn||today(),'required min="1900-01-01" max="9999-12-31"')}${cash('bank','Ngân hàng đầu ngày',original?.bank)}${cash('cash','Tiền mặt đầu ngày',original?.cash)}${credit?`${cash('creditDebt','Dư nợ PayPay đầu ngày',original?.creditDebt)}${cash('creditLimit','Hạn mức PayPay (không bắt buộc)',original?.creditLimit)}`:''}<p>Nhập số dư trước mọi giao dịch trong ngày bắt đầu. Dư nợ đầu ngày gồm cả nợ cũ, mua hàng và phí chưa trả trước ngày đó. Giao dịch từ ngày bắt đầu trở đi sẽ được cộng/trừ; không nhập lại số dư cuối ngày vào đây.</p>`:mode==='transfer'?`${field('date','Ngày chuyển','date',today(),'required min="1900-01-01" max="9999-12-31"')}${source('from','Nguồn tiền','bank')}${source('to','Nơi nhận','cash')}${cash('amount','Số tiền','')}<p>Chuyển giữa hai nguồn của bạn không tạo thêm thu nhập hoặc chi phí.</p>`:'<p>Xóa giao dịch chuyển tiền này sẽ hoàn lại số dư của cả hai nguồn.</p>'}<button class="account-submit" type="submit">Lưu thay đổi</button></form><p role="status" aria-live="polite"></p>`;
  document.body.append(dialog);dialog.showModal();let busy=false;
  const close=()=>{if(!busy)dialog.close();};dialog.querySelector('.dialog-close').onclick=close;dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});dialog.addEventListener('close',()=>dialog.remove());
  for(const name of mode==='balances'?['bank','cash',...(credit?['creditDebt']:[])]:mode==='transfer'?['amount']:[])dialog.querySelector(`[name=${name}]`).required=true;
  dialog.querySelector('form').onsubmit=async event=>{
    event.preventDefault();if(busy)return;const status=dialog.querySelector('[role=status]');
    try{
      if(!context.canEdit()||context.getUserId()!==user||JSON.stringify(context.getData().accounts)!==snapshot||JSON.stringify(context.getData().currencies)!==currencies)throw Error('Dữ liệu đã thay đổi. Đóng và mở lại để kiểm tra.');
      busy=true;dialog.querySelectorAll('button,input,select').forEach(e=>e.disabled=true);
      const next=structuredClone(context.getData()), f=event.target.elements;
      if(mode==='balances'){
        if(credit&&!await context.verifyCreditAccess())throw Error('Chức năng này chỉ dành cho admin.');
        next.accounts=normalizeAccounts({openedOn:f.openedOn.value,bank:f.bank.value,cash:f.cash.value,creditDebt:credit?f.creditDebt.value:original?.creditDebt||0,creditLimit:credit?(f.creditLimit.value.trim()?f.creditLimit.value:null):original?.creditLimit??null,transfers:original?.transfers||[]});
      }else if(mode==='transfer')next.accounts=normalizeAccounts({...next.accounts,transfers:[...next.accounts.transfers,{id:crypto.randomUUID(),date:f.date.value,from:f.from.value,to:f.to.value,amount:f.amount.value}]});
      else{if(!next.accounts.transfers.some(t=>t.id===transferId))throw Error('Không tìm thấy chuyển tiền.');next.accounts.transfers=next.accounts.transfers.filter(t=>t.id!==transferId);}
      if(context.getUserId()!==user)throw Error('Phiên đăng nhập đã thay đổi.');
      context.onChange(next);await context.commit();dialog.close();
    }catch(error){status.textContent=error.message;}finally{busy=false;dialog.querySelectorAll('button,input,select').forEach(e=>e.disabled=false);}
  };
}
