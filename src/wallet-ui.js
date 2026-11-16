import {addMoney} from './money.js';
import {accountBalances} from './account-model.js';
import {separateWallets,walletSources,walletName} from './wallet-model.js';
import {formatAmount} from './model.js';
import {currencyLabel} from './preferences.js';
import {tokyoToday} from './finance-date.js';
import {downloadFile} from './export-ui.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=x=>x==null?'Chưa thiết lập':`${formatAmount(x)} ${currencyLabel()}`;
const balance=(b,key)=>key.startsWith('fund:')?b?.funds?.[key.slice(5)]:b?.[key];
export function walletsPanel(book,date=tokyoToday()){
 if(!separateWallets(book))return `<section class="card wallets-panel"><h2>Ngân hàng, tiết kiệm và quỹ riêng</h2><p>Tách tiền của các quỹ khỏi nguồn đang chứa để quản lý như các ví độc lập. Giữ nguyên lịch sử và tổng tiền; xem trước trước khi xác nhận.</p><button class="button secondary" data-wallet-action="enable">Tách quỹ thành ví riêng</button></section>`;
 const b=accountBalances(book,date);
 return `<section class="card wallets-panel"><div class="card-heading"><div><h2>Các nơi giữ tiền</h2><p>Tính đến ${date.split('-').reverse().join('/')}. Chuyển giữa các ví không tạo thu nhập hoặc chi tiêu.</p></div><button class="button save-button" data-wallet-action="transfer">Chuyển tiền giữa các ví</button></div><div class="wallet-grid">${walletSources(book).map(key=>`<article><h3 translate="no">${esc(walletName(book,key))}</h3><strong data-wallet-balance="${esc(key)}">${money(balance(b,key))}</strong><button class="text-button" data-wallet-action="transfer" data-wallet-from="${esc(key)}">Chuyển tiền</button></article>`).join('')}</div><div class="wallet-summary"><div><span>Tổng tiền đang giữ</span><strong data-wallet-total>${money(b?.walletTotal)}</strong></div><div><span>Ngân hàng + tiền mặt</span><strong>${money(b?addMoney(b.bank,b.cash):null)}</strong></div></div><div class="wallet-actions"><button class="button secondary" data-safety-action="fund">+ Tạo quỹ mục tiêu / dự phòng</button></div><details class="wallet-history"><summary>Lịch sử chuyển giữa các ví</summary>${(book.wallets.transfers||[]).slice().reverse().map(t=>`<article class="wallet-transfer-row"><span>${t.date} · <span translate="no">${esc(walletName(book,t.from))} → ${esc(walletName(book,t.to))}</span> · ${money(t.amount)}${t.voided?' · Đã hủy':''}<small translate="no">${esc(t.note)}</small></span>${t.voided?'':`<button class="text-button" data-wallet-action="edit" data-wallet-id="${esc(t.id)}">Sửa</button><button class="text-button danger" data-wallet-action="void" data-wallet-id="${esc(t.id)}">Hủy chuyển</button>`}</article>`).join('')||'<p class=wallet-history-empty>Chưa có giao dịch chuyển ví mới. Lịch sử quỹ và chuyển nguồn trước đây vẫn được giữ.</p>'}</details><p class="account-note">Các ví có thể cùng nằm trong một tài khoản ngân hàng thực tế. Khi đối chiếu tài khoản thực tế, cộng các ví thuộc tài khoản đó; không cộng lại số tiền đã tách.</p></section>`;
}
export function showWalletDialog(context,action,{id='',from='',to=''}={}){
 if(!context.canEdit())return;
 if(action==='enable'&&separateWallets(context.getData())||action!=='enable'&&!separateWallets(context.getData()))return;
 const book=context.getData(),actor=context.getUserId(),before=JSON.stringify(context.getDocument()),existing=book.wallets?.transfers.find(t=>t.id===id);
 if(['edit','void'].includes(action)&&(!existing||existing.voided))return;
 const d=document.createElement('dialog');d.id='wallet-dialog';d.className='account-dialog ledger-dialog';d.setAttribute('aria-labelledby','wallet-dialog-title');document.querySelector('#wallet-dialog')?.remove();
 let contents;
 if(action==='enable'){
  const visible=context.getFinanceData?.()||book,preview={...structuredClone(visible),wallets:{version:1,enabled:true,transfers:[]}},b=accountBalances(preview,tokyoToday()),old=accountBalances(visible,tokyoToday());
  contents=`<p>Quỹ cũ trở thành ví có số dư riêng. Tiền quỹ được tách khỏi ngân hàng, tiền mặt hoặc tiết kiệm đang chứa nó; không tạo thêm tiền và không sửa giao dịch cũ.</p><div class="wallet-preview">${walletSources(preview).map(key=>`<p><span translate="no">${esc(walletName(preview,key))}</span>: <strong>${money(balance(b,key))}</strong></p>`).join('')}<p>Tổng trước: <strong>${money(old?addMoney(old.bank,old.cash,old.savings||0):null)}</strong></p><p>Tổng sau: <strong>${money(b?.walletTotal)}</strong></p></div><p>Báo cáo dòng tiền ở chế độ này bao gồm mọi ví; chuyển giữa các ví không tính là thu nhập hoặc chi phí. Mục tiêu và lịch sử tiết kiệm tháng/năm giữ nguyên, không tự quy đổi tiền tệ.</p><button type="button" class="button secondary" data-wallet-backup>Sao lưu JSON trước khi tách</button><label class="module-option"><input type="checkbox" name="ack" required> Tôi đã kiểm tra các số dư trước và sau</label>`;
 }else if(action==='void')contents=`<p>Hủy lần chuyển này và đảo đúng hai ví. Lịch sử vẫn được giữ. Nếu tiền đã được sử dụng, cần xử lý giao dịch liên quan trước.</p><p translate="no">${esc(walletName(book,existing.from))} → ${esc(walletName(book,existing.to))} · ${money(existing.amount)}</p>`;
 else{
  const keys=walletSources(book,{includeArchived:!!existing}),select=(name,value)=>`<label>${name==='from'?'Lấy tiền từ':'Chuyển vào'}<select name="${name}">${keys.map(key=>`<option value="${esc(key)}" ${key===value?'selected':''}>${esc(walletName(book,key))}</option>`).join('')}</select></label>`;
  contents=`<label>Ngày chuyển<input type="date" name="date" required value="${existing?.date||tokyoToday()}" max="${tokyoToday()}"></label>${select('from',existing?.from||from||'bank')}${select('to',existing?.to||to||keys.find(k=>k!==(from||'bank'))||'cash')}<label>Số tiền · ${currencyLabel()}<input name="amount" data-money inputmode="decimal" required value="${existing?formatAmount(existing.amount):''}"></label><label>Ghi chú<input name="note" maxlength="500" value="${esc(existing?.note||'')}"></label><p>Giảm ví gửi và tăng ví nhận cùng số tiền. Không tự lấy thêm tiền từ ví khác nếu thiếu.</p>`;
 }
 d.innerHTML=`<button class="dialog-close" aria-label="Đóng">×</button><h2 id="wallet-dialog-title">${action==='enable'?'Tách quỹ thành ví riêng':action==='void'?'Hủy chuyển tiền':'Chuyển tiền giữa các ví'}</h2><form>${contents}<button class="account-submit">${action==='enable'?'Xác nhận dùng ví riêng':action==='void'?'Xác nhận hủy':'Lưu chuyển tiền'}</button><button type="button" class="button secondary" data-cancel>Hủy</button></form><p role="status" aria-live="polite"></p>`;
 document.body.append(d);d.showModal();let busy=false;const close=()=>{if(!busy)d.close();};d.querySelector('.dialog-close').onclick=close;d.querySelector('[data-cancel]').onclick=close;d.addEventListener('cancel',e=>{if(busy)e.preventDefault();});d.addEventListener('close',()=>d.remove());
 d.querySelector('[data-wallet-backup]')?.addEventListener('click',()=>{try{if(!context.canEdit()||context.getUserId()!==actor)throw Error('Tài khoản đã thay đổi.');downloadFile(JSON.stringify(context.getDocument(),null,2),'calendar-before-wallets.json','application/json');}catch(e){d.querySelector('[role=status]').textContent=e.message;}});
 d.querySelector('form').onsubmit=async e=>{e.preventDefault();if(busy)return;try{
  if(!d.open||!context.canEdit()||context.getUserId()!==actor||JSON.stringify(context.getDocument())!==before)throw Error('Dữ liệu, khu vực hoặc tài khoản đã thay đổi. Đóng và mở lại.');
  if(context.hasPending?.())throw Error('Hãy lưu bản nháp thành công trước khi chuyển tiền giữa các ví.');
  const next=structuredClone(book),f=e.target.elements;
  if(action==='enable'){if(!next.accounts)throw Error('Thiết lập số dư đầu kỳ trước khi tách ví.');next.wallets={version:1,enabled:true,transfers:[]};}
  else if(action==='void'){const row=next.wallets.transfers.find(t=>t.id===id);row.voided=true;row.voidedOn=tokyoToday();}
  else{
   const raw=f.amount.value.replaceAll(',','').trim();if(!/^\d+(?:\.\d{1,3})?$/.test(raw))throw Error('Số tiền không hợp lệ.');
   const row={id:existing?.id||crypto.randomUUID(),date:f.date.value,from:f.from.value,to:f.to.value,amount:Number(raw),note:f.note.value};next.wallets.transfers=next.wallets.transfers.filter(t=>t.id!==id).concat(row);
  }
  busy=true;d.querySelectorAll('button,input,select').forEach(e=>e.disabled=true);await context.commitConfirmed(next);d.close();
 }catch(error){d.querySelector('[role=status]').textContent=error.message;}finally{busy=false;d.querySelectorAll('button,input,select').forEach(e=>e.disabled=false);}};
}
