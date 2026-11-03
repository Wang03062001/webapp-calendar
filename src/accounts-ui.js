import { financeView } from './credit-access.js';
import { t } from './i18n.js';
import { formatAmount } from './model.js';
import { accountBalances, normalizeAccounts, moneyOut, monthEnd, reconcileMonth, isInternalMovement, balanceUpdateCount } from './account-model.js';
import { currencyLabel, currencyCode } from './preferences.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>`${formatAmount(value)} ${currencyLabel()}`;
const dateLabel=value=>value.split('-').reverse().join('/');
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export const sourceName=source=>source==='bank'?'Tài khoản ngân hàng':source==='card'?'PayPay / thẻ tín dụng':'Tiền mặt';
export function accountsPanel(data,date,creditAllowed) {
  data=financeView(data,creditAllowed);
  const b=accountBalances(data,date), a=data.accounts;
  const transfers=[...(a?.transfers||[]),...Object.entries(data.days).flatMap(([date,entry])=>entry.items.filter(isInternalMovement).map(item=>({date,id:item.id,amount:item.amount,from:item.movement==='withdraw'?'bank':'cash',to:item.movement==='withdraw'?'cash':'bank',expense:true})))].sort((a,b)=>b.date.localeCompare(a.date));
  return `<section class="card accounts-panel"><div class="card-heading"><div><h2>Số dư theo nguồn tiền</h2><p>Tính đến cuối ngày ${dateLabel(date)} · ${a?`Số dư đầu ngày ${dateLabel(a.openedOn)}`:'Chưa thiết lập số dư đầu ngày'}</p></div><button class="button secondary" data-action="account-balances">Thiết lập số dư</button></div><div class="account-balances"><article class="assets-total"><span>Tài sản còn lại</span><strong data-balance="assets">${b?money(b.bank+b.cash):'Chưa thiết lập'}</strong><small>Ngân hàng + tiền mặt</small></article><article><span>Tài khoản ngân hàng</span><strong data-money-kind="bank" data-balance="bank">${b?money(b.bank):'Chưa thiết lập'}</strong></article><article><span>Tiền mặt</span><strong data-money-kind="cash" data-balance="cash">${b?money(b.cash):'Chưa thiết lập'}</strong></article>${creditAllowed?`<article><span>Hạn mức khả dụng PayPay</span><strong data-money-kind="card" data-balance="credit">${b?.available!=null?money(b.available):'Cần nhập / đối chiếu hạn mức'}</strong><small>Dư nợ ghi sổ: ${b?money(b.creditDebt):'Chưa thiết lập'}</small></article>`:''}</div><p class="account-note">Số dư dựa trên các giao dịch đã ghi; không kết nối trực tiếp với ngân hàng. Khoản cũ chưa có nguồn được tính là tiền mặt. Thu nhập chưa chọn nơi nhận được tính vào ngân hàng.</p>${b && b.creditDebt<0 && creditAllowed?'<p class="account-note negative">Cần đối chiếu dư nợ đầu kỳ và giao dịch thẻ: tiền đã trả vượt dư nợ ghi sổ.</p>':''}<div class="account-period"><span>Tiền ra ngân hàng / tiền mặt trong tháng <strong data-money-out>${money(moneyOut(data,date.slice(0,7)))}</strong></span>${creditAllowed?'<small>Gồm trả sao kê; chi phí mua bằng thẻ không bị cộng hai lần.</small>':''}</div>${a?`<div class="account-transfers"><button class="button secondary" data-action="account-transfer">Chuyển ngân hàng ↔ tiền mặt</button><details><summary>Lịch sử chuyển tiền</summary>${transfers.map(t=>`<div><span>${dateLabel(t.date)} · ${sourceName(t.from)} → ${sourceName(t.to)} · ${money(t.amount)}</span>${t.expense?`<button class="text-button" data-open-day="${t.date}">Xem</button>`:`<button class="text-button danger" data-remove-transfer="${encodeURIComponent(t.id)}">Xóa</button>`}</div>`).join('')||'<p>Chưa có chuyển tiền.</p>'}</details></div>`:''}${monthClosingPanel(data,date,b)}</section>`;
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
  dialog.innerHTML=`<button class="dialog-close" aria-label="Đóng">×</button><h2>${mode==='balances'?'Thiết lập số dư':mode==='transfer'?'Chuyển tiền nội bộ':'Xóa chuyển tiền'}</h2><form>${mode==='balances'?`${field('openedOn','Ngày bắt đầu theo dõi','date',original?.openedOn||today(),'required min="1900-01-01" max="9999-12-31"')}${cash('bank','Ngân hàng đầu ngày',original?.bank)}${cash('cash','Tiền mặt đầu ngày',original?.cash)}${credit?`${cash('creditDebt','Dư nợ PayPay đầu ngày',original?.creditDebt)}${cash('creditLimit','Hạn mức PayPay (không bắt buộc)',original?.creditLimit)}`:''}<p>Nhập số dư trước mọi giao dịch trong ngày bắt đầu. ${credit?'Dư nợ đầu ngày gồm cả nợ cũ, mua hàng và phí chưa trả trước ngày đó.':''} Giao dịch từ ngày bắt đầu trở đi sẽ được cộng/trừ; không nhập lại số dư cuối ngày vào đây.</p>`:mode==='transfer'?`${field('date','Ngày chuyển','date',today(),'required min="1900-01-01" max="9999-12-31"')}${source('from','Nguồn tiền','bank')}${source('to','Nơi nhận','cash')}${cash('amount','Số tiền','')}<p>Chuyển giữa hai nguồn của bạn không tạo thêm thu nhập hoặc chi phí.</p>`:'<p>Xóa giao dịch chuyển tiền này sẽ hoàn lại số dư của cả hai nguồn.</p>'}<button class="account-submit" type="submit">Lưu thay đổi</button></form><p role="status" aria-live="polite"></p>`;
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
        next.accounts=normalizeAccounts({openedOn:f.openedOn.value,bank:f.bank.value,cash:f.cash.value,creditDebt:credit?f.creditDebt.value:original?.creditDebt||0,creditLimit:credit?(f.creditLimit.value.trim()?f.creditLimit.value:null):original?.creditLimit??null,transfers:original?.transfers||[],...(original?.reconciliations?{reconciliations:original.reconciliations}:{})});
      }else if(mode==='transfer')next.accounts=normalizeAccounts({...next.accounts,transfers:[...next.accounts.transfers,{id:crypto.randomUUID(),date:f.date.value,from:f.from.value,to:f.to.value,amount:f.amount.value}]});
      else{if(!next.accounts.transfers.some(t=>t.id===transferId))throw Error('Không tìm thấy chuyển tiền.');next.accounts.transfers=next.accounts.transfers.filter(t=>t.id!==transferId);}
      if(context.getUserId()!==user)throw Error('Phiên đăng nhập đã thay đổi.');
      context.onChange(next);await context.commit();dialog.close();
    }catch(error){status.textContent=error.message;}finally{busy=false;dialog.querySelectorAll('button,input,select').forEach(e=>e.disabled=false);}
  };
}

