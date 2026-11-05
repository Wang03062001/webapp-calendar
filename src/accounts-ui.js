import {sumMoney} from './money.js';
import {tokyoToday} from './finance-date.js';
import {showSourceOpening} from './opening-ui.js';
import { simpleCards,moduleEnabled } from './region-model.js';
import { availableCredit, setAvailableCredit } from './card-model.js';
import { financeView } from './credit-access.js';
import { t } from './i18n.js';
import { formatAmount } from './model.js';
import { accountBalances, normalizeAccounts, moneyOut, monthEnd, reconcileMonth, isInternalMovement, balanceUpdateCount, sourceOpening } from './account-model.js';
import { currencyLabel, currencyCode } from './preferences.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>`${formatAmount(value)} ${currencyLabel()}`;
const dateLabel=value=>value.split('-').reverse().join('/');
const today=tokyoToday;
export const sourceName=source=>source==='bank'?'Tài khoản ngân hàng':source==='card'?'Thẻ tín dụng':source==='savings'?'Tiết kiệm':'Tiền mặt';
export function accountsPanel(data,date,creditAllowed) {
  data=financeView(data,creditAllowed);
  creditAllowed=creditAllowed&&!simpleCards(data)&&moduleEnabled(data,'cards');
  const b=accountBalances(data,date), a=data.accounts, opening=sourceOpening(a), available=availableCredit(data,date,b?.available??null);
  const transfers=[...(a?.transfers||[]),...Object.entries(data.days).flatMap(([date,entry])=>entry.items.filter(isInternalMovement).map(item=>({date,id:item.id,amount:item.amount,from:item.movement==='withdraw'?'bank':'cash',to:item.movement==='withdraw'?'cash':'bank',expense:true})))].sort((a,b)=>b.date.localeCompare(a.date));
  return `<section class="card accounts-panel"><div class="card-heading"><div><h2>Số dư theo nguồn tiền</h2><p>Tính đến cuối ngày ${dateLabel(date)} · ${opening?`${opening.timing==='end'?'Mốc số dư cuối tháng':'Mốc số dư đầu ngày'} ${dateLabel(opening.date)}`:'Chưa thiết lập số dư đầu ngày'}</p></div><button class="button secondary" data-action="account-balances">Thiết lập số dư</button></div><div class="account-balances"><article class="assets-total"><span>Tài sản còn lại</span><strong data-balance="assets">${b?money(b.bank+b.cash+(b.savings||0)):'Chưa thiết lập'}</strong><small>Ngân hàng chưa phân bổ + tiền mặt + tiết kiệm</small></article><article><span>Ngân hàng chưa phân bổ</span><strong data-money-kind="bank" data-balance="bank">${b?money(b.bank):'Chưa thiết lập'}</strong></article><article><span>Tiền mặt</span><strong data-money-kind="cash" data-balance="cash">${b?money(b.cash):'Chưa thiết lập'}</strong></article>${moduleEnabled(data,'savings')?`<article><span>Tiết kiệm · ${currencyLabel()}</span><strong data-money-kind="savings" data-balance="savings">${b?.savings!==undefined?money(b.savings):'Chưa thiết lập'}</strong>${a&&a.savings===undefined?'<button class="text-button" data-action="savings-opening">Thiết lập nguồn tiết kiệm</button>':''}</article>`:''}</div><p class="account-note">Số dư dựa trên các giao dịch đã ghi; không kết nối trực tiếp với ngân hàng. Khoản cũ chưa có nguồn được tính là tiền mặt. Thu nhập chưa chọn nơi nhận được tính vào ngân hàng.</p><div class="account-period"><span>Tiền ra các nguồn trong tháng <strong data-money-out>${money(moneyOut(data,date.slice(0,7)))}</strong></span>${creditAllowed?'<small>Gồm trả sao kê; chi phí mua bằng thẻ không bị cộng hai lần.</small>':''}</div>${a?`<div class="account-transfers"><button class="button secondary" data-action="account-transfer">Phân bổ / chuyển nguồn tiền</button><details><summary>Lịch sử chuyển tiền</summary>${transfers.map(t=>`<div><span>${dateLabel(t.date)} · ${sourceName(t.from)} → ${sourceName(t.to)} · ${money(t.amount)}</span>${t.expense?`<button class="text-button" data-open-day="${t.date}">Xem</button>`:`<button class="text-button danger" data-remove-transfer="${encodeURIComponent(t.id)}">Xóa</button>`}</div>`).join('')||'<p>Chưa có chuyển tiền.</p>'}</details></div>`:''}${monthClosingPanel(data,date,b)}</section>`;
}
export function showAccountLedger(context,mode='balances',transferId) {
  if(!context.canEdit())return;
  document.querySelector('#ledger-dialog')?.remove();
  const original=context.getData().accounts, snapshot=JSON.stringify(original), currencies=JSON.stringify(context.getData().currencies), user=context.getUserId(), credit=false;
  if(mode!=='balances'&&!original)return;
  const dialog=document.createElement('dialog');dialog.id='ledger-dialog';dialog.className='account-dialog ledger-dialog';
  const field=(name,label,type,value='',extra='')=>`<label>${label}<input type="${type}" name="${name}" value="${value}" ${extra}></label>`;
  const cash=(name,label,value)=>field(name,`${label} · ${currencyLabel()}`,'text',value==null?'':formatAmount(value),'data-money inputmode="decimal" maxlength="32"');
  const source=(name,label,value)=>`<label>${label}<select name="${name}"><option value="bank" ${value==='bank'?'selected':''}>Tài khoản ngân hàng</option><option value="cash" ${value==='cash'?'selected':''}>Tiền mặt</option>${original?.savings!==undefined?`<option value="savings" ${value==='savings'?'selected':''}>Tiết kiệm</option>`:''}</select></label>`;
  dialog.innerHTML=`<button class="dialog-close" aria-label="Đóng">×</button><h2>${mode==='balances'?'Thiết lập số dư':mode==='transfer'?'Chuyển tiền nội bộ':'Xóa chuyển tiền'}</h2><form>${mode==='balances'?`${field('openedOn','Ngày bắt đầu theo dõi','date',original?.openedOn||context.getData().trackingStart||today(),'required min="1900-01-01" max="9999-12-31"')}${cash('bank','Ngân hàng đầu ngày',original?.bank)}${cash('cash','Tiền mặt đầu ngày',original?.cash)}${cash('savings','Tiết kiệm đầu ngày (cùng đơn vị nguồn tiền)',original?.savings||0)}<p>Tổng tài sản đầu ngày: <strong data-opening-total>Chưa thiết lập</strong></p><p>Nhập số dư trước mọi giao dịch trong ngày bắt đầu. Ngân hàng là phần chưa dành tiết kiệm; không nhập tiền tiết kiệm vào cả hai ô. ${credit?'Dư nợ đầu ngày gồm cả nợ cũ, mua hàng và phí chưa trả trước ngày đó.':''} Giao dịch từ ngày bắt đầu trở đi sẽ được cộng/trừ; không nhập lại số dư cuối ngày vào đây.</p>`:mode==='transfer'?`${field('date','Ngày chuyển','date',today(),'required min="1900-01-01" max="9999-12-31"')}${source('from','Nguồn tiền','bank')}${source('to','Nơi nhận','cash')}${cash('amount','Số tiền','')}<p>Chuyển giữa hai nguồn của bạn không tạo thêm thu nhập hoặc chi phí.</p>`:'<p>Xóa giao dịch chuyển tiền này sẽ hoàn lại số dư của cả hai nguồn.</p>'}<button class="account-submit" type="submit">Lưu thay đổi</button></form><p role="status" aria-live="polite"></p>`;
  document.body.append(dialog);dialog.showModal();let busy=false;
  if(mode==='balances'){const preview=()=>{const f=dialog.querySelector('form').elements;try{dialog.querySelector('[data-opening-total]').textContent=f.bank.value.trim()&&f.cash.value.trim()?money(sumMoney([f.bank.value.replaceAll(',',''),f.cash.value.replaceAll(',',''),f.savings.value.replaceAll(',','')||0])):'Chưa thiết lập';}catch{dialog.querySelector('[data-opening-total]').textContent='Chưa thiết lập';}};dialog.querySelector('form').addEventListener('input',preview);preview();}
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
        next.accounts=normalizeAccounts({openedOn:f.openedOn.value,bank:f.bank.value,cash:f.cash.value,savings:f.savings.value,...(original?.savingsOpenedOn?{savingsOpenedOn:original.savingsOpenedOn}:{}),creditDebt:credit?f.creditDebt.value:original?.creditDebt||0,creditLimit:credit?(f.creditLimit.value.trim()?f.creditLimit.value:null):original?.creditLimit??null,transfers:original?.transfers||[],...(original?.reconciliations?{reconciliations:original.reconciliations}:{}),...(original?.openingHistory?{openingHistory:original.openingHistory}:{})});
      }else if(mode==='transfer')next.accounts=normalizeAccounts({...next.accounts,transfers:[...next.accounts.transfers,{id:crypto.randomUUID(),date:f.date.value,from:f.from.value,to:f.to.value,amount:f.amount.value}]});
      else{if(!next.accounts.transfers.some(t=>t.id===transferId))throw Error('Không tìm thấy chuyển tiền.');next.accounts.transfers=next.accounts.transfers.filter(t=>t.id!==transferId);}
      if(context.getUserId()!==user)throw Error('Phiên đăng nhập đã thay đổi.');
      await context.commitConfirmed(next);dialog.close();
    }catch(error){status.textContent=error.message;}finally{busy=false;dialog.querySelectorAll('button,input,select').forEach(e=>e.disabled=false);}
  };
}

