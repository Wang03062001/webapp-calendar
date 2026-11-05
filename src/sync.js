import { emptyData, normalizeData } from './model.js';
import { confirmedExpenses } from './expense-model.js';

export const LOCAL_KEY = 'lich-cua-toi.v1';
export const hasData = data => (data.trackingStart?1:0) + Object.keys(data.days).length + Object.keys(data.incomes).length + Object.keys(data.savings).length + Object.keys(data.goals).length + (data.debts?.length || 0) + (data.cards?.statements.length || 0) + (data.cards?.availableCreditHistory?.length || 0) + (data.cards?.riboBalanceHistory?.length || 0) + (data.cards?.trackingMonths?.length || 0) + (data.accounts ? 1 : 0) + (data.receipts?.length||0) + (data.receivables?.length||0) + (data.safety?1:0) + (data.regional?.vietnam&&hasData(data.regional.vietnam)?1:0) > 0;

export class SyncController {
  constructor(client, storage, { onData, onStatus, onConfirmed = () => {} }) {
    this.client = client; this.storage = storage; this.onData = onData; this.onStatus = onStatus; this.onConfirmed = onConfirmed; this.confirmedData = null; this.confirmedAt=null; this.confirmedExpenses = null; this.expenseInputs = {};
    this.user = null; this.revision = 0; this.dirty = false; this.counter = 0; this.epoch = 0; this.queued = null;
    this.status = 'guest'; this.message = ''; this.data = emptyData();
  }
  get cacheKey() { return `lich-cloud:${new URL(this.client.url).hostname}:${this.user.id}`; }
  statusChanged(status, message = '') { this.status = status; this.message = message; this.onStatus(); }
  cache() {
    const row={data:this.data,revision:this.revision,dirty:this.dirty,counter:this.counter,queued:this.queued,confirmedData:this.dirty?this.confirmedData:null,confirmedAt:this.confirmedAt,confirmedExpenses:this.confirmedExpenses,expenseInputs:this.expenseInputs};
    try{this.storage.setItem(this.cacheKey,JSON.stringify(row));}
    catch(error){if(!row.confirmedData)throw error;this.storage.setItem(this.cacheKey,JSON.stringify({...row,confirmedData:null}));}
  }
  async open() {
    this.statusChanged('loading'); let cacheLoaded = false;
    try {
      this.user = await this.client.user(); this.epoch++;
      const cached = this.storage.getItem(this.cacheKey);
      let draft;
      try { draft = cached ? JSON.parse(cached) : null; }
      catch { throw new Error('Không đọc được bản nháp tài khoản. Dữ liệu gốc vẫn được giữ; hãy khôi phục từ bản sao lưu.'); }
      this.data = draft ? normalizeData(draft.data) : emptyData();
      this.expenseInputs = draft?.expenseInputs || {};this.confirmedAt=draft?.confirmedAt||null;
      this.confirmedData = draft?.confirmedData ? normalizeData(draft.confirmedData) : !draft?.dirty ? structuredClone(this.data) : null;
      this.confirmedExpenses = draft?.confirmedExpenses ?? (!draft?.dirty ? confirmedExpenses(this.data) : null);
      this.revision = draft?.revision || 0; this.dirty = Boolean(draft?.dirty); this.counter = draft?.counter || 0;
      // Older dirty caches were already submitted by the former autosave workflow.
      this.queued = draft && Object.hasOwn(draft, 'queued') ? draft.queued : this.dirty ? { data: structuredClone(this.data), counter: this.counter } : null;
      if (this.queued) this.queued = { data: normalizeData(this.queued.data), counter: this.queued.counter };
      cacheLoaded = true; this.onData(this.data);
      // Migrate old dirty caches from a server read without changing their draft
      // or revision. A failed read leaves all unacknowledged entries intact.
      if (this.dirty && (!this.confirmedExpenses || !this.confirmedData)) {
        const epoch = this.epoch;
        const row = await this.client.load(this.user.id);
        if (epoch !== this.epoch) return;
        this.confirmedData = row ? normalizeData(row.data) : emptyData(); this.confirmedAt=new Date().toISOString();this.confirmedExpenses = confirmedExpenses(this.confirmedData);
        this.cache(); this.onConfirmed();
      }
      await this.refresh();
    } catch (error) {
      if (!cacheLoaded) { this.user = null; this.confirmedData = null; this.confirmedAt=null; this.confirmedExpenses = null; this.expenseInputs = {}; this.data = emptyData(); this.dirty = false; this.queued = null; this.revision = 0; this.onData(this.data); }
      this.statusChanged('error', error.message);
    }
  }
  async refresh() {
    if (!this.user || this.inFlight) return;
    if (this.dirty) {
      if (this.queued) return this.flush();
      if (this.status !== 'conflict') this.statusChanged('draft');
      return;
    }
    const epoch = this.epoch, counter = this.counter, readId = this.readId = (this.readId || 0) + 1;
    try {
      const row = await this.client.load(this.user.id);
      if (epoch !== this.epoch || counter !== this.counter || this.dirty || readId !== this.readId) return;
      const revision = row?.revision || 0, changed = revision !== this.revision || this.status === 'loading';
      this.data = row ? normalizeData(row.data) : emptyData(); this.revision = revision; this.confirmedData = structuredClone(this.data);this.confirmedAt=new Date().toISOString(); this.confirmedExpenses = confirmedExpenses(this.data); this.cache();
      if (changed) this.onData(this.data); this.statusChanged('ready');
    } catch (error) { if (epoch === this.epoch && counter === this.counter && readId === this.readId) this.statusChanged('error', error.message); }
  }
  save(data) {
    if(this.resetting)throw Error('Đang đặt lại dữ liệu. Vui lòng chờ.');
    if (!this.user) throw new Error('Hãy đăng nhập trước khi nhập dữ liệu.');
    this.data = structuredClone(data); this.counter++; this.dirty = true; this.cache();
    if (!['conflict', 'error'].includes(this.status)) this.statusChanged(this.inFlight ? 'saving' : this.queued ? 'pending' : 'draft');
  }
  async commit() {
    if(this.resetting)throw Error('Đang đặt lại dữ liệu. Vui lòng chờ.');
    if (!this.user) throw new Error('Hãy đăng nhập trước khi lưu dữ liệu.');
    if (!this.dirty) return;
    this.queued = { data: structuredClone(this.data), counter: this.counter }; this.cache();
    return this.flush();
  }
  // Explicit financial edits become visible/countable only after the
  // optimistic server write succeeds. Failed attempts never enter the cache.
  async commitConfirmed(next) {
    if(this.resetting)throw Error('Đang đặt lại dữ liệu. Vui lòng chờ.');
    if (!this.user) throw new Error('Hãy đăng nhập trước khi lưu dữ liệu.');
    const epoch = this.epoch, counter = this.counter;
    const snapshot = normalizeData(structuredClone(next)), before = JSON.stringify(this.data);
    // A failed confirmation has no queued draft: re-read before retrying so a
    // lost response or another device cannot be overwritten.
    if (!this.dirty && this.status === 'error') await this.refresh();
    if (JSON.stringify(this.data) !== before) throw new Error('Dữ liệu đã thay đổi. Đóng và mở lại để kiểm tra.');
    await this.commit();
    if (epoch !== this.epoch || counter !== this.counter || this.dirty || this.status !== 'ready') throw new Error('Chưa lưu được thay đổi. Kiểm tra đồng bộ và thử lại.');
    this.statusChanged('saving');
    this.inFlight = (async () => {
      try {
        const row = await this.client.save(snapshot, this.revision);
        if (epoch !== this.epoch) throw new Error('Phiên đăng nhập đã thay đổi.');
        this.revision = row.revision;
        this.data = snapshot; this.confirmedData = structuredClone(snapshot);this.confirmedAt=new Date().toISOString(); this.confirmedExpenses = confirmedExpenses(snapshot); this.counter++; this.dirty = false; this.queued = null;
        this.cache(); this.onData(this.data); this.statusChanged('ready');
      } catch (error) {
        if (epoch === this.epoch) this.statusChanged(error.code === '40001' ? 'conflict' : 'error', error.message);
        throw error;
      } finally { this.inFlight = null; }
    })();
    return this.inFlight;
  }
  async resetConfirmed(next){
    if(!this.user||this.inFlight||this.resetting||this.status==='conflict')throw Error('Chưa thể đặt lại dữ liệu. Kiểm tra đồng bộ và thử lại.');
    const snapshot=normalizeData(structuredClone(next)),epoch=this.epoch,actor=this.user.id,revision=this.revision;
    this.resetting=true;this.readId=(this.readId||0)+1;this.statusChanged('saving');
    this.inFlight=(async()=>{
      try{
        const verified=await this.client.user();
        if(verified.id!==actor||epoch!==this.epoch)throw Error('Phiên đăng nhập đã thay đổi.');
        const row=await this.client.save(snapshot,revision);
        if(epoch!==this.epoch)throw Error('Phiên đăng nhập đã thay đổi.');
        this.revision=row.revision;this.data=snapshot;this.confirmedData=structuredClone(snapshot);this.confirmedAt=new Date().toISOString();this.confirmedExpenses=confirmedExpenses(snapshot);
        this.expenseInputs={};this.queued=null;this.dirty=false;this.counter++;this.resetting=false;
        // Only remove this account's old cache, and only after the server ACK.
        try{this.cache();}catch{this.storage.removeItem(this.cacheKey);}
        this.onData(this.data);this.statusChanged('ready');
      }catch(error){if(epoch===this.epoch){this.resetting=false;this.statusChanged(error.code==='40001'?'conflict':'error',error.message);}throw error;}
      finally{this.resetting=false;this.inFlight=null;}
    })();
    return this.inFlight;
  }
  async flush() {
    if (!this.user || !this.queued || this.status === 'conflict') return;
    if (this.inFlight) return this.inFlight;
    const epoch = this.epoch, submission = this.queued;
    this.statusChanged('saving');
    this.inFlight = (async () => {
      try {
        const row = await this.client.save(submission.data, this.revision);
        if (epoch !== this.epoch) return;
        this.revision = row.revision;
        if (this.queued?.counter <= submission.counter) this.queued = null;
        this.dirty = submission.counter !== this.counter;
        this.confirmedData = structuredClone(submission.data);this.confirmedAt=new Date().toISOString(); this.confirmedExpenses = confirmedExpenses(submission.data); this.cache(); this.onConfirmed();
        this.statusChanged(this.dirty ? this.queued ? 'pending' : 'draft' : 'ready');
      } catch (error) { if (epoch === this.epoch) this.statusChanged(error.code === '40001' ? 'conflict' : 'error', error.message); }
      finally { this.inFlight = null; }
      if (this.queued && this.status === 'pending') return this.flush();
    })();
    return this.inFlight;
  }
  async useRemote() {
    if (this.inFlight) await this.inFlight;
    this.statusChanged('loading');
    try {
      const row = await this.client.load(this.user.id);
      this.data = row ? normalizeData(row.data) : emptyData(); this.revision = row?.revision || 0;
      this.dirty = false; this.queued = null; this.counter++; this.expenseInputs = {}; this.confirmedData = structuredClone(this.data);this.confirmedAt=new Date().toISOString(); this.confirmedExpenses = confirmedExpenses(this.data); this.cache(); this.onData(this.data); this.statusChanged('ready');
    } catch (error) { this.statusChanged('error', error.message); throw error; }
  }
  async logout() {
    if (this.inFlight) await this.inFlight;
    this.epoch++; this.confirmedData = null; this.confirmedAt=null; this.confirmedExpenses = null; this.expenseInputs = {}; this.user = null; this.dirty = false; this.revision = 0; this.queued = null;
    this.data = emptyData(); this.onData(this.data); this.statusChanged('guest');
    await this.client.signOut();
  }
}
