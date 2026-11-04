import {excelReport} from './excel-report.js';
import {t} from './i18n.js';
export function downloadFile(bytes,name,type){
  const url=URL.createObjectURL(new Blob([bytes],{type}));
  const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export function showExportDialog(context,asOf){
  if(!context.canEdit())return;
  document.querySelector('#export-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='export-dialog';dialog.className='account-dialog';dialog.setAttribute('aria-labelledby','export-title');
  dialog.innerHTML='<button class="dialog-close" aria-label="Đóng">×</button><h2 id="export-title">Xuất dữ liệu Excel</h2><p>File .xlsx gồm tổng hợp tháng và các trang giao dịch, thu nhập, số dư, quỹ, khoản vay và lịch sử. Xuất tất cả các năm và khu vực có dữ liệu, ghi riêng tiền tệ.</p><p>Dữ liệu thẻ chỉ có khi quyền admin được máy chủ xác minh lúc xuất. Báo cáo dòng tiền chỉ dùng dữ liệu đã được máy chủ xác nhận. Bản nháp chưa lưu được giữ riêng trong sao lưu JSON.</p><button class="account-submit" data-download-excel>Tải Excel (.xlsx)</button><details class="export-backup"><summary>Sao lưu và khôi phục</summary><p>Excel dùng để xem và tính toán. Để khôi phục đầy đủ vào ứng dụng, giữ bản sao lưu JSON gồm toàn bộ dữ liệu của tài khoản.</p><button type="button" class="button secondary" data-download-json>Sao lưu JSON</button></details><p role="status" aria-live="polite"></p>';
  document.body.append(dialog);dialog.showModal();let busy=false;
  const check=()=>{if(!dialog.open||!context.canEdit())throw Error('Khu vực hoặc tài khoản đã thay đổi.');};
  dialog.querySelector('.dialog-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
  async function download(json=false){
    if(busy)return;const status=dialog.querySelector('[role=status]');
    try{
      check();busy=true;dialog.querySelectorAll('button:not(.dialog-close)').forEach(button=>button.disabled=true);status.textContent=t('Đang tạo file…');
      await context.waitForEdits();check();
      const allowed=json?false:await context.verifyCreditAccess();check();
      const snapshot=structuredClone(json?context.getDocument():(context.getConfirmedDocument?.()||context.getDocument()));
      const bytes=json?JSON.stringify(snapshot,null,2):excelReport(snapshot,{asOf,creditAllowed:allowed,draft:context.isDirty()});
      check();downloadFile(bytes,`lich-cua-toi-${asOf}.${json?'json':'xlsx'}`,json?'application/json':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      dialog.close();
    }catch(error){status.textContent=t(error.message);}
    finally{busy=false;dialog.querySelectorAll('button').forEach(button=>button.disabled=false);}
  }
  dialog.querySelector('[data-download-excel]').onclick=()=>void download();
  dialog.querySelector('[data-download-json]').onclick=()=>void download(true);
}