function monthClosingPanel(data,date,balance) {
  const records=data.accounts?.reconciliations||[];
  const history=records.length?`<details class="reconciliation-history"><summary>Lịch sử đối chiếu</summary>${records.map(r=>`<p translate="no">${esc(r.note)}</p>`).join('')}</details>`:'';
  if(date!==monthEnd(date.slice(0,7)))return history;
  if(!balance)return `<section class="month-closing"><h3>Đối chiếu cuối tháng</h3><p>Thiết lập số dư đầu ngày trước khi đối chiếu.</p></section>${history}`;
  return `<section class="month-closing"><h3>Đối chiếu cuối tháng · ${dateLabel(date)}</h3><p>Nhập tiền thực có cuối ngày, sau mọi giao dịch. Xác nhận sẽ dùng số thực tế làm số dư đầu tháng mới và giữ nguyên lịch sử chi tiêu.</p><div class="closing-inputs"><label>Ngân hàng thực tế<input data-closing="bank" data-money inputmode="decimal" maxlength="32" placeholder="0"></label><label>Tiền mặt thực tế<input data-closing="cash" data-money inputmode="decimal" maxlength="32" placeholder="0"></label></div><button class="button" data-action="reconcile-month" ${date>today()?'disabled':''}>Kiểm tra chênh lệch</button>${date>today()?'<small>Chưa đến ngày cuối tháng.</small>':''}</section>${history}`;
}
export function showMonthReconciliation(context,date,actual,manual=false) {
  if(!context.canEdit())return;
  const snapshot=JSON.stringify(context.getData()),user=context.getUserId();
  const draft=structuredClone(context.getData());
  const record=reconcileMonth(draft,date,actual,{id:crypto.randomUUID(),currency:currencyCode(),today:today(),manual,creditAllowed:context.canUseCredit()});
  const localizedNote=`[${t(manual?'Cập nhật số dư':'Đối chiếu cuối tháng')} ${dateLabel(date)} · ${currencyLabel()}] ${t('Ngân hàng theo sổ:')} ${money(record.expectedBank)}; ${t('Ngân hàng thực tế:')} ${money(record.bank)}; ${t('Chênh lệch ngân hàng:')} ${money(record.deltaBank)}. ${t('Tiền mặt theo sổ:')} ${money(record.expectedCash)}; ${t('Tiền mặt thực tế:')} ${money(record.cash)}; ${t('Chênh lệch tiền mặt:')} ${money(record.deltaCash)}. ${t('Tổng chênh lệch:')} ${money(record.deltaBank+record.deltaCash)}.`;
  const dayNote=[context.getData().days[date]?.note,localizedNote].filter(Boolean).join('\n');if(dayNote.length>20000)throw Error('Ghi chú ngày đã đầy. Hãy rút ngắn ghi chú trước khi xác nhận.');
  record.note=localizedNote;draft.accounts.reconciliations.at(-1).note=localizedNote;draft.days[date].note=dayNote;
  document.querySelector('#reconcile-dialog')?.remove();const dialog=document.createElement('dialog');dialog.id='reconcile-dialog';dialog.className='account-dialog ledger-dialog';
  dialog.innerHTML=`<button class="dialog-close" aria-label="Đóng">×</button><h2>${manual?'Xác nhận cập nhật số dư':'Xác nhận đối chiếu cuối tháng'}</h2><p>${dateLabel(date)}</p><div class="reconciliation-differences"><p>Ngân hàng theo sổ: <strong data-money-kind="bank">${money(record.expectedBank)}</strong></p><p>Ngân hàng thực tế: <strong data-money-kind="bank">${money(record.bank)}</strong></p><p>Chênh lệch ngân hàng: <strong data-money-kind="bank" data-delta="bank">${money(record.deltaBank)}</strong></p><p>Tiền mặt theo sổ: <strong data-money-kind="cash">${money(record.expectedCash)}</strong></p><p>Tiền mặt thực tế: <strong data-money-kind="cash">${money(record.cash)}</strong></p><p>Chênh lệch tiền mặt: <strong data-money-kind="cash" data-delta="cash">${money(record.deltaCash)}</strong></p><p>Tổng chênh lệch: <strong data-delta="total">${money(record.deltaBank+record.deltaCash)}</strong></p></div><p>Ghi chú chênh lệch được lưu vào ngày đã chọn cùng lịch sử. Số dư thực tế áp dụng từ cuối ngày đó; không sửa hoặc tạo thêm khoản chi.</p><button class="account-submit confirm-reconciliation">Xác nhận số dư thực tế</button><p role="status" aria-live="polite"></p>`;
  document.body.append(dialog);dialog.showModal();let busy=false,done=false;
  dialog.querySelector('.dialog-close').onclick=()=>{if(!busy)dialog.close();};dialog.addEventListener('close',()=>dialog.remove());dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.querySelector('.confirm-reconciliation').onclick=async()=>{
    if(busy)return;if(done){dialog.close();return;}const status=dialog.querySelector('[role=status]');
    try{
      if(!context.canEdit()||context.getUserId()!==user||JSON.stringify(context.getData())!==snapshot)throw Error('Dữ liệu đã thay đổi. Đóng và mở lại để kiểm tra.');
      busy=true;dialog.querySelectorAll('button').forEach(button=>button.disabled=true);
      if(manual){
        if(today()!==record.confirmedOn)throw Error('Ngày đã thay đổi. Đóng và mở lại để kiểm tra.');
        await context.commitConfirmed(draft);
      }else{context.onChange(draft);await context.commit();}
      if(context.getUserId()!==user){dialog.close();return;}
      done=true;dialog.querySelector('h2').textContent=t('Đã ghi nhận đối chiếu');status.textContent=t(context.getStatus()==='ready'?'Số dư đã cập nhật. Ghi chú chênh lệch được lưu cùng lịch sử.':'Bản nháp đối chiếu đã được giữ trên máy. Kiểm tra trạng thái đồng bộ.');dialog.querySelector('.confirm-reconciliation').textContent=t('Đóng');
    }catch(error){status.textContent=error.message;}finally{busy=false;dialog.querySelectorAll('button').forEach(button=>button.disabled=false);}
  };
}

