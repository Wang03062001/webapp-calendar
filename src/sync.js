import { emptyData, normalizeData } from './model.js';

export const LOCAL_KEY = 'lich-cua-toi.v1';
export const hasData = data => Object.keys(data.days).length + Object.keys(data.incomes).length + Object.keys(data.savings).length + Object.keys(data.goals).length + (data.debts?.length || 0) + (data.cards?.statements.length || 0) + (data.accounts ? 1 : 0) > 0;

export class SyncController {
  constructor(client, storage, { onData, onStatus }) {
    this.client = client; this.storage = storage; this.onData = onData; this.onStatus = onStatus;
    this.user = null; this.revision = 0; this.dirty = false; this.counter = 0; this.epoch = 0; this.queued = null;
    this.status = 'guest'; this.message = ''; this.data = emptyData();
  }
  get cacheKey() { return `lich-cloud:${new URL(this.client.url).hostname}:${this.user.id}`; }
  statusChanged(status, message = '') { this.status = status; this.message = message; this.onStatus(); }
  cache() { this.storage.setItem(this.cacheKey, JSON.stringify({ data: this.data, revision: this.revision, dirty: this.dirty, counter: this.counter, queued: this.queued })); }
  async open() {
    this.statusChanged('loading'); let cacheLoaded = false;
    try {
      this.user = await this.client.user(); this.epoch++;
      const cached = this.storage.getItem(this.cacheKey);
      let draft;
      try { draft = cached ? JSON.parse(cached) : null; }
      catch { throw new Error('Không đọc được bản nháp tài khoản. Dữ liệu gốc vẫn được giữ; hãy khôi phục từ bản sao lưu.'); }
      this.data = draft ? normalizeData(draft.data) : emptyData();
      this.revision = draft?.revision || 0; this.dirty = Boolean(draft?.dirty); this.counter = draft?.counter || 0;
      // Older dirty caches were already submitted by the former autosave workflow.
      this.queued = draft && Object.hasOwn(draft, 'queued') ? draft.queued : this.dirty ? { data: structuredClone(this.data), counter: this.counter } : null;
      if (this.queued) this.queued = { data: normalizeData(this.queued.data), counter: this.queued.counter };
      cacheLoaded = true; this.onData(this.data); await this.refresh();
    } catch (error) {
      if (!cacheLoaded) { this.user = null; this.data = emptyData(); this.dirty = false; this.queued = null; this.revision = 0; this.onData(this.data); }
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
      this.data = row ? normalizeData(row.data) : emptyData(); this.revision = revision; this.cache();
      if (changed) this.onData(this.data); this.statusChanged('ready');
    } catch (error) { if (epoch === this.epoch && counter === this.counter && readId === this.readId) this.statusChanged('error', error.message); }
  }
  save(data) {
    if (!this.user) throw new Error('Hãy đăng nhập trước khi nhập dữ liệu.');
    this.data = structuredClone(data); this.counter++; this.dirty = true; this.cache();
    if (!['conflict', 'error'].includes(this.status)) this.statusChanged(this.inFlight ? 'saving' : this.queued ? 'pending' : 'draft');
  }
  async commit() {
    if (!this.user) throw new Error('Hãy đăng nhập trước khi lưu dữ liệu.');
    if (!this.dirty) return;
    this.queued = { data: structuredClone(this.data), counter: this.counter }; this.cache();
    return this.flush();
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
        this.dirty = submission.counter !== this.counter; this.cache();
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
      this.dirty = false; this.queued = null; this.counter++; this.cache(); this.onData(this.data); this.statusChanged('ready');
    } catch (error) { this.statusChanged('error', error.message); throw error; }
  }
  async logout() {
    if (this.inFlight) await this.inFlight;
    this.epoch++; this.user = null; this.dirty = false; this.revision = 0; this.queued = null;
    this.data = emptyData(); this.onData(this.data); this.statusChanged('guest');
    await this.client.signOut();
  }
}
