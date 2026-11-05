import {DEFAULT_TRACKING_START,resetFinancialDocument} from './reset-model.js';
import {tokyoToday} from './finance-date.js';
import {downloadFile} from './export-ui.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function showResetDialog(context){
 if(!context.canEdit())return;
 const actor=context.getUserId(),documentData=context.getDocument(),snapshot=JSON.stringify(documentData);
 const counts=book=>Object.values(book?.days||{}).reduce((n,d)=>n+d.items.length,0),summary=`<p>Giao dịch sẽ xóa: sổ nước ngoài ${counts(documentData)} · sổ Việt Nam ${counts(documentData.regional?.vietnam)}. Bao gồm mọi năm đã lưu.</p>`;
 document.querySelector('#reset-dialog')?.remove();
 const dialog=document.createElement('dialog');dialog.id='reset-dialog';dialog.className='account-dialog reset-dialog';
 dialog.innerHTML=`<button class="dialog-close" aria-label="Đóng">×</button><h2>Bắt đầu theo dõi mới</h2><p>Tài khoản: <strong translate="no">${esc(context.getUserLabel())}</strong></p><p>Xóa toàn bộ dữ liệu tài chính và bản nháp của tài khoản này trong cả hai khu vực, gồm giao dịch, thu nhập, số dư, quỹ, khoản vay và dữ liệu PayPay / sao kê. Giữ tài khoản đăng nhập, tiền tệ và tùy chọn giao diện.</p>${summary}<button type="button" class="button secondary" data-reset-backup>Sao lưu JSON trước khi xóa</button><form><label>Ngày bắt đầu theo dõi<input name="start" type="date" min="1900-01-01" max="${tokyoToday()}" value="${DEFAULT_TRACKING_START}" required></label><p>Ngày bắt đầu: <strong data-reset-date>01/11/2026</strong></p><p>Sau khi xóa, nhập số dư ngân hàng, tiền mặt và tiết kiệm đầu ngày bắt đầu, trước các giao dịch. Tài sản chi tiêu = ngân hàng + tiền mặt; tiết kiệm theo dõi riêng. Nếu chưa nhập, số dư hiển thị Chưa thiết lập.</p><label>Nhập RESET để xác nhận xóa cả hai khu vực<input name="confirmation" autocomplete="off" pattern="RESET" required></label><button class="account-submit danger">Xóa dữ liệu và bắt đầu lại</button><button type="button" class="button secondary" data-cancel>Hủy</button></form><p role="status" aria-live="polite"></p>`;
 document.body.append(dialog);dialog.showModal();let busy=false;
 dialog.querySelector('[name=start]').onchange=e=>dialog.querySelector('[data-reset-date]').textContent=e.target.value?e.target.value.split('-').reverse().join('/'):'—';
 const check=()=>{if(!dialog.open||!context.canEdit()||context.getUserId()!==actor||JSON.stringify(context.getDocument())!==snapshot)throw Error('Dữ liệu, khu vực hoặc tài khoản đã thay đổi. Đóng và mở lại để kiểm tra.');};
 const close=()=>{if(!busy)dialog.close();};dialog.querySelector('.dialog-close').onclick=close;dialog.querySelector('[data-cancel]').onclick=close;dialog.addEventListener('close',()=>dialog.remove());dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 dialog.querySelector('[data-reset-backup]').onclick=()=>{try{check();downloadFile(JSON.stringify(context.getDocument(),null,2),'sao-luu-truoc-reset-'+tokyoToday()+'.json','application/json');}catch(error){dialog.querySelector('[role=status]').textContent=error.message;}};
 dialog.querySelector('form').onsubmit=async e=>{
  e.preventDefault();if(busy)return;
  try{
   check();if(!e.target.reportValidity()||e.target.elements.confirmation.value!=='RESET')return;
   const start=e.target.elements.start.value,next=resetFinancialDocument(context.getDocument(),start);
   busy=true;dialog.querySelectorAll('input,button').forEach(n=>n.disabled=true);
   await context.verifyCreditAccess();check();
   await context.resetDocument(next,start);dialog.close();
  }catch(error){dialog.querySelector('[role=status]').textContent=error.message;}
  finally{busy=false;dialog.querySelectorAll('input,button').forEach(n=>n.disabled=false);}
 };
}