function monthClosingPanel(data,date,balance) {
  const records=data.accounts?.reconciliations||[];
  const openingHistory=(data.accounts?.openingHistory||[]).map(r=>`<p>${dateLabel(r.date)} · ${r.timing==='end'?'Cuối tháng':'Đầu ngày'} · Ngân hàng ${money(r.bank)} · Tiền mặt ${money(r.cash)}${r.savings!==undefined?' · Tiết kiệm '+money(r.savings):''} · Xác nhận ${dateLabel(r.confirmedOn)} <span translate="no">${esc(r.note)}</span></p>`).join('');
  const sourceHistory=openingHistory?`<details class="reconciliation-history"><summary>Lịch sử số dư đầu kỳ</summary>${openingHistory}</details>`:'';
  const history=sourceHistory+(records.length?`<details class="reconciliation-history"><summary>Lịch sử đối chiếu</summary>${records.map(r=>`<p translate="no">${esc(r.note)}</p>`).join('')}</details>`:'');
  if(date!==monthEnd(date.slice(0,7)))return history;
  if(!balance)return `<section class="month-closing"><h3>Đối chiếu cuối tháng</h3><p>Thiết lập số dư đầu ngày trước khi đối chiếu.</p></section>${history}`;
  return `<section class="month-closing"><h3>Đối chiếu cuối tháng · ${dateLabel(date)}</h3><p>Nhập tiền thực có cuối ngày, sau mọi giao dịch. Xác nhận sẽ dùng số thực tế làm số dư đầu tháng mới và giữ nguyên lịch sử chi tiêu.</p><div class="closing-inputs"><label>Ngân hàng thực tế<input data-closing="bank" data-money inputmode="decimal" maxlength="32" placeholder="0"></label><label>Tiền mặt thực tế<input data-closing="cash" data-money inputmode="decimal" maxlength="32" placeholder="0"></label>${balance.savings!==undefined?`<label>Tiết kiệm thực tế<input data-closing="savings" data-money inputmode="decimal" required></label>`:''}</div><button class="button" data-action="reconcile-month" ${date>today()?'disabled':''}>Kiểm tra chênh lệch</button>${date>today()?'<small>Chưa đến ngày cuối tháng.</small>':''}</section>${history}`;
}
export function showMonthReconciliation(context,date,actual,manual=false) {
  if(!context.canEdit())return;
  const snapshot=JSON.stringify(context.getData()),user=context.getUserId();
  const draft=structuredClone(context.getData());
  const record=reconcileMonth(draft,date,actual,{id:crypto.randomUUID(),currency:currencyCode(),today:today(),manual,creditAllowed:context.hasCreditAccess?.()??context.canUseCredit()});
  const localizedNote=`[${t(manual?'Cập nhật số dư':'Đối chiếu cuối tháng')} ${dateLabel(date)} · ${currencyLabel()}] ${t('Ngân hàng theo sổ:')} ${money(record.expectedBank)}; ${t('Ngân hàng thực tế:')} ${money(record.bank)}; ${t('Chênh lệch ngân hàng:')} ${money(record.deltaBank)}. ${t('Tiền mặt theo sổ:')} ${money(record.expectedCash)}; ${t('Tiền mặt thực tế:')} ${money(record.cash)}; ${t('Chênh lệch tiền mặt:')} ${money(record.deltaCash)}. ${record.savings!==undefined?`Tiết kiệm: sổ ${money(record.expectedSavings)}, thực tế ${money(record.savings)}, chênh lệch ${money(record.deltaSavings)}. `:''}${t('Tổng chênh lệch:')} ${money(record.deltaBank+record.deltaCash+(record.deltaSavings||0))}.`;
  const dayNote=[context.getData().days[date]?.note,localizedNote].filter(Boolean).join('\n');if(dayNote.length>20000)throw Error('Ghi chú ngày đã đầy. Hãy rút ngắn ghi chú trước khi xác nhận.');
  record.note=localizedNote;draft.accounts.reconciliations.at(-1).note=localizedNote;draft.days[date].note=dayNote;
  document.querySelector('#reconcile-dialog')?.remove();const dialog=document.createElement('dialog');dialog.id='reconcile-dialog';dialog.className='account-dialog ledger-dialog';
  dialog.innerHTML=`<button class="dialog-close" aria-label="Đóng">×</button><h2>${manual?'Xác nhận cập nhật số dư':'Xác nhận đối chiếu cuối tháng'}</h2><p>${dateLabel(date)}</p><div class="reconciliation-differences"><p>Ngân hàng theo sổ: <strong data-money-kind="bank">${money(record.expectedBank)}</strong></p><p>Ngân hàng thực tế: <strong data-money-kind="bank">${money(record.bank)}</strong></p><p>Chênh lệch ngân hàng: <strong data-money-kind="bank" data-delta="bank">${money(record.deltaBank)}</strong></p><p>Tiền mặt theo sổ: <strong data-money-kind="cash">${money(record.expectedCash)}</strong></p><p>Tiền mặt thực tế: <strong data-money-kind="cash">${money(record.cash)}</strong></p><p>Chênh lệch tiền mặt: <strong data-money-kind="cash" data-delta="cash">${money(record.deltaCash)}</strong></p>${record.savings!==undefined?`<p>Tiết kiệm theo sổ: ${money(record.expectedSavings)} · Thực tế: ${money(record.savings)} · Chênh lệch: ${money(record.deltaSavings)}</p>`:''}<p>Tổng chênh lệch: <strong data-delta="total">${money(record.deltaBank+record.deltaCash+(record.deltaSavings||0))}</strong></p></div><p>Ghi chú chênh lệch được lưu vào ngày đã chọn cùng lịch sử. Số dư thực tế áp dụng từ cuối ngày đó; không sửa hoặc tạo thêm khoản chi.</p><button class="account-submit confirm-reconciliation">Xác nhận số dư thực tế</button><p role="status" aria-live="polite"></p>`;
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
  if(!context.getData().accounts){showAccountLedger(context);return;}
  if(date===monthEnd(date.slice(0,7))&&context.getData().accounts){
    showBalanceNotice(context,date,true);return;
  }
  showBalanceNotice(context,date,false);
}
function showBalanceNotice(context,date,closing) {
  document.querySelector('#ledger-dialog')?.remove();
  const user=context.getUserId(), dialog=document.createElement('dialog');dialog.id='ledger-dialog';dialog.className='account-dialog ledger-dialog';
  const used=balanceUpdateCount(context.getData().accounts,today().slice(0,7));
  dialog.innerHTML=`<button class="dialog-close" aria-label="Đóng">×</button><h2>Thiết lập số dư</h2><p>${closing?'Dùng Đối chiếu cuối tháng trên trang để cập nhật số dư, không tính lượt.':'Chọn cập nhật số dư cuối ngày hoặc sửa mốc đầu kỳ. Tiền mang sang không phải thu nhập mới.'}</p>${closing?'':`<p>Đã dùng ${used}/3 lượt cập nhật thành công trong tháng hiện tại. Hủy hoặc lưu lỗi không tính lượt.</p><button class="account-submit" data-request-balance ${used>=3||date>today()?'disabled':''}>Yêu cầu thêm</button>${date>today()?'<p>Không thể cập nhật số dư cho ngày tương lai.</p>':''}`}`;
  const book=context.getData(),opening=sourceOpening(book.accounts);
  if(opening){
    const previous=new Date(`${date.slice(0,7)}-01T00:00:00Z`);previous.setUTCDate(0);const previousEnd=previous.toISOString().slice(0,10);
    const menu=document.createElement('div');menu.className='balance-setup-options';
    menu.innerHTML=`${date<opening.date?'<p>Ngày đang xem nằm trước mốc số dư hiện tại. Chọn thiết lập mốc sớm hơn để theo dõi tháng này.</p>':''}<button class="button secondary" data-edit-opening>Sửa ngày bắt đầu / số dư đầu kỳ</button><button class="button secondary" data-previous-opening>Nhập tiền còn lại cuối tháng trước</button>${closing?'<button class="button secondary" data-selected-closing>Nhập số dư cuối tháng đang chọn</button>':''}<button class="button secondary" data-previous-income ${!moduleEnabled(book,'salary')?'disabled':''}>Nhập thu nhập tháng trước</button>${!moduleEnabled(book,'salary')?'<p>Bật Lương & thưởng trong Quốc gia & chức năng để nhập thu nhập tháng trước.</p>':''}`;
    dialog.append(menu);
    menu.querySelector('[data-edit-opening]').onclick=()=>{if(!context.canEdit())return;dialog.close();showSourceOpening(context,date<opening.date?date.slice(0,7)+'-01':opening.date,date<opening.date?'start':opening.timing);};
    menu.querySelector('[data-previous-opening]').onclick=()=>{if(!context.canEdit())return;dialog.close();showSourceOpening(context,previousEnd,'end');};
    menu.querySelector('[data-selected-closing]')?.addEventListener('click',()=>{if(!context.canEdit())return;dialog.close();showSourceOpening(context,date,'end');});
    menu.querySelector('[data-previous-income]').onclick=()=>{if(!context.canEdit())return;dialog.close();context.openIncomeMonth?.(previousEnd);};
  }
  document.body.append(dialog);dialog.showModal();dialog.querySelector('.dialog-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
  dialog.querySelector('[data-request-balance]')?.addEventListener('click',()=>{
    if(!context.canEdit()||context.getUserId()!==user)return;
    if(balanceUpdateCount(context.getData().accounts,today().slice(0,7))>=3)return;
    if(!context.getData().accounts){dialog.close();showAccountLedger(context);return;}
    const b=accountBalances(context.getFinanceData(),date);if(!b){dialog.close();showSourceOpening(context,date);return;}
    dialog.innerHTML=`<button class="dialog-close" aria-label="Đóng">×</button><h2>Yêu cầu cập nhật số dư</h2><p>Số dư thực tế cuối ngày ${dateLabel(date)}.</p><form><label>Ngân hàng thực tế<input name="bank" data-money-kind="bank" data-money inputmode="decimal" required value="${formatAmount(b.bank)}"></label><label>Tiền mặt thực tế<input name="cash" data-money-kind="cash" data-money inputmode="decimal" required value="${formatAmount(b.cash)}"></label>${b.savings!==undefined?`<label>Tiết kiệm thực tế<input name="savings" data-money inputmode="decimal" required value="${formatAmount(b.savings)}"></label>`:''}<button class="account-submit">Kiểm tra chênh lệch</button></form><p role="status"></p>`;
    dialog.querySelector('.dialog-close').onclick=()=>dialog.close();
    dialog.querySelector('form').onsubmit=event=>{
      event.preventDefault();
      if(!context.canEdit()||context.getUserId()!==user)return;
      try{showMonthReconciliation(context,date,{bank:event.target.elements.bank.value,cash:event.target.elements.cash.value,...(event.target.elements.savings?{savings:event.target.elements.savings.value}:{})},true);dialog.close();}catch(error){dialog.querySelector('[role=status]').textContent=error.message;}
    };
  });
}

export function showAvailableCredit(context,date) {
  if(!context.canEdit()||!context.canUseCredit())return;
  const user=context.getUserId(),snapshot=JSON.stringify(context.getData());
  const balance=accountBalances(context.getData(),date),value=availableCredit(context.getData(),date,balance?.available??null);
  document.querySelector('#credit-limit-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='credit-limit-dialog';dialog.className='account-dialog ledger-dialog';
  dialog.innerHTML=`<button class="dialog-close" aria-label="Đóng">×</button><h2>Hạn mức khả dụng PayPay</h2><p>Nhập số tiền còn có thể sử dụng cuối ngày ${dateLabel(date)} theo PayPay. Giao dịch thẻ sau ngày này sẽ tiếp tục cộng/trừ hạn mức. Cập nhật không giới hạn số lần và không dùng lượt thiết lập số dư.</p><form><label>Hạn mức khả dụng · ${currencyLabel()}<input name="available" data-money data-money-kind="card" inputmode="decimal" maxlength="32" required value="${value!=null&&value>=0?formatAmount(value):''}"></label><button class="account-submit">Lưu thay đổi</button></form><p role="status" aria-live="polite"></p>`;
  document.body.append(dialog);dialog.showModal();let busy=false;
  dialog.querySelector('.dialog-close').onclick=()=>{if(!busy)dialog.close();};
  dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});dialog.addEventListener('close',()=>dialog.remove());
  dialog.querySelector('form').onsubmit=async event=>{
    event.preventDefault();if(busy)return;const status=dialog.querySelector('[role=status]');
    try{
      busy=true;dialog.querySelectorAll('button,input').forEach(e=>e.disabled=true);
      if(!context.canEdit()||!await context.verifyCreditAccess()||context.getUserId()!==user)throw Error('Chức năng Thẻ & sao kê chỉ dành cho admin.');
      if(JSON.stringify(context.getData())!==snapshot)throw Error('Dữ liệu đã thay đổi. Đóng và mở lại để kiểm tra.');
      if(date>today())throw Error('Không thể cập nhật số dư cho ngày tương lai.');
      const next=structuredClone(context.getData());
      setAvailableCredit(next,{id:crypto.randomUUID(),date,amount:event.target.elements.available.value});
      await context.commitConfirmed(next);dialog.close();
    }catch(error){status.textContent=t(error.message);}finally{busy=false;dialog.querySelectorAll('button,input').forEach(e=>e.disabled=false);}
  };
}

