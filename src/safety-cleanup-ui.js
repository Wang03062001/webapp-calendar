import {cleanupSafety,safetyCleanupPreview} from './safety-cleanup.js';
import {tokyoToday} from './finance-date.js';
import {downloadFile} from './export-ui.js';
import {creditSnapshot,isCreditItem} from './credit-access.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const actions={resetSafety:'reset',removeFund:'fund',removeObligation:'obligation',removePlanned:'planned',removeDebtTerms:'debtTerms'};
export function showSafetyCleanupDialog(context,action,id){
 if(!context.canEdit()||!actions[action])return;
 const actor=context.getUserId(),data=context.getData(),documentSnapshot=JSON.stringify(context.getDocument()),counts=safetyCleanupPreview(data);
 const fund=data.safety?.funds.find(f=>f.id===id),obligation=data.safety?.obligations.find(o=>o.id===id);
 const item=obligation?data.days[obligation.date]?.items.find(i=>i.id===obligation.expenseId):null;
 let title='',label='',description='',planned=0;
 if(action==='resetSafety'){
  title='Đặt lại Nền tảng an toàn';planned=counts.planned;
  description='<p>Đặt lại quỹ, ngân sách mọi tháng, lịch theo dõi, dự phòng và kế hoạch trả nợ thông thường của khu vực này.</p><p>Giữ nguyên số dư ngân hàng, tiền mặt, tiết kiệm, khoản đã chi, thu nhập, khoản vay, ghi chú và khu vực còn lại. Dữ liệu tín dụng cũ được giữ nguyên.</p>';
 }else if(action==='removeFund'){
  if(!fund)return;title='Xóa quỹ';label=fund.name;
  description='<p>Xóa phần tiền dành riêng và bỏ liên kết quỹ. Giữ nguyên số dư thực, các khoản chi và ghi chú; không tạo giao dịch chuyển tiền.</p>';
 }else if(action==='removeObligation'){
  if(!item)return;title='Xóa lịch phải trả';label=item.title;planned=item.status==='planned'?1:0;
  description='<p>Bỏ lịch theo dõi và liên kết. Khoản đã chi vẫn giữ nguyên ngày, số tiền và nguồn tiền.</p>';
 }else if(action==='removePlanned'){
  const [date,itemId]=JSON.parse(id),row=data.days[date]?.items.find(i=>i.id===itemId);if(!row||row.obligationId||row.status!=='planned')return;
  title='Xóa khoản dự kiến';label=row.title;
  description='<p>Xóa khoản chưa chi khỏi lịch và dự báo. Giữ nguyên ghi chú trong ngày và mọi khoản đã chi.</p>';
 }else{
  const debt=data.debts.find(d=>d.id===id);if(!debt||debt.type==='Thẻ tín dụng'||!data.safety?.debtTerms.some(t=>t.debtId===id))return;
  title='Xóa điều kiện trả nợ';label=debt.title;
  description='<p>Chỉ xóa giả thiết lãi suất và mức tối thiểu. Giữ nguyên khoản vay, hạn trả gốc và lịch sử thanh toán.</p>';
 }
 document.querySelector('#safety-dialog')?.remove();
 const dialog=document.createElement('dialog');dialog.id='safety-dialog';dialog.className='account-dialog ledger-dialog safety-cleanup-dialog';
 if(Object.entries(data.days).some(([date,day])=>day.items.some(row=>isCreditItem(row)&&(action==='resetSafety'&&(row.fundId||row.obligationId)||action==='removeFund'&&row.fundId===id||action==='removeObligation'&&row.obligationId===id||action==='removePlanned'&&id===JSON.stringify([date,row.id])))))dialog.dataset.creditGuard='true';
 dialog.innerHTML=`<button class="dialog-close" aria-label="Đóng">×</button><h2>${title}</h2><p><span>Tài khoản:</span> <strong translate="no">${esc(context.getUserLabel())}</strong> · <span>Khu vực:</span> <strong>${esc(context.getRegionLabel())}</strong></p>${label?`<p translate="no"><strong>${esc(label)}</strong></p>`:''}${description}${action==='resetSafety'?`<dl class="cleanup-counts"><div><dt>Quỹ</dt><dd>${counts.funds}</dd></div><div><dt>Ngân sách</dt><dd>${counts.budgets}</dd></div><div><dt>Lịch chưa chi</dt><dd>${counts.planned}</dd></div><div><dt>Lịch giữ khoản đã chi</dt><dd>${counts.retained}</dd></div><div><dt>Điều kiện trả nợ</dt><dd>${counts.debtTerms}</dd></div></dl>`:''}<p>Lưu bản ghi gốc vào Lịch sử xóa để đối chiếu. Chỉ áp dụng sau khi máy chủ xác nhận.</p><button type="button" class="button secondary" data-safety-backup>Sao lưu JSON trước khi xóa</button><form>${planned?'<label class="cleanup-option"><input type="checkbox" name="removePlanned" checked>Xóa cả khoản dự kiến chưa chi liên kết khỏi lịch</label><p>Nếu bỏ chọn, khoản dự kiến còn trong lịch và vẫn được tính vào dự báo.</p>':''}${action==='resetSafety'?'<p>Các khoản dự kiến khác trong lịch và khoản vay vẫn được dự báo từ sổ gốc.</p><label>Nhập RESET để xác nhận đặt lại khu vực này<input name="confirmation" autocomplete="off" pattern="RESET" required></label>':''}<button class="account-submit danger">${action==='resetSafety'?'Đặt lại khu vực này':'Xác nhận xóa'}</button><button type="button" class="button secondary" data-cancel>Hủy</button></form><p role="status" aria-live="polite"></p>`;
 document.body.append(dialog);dialog.showModal();let busy=false;
 const check=()=>{if(!dialog.open||!context.canEdit()||context.getUserId()!==actor||JSON.stringify(context.getDocument())!==documentSnapshot)throw Error('Dữ liệu, khu vực hoặc tài khoản đã thay đổi. Đóng và mở lại để kiểm tra.');};
 const close=()=>{if(!busy)dialog.close();};dialog.querySelector('.dialog-close').onclick=close;dialog.querySelector('[data-cancel]').onclick=close;
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});dialog.addEventListener('close',()=>dialog.remove());
 dialog.querySelector('[data-safety-backup]').onclick=()=>{try{check();downloadFile(JSON.stringify(context.getDocument(),null,2),'sao-luu-truoc-xoa-ke-hoach-'+tokyoToday()+'.json','application/json');}catch(error){dialog.querySelector('[role=status]').textContent=error.message;}};
 dialog.querySelector('form').onsubmit=async e=>{
  e.preventDefault();if(busy)return;
  try{
   check();const fields=e.target.elements;
   if(!e.target.reportValidity()||action==='resetSafety'&&fields.confirmation.value!=='RESET')return;
   const next=cleanupSafety(context.getData(),{action:actions[action],id,date:tokyoToday(),removePlanned:fields.removePlanned?.checked??true});
   busy=true;dialog.querySelectorAll('input,button').forEach(n=>n.disabled=true);
   if(creditSnapshot(next)!==creditSnapshot(data)){
    if(!await context.verifyCreditAccess())throw Error('Chức năng Thẻ & sao kê chỉ dành cho admin.');
    check();
   }
   await context.commitConfirmed(next);dialog.close();
  }catch(error){dialog.querySelector('[role=status]').textContent=error.message;}
  finally{busy=false;dialog.querySelectorAll('input,button').forEach(n=>n.disabled=false);}
 };
}
