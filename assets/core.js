/* Rendiconti social — funzioni condivise tra admin e pagina cliente.
   Cifratura (AES-256-GCM via WebCrypto), contabilità, Instagram, GitHub. */
(function () {
  'use strict';
  const RS = (window.RS = {});
  const te = new TextEncoder();
  const td = new TextDecoder();

  /* ---------- base64 ---------- */
  RS.b64 = {
    enc(buf) {
      const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
      let s = '';
      for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      return btoa(s);
    },
    dec(str) {
      const s = atob(str);
      const b = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
      return b;
    },
    url(buf) {
      return RS.b64.enc(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    unurl(s) {
      s = s.replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      return RS.b64.dec(s);
    }
  };

  RS.rand = (n) => crypto.getRandomValues(new Uint8Array(n));
  // Gli id diventano anche nomi di file (data/m/<id>.enc): mai iniziare con "_" o "-",
  // che GitHub Pages (Jekyll) potrebbe ignorare.
  RS.uid = () => {
    let s;
    do s = RS.b64.url(RS.rand(9));
    while (!/^[A-Za-z0-9]/.test(s));
    return s;
  };

  /* ---------- cifratura ---------- */
  const KDF_ITER = 310000;
  RS.crypto = {
    KDF_ITER,
    newSalt() {
      return RS.b64.enc(RS.rand(16));
    },
    async fromPassword(pw, saltB64, iter) {
      const base = await crypto.subtle.importKey('raw', te.encode(pw), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: RS.b64.dec(saltB64), iterations: iter || KDF_ITER, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    },
    newKeyString() {
      return RS.b64.url(RS.rand(32));
    },
    fromKeyString(s) {
      return crypto.subtle.importKey('raw', RS.b64.unurl(s), 'AES-GCM', false, ['encrypt', 'decrypt']);
    },
    async encBytes(key, bytes) {
      const iv = RS.rand(12);
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
      const out = new Uint8Array(12 + ct.length);
      out.set(iv);
      out.set(ct, 12);
      return out;
    },
    async decBytes(key, data) {
      const b = data instanceof Uint8Array ? data : new Uint8Array(data);
      return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.subarray(0, 12) }, key, b.subarray(12)));
    },
    async encJSON(key, obj, meta) {
      const ct = await RS.crypto.encBytes(key, te.encode(JSON.stringify(obj)));
      return JSON.stringify(Object.assign({ v: 1 }, meta || {}, { data: RS.b64.enc(ct) }));
    },
    async decJSON(key, text) {
      const o = typeof text === 'string' ? JSON.parse(text) : text;
      return JSON.parse(td.decode(await RS.crypto.decBytes(key, RS.b64.dec(o.data))));
    },

    /* File cliente (v2): i dati sono cifrati con la chiave contenuti del cliente;
       quella chiave è a sua volta cifrata con una chiave derivata da segreto del link + PIN.
       Senza entrambi il file resta illeggibile. Cambiare PIN non richiede di ricifrare le immagini. */
    PIN_ITER: 400000,
    async sealClient(contentKeyStr, linkSecret, pin, obj, theme) {
      const salt = RS.crypto.newSalt();
      const iter = RS.crypto.PIN_ITER;
      const kek = await RS.crypto.fromPassword(linkSecret + '|' + pin, salt, iter);
      const wk = await RS.crypto.encBytes(kek, RS.b64.unurl(contentKeyStr));
      const ct = await RS.crypto.encBytes(await RS.crypto.fromKeyString(contentKeyStr), te.encode(JSON.stringify(obj)));
      return JSON.stringify({ v: 2, kdf: { salt, iter }, theme: theme || null, wk: RS.b64.enc(wk), data: RS.b64.enc(ct) });
    },
    /* Lancia un errore se link o PIN non corrispondono. */
    async openClient(text, linkSecret, pin) {
      const o = typeof text === 'string' ? JSON.parse(text) : text;
      const kek = await RS.crypto.fromPassword(linkSecret + '|' + pin, o.kdf.salt, o.kdf.iter);
      const raw = await RS.crypto.decBytes(kek, RS.b64.dec(o.wk));
      const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
      return { key, data: await RS.crypto.decJSON(key, o) };
    }
  };

  RS.genPin = () => {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
    return String(n).padStart(6, '0');
  };
  RS.validPin = (p) => /^\d{4,8}$/.test(String(p || ''));

  /* ---------- formattazione ---------- */
  const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
  RS.money = (cents) => eur.format((cents || 0) / 100);
  RS.parseMoney = (s) => {
    s = String(s == null ? '' : s).trim().replace(/[€\s]/g, '');
    if (!s) return NaN;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return isFinite(n) ? Math.round(n * 100) : NaN;
  };
  RS.centsToInput = (c) => (c ? (c / 100).toFixed(2).replace('.', ',') : '');
  RS.fmtDate = (d, opts) =>
    d ? new Date(d + 'T12:00:00').toLocaleDateString('it-IT', opts || { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  RS.today = () => {
    const d = new Date();
    return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  RS.esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  RS.slugify = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'cliente';

  /* ---------- Instagram ---------- */
  RS.igParse = (url) => {
    const m = String(url || '').match(/instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
    if (!m) return null;
    const kind = m[1] === 'reels' ? 'reel' : m[1] === 'tv' ? 'p' : m[1];
    return { kind, code: m[2] };
  };
  RS.igEmbed = (url, captioned) => {
    const p = RS.igParse(url);
    return p ? `https://www.instagram.com/${p.kind}/${p.code}/embed/${captioned ? 'captioned/' : ''}` : null;
  };
  RS.igLink = (url) => {
    const p = RS.igParse(url);
    return p ? `https://www.instagram.com/${p.kind}/${p.code}/` : url;
  };

  /* ---------- contabilità ----------
     I pagamenti coprono i lavori in ordine cronologico (dal più vecchio):
     così ogni lavoro risulta Saldato, Parziale o Da saldare. */
  RS.STATE_LABEL = { saldato: 'Saldato', parziale: 'Parziale', da_saldare: 'Da saldare' };
  RS.TYPE_LABEL = { published: 'Pubblicato', draft: 'Bozza' };
  RS.ledger = (client) => {
    const works = (client.works || [])
      .slice()
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.created || 0) - (b.created || 0));
    const payments = (client.payments || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const total = works.reduce((s, w) => s + (w.price || 0), 0);
    const paid = payments.reduce((s, p) => s + (p.amount || 0), 0);
    let pool = paid;
    const status = {};
    for (const w of works) {
      const price = w.price || 0;
      const covered = Math.max(0, Math.min(price, pool));
      pool -= covered;
      status[w.id] = { covered, state: covered >= price ? 'saldato' : covered > 0 ? 'parziale' : 'da_saldare' };
    }
    return {
      works,
      payments,
      total,
      paid,
      due: Math.max(0, total - paid),
      credit: Math.max(0, paid - total),
      status,
      lastPayment: payments.length ? payments[payments.length - 1] : null,
      published: works.filter((w) => w.type === 'published').length,
      drafts: works.filter((w) => w.type === 'draft').length
    };
  };

  /* ---------- tema per cliente ---------- */
  RS.DEFAULT_THEME = { primary: '#058DD3', accent: '#61ADDF', paper: '#EFEFEF', bg: '#F3F5F9', ink: '#0B2A3F' };
  RS.THEME_KEYS = ['primary', 'accent', 'paper', 'bg', 'ink'];
  RS.applyTheme = (el, t) => {
    t = Object.assign({}, RS.DEFAULT_THEME, t || {});
    for (const k of RS.THEME_KEYS) el.style.setProperty('--' + k, t[k]);
  };

  /* Dati che il cliente può vedere: niente note interne. */
  RS.clientView = (db, c) => ({
    v: 1,
    owner: { name: (db.owner && db.owner.name) || '' },
    client: { name: c.name, handle: c.handle || '', theme: c.theme || RS.DEFAULT_THEME },
    works: (c.works || []).map((w) => ({
      id: w.id,
      type: w.type,
      url: w.url || '',
      title: w.title || '',
      caption: w.caption || '',
      date: w.date || '',
      price: w.price || 0,
      media: w.media || [],
      created: w.created || 0
    })),
    payments: (c.payments || []).map((p) => ({
      id: p.id,
      date: p.date,
      amount: p.amount,
      method: p.method || '',
      note: p.note || ''
    })),
    updatedAt: new Date().toISOString()
  });

  /* ---------- GitHub (solo admin) ---------- */
  // In anteprima locale (tools/preview-server.pl) l'API GitHub è simulata dal server stesso.
  const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  RS.LOCAL = LOCAL;
  const API = LOCAL ? location.origin + '/__gh' : 'https://api.github.com';
  function ghHeaders(cfg, accept, json) {
    const h = { Authorization: 'Bearer ' + cfg.token, Accept: accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }
  RS.gh = {
    guess() {
      if (LOCAL) return { owner: 'anteprima', repo: 'locale', branch: 'main' };
      const host = location.hostname;
      const m = host.match(/^([a-z0-9-]+)\.github\.io$/i);
      if (!m) return { owner: '', repo: '', branch: 'main' };
      const seg = location.pathname.split('/').filter(Boolean)[0];
      const repo = seg && seg !== 'admin' && seg !== 'cliente' ? seg : host;
      return { owner: m[1], repo, branch: 'main' };
    },
    async req(cfg, method, path, body) {
      const r = await fetch(`${API}/repos/${cfg.owner}/${cfg.repo}${path}`, {
        method,
        headers: ghHeaders(cfg, null, !!body),
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store'
      });
      if (!r.ok) {
        let msg = 'GitHub ' + r.status;
        try {
          const j = await r.json();
          if (j.message) msg += ' — ' + j.message;
        } catch (e) {}
        const err = new Error(msg);
        err.status = r.status;
        throw err;
      }
      return r.status === 204 ? null : r.json();
    },
    async raw(cfg, path, asBytes) {
      const r = await fetch(`${API}/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${encodeURIComponent(cfg.branch)}`, {
        headers: ghHeaders(cfg, 'application/vnd.github.raw+json'),
        cache: 'no-store'
      });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('GitHub ' + r.status);
      return asBytes ? new Uint8Array(await r.arrayBuffer()) : r.text();
    },
    /* Un solo commit con tutti i file. content === null => elimina il file. */
    async commit(cfg, files, message) {
      const ref = await RS.gh.req(cfg, 'GET', `/git/ref/heads/${cfg.branch}`);
      const head = ref.object.sha;
      const base = await RS.gh.req(cfg, 'GET', `/git/commits/${head}`);
      const tree = [];
      for (const f of files) {
        if (f.content == null) {
          tree.push({ path: f.path, mode: '100644', type: 'blob', sha: null });
          continue;
        }
        const bytes = typeof f.content === 'string' ? te.encode(f.content) : f.content;
        const blob = await RS.gh.req(cfg, 'POST', '/git/blobs', { content: RS.b64.enc(bytes), encoding: 'base64' });
        tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
      }
      const t = await RS.gh.req(cfg, 'POST', '/git/trees', { base_tree: base.tree.sha, tree });
      const c = await RS.gh.req(cfg, 'POST', '/git/commits', { message, tree: t.sha, parents: [head] });
      await RS.gh.req(cfg, 'PATCH', `/git/refs/heads/${cfg.branch}`, { sha: c.sha });
      return c.sha;
    }
  };

  /* Legge un file dal sito pubblicato, saltando la cache. */
  RS.fetchSite = async (path, asBytes, bust) => {
    const r = await fetch(path + (bust ? (path.includes('?') ? '&' : '?') + 't=' + Date.now() : ''), { cache: bust ? 'no-store' : 'default' });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return asBytes ? new Uint8Array(await r.arrayBuffer()) : r.text();
  };
})();