export function showSavingsOpening(context,date){
 if(!context.canEdit()||!context.getData().accounts||context.getData().accounts.savings!==undefined)return;
 const before=JSON.stringify(context.getData()),user=context.getUserId();
 const d=document.createElement('dialog');d.id='savings-opening-dialog';d.className='account-dialog ledger-dialog';
 d.innerHTML=`<button class="dialog-close" aria-label="Đóng">×</button><h2>Thiết lập nguồn tiết kiệm</h2><p>Nhập số dư đầu ngày. Tiền này phải nằm ngoài số ngân hàng chưa phân bổ đang theo dõi. Nếu đã nằm trong ngân hàng, nhập 0 rồi dùng Phân bổ / chuyển nguồn tiền để tránh tính trùng.</p><form><label>Ngày bắt đầu<input name="date" type="date" required value="${date}"></label><label>Tiết kiệm · ${currencyLabel()}<input name="amount" data-money inputmode="decimal" required value="0"></label><button class="account-submit">Xác nhận</button></form><p role="status"></p>`;
 document.body.append(d);d.showModal();let busy=false;d.querySelector('.dialog-close').onclick=()=>{if(!busy)d.close();};d.addEventListener('cancel',e=>{if(busy)e.preventDefault();});d.addEventListener('close',()=>d.remove());
 d.querySelector('form').onsubmit=async e=>{e.preventDefault();if(busy)return;try{if(!context.canEdit()||context.getUserId()!==user||JSON.stringify(context.getData())!==before)throw Error('Dữ liệu đã thay đổi. Đóng và mở lại để kiểm tra.');const next=structuredClone(context.getData()),f=e.target.elements;if(f.date.value>today())throw Error('Không thể cập nhật số dư cho ngày tương lai.');next.accounts=normalizeAccounts({...next.accounts,savings:f.amount.value,savingsOpenedOn:f.date.value});busy=true;d.querySelectorAll('button').forEach(x=>x.disabled=true);await context.commitConfirmed(next);d.close();}catch(error){d.querySelector('[role=status]').textContent=error.message;}finally{busy=false;d.querySelectorAll('button').forEach(x=>x.disabled=false);}};
}
