import { emptyData, normalizeData } from './model.js';

export const LOCAL_KEY = 'lich-cua-toi.v1';
export const hasData = data => Object.keys(data.days).length + Object.keys(data.incomes).length + Object.keys(data.savings).length + Object.keys(data.goals).length > 0;

export class SyncController {
  constructor(client, storage, { onData, onStatus }) {
    this.client = client; this.storage = storage; this.onData = onData; this.onStatus = onStatus;
    this.user = null; this.revision = 0; this.dirty = false; this.counter = 0; this.epoch = 0;
    this.status = 'local'; this.message = ''; this.data = emptyData();
  }
  get cacheKey() { return `lich-cloud:${new URL(this.client.url).hostname}:${this.user.id}`; }
  statusChanged(status, message = '') { this.status = status; this.message = message; this.onStatus(); }
  cache() { this.storage.setItem(this.cacheKey, JSON.stringify({ data: this.data, revision: this.revision, dirty: this.dirty })); }
  async open() {
    this.statusChanged('loading');
    let cacheLoaded = false;
    try {
      this.user = await this.client.user(); this.epoch++;
      const cached = this.storage.getItem(this.cacheKey);
      const draft = cached ? JSON.parse(cached) : null;
      this.data = draft ? normalizeData(draft.data) : emptyData();
      this.revision = draft?.revision || 0; this.dirty = Boolean(draft?.dirty); this.counter++;
      cacheLoaded = true;
      this.onData(this.data);
      await this.refresh();
    } catch (error) {
      if (!cacheLoaded) this.user = null;
      this.statusChanged('error', error.message);
    }
  }
  async refresh() {
    if (!this.user || this.inFlight) return;
    if (this.dirty) return this.flush();
    const epoch = this.epoch, counter = this.counter, readId = this.readId = (this.readId || 0) + 1;
    try {
      const row = await this.client.load(this.user.id);
      if (epoch !== this.epoch || counter !== this.counter || this.dirty || readId !== this.readId) return;
      const revision = row?.revision || 0;
      const changed = revision !== this.revision || this.status === 'loading';
      this.data = row ? normalizeData(row.data) : emptyData(); this.revision = revision;
      this.cache();
      if (changed) this.onData(this.data);
      this.statusChanged('ready');
    } catch (error) {
      if (epoch === this.epoch && counter === this.counter && readId === this.readId) this.statusChanged('error', error.message);
    }
  }
  save(data) {
    this.data = structuredClone(data); this.counter++;
    if (!this.user) { this.storage.setItem(LOCAL_KEY, JSON.stringify(data)); return; }
    this.dirty = true; this.cache();
    if (this.status === 'conflict') return;
    this.statusChanged('pending'); clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 900);
  }
  async flush() {
    clearTimeout(this.timer);
    if (!this.user || !this.dirty || this.status === 'conflict') return;
    if (this.inFlight) return this.inFlight;
    const epoch = this.epoch, counter = this.counter, snapshot = structuredClone(this.data);
    this.statusChanged('saving');
    this.inFlight = (async () => {
      try {
        const row = await this.client.save(snapshot, this.revision);
        if (epoch !== this.epoch) return;
        this.revision = row.revision; this.dirty = counter !== this.counter; this.cache();
        this.statusChanged(this.dirty ? 'pending' : 'ready');
      } catch (error) { if (epoch === this.epoch) this.statusChanged(error.code === '40001' ? 'conflict' : 'error', error.message); }
      finally { this.inFlight = null; }
      if (this.dirty && this.status === 'pending') this.timer = setTimeout(() => this.flush(), 200);
    })();
    return this.inFlight;
  }
  async useRemote() {
    if (this.inFlight) await this.inFlight;
    this.statusChanged('loading');
    try {
      const row = await this.client.load(this.user.id);
      this.data = row ? normalizeData(row.data) : emptyData(); this.revision = row?.revision || 0;
      this.dirty = false; this.counter++; this.cache(); this.onData(this.data); this.statusChanged('ready');
    } catch (error) { this.statusChanged('error', error.message); throw error; }
  }
  async logout() {
    clearTimeout(this.timer);
    if (this.inFlight) await this.inFlight;
    this.epoch++; this.user = null; this.dirty = false; this.revision = 0;
    // Switch immediately; a network logout must never leave another account's data on screen.
    this.localReadError = false;
    try { this.data = normalizeData(JSON.parse(this.storage.getItem(LOCAL_KEY) || JSON.stringify(emptyData()))); }
    catch { this.data = emptyData(); this.localReadError = true; }
    this.onData(this.data); this.statusChanged('local');
    await this.client.signOut();
  }
}
