import {tokyoToday} from './finance-date.js';
import {normalizeData,formatAmount,MAX_AMOUNT} from './model.js';
import {accountBalances,sourceOpening,setSourceOpening,reconcileMonth,monthEnd,balanceUpdateCount} from './account-model.js';
import {currencyLabel,currencyCode} from './preferences.js';
import {t} from './i18n.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>value==null?t('Chưa có số dư tại ngày này'):`${formatAmount(value)} ${currencyLabel()}`;
const dateLabel=value=>value.split('-').reverse().join('/');
const today=tokyoToday;

// Only bank/cash/savings sources change. The original credit baseline, linked
// rows and observed reconciliations remain intact in the full document.
export function showSourceOpening(context,date,timing='start') {
  if(!context.canEdit()||!context.getData().accounts)return;
  const before=JSON.stringify(context.getDocument()),actor=context.getUserId(),confirmedOn=today();
  const current=sourceOpening(context.getData().accounts);
  document.querySelector('#opening-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='opening-dialog';dialog.className='account-dialog ledger-dialog';
  dialog.setAttribute('aria-labelledby','opening-title');
  const sources=['bank','cash',...(current.savings!==undefined?['savings']:[])],labels={bank:'Ngân hàng chưa phân bổ',cash:'Tiền mặt',savings:'Tiết kiệm'};
  // A new date has no known actual balance: do not silently copy today's money
  // into the past. Editing the active opening may prefill its saved amounts.
  const editing=date===current.date&&timing===current.timing;
  dialog.innerHTML=`<button class="dialog-close" aria-label="Đóng">×</button><h2 id="opening-title">Số dư đầu kỳ / tiền tháng trước</h2><p>Nhập tiền thực có của từng nguồn tại mốc đã chọn. Tiền có sẵn không phải thu nhập mới và không cộng thêm vào số dư đang có.</p><p>Thay đổi mốc nguồn tiền dùng chung giới hạn 3 cập nhật thành công trong tháng; hủy hoặc lưu lỗi không tính lượt. Đối chiếu tháng đã theo dõi không tính lượt.</p><form><label>Ngày số dư<input name="date" type="date" required min="1900-01-01" max="${confirmedOn}" value="${date}"></label><label>Thời điểm số dư<select name="timing"><option value="start" ${timing==='start'?'selected':''}>Đầu ngày · trước mọi giao dịch</option><option value="end" ${timing==='end'?'selected':''}>Cuối tháng · sau mọi giao dịch</option></select></label>${sources.map(source=>`<label>${labels[source]} · ${currencyLabel()}<input name="${source}" data-money inputmode="decimal" required maxlength="32" value="${editing?formatAmount(current[source]):''}"></label>`).join('')}<label>Ghi chú<input name="note" maxlength="500" placeholder="Ví dụ: số dư thực tế cuối tháng trước"></label><p>Ngân hàng không gồm tiền đã ghi ở ô Tiết kiệm. Sau mốc này, các giao dịch đã lưu sẽ được cộng/trừ đúng nguồn. Dư nợ và hạn mức thẻ giữ nguyên mốc cũ.</p><button class="account-submit" type="submit">Xem trước số dư</button></form><div class="opening-preview" hidden aria-live="polite"></div><button type="button" class="button secondary opening-cancel" data-cancel-opening>Hủy</button><p role="status" aria-live="polite"></p>`;
  document.body.append(dialog);dialog.showModal();let busy=false,preview=null,isClosing=false;
  const status=dialog.querySelector('[role=status]'),form=dialog.querySelector('form'),panel=dialog.querySelector('.opening-preview');
  const check=()=>{
    if(!dialog.open||!context.canEdit()||context.getUserId()!==actor||JSON.stringify(context.getDocument())!==before)throw Error('Dữ liệu, khu vực hoặc tài khoản đã thay đổi. Đóng và mở lại để kiểm tra.');
    if(today()!==confirmedOn)throw Error('Ngày đã thay đổi. Đóng và mở lại để kiểm tra.');
  };
  const close=()=>{if(!busy)dialog.close();};dialog.querySelector('.dialog-close').onclick=close;dialog.querySelector('[data-cancel-opening]').onclick=close;dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});dialog.addEventListener('close',()=>dialog.remove());
  form.addEventListener('input',event=>{
    if(event.target.hasAttribute('data-money')){
      const value=event.target.value.trim();event.target.setCustomValidity(value&&!/^\d[\d,]*(?:\.\d{0,3})?$/.test(value)?t('Nhập số tiền dạng 1,000,000; có thể nhập tối đa 3 chữ số thập phân.'):Number(value.replace(/,/g,''))>MAX_AMOUNT?t('Số tiền vượt giới hạn cho phép.'):'');
    }
    preview=null;panel.hidden=true;
  });
  form.onsubmit=event=>{
    event.preventDefault();if(busy)return;
    try{
      check();if(!form.reportValidity())return;
      const fields=form.elements,next=structuredClone(context.getData());
      const row={id:crypto.randomUUID(),date:fields.date.value,timing:fields.timing.value,confirmedOn,bank:fields.bank.value,cash:fields.cash.value,...(fields.savings?{savings:fields.savings.value}:{}),note:fields.note.value};
      if(row.timing==='end'&&row.date!==monthEnd(row.date.slice(0,7)))throw Error('Số dư cuối tháng cần chọn ngày cuối cùng của tháng.');
      isClosing=row.timing==='end'&&Boolean(accountBalances(context.getFinanceData(),row.date));
      const record=isClosing?reconcileMonth(next,row.date,row,{id:row.id,today:confirmedOn,currency:currencyCode(),creditAllowed:context.hasCreditAccess()}):setSourceOpening(next,row,{today:confirmedOn});
      if(isClosing&&row.note){record.note+=' '+row.note;next.accounts.reconciliations.at(-1).note=record.note;next.days[row.date].note+=' '+row.note;if(next.days[row.date].note.length>20000)throw Error('Ghi chú ngày đã đầy. Hãy rút ngắn ghi chú trước khi xác nhận.');}
      preview=normalizeData(next);
      const reference=confirmedOn,old=accountBalances(context.getFinanceData(),reference),updated=accountBalances({...context.getFinanceData(),accounts:preview.accounts},reference);
      panel.innerHTML=`<h3>Xác nhận mốc nguồn tiền</h3><p>${dateLabel(row.date)} · ${row.timing==='end'?'Cuối tháng':'Đầu ngày'}. ${row.timing==='end'?'Tiền này chuyển sang tháng sau; giao dịch cùng ngày không bị trừ lại.':'Các giao dịch trong ngày này sẽ được cộng/trừ.'}</p><p>Số dư tính đến cuối ngày ${dateLabel(reference)}:</p><table><thead><tr><th>Nguồn tiền</th><th>Trước</th><th>Sau</th></tr></thead><tbody>${sources.map(source=>`<tr><th>${labels[source]}</th><td>${money(old?.[source])}</td><td>${money(updated?.[source])}</td></tr>`).join('')}</tbody></table><p>Tài sản chi tiêu: ${money(updated?updated.bank+updated.cash:null)}</p><p>Số liệu chi tiêu và thu nhập không thay đổi. Các mốc đối chiếu đã xác nhận sau ngày này vẫn được ưu tiên.</p><p translate="no">${esc(record.note)}</p><button class="account-submit" type="button" data-confirm-opening>Xác nhận lưu mốc số dư</button>`;
      panel.hidden=false;status.textContent='';panel.scrollIntoView({block:'start'});panel.querySelector('[data-confirm-opening]').onclick=async()=>{
        if(busy||!preview)return;
        try{
          check();if(!isClosing&&balanceUpdateCount(context.getData().accounts,confirmedOn.slice(0,7))>=3)throw Error('Đã dùng hết 3 lượt cập nhật số dư trong tháng.');
          busy=true;dialog.querySelectorAll('input,select,button').forEach(control=>control.disabled=true);
          await context.commitConfirmed(preview);dialog.close();
        }catch(error){status.textContent=t(error.message);}
        finally{busy=false;dialog.querySelectorAll('input,select,button').forEach(control=>control.disabled=false);}
      };
    }catch(error){preview=null;panel.hidden=true;status.textContent=t(error.message);}
  };
}