// Ordinary-day corrections share the account document and reconciliation ledger.
// Opening/canceling either dialog does not write data or reserve a quota slot.
export function showBalanceRequest(context,date) {
  if(!context.canEdit())return;
  if(date===monthEnd(date.slice(0,7))&&context.getData().accounts){
    showBalanceNotice(context,date,true);return;
  }
  showBalanceNotice(context,date,false);
}
function showBalanceNotice(context,date,closing) {
  document.querySelector('#ledger-dialog')?.remove();
  const user=context.getUserId(), dialog=document.createElement('dialog');dialog.id='ledger-dialog';dialog.className='account-dialog ledger-dialog';
  const used=balanceUpdateCount(context.getData().accounts,today().slice(0,7));
  dialog.innerHTML=`<button class="dialog-close" aria-label="Đóng">×</button><h2>Thiết lập số dư</h2><p>${closing?'Dùng Đối chiếu cuối tháng trên trang để cập nhật số dư, không tính lượt.':'Thiết lập số dư trực tiếp chưa khả dụng ở ngày thường.'}</p>${closing?'':`<p>Đã dùng ${used}/3 lượt cập nhật thành công trong tháng hiện tại. Hủy hoặc lưu lỗi không tính lượt.</p><button class="account-submit" data-request-balance ${used>=3||date>today()?'disabled':''}>Yêu cầu thêm</button>${date>today()?'<p>Không thể cập nhật số dư cho ngày tương lai.</p>':''}`}`;
  document.body.append(dialog);dialog.showModal();dialog.querySelector('.dialog-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
  dialog.querySelector('[data-request-balance]')?.addEventListener('click',()=>{
    if(!context.canEdit()||context.getUserId()!==user)return;
    if(balanceUpdateCount(context.getData().accounts,today().slice(0,7))>=3)return;
    if(!context.getData().accounts){dialog.close();showAccountLedger(context);return;}
    const b=accountBalances(context.getFinanceData(),date);if(!b)return;
    dialog.innerHTML=`<button class="dialog-close" aria-label="Đóng">×</button><h2>Yêu cầu cập nhật số dư</h2><p>Số dư thực tế cuối ngày ${dateLabel(date)}.${context.canUseCredit()?' Giữ nguyên hạn mức và dư nợ thẻ.':''}</p><form><label>Ngân hàng thực tế<input name="bank" data-money-kind="bank" data-money inputmode="decimal" required value="${formatAmount(b.bank)}"></label><label>Tiền mặt thực tế<input name="cash" data-money-kind="cash" data-money inputmode="decimal" required value="${formatAmount(b.cash)}"></label><button class="account-submit">Kiểm tra chênh lệch</button></form><p role="status"></p>`;
    dialog.querySelector('.dialog-close').onclick=()=>dialog.close();
    dialog.querySelector('form').onsubmit=event=>{
      event.preventDefault();
      if(!context.canEdit()||context.getUserId()!==user)return;
      try{showMonthReconciliation(context,date,{bank:event.target.elements.bank.value,cash:event.target.elements.cash.value},true);dialog.close();}catch(error){dialog.querySelector('[role=status]').textContent=error.message;}
    };
  });
}
