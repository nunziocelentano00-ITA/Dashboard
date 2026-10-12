/* Admin — CRM di rendicontazione multi-cliente.
   Tutti i dati vivono cifrati nel repo (data/db.enc). La password non lascia mai il browser.
   "Pubblica" crea un unico commit via API GitHub con: db admin, un file per cliente, immagini. */
(function () {
  'use strict';
  const esc = RS.esc;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const app = $('#app');
  const LS_GH = 'rs.gh';
  const LS_DRAFT = 'rs.draft';

  const I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5m0 0-6 6m6-6 6 6"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>',
    draft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>',
    img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
    euro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6.5A7 7 0 1 0 18 17.5M4 10h10M4 14h10"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14"/></svg>'
  };
  const METHODS = ['Bonifico', 'Contanti', 'PayPal', 'Carta', 'Satispay', 'Altro'];

  /* ---------- stato ---------- */
  const S = {
    key: null, salt: null, iter: RS.crypto.KDF_ITER,
    db: null, base: null, dirty: false,
    pending: new Map(), // mediaId -> { clientId, enc } (immagini nuove, già cifrate con la chiave cliente)
    deleted: new Set(), // percorsi da eliminare al prossimo "Pubblica"
    thumbs: new Map(), // mediaId -> Promise<objectURL>
    ckeys: new Map(), // keyString -> Promise<CryptoKey>
    gh: null,
    page: 'overview', cid: null, tab: 'works',
    f: { q: '', type: 'all', state: 'all', min: '', max: '', sort: 'date_desc' },
    busy: false
  };

  /* ---------- utilità ---------- */
  function toast(msg, kind) {
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), kind === 'err' ? 7000 : 3600);
  }
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) {} };
  const client = (id) => S.db.clients.find((c) => c.id === id);
  const ckey = (c) => {
    if (!S.ckeys.has(c.key)) S.ckeys.set(c.key, RS.crypto.fromKeyString(c.key));
    return S.ckeys.get(c.key);
  };
  // Il link porta il segreto del link (c.link), mai la chiave dei contenuti (c.key).
  const clientLink = (c) => new URL(`../cliente/?c=${encodeURIComponent(c.slug)}`, location.href).href + '#k=' + c.link;
  // Clienti creati prima del PIN: il vecchio link conteneva la chiave contenuti,
  // quindi si ruotano le chiavi (altrimenti il vecchio link aprirebbe i dati senza PIN).
  async function ensureAccess() {
    let changed = false;
    for (const c of S.db.clients) {
      if (!c.link) {
        try {
          await rotateKeys(c);
        } catch (e) {
          c.link = RS.crypto.newKeyString();
          toast(`${c.name}: alcune immagini non sono state ricifrate (${e.message}). Usa “Rigenera link” più tardi.`, 'err');
        }
        changed = true;
      }
      if (!RS.validPin(c.pin)) { c.pin = RS.genPin(); changed = true; }
    }
    return changed;
  }
  const allMedia = (c) => (c.works || []).reduce((a, w) => a.concat(w.media || []), []);
  const themeOf = (c) => Object.assign({}, RS.DEFAULT_THEME, c.theme || {});

  async function openEnvelope(text, pw) {
    const o = JSON.parse(text);
    const key = await RS.crypto.fromPassword(pw, o.kdf.salt, o.kdf.iter);
    const obj = await RS.crypto.decJSON(key, o);
    return { key, salt: o.kdf.salt, iter: o.kdf.iter, obj };
  }
  const seal = (obj) => RS.crypto.encJSON(S.key, obj, { kdf: { salt: S.salt, iter: S.iter } });

  /* ---------- IndexedDB per le immagini non ancora pubblicate ---------- */
  let idbP;
  function idb() {
    if (!idbP)
      idbP = new Promise((res, rej) => {
        const r = indexedDB.open('rs-admin', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('pending');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    return idbP;
  }
  async function idbDo(mode, fn) {
    try {
      const d = await idb();
      return await new Promise((res, rej) => {
        const t = d.transaction('pending', mode);
        const r = fn(t.objectStore('pending'));
        t.oncomplete = () => res(r ? r.result : undefined);
        t.onerror = t.onabort = () => rej(t.error);
      });
    } catch (e) {
      return undefined;
    }
  }
  const idbPut = (id, v) => idbDo('readwrite', (s) => s.put(v, id));
  const idbDel = (id) => idbDo('readwrite', (s) => s.delete(id));
  const idbClear = () => idbDo('readwrite', (s) => s.clear());
  async function idbLoad() {
    const keys = (await idbDo('readonly', (s) => s.getAllKeys())) || [];
    const vals = (await idbDo('readonly', (s) => s.getAll())) || [];
    keys.forEach((k, i) => S.pending.set(k, vals[i]));
  }

  /* ---------- salvataggio locale (bozza) ---------- */
  let draftTimer;
  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(async () => {
      if (!S.dirty) return;
      lsSet(LS_DRAFT, await seal({ db: S.db, base: S.base, deleted: Array.from(S.deleted) }));
    }, 300);
  }
  function markDirty() {
    S.dirty = true;
    saveDraft();
    updateStatus();
  }
  function updateStatus() {
    const el = $('#pubstate');
    if (!el) return;
    el.className = 'pubstate' + (S.dirty ? ' dirty' : '');
    el.innerHTML = `<span>${S.dirty ? 'Modifiche non pubblicate' : 'Tutto pubblicato'}</span>`;
    const pb = $('[data-act="publish"]');
    if (pb) pb.disabled = S.busy;
  }
  window.addEventListener('beforeunload', (e) => {
    if (S.dirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  /* ---------- media ---------- */
  async function compressImage(file) {
    const bmp = await createImageBitmap(file);
    const max = 1600;
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * s);
    cv.height = Math.round(bmp.height * s);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.86));
    return new Uint8Array(await blob.arrayBuffer());
  }
  async function addMedia(c, file) {
    const bytes = await compressImage(file);
    const id = RS.uid();
    const enc = await RS.crypto.encBytes(await ckey(c), bytes);
    const rec = { clientId: c.id, enc };
    S.pending.set(id, rec);
    idbPut(id, rec);
    S.thumbs.set(id, Promise.resolve(URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }))));
    return id;
  }
  function dropMedia(id) {
    if (S.pending.has(id)) {
      S.pending.delete(id);
      idbDel(id);
    } else S.deleted.add(`data/m/${id}.enc`);
  }
  async function mediaPlain(c, id, key) {
    key = key || (await ckey(c));
    let enc = S.pending.has(id) ? S.pending.get(id).enc : null;
    if (!enc) enc = await RS.fetchSite(`../data/m/${id}.enc`, true, false).catch(() => null);
    if (!enc && S.gh) enc = await RS.gh.raw(S.gh, `data/m/${id}.enc`, true);
    if (!enc) throw new Error('Immagine non trovata');
    return RS.crypto.decBytes(key, enc);
  }
  function thumb(c, id) {
    if (!S.thumbs.has(id)) {
      S.thumbs.set(
        id,
        mediaPlain(c, id).then((b) => URL.createObjectURL(new Blob([b], { type: 'image/jpeg' })))
      );
    }
    return S.thumbs.get(id);
  }
  function hydrate(root) {
    $$('img[data-m]', root).forEach((img) => {
      const c = client(img.dataset.c);
      if (!c) return;
      thumb(c, img.dataset.m).then(
        (u) => (img.src = u),
        () => (img.alt = '!')
      );
    });
  }

  /* ================= AVVIO ================= */
  async function start() {
    let remote = null;
    try {
      remote = await RS.fetchSite('../data/db.enc', false, true);
    } catch (e) {}
    const draft = lsGet(LS_DRAFT);
    if (!remote && !draft) return renderSetup();
    renderLogin(remote, draft);
  }

  function authShell(title, sub, body) {
    app.innerHTML = `<div class="center"><div class="auth">
      <div class="logo"><i>R</i><div>Rendiconti<small>Area riservata</small></div></div>
      <h1>${title}</h1><p>${sub}</p>${body}</div></div>`;
  }

  function renderSetup() {
    authShell(
      'Configura l’admin',
      'Scegli la password che cifra tutti i dati. Non si può recuperare: conservala in un posto sicuro.',
      `<form id="setup">
        <label class="f">Il tuo nome (fornitore)<input name="owner" value="Nunzio Celentano" required></label>
        <label class="f">Password<input name="pw" type="password" minlength="10" autocomplete="new-password" required><span class="help">Almeno 10 caratteri.</span></label>
        <label class="f">Ripeti password<input name="pw2" type="password" autocomplete="new-password" required></label>
        <label class="check"><input type="checkbox" name="seed" checked> Crea il cliente “Martina Manzo”</label>
        <div class="err" id="err"></div>
        <button class="btn primary block">Crea area admin</button>
      </form>`
    );
    $('#setup').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      if (f.pw.value !== f.pw2.value) return ($('#err').textContent = 'Le password non coincidono.');
      f.querySelector('button').disabled = true;
      S.salt = RS.crypto.newSalt();
      S.key = await RS.crypto.fromPassword(f.pw.value, S.salt, S.iter);
      S.db = { v: 1, owner: { name: f.owner.value.trim() }, clients: [], updatedAt: null };
      if (f.seed.checked) {
        S.db.clients.push(newClient('Martina Manzo', 'martinamanzoo'));
      }
      S.base = null;
      markDirty();
      if (S.db.clients[0]) {
        S.page = 'client';
        S.cid = S.db.clients[0].id;
      }
      render();
      openGitHub(true);
    });
  }

  function renderLogin(remote, draft) {
    authShell(
      'Bentornato',
      'Inserisci la password per sbloccare i dati.',
      `<form id="login">
        <label class="f">Password<input name="pw" type="password" autocomplete="current-password" autofocus required></label>
        <div class="err" id="err"></div>
        <button class="btn primary block">Sblocca</button>
      </form>`
    );
    $('#login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner sm"></span> Sblocco…';
      try {
        await unlock(e.target.pw.value, remote, draft);
      } catch (err) {
        $('#err').textContent = err.message || 'Password errata.';
        btn.disabled = false;
        btn.textContent = 'Sblocca';
      }
    });
  }

  async function unlock(pw, remoteText, draftText) {
    let env = null;
    if (remoteText) {
      try {
        env = await openEnvelope(remoteText, pw);
      } catch (e) {
        throw new Error('Password errata.');
      }
    }
    // configurazione GitHub salvata su questo dispositivo
    const ghText = lsGet(LS_GH);
    if (ghText) {
      try {
        S.gh = (await openEnvelope(ghText, pw)).obj;
      } catch (e) {
        S.gh = null;
      }
    }
    // versione più fresca direttamente dal repo (Pages può avere ~1 min di ritardo)
    if (S.gh) {
      try {
        const fresh = await RS.gh.raw(S.gh, 'data/db.enc');
        if (fresh && fresh !== remoteText) {
          const e2 = await openEnvelope(fresh, pw);
          if (!env || (e2.obj.updatedAt || '') >= (env.obj.updatedAt || '')) env = e2;
        }
      } catch (e) {}
    }
    let d = null;
    if (draftText) {
      try {
        d = await openEnvelope(draftText, pw);
      } catch (e) {
        d = null;
      }
    }
    if (!env && !d) throw new Error('Password errata.');

    const remoteAt = env ? env.obj.updatedAt || null : null;
    let use = env;
    let restored = false;
    if (d) {
      if (!env || d.obj.base === remoteAt) {
        use = d;
        restored = true;
      } else if (confirm('Su questo dispositivo ci sono modifiche non pubblicate, ma nel frattempo i dati online sono cambiati.\n\nOK = recupera le modifiche locali (sovrascriveranno la versione online alla prossima pubblicazione)\nAnnulla = scarta le modifiche locali')) {
        use = d;
        restored = true;
      } else {
        lsDel(LS_DRAFT);
        idbClear();
      }
    }
    S.key = use.key;
    S.salt = use.salt;
    S.iter = use.iter;
    if (restored) {
      S.db = d.obj.db;
      S.base = remoteAt;
      (d.obj.deleted || []).forEach((p) => S.deleted.add(p));
      S.dirty = true;
      await idbLoad();
    } else {
      S.db = env.obj;
      S.base = remoteAt;
      S.dirty = false;
    }
    if (await ensureAccess()) {
      markDirty();
      toast('Aggiunto il PIN ai clienti: pubblica e manda link e PIN aggiornati.');
    }
    render();
    if (restored) toast('Recuperate le modifiche non pubblicate.');
  }

  function newClient(name, handle) {
    let slug = RS.slugify(name.split(/\s+/)[0]);
    let n = 2;
    const base = slug;
    while (S.db && S.db.clients.some((c) => c.slug === slug)) slug = base + '-' + n++;
    return {
      id: RS.uid(), slug, name, handle: (handle || '').replace(/^@/, ''),
      key: RS.crypto.newKeyString(), link: RS.crypto.newKeyString(), pin: RS.genPin(),
      theme: Object.assign({}, RS.DEFAULT_THEME), works: [], payments: [], notes: '', created: Date.now(), publishedSlug: null
    };
  }

  /* ================= LAYOUT ================= */
  function render() {
    const cs = S.db.clients;
    app.innerHTML = `<div class="shell" id="shell">
      <aside class="side">
        <div class="logo"><i>R</i><div>Rendiconti<small>${esc(S.db.owner.name || 'Admin')}</small></div></div>
        <nav class="nav">
          <button data-nav="overview" class="${S.page === 'overview' ? 'on' : ''}">${I.home}<span class="nm">Panoramica</span></button>
          <div class="nav-h">Clienti</div>
          ${cs
            .map((c) => {
              const L = RS.ledger(c);
              return `<button data-nav="client" data-id="${c.id}" class="${S.page === 'client' && S.cid === c.id ? 'on' : ''}">
                <span class="dot" style="background:${esc(themeOf(c).primary)}"></span><span class="nm">${esc(c.name)}</span>
                <em class="${L.due ? '' : 'zero'}">${L.due ? RS.money(L.due) : '✓'}</em></button>`;
            })
            .join('')}
          <button data-act="new-client">${I.plus}<span class="nm">Nuovo cliente</span></button>
        </nav>
        <div class="side-foot nav">
          <button data-act="settings">${I.gear}<span class="nm">Impostazioni</span></button>
          <button data-act="lock">${I.lock}<span class="nm">Blocca</span></button>
        </div>
      </aside>
      <div class="main">
        <header class="bar">
          <div class="crumbs"><button class="btn ghost icon menu-btn" data-act="menu" aria-label="Menu">${I.menu}</button>${crumbs()}</div>
          <div class="bar-r"><span id="pubstate" class="pubstate"></span>
            <button class="btn primary" data-act="publish">${S.busy ? '<span class="spinner sm"></span>' : I.up} Pubblica</button></div>
        </header>
        <div class="view" id="view"></div>
      </div>
    </div>`;
    renderView();
    updateStatus();
  }
  function crumbs() {
    if (S.page === 'client' && client(S.cid)) return `<span>Clienti</span><span>/</span><b>${esc(client(S.cid).name)}</b>`;
    return '<b>Panoramica</b>';
  }
  function renderView() {
    const v = $('#view');
    if (S.page === 'client' && client(S.cid)) {
      v.innerHTML = clientPage(client(S.cid));
      if (S.tab === 'works') renderWorks();
    } else {
      S.page = 'overview';
      v.innerHTML = overview();
    }
    hydrate(v);
  }

  /* ---------- panoramica ---------- */
  function overview() {
    const rows = S.db.clients.map((c) => ({ c, L: RS.ledger(c) }));
    const tot = rows.reduce((s, r) => s + r.L.total, 0);
    const paid = rows.reduce((s, r) => s + Math.min(r.L.paid, r.L.total), 0);
    const due = rows.reduce((s, r) => s + r.L.due, 0);
    const works = rows.reduce((s, r) => s + r.L.works.length, 0);
    const pays = [];
    rows.forEach((r) => r.L.payments.forEach((p) => pays.push({ p, c: r.c })));
    pays.sort((a, b) => (b.p.date || '').localeCompare(a.p.date || ''));
    return `
      <div class="head"><div><h1>Panoramica</h1><div class="sub">Situazione contabile di tutti i clienti · importi IVA inclusa</div></div>
        <div class="acts"><button class="btn" data-act="csv">${I.dl} Esporta CSV</button><button class="btn primary" data-act="new-client">${I.plus} Nuovo cliente</button></div></div>
      <div class="kpis">
        <div class="kpi"><div class="l">Totale rendicontato</div><div class="v">${RS.money(tot)}</div><div class="h">${works} contenuti</div></div>
        <div class="kpi ok"><div class="l">Incassato</div><div class="v">${RS.money(paid)}</div><div class="h">${tot ? Math.round((paid / tot) * 100) : 0}% del totale</div></div>
        <div class="kpi due"><div class="l">Da incassare</div><div class="v">${RS.money(due)}</div><div class="h">${rows.filter((r) => r.L.due).length} clienti con saldo aperto</div></div>
        <div class="kpi"><div class="l">Clienti attivi</div><div class="v">${rows.length}</div><div class="h">${pays.length} pagamenti registrati</div></div>
      </div>
      <div class="panel">
        <div class="panel-h"><h2>Clienti</h2></div>
        ${
          rows.length
            ? `<div class="scroll-x"><table class="t"><thead><tr><th>Cliente</th><th class="num">Contenuti</th><th class="num">Totale</th><th class="num">Incassato</th><th class="num">Residuo</th><th>Avanzamento</th><th>Ultimo pagamento</th></tr></thead><tbody>
            ${rows
              .map(({ c, L }) => {
                const pct = L.total ? Math.min(100, Math.round((L.paid / L.total) * 100)) : 0;
                return `<tr class="click" data-nav="client" data-id="${c.id}">
                  <td><div class="who"><span class="dot" style="background:${esc(themeOf(c).primary)}"></span><div><b>${esc(c.name)}</b>${c.handle ? `<small>@${esc(c.handle)}</small>` : ''}</div></div></td>
                  <td class="num">${L.works.length} <span style="color:var(--faint)">(${L.drafts} bozze)</span></td>
                  <td class="num strong">${RS.money(L.total)}</td>
                  <td class="num" style="color:var(--ok)">${RS.money(L.paid)}</td>
                  <td class="num strong" style="color:${L.due ? 'var(--due)' : 'var(--ok)'}">${RS.money(L.due)}</td>
                  <td><div class="mini-bar"><i style="width:${pct}%"></i></div></td>
                  <td>${L.lastPayment ? RS.fmtDate(L.lastPayment.date) + ' · ' + RS.money(L.lastPayment.amount) : '<span style="color:var(--faint)">—</span>'}</td></tr>`;
              })
              .join('')}
            </tbody><tfoot><tr><td>Totale</td><td class="num">${works}</td><td class="num">${RS.money(tot)}</td><td class="num">${RS.money(paid)}</td><td class="num">${RS.money(due)}</td><td colspan="2"></td></tr></tfoot></table></div>`
            : `<div class="empty"><b>Nessun cliente</b>Aggiungi il primo cliente per iniziare.</div>`
        }
      </div>
      <div class="panel">
        <div class="panel-h"><h2>Ultimi pagamenti</h2></div>
        ${
          pays.length
            ? `<div class="scroll-x"><table class="t"><tbody>${pays
                .slice(0, 8)
                .map(
                  ({ p, c }) => `<tr class="click" data-nav="client" data-id="${c.id}" data-tab="payments"><td>${RS.fmtDate(p.date)}</td><td><div class="who"><span class="dot" style="background:${esc(themeOf(c).primary)}"></span><b>${esc(c.name)}</b></div></td><td>${esc(p.method || '')}</td><td style="color:var(--muted)">${esc(p.note || '')}</td><td class="num strong" style="color:var(--ok)">+ ${RS.money(p.amount)}</td></tr>`
                )
                .join('')}</tbody></table></div>`
            : '<div class="empty">Nessun pagamento registrato.</div>'
        }
      </div>`;
  }

  /* ---------- pagina cliente ---------- */
  function clientPage(c) {
    const L = RS.ledger(c);
    const t = themeOf(c);
    return `
      <div class="head">
        <div><h1><span class="dot" style="background:${esc(t.primary)}"></span>${esc(c.name)}</h1>
          <div class="sub">${c.handle ? '@' + esc(c.handle) + ' · ' : ''}${c.publishedSlug ? 'Pagina cliente online' : 'Pagina cliente non ancora pubblicata'}</div></div>
        <div class="acts">
          <button class="btn" data-act="copy-link">${I.copy} Copia link cliente</button>
          ${c.publishedSlug ? `<a class="btn" href="${esc(clientLink(c))}" target="_blank" rel="noopener">${I.ext} Apri pagina</a>` : ''}
          <button class="btn" data-act="add-payment">${I.euro} Pagamento</button>
          <button class="btn primary" data-act="add-work">${I.plus} Contenuto</button>
        </div>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="l">Totale</div><div class="v">${RS.money(L.total)}</div><div class="h">${L.published} pubblicati · ${L.drafts} bozze</div></div>
        <div class="kpi ok"><div class="l">Incassato</div><div class="v">${RS.money(L.paid)}</div><div class="h">${L.payments.length} pagamenti${L.credit ? ' · credito ' + RS.money(L.credit) : ''}</div></div>
        <div class="kpi due"><div class="l">Residuo</div><div class="v">${RS.money(L.due)}</div><div class="h">${L.works.filter((w) => L.status[w.id].state !== 'saldato').length} contenuti non saldati</div></div>
        <div class="kpi"><div class="l">Ultimo pagamento</div><div class="v">${L.lastPayment ? RS.money(L.lastPayment.amount) : '—'}</div><div class="h">${L.lastPayment ? RS.fmtDate(L.lastPayment.date) : 'nessuno'}</div></div>
      </div>
      <div class="tabs">
        <button data-tab="works" class="${S.tab === 'works' ? 'on' : ''}">Contenuti<span>${L.works.length}</span></button>
        <button data-tab="payments" class="${S.tab === 'payments' ? 'on' : ''}">Pagamenti<span>${L.payments.length}</span></button>
        <button data-tab="settings" class="${S.tab === 'settings' ? 'on' : ''}">Impostazioni</button>
      </div>
      ${S.tab === 'payments' ? paymentsTab(c, L) : S.tab === 'settings' ? settingsTab(c) : worksTab()}`;
  }

  function worksTab() {
    const f = S.f;
    return `<div class="panel">
      <div class="filters">
        <input class="in search" data-f="q" placeholder="Cerca titolo o didascalia…" value="${esc(f.q)}">
        <select class="in" data-f="type"><option value="all">Tutti i tipi</option><option value="published" ${f.type === 'published' ? 'selected' : ''}>Pubblicati</option><option value="draft" ${f.type === 'draft' ? 'selected' : ''}>Bozze</option></select>
        <select class="in" data-f="state"><option value="all">Tutti gli stati</option>${Object.keys(RS.STATE_LABEL)
          .map((k) => `<option value="${k}" ${f.state === k ? 'selected' : ''}>${RS.STATE_LABEL[k]}</option>`)
          .join('')}<option value="open" ${f.state === 'open' ? 'selected' : ''}>Non saldati (tutti)</option></select>
        <input class="in price" data-f="min" inputmode="decimal" placeholder="€ min" value="${esc(f.min)}"><span class="sep">–</span><input class="in price" data-f="max" inputmode="decimal" placeholder="€ max" value="${esc(f.max)}">
        <select class="in" data-f="sort">
          <option value="date_desc" ${f.sort === 'date_desc' ? 'selected' : ''}>Più recenti</option>
          <option value="date_asc" ${f.sort === 'date_asc' ? 'selected' : ''}>Meno recenti</option>
          <option value="price_desc" ${f.sort === 'price_desc' ? 'selected' : ''}>Prezzo ↓</option>
          <option value="price_asc" ${f.sort === 'price_asc' ? 'selected' : ''}>Prezzo ↑</option>
        </select>
        <button class="btn ghost" data-act="reset-filters">Azzera</button>
      </div>
      <div id="works-list"></div>
    </div>`;
  }
  function renderWorks() {
    const box = $('#works-list');
    const c = client(S.cid);
    if (!box || !c) return;
    const L = RS.ledger(c);
    const f = S.f;
    const q = f.q.trim().toLowerCase();
    const min = RS.parseMoney(f.min);
    const max = RS.parseMoney(f.max);
    let list = L.works.filter((w) => {
      const st = L.status[w.id].state;
      if (f.type !== 'all' && w.type !== f.type) return false;
      if (f.state === 'open' ? st === 'saldato' : f.state !== 'all' && st !== f.state) return false;
      if (!isNaN(min) && w.price < min) return false;
      if (!isNaN(max) && w.price > max) return false;
      if (q && !((w.title || '') + ' ' + (w.caption || '') + ' ' + (w.note || '')).toLowerCase().includes(q)) return false;
      return true;
    });
    const [k, dir] = f.sort.split('_');
    list.sort((a, b) => {
      const r = k === 'price' ? a.price - b.price : (a.date || '').localeCompare(b.date || '') || (a.created || 0) - (b.created || 0);
      return dir === 'desc' ? -r : r;
    });
    if (!L.works.length) {
      box.innerHTML = `<div class="empty"><b>Nessun contenuto</b>Aggiungi un post pubblicato (link Instagram) o una bozza con foto e didascalia.<br><br><button class="btn primary" data-act="add-work">${I.plus} Aggiungi contenuto</button></div>`;
      return;
    }
    const sum = list.reduce((s, w) => s + w.price, 0);
    box.innerHTML = list.length
      ? `<div class="scroll-x"><table class="t"><thead><tr><th>Contenuto</th><th>Data</th><th>Tipo</th><th class="num">Prezzo</th><th>Stato</th><th></th></tr></thead><tbody>
        ${list
          .map((w) => {
            const st = L.status[w.id];
            const th = w.media && w.media[0] ? `<img data-m="${esc(w.media[0])}" data-c="${c.id}" alt="">` : w.type === 'published' ? I.ig : I.draft;
            return `<tr class="click" data-act="edit-work" data-id="${w.id}">
              <td><div class="wk"><div class="thumb">${th}</div><div style="min-width:0"><div class="tt">${esc(w.title || RS.TYPE_LABEL[w.type])}</div><div class="cp">${esc(w.caption || w.url || '')}</div></div></div></td>
              <td style="white-space:nowrap">${RS.fmtDate(w.date)}</td>
              <td><span class="pill ${w.type}">${RS.TYPE_LABEL[w.type]}</span></td>
              <td class="num strong">${RS.money(w.price)}</td>
              <td><span class="pill ${st.state}">${RS.STATE_LABEL[st.state]}${st.state === 'parziale' ? ' · ' + RS.money(st.covered) : ''}</span></td>
              <td class="acts">${w.url ? `<a class="btn ghost icon" href="${esc(RS.igLink(w.url))}" target="_blank" rel="noopener" title="Apri su Instagram" data-stop>${I.ext}</a>` : ''}<button class="btn ghost icon danger" data-act="del-work" data-id="${w.id}" title="Elimina">${I.trash}</button></td>
            </tr>`;
          })
          .join('')}
        </tbody><tfoot><tr><td colspan="3">${list.length} di ${L.works.length} contenuti</td><td class="num">${RS.money(sum)}</td><td colspan="2"></td></tr></tfoot></table></div>`
      : '<div class="empty">Nessun contenuto corrisponde ai filtri.</div>';
    hydrate(box);
  }

  function paymentsTab(c, L) {
    return `<div class="panel">
      <div class="panel-h"><h2>Registro pagamenti</h2><button class="btn primary" data-act="add-payment">${I.plus} Registra pagamento</button></div>
      ${
        L.payments.length
          ? `<div class="scroll-x"><table class="t"><thead><tr><th>Data</th><th>Metodo</th><th>Nota (visibile al cliente)</th><th class="num">Importo</th><th></th></tr></thead><tbody>
          ${L.payments
            .slice()
            .reverse()
            .map(
              (p) => `<tr class="click" data-act="edit-payment" data-id="${p.id}"><td>${RS.fmtDate(p.date)}</td><td>${esc(p.method || '—')}</td><td style="color:var(--muted)">${esc(p.note || '')}</td><td class="num strong" style="color:var(--ok)">+ ${RS.money(p.amount)}</td>
              <td class="acts"><button class="btn ghost icon danger" data-act="del-payment" data-id="${p.id}" title="Elimina">${I.trash}</button></td></tr>`
            )
            .join('')}
          </tbody><tfoot><tr><td colspan="3">Totale incassato · residuo ${RS.money(L.due)}</td><td class="num">${RS.money(L.paid)}</td><td></td></tr></tfoot></table></div>`
          : `<div class="empty"><b>Nessun pagamento</b>Quando il cliente paga, registralo qui: il residuo si aggiorna da solo, anche per gli acconti.</div>`
      }
    </div>
    <p style="color:var(--faint);font-size:12.5px;margin:12px 4px">I pagamenti coprono i contenuti in ordine cronologico, dal più vecchio: così ogni contenuto risulta Saldato, Parziale o Da saldare.</p>`;
  }

  function settingsTab(c) {
    const t = themeOf(c);
    const labels = { primary: 'Primario', accent: 'Accento', paper: 'Carta', bg: 'Sfondo', ink: 'Testo' };
    return `<div class="stack">
      <div class="panel"><div class="panel-h"><h2>Dati cliente</h2></div><div class="panel-b stack">
        <div class="grid3">
          <label class="f">Nome<input data-cset="name" value="${esc(c.name)}"></label>
          <label class="f">Profilo Instagram<input data-cset="handle" value="${esc(c.handle || '')}" placeholder="senza @"></label>
          <label class="f">Indirizzo pagina<input data-cset="slug" value="${esc(c.slug)}"><span class="help">…/cliente/?c=${esc(c.slug)}</span></label>
        </div>
        <label class="f">Note interne <span class="help">(mai visibili al cliente)</span><textarea data-cset="notes" placeholder="Accordi, scadenze, contatti…">${esc(c.notes || '')}</textarea></label>
      </div></div>

      <div class="panel"><div class="panel-h"><h2>Accesso del cliente</h2><button class="btn" data-act="copy-access">${I.copy} Copia link + PIN</button></div><div class="panel-b stack">
        <label class="f">Link<div class="linkbox"><input class="in" readonly value="${esc(clientLink(c))}"><button class="btn" data-act="copy-link">${I.copy} Copia</button></div></label>
        <label class="f">PIN<div class="linkbox"><input class="in pin-show" readonly value="${esc(c.pin)}"><button class="btn" data-act="copy-pin">${I.copy} Copia</button><button class="btn" data-act="change-pin">${I.edit} Cambia</button></div></label>
        <div class="note">Per aprire il rendiconto servono <b>sia il link sia il PIN</b>: senza PIN i dati restano cifrati. Meglio mandarli su canali diversi (es. link su WhatsApp, PIN a voce o per SMS).
          ${c.publishedSlug ? '' : '<br><b>Funzioneranno dopo il primo “Pubblica”.</b>'}${S.dirty && c.publishedSlug ? '<br>Se hai cambiato PIN o link, valgono dopo “Pubblica”.' : ''}</div>
        <div class="danger-zone"><p><b>Rigenera link</b>Crea un nuovo link e nuove chiavi. Il vecchio link smette di funzionare dopo la prossima pubblicazione. Utile se link e PIN sono finiti alla persona sbagliata.</p><button class="btn danger" data-act="regen-key">Rigenera</button></div>
      </div></div>

      <div class="panel"><div class="panel-h"><h2>Colori della pagina cliente</h2><button class="btn ghost" data-act="reset-theme">Ripristina</button></div><div class="panel-b stack">
        <div class="swatches">${RS.THEME_KEYS.map(
          (k) => `<label class="sw">${labels[k]}<input type="color" data-theme="${k}" value="${esc(t[k])}"><code>${esc(t[k].toUpperCase())}</code></label>`
        ).join('')}</div>
        <div class="theme-prev" id="theme-prev">${themePreview(c)}</div>
      </div></div>

      <div class="danger-zone"><p><b>Elimina cliente</b>Rimuove cliente, contenuti, pagamenti e immagini alla prossima pubblicazione.</p><button class="btn danger" data-act="del-client">${I.trash} Elimina</button></div>
    </div>`;
  }
  function themePreview(c) {
    const t = themeOf(c);
    return `<div class="tp-hero" style="background:${esc(t.primary)}"><span style="color:${esc(t.accent)}">“</span><b>${esc(c.name)}</b>Rendiconto contenuti</div>
      <div class="tp-body" style="background:${esc(t.bg)};color:${esc(t.ink)}"><div class="tp-card">Totale</div><div class="tp-card" style="background:${esc(t.ink)};color:#fff">Da saldare</div><div class="tp-card" style="background:${esc(t.paper)}">Ricevuta</div></div>`;
  }

  /* ================= MODALI ================= */
  function modal(html, opts) {
    opts = opts || {};
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `<div class="dlg ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
    const close = () => {
      m.remove();
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    m.addEventListener('mousedown', (e) => {
      if (e.target === m) close();
    });
    m.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) close();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(m);
    const first = m.querySelector('input:not([type=hidden]):not([type=file]), textarea, select');
    if (first) first.focus();
    return { el: m, close };
  }
  const dlgHead = (t) => `<div class="dlg-h"><h2>${t}</h2><button class="btn ghost icon" data-close aria-label="Chiudi">${I.x}</button></div>`;

  /* ---------- contenuto (post / bozza) ---------- */
  function openWork(c, w) {
    const isNew = !w;
    const draft = w
      ? JSON.parse(JSON.stringify(w))
      : { id: RS.uid(), type: 'published', url: '', title: '', caption: '', date: RS.today(), price: 0, media: [], note: '', created: Date.now() };
    const startMedia = (w && w.media ? w.media : []).slice();
    const added = [];
    const M = modal(
      `${dlgHead(isNew ? 'Nuovo contenuto' : 'Modifica contenuto')}
      <form id="wf"><div class="dlg-b"><div class="split">
        <div class="stack">
          <div class="seg" role="radiogroup">
            <button type="button" data-type="published">${I.ig} Pubblicato</button>
            <button type="button" data-type="draft">${I.draft} Bozza / non pubblicato</button>
          </div>
          <label class="f" id="url-f">Link del post Instagram<input name="url" value="${esc(draft.url)}" placeholder="https://www.instagram.com/p/…"></label>
          <div class="grid3">
            <label class="f" style="grid-column:span 1">Data<input name="date" type="date" value="${esc(draft.date)}" required></label>
            <label class="f">Prezzo (IVA incl.)<input name="price" inputmode="decimal" value="${esc(RS.centsToInput(draft.price))}" placeholder="0,00" required></label>
            <label class="f">Titolo<input name="title" value="${esc(draft.title)}" placeholder="es. Post evento 12/10"></label>
          </div>
          <label class="f">Didascalia<textarea name="caption" rows="5" placeholder="Testo del post">${esc(draft.caption)}</textarea></label>
          <div class="f"><span id="img-lbl"></span><div class="imgs" id="imgs"></div></div>
          <label class="f">Nota interna <span class="help">(non visibile al cliente)</span><input name="note" value="${esc(draft.note || '')}"></label>
        </div>
        <div class="preview" id="pv"></div>
      </div></div>
      <div class="dlg-f">${isNew ? '' : `<button type="button" class="btn danger" data-act="wdel" style="margin-right:auto">${I.trash} Elimina</button>`}<button type="button" class="btn" data-close>Annulla</button><button class="btn primary">${isNew ? 'Aggiungi' : 'Salva'}</button></div></form>`,
      { wide: true }
    );
    const el = M.el;
    const form = $('#wf', el);
    const fileIn = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', multiple: true, hidden: true });
    el.appendChild(fileIn);

    function setType(t) {
      draft.type = t;
      $$('[data-type]', el).forEach((b) => b.classList.toggle('on', b.dataset.type === t));
      $('#url-f', el).hidden = t !== 'published';
      $('#img-lbl', el).innerHTML =
        t === 'published'
          ? 'Copertina per l’hero <span class="help">(opzionale: se manca si usa l’anteprima di Instagram)</span>'
          : 'Immagini della bozza <span class="help">(più immagini = carosello)</span>';
      preview();
    }
    function preview() {
      const pv = $('#pv', el);
      const url = form.url.value.trim();
      if (draft.type === 'published') {
        const src = RS.igEmbed(url, true);
        if (src) {
          if (!pv.querySelector('iframe') || pv.dataset.src !== src) {
            pv.dataset.src = src;
            pv.innerHTML = `<iframe src="${esc(src)}" title="Anteprima"></iframe>`;
          }
        } else {
          pv.dataset.src = '';
          pv.innerHTML = url ? '<div style="padding:20px;color:var(--due)">Link non riconosciuto.<br>Usa il link di un post o reel.</div>' : '<div style="padding:20px">Incolla il link del post<br>per vedere l’anteprima.</div>';
        }
      } else {
        pv.dataset.src = '';
        pv.innerHTML = draft.media[0]
          ? `<img data-m="${esc(draft.media[0])}" data-c="${c.id}" alt="" style="width:100%;height:100%;object-fit:contain;max-height:560px">`
          : '<div style="padding:20px">Carica le immagini della bozza.</div>';
        hydrate(pv);
      }
    }
    function renderImgs() {
      $('#imgs', el).innerHTML =
        draft.media
          .map(
            (id, i) => `<div class="it"><img data-m="${esc(id)}" data-c="${c.id}" alt=""><span class="n">${i + 1}</span>
            ${i ? `<button type="button" class="mv" data-mv="${i}" title="Sposta prima">${I.left}</button>` : ''}
            <button type="button" class="rm" data-rm="${i}" title="Rimuovi">${I.x}</button></div>`
          )
          .join('') + `<div class="drop" data-act="pick" tabindex="0">${I.img}<span>Aggiungi</span></div>`;
      hydrate($('#imgs', el));
      if (draft.type === 'draft') preview();
    }
    async function addFiles(files) {
      const list = Array.from(files).filter((f) => /^image\//.test(f.type) || /\.(heic|heif)$/i.test(f.name));
      for (const f of list) {
        try {
          const id = await addMedia(c, f);
          added.push(id);
          draft.media.push(id);
        } catch (e) {
          toast(`Impossibile leggere ${f.name}. Usa JPG o PNG.`, 'err');
        }
      }
      renderImgs();
    }

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-type],[data-rm],[data-mv],[data-act]');
      if (!b) return;
      if (b.dataset.type) setType(b.dataset.type);
      else if (b.dataset.rm != null) {
        draft.media.splice(+b.dataset.rm, 1);
        renderImgs();
      } else if (b.dataset.mv != null) {
        const i = +b.dataset.mv;
        [draft.media[i - 1], draft.media[i]] = [draft.media[i], draft.media[i - 1]];
        renderImgs();
      } else if (b.dataset.act === 'pick') fileIn.click();
      else if (b.dataset.act === 'wdel') {
        if (deleteWork(c, w)) M.close();
      }
    });
    fileIn.addEventListener('change', () => {
      addFiles(fileIn.files);
      fileIn.value = '';
    });
    el.addEventListener('dragover', (e) => {
      if (e.target.closest('.dlg')) {
        e.preventDefault();
        const d = $('.drop', el);
        if (d) d.classList.add('over');
      }
    });
    el.addEventListener('dragleave', () => {
      const d = $('.drop', el);
      if (d) d.classList.remove('over');
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });
    form.url.addEventListener('input', preview);

    // chiusura senza salvare: scarta le immagini caricate in questa sessione
    let saved = false;
    const observer = new MutationObserver(() => {
      if (!document.body.contains(el)) {
        observer.disconnect();
        if (!saved) added.forEach((id) => dropMedia(id));
      }
    });
    observer.observe(document.body, { childList: true });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const price = RS.parseMoney(form.price.value);
      if (isNaN(price) || price < 0) return toast('Inserisci un prezzo valido (es. 120 o 120,50).', 'err');
      const url = form.url.value.trim();
      if (draft.type === 'published' && !RS.igParse(url)) return toast('Inserisci il link di un post o reel Instagram.', 'err');
      Object.assign(draft, {
        url: draft.type === 'published' ? url : '',
        date: form.date.value || RS.today(),
        price,
        title: form.title.value.trim(),
        caption: form.caption.value,
        note: form.note.value.trim()
      });
      // immagini rimosse: da eliminare dal repo
      startMedia.filter((id) => !draft.media.includes(id)).forEach(dropMedia);
      added.filter((id) => !draft.media.includes(id)).forEach(dropMedia);
      if (isNew) c.works.push(draft);
      else Object.assign(w, draft);
      saved = true;
      M.close();
      markDirty();
      render();
      toast(isNew ? 'Contenuto aggiunto.' : 'Contenuto aggiornato.');
    });

    setType(draft.type);
    renderImgs();
  }
  function deleteWork(c, w) {
    if (!confirm(`Eliminare “${w.title || RS.TYPE_LABEL[w.type]}” (${RS.money(w.price)})?`)) return false;
    (w.media || []).forEach(dropMedia);
    c.works = c.works.filter((x) => x.id !== w.id);
    markDirty();
    render();
    toast('Contenuto eliminato.');
    return true;
  }

  /* ---------- pagamento ---------- */
  function openPayment(c, p) {
    const isNew = !p;
    const L = RS.ledger(c);
    const M = modal(
      `${dlgHead(isNew ? 'Registra pagamento' : 'Modifica pagamento')}
      <form id="pf"><div class="dlg-b">
        ${isNew && L.due ? `<div class="note">Residuo attuale: <b>${RS.money(L.due)}</b> · <a href="#" data-fill>usa l’importo intero</a></div>` : ''}
        <div class="grid2">
          <label class="f">Importo ricevuto<input name="amount" inputmode="decimal" value="${p ? esc(RS.centsToInput(p.amount)) : ''}" placeholder="0,00" required></label>
          <label class="f">Data<input name="date" type="date" value="${esc(p ? p.date : RS.today())}" required></label>
        </div>
        <label class="f">Metodo<select name="method">${METHODS.map((m) => `<option ${p && p.method === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        <label class="f">Nota <span class="help">(visibile al cliente)</span><input name="note" value="${esc(p ? p.note || '' : '')}" placeholder="es. Acconto ottobre"></label>
      </div>
      <div class="dlg-f"><button type="button" class="btn" data-close>Annulla</button><button class="btn primary">${isNew ? 'Registra' : 'Salva'}</button></div></form>`
    );
    const form = $('#pf', M.el);
    const fill = $('[data-fill]', M.el);
    if (fill)
      fill.addEventListener('click', (e) => {
        e.preventDefault();
        form.amount.value = RS.centsToInput(L.due);
      });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = RS.parseMoney(form.amount.value);
      if (isNaN(amount) || amount <= 0) return toast('Inserisci un importo valido.', 'err');
      const data = { amount, date: form.date.value || RS.today(), method: form.method.value, note: form.note.value.trim() };
      if (isNew) c.payments.push(Object.assign({ id: RS.uid() }, data));
      else Object.assign(p, data);
      M.close();
      markDirty();
      render();
      toast(isNew ? 'Pagamento registrato.' : 'Pagamento aggiornato.');
    });
  }

  /* ---------- nuovo cliente ---------- */
  function openNewClient() {
    const M = modal(
      `${dlgHead('Nuovo cliente')}
      <form id="cf"><div class="dlg-b">
        <label class="f">Nome<input name="name" required placeholder="Nome e cognome o brand"></label>
        <label class="f">Profilo Instagram<input name="handle" placeholder="senza @"></label>
      </div>
      <div class="dlg-f"><button type="button" class="btn" data-close>Annulla</button><button class="btn primary">Crea</button></div></form>`
    );
    $('#cf', M.el).addEventListener('submit', (e) => {
      e.preventDefault();
      const c = newClient(e.target.name.value.trim(), e.target.handle.value.trim());
      S.db.clients.push(c);
      S.page = 'client';
      S.cid = c.id;
      S.tab = 'settings';
      M.close();
      markDirty();
      render();
    });
  }

  /* ---------- impostazioni generali + GitHub ---------- */
  function openSettings() {
    const M = modal(
      `${dlgHead('Impostazioni')}
      <div class="dlg-b">
        <label class="f">Il tuo nome (compare nelle pagine cliente e nel PDF)<input id="own" value="${esc(S.db.owner.name || '')}"></label>
        <div class="grid2">
          <button class="btn" data-act="gh">${I.gear} Collegamento GitHub</button>
          <button class="btn" data-act="pw">${I.lock} Cambia password</button>
        </div>
        <div class="note">${S.gh ? `Collegato a <b>${esc(S.gh.owner)}/${esc(S.gh.repo)}</b> (branch ${esc(S.gh.branch)}).` : 'GitHub non ancora collegato su questo dispositivo.'}</div>
      </div>
      <div class="dlg-f"><button class="btn primary" data-close>Fatto</button></div>`
    );
    $('#own', M.el).addEventListener('change', (e) => {
      S.db.owner.name = e.target.value.trim();
      markDirty();
      render();
    });
    M.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      M.close();
      if (b.dataset.act === 'gh') openGitHub();
      else openPassword();
    });
  }

  function openGitHub(first, then) {
    const g = S.gh || RS.gh.guess();
    const M = modal(
      `${dlgHead('Collega GitHub')}
      <form id="gf"><div class="dlg-b">
        ${first ? '<div class="note">Ultimo passo: collega il repository così “Pubblica” può salvare i dati sul sito. Puoi farlo anche dopo da Impostazioni.</div>' : ''}
        <div class="grid3">
          <label class="f">Utente / organizzazione<input name="owner" value="${esc(g.owner)}" required></label>
          <label class="f">Repository<input name="repo" value="${esc(g.repo)}" required></label>
          <label class="f">Branch<input name="branch" value="${esc(g.branch || 'main')}" required></label>
        </div>
        <label class="f">Token di accesso<input name="token" type="password" value="${esc((S.gh && S.gh.token) || '')}" autocomplete="off" required placeholder="github_pat_…"></label>
        <div class="note">Crea un <b>fine-grained token</b>:
          <ol><li>GitHub → Settings → Developer settings → <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Fine-grained tokens</a></li>
          <li>Repository access: <b>Only select repositories</b> → questo repository</li>
          <li>Permissions → Repository → <b>Contents: Read and write</b></li></ol>
          Il token resta solo su questo dispositivo, cifrato con la tua password.</div>
        <div id="gres"></div>
      </div>
      <div class="dlg-f"><button type="button" class="btn" data-close>Annulla</button><button type="button" class="btn" data-act="test">Verifica</button><button class="btn primary">Salva</button></div></form>`
    );
    const form = $('#gf', M.el);
    const read = () => ({
      owner: form.owner.value.trim(),
      repo: form.repo.value.trim(),
      branch: form.branch.value.trim() || 'main',
      token: form.token.value.trim()
    });
    async function test() {
      const cfg = read();
      const res = $('#gres', M.el);
      res.innerHTML = '<div class="note">Verifica in corso…</div>';
      try {
        const repo = await RS.gh.req(cfg, 'GET', '');
        if (repo.permissions && !repo.permissions.push) throw new Error('Il token non ha il permesso di scrittura (Contents: Read and write).');
        await RS.gh.req(cfg, 'GET', `/git/ref/heads/${cfg.branch}`);
        res.innerHTML = `<div class="note">✓ Collegato a <b>${esc(repo.full_name)}</b>${repo.private ? ' (privato)' : ''}.</div>`;
        return true;
      } catch (e) {
        res.innerHTML = `<div class="note warn">${esc(e.status === 404 ? 'Repository o branch non trovati, oppure il token non ha accesso.' : e.status === 401 ? 'Token non valido o scaduto.' : e.message)}</div>`;
        return false;
      }
    }
    $('[data-act="test"]', M.el).addEventListener('click', test);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!(await test())) return;
      S.gh = read();
      lsSet(LS_GH, await seal(S.gh));
      M.close();
      toast('GitHub collegato.', 'ok');
      if (then) then();
    });
  }

  function openPassword() {
    const M = modal(
      `${dlgHead('Cambia password')}
      <form id="pwf"><div class="dlg-b">
        <label class="f">Nuova password<input name="pw" type="password" minlength="10" autocomplete="new-password" required></label>
        <label class="f">Ripeti<input name="pw2" type="password" autocomplete="new-password" required></label>
        <div class="note warn">La nuova password vale online dopo “Pubblica”. Gli altri dispositivi dovranno ricollegare GitHub.</div>
      </div>
      <div class="dlg-f"><button type="button" class="btn" data-close>Annulla</button><button class="btn primary">Cambia</button></div></form>`
    );
    $('#pwf', M.el).addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      if (f.pw.value !== f.pw2.value) return toast('Le password non coincidono.', 'err');
      S.salt = RS.crypto.newSalt();
      S.key = await RS.crypto.fromPassword(f.pw.value, S.salt, S.iter);
      if (S.gh) lsSet(LS_GH, await seal(S.gh));
      M.close();
      markDirty();
      toast('Password cambiata. Ricorda di pubblicare.', 'ok');
    });
  }

  async function copyText(text, msg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg);
    } catch (err) {
      prompt('Copia:', text);
    }
  }

  function openPin(c) {
    const M = modal(
      `${dlgHead('Cambia PIN')}
      <form id="pinf"><div class="dlg-b">
        <label class="f">Nuovo PIN <span class="help">(4–8 cifre)</span>
          <div class="linkbox"><input name="pin" class="pin-show" inputmode="numeric" maxlength="8" value="${esc(c.pin)}" required><button type="button" class="btn" data-gen>Genera</button></div></label>
        <div class="note warn">Il vecchio PIN smette di funzionare dopo “Pubblica”: ricordati di comunicare quello nuovo al cliente.</div>
      </div>
      <div class="dlg-f"><button type="button" class="btn" data-close>Annulla</button><button class="btn primary">Salva PIN</button></div></form>`
    );
    const form = $('#pinf', M.el);
    form.pin.addEventListener('input', () => (form.pin.value = form.pin.value.replace(/\D/g, '').slice(0, 8)));
    $('[data-gen]', M.el).addEventListener('click', () => (form.pin.value = RS.genPin()));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!RS.validPin(form.pin.value)) return toast('Il PIN deve avere da 4 a 8 cifre.', 'err');
      if (form.pin.value !== c.pin) {
        c.pin = form.pin.value;
        markDirty();
        render();
        toast('PIN aggiornato. Pubblica per renderlo attivo.');
      }
      M.close();
    });
  }

  /* ================= AZIONI CLIENTE ================= */
  /* Nuova chiave contenuti (immagini ricifrate) e nuovo segreto del link. */
  async function rotateKeys(c) {
    const oldKey = await ckey(c);
    const newStr = RS.crypto.newKeyString();
    const nk = await RS.crypto.fromKeyString(newStr);
    for (const id of allMedia(c)) {
      const plain = await mediaPlain(c, id, oldKey);
      const rec = { clientId: c.id, enc: await RS.crypto.encBytes(nk, plain) };
      S.pending.set(id, rec);
      idbPut(id, rec);
    }
    c.key = newStr;
    c.link = RS.crypto.newKeyString();
  }
  async function regenKey(c) {
    if (!confirm(`Rigenerare link e chiavi di ${c.name}? Dopo la pubblicazione il vecchio link non funzionerà più.`)) return;
    try {
      await rotateKeys(c);
      markDirty();
      render();
      toast('Nuovo link creato. Pubblica e manda il nuovo link.', 'ok');
    } catch (e) {
      toast('Rigenerazione non riuscita: ' + e.message, 'err');
    }
  }
  function deleteClient(c) {
    if (!confirm(`Eliminare ${c.name} con tutti i contenuti e i pagamenti?`)) return;
    if (prompt(`Per confermare scrivi il nome del cliente: ${c.name}`) !== c.name) return toast('Nome non corrispondente, nulla è stato eliminato.');
    allMedia(c).forEach(dropMedia);
    if (c.publishedSlug) S.deleted.add(`data/c/${c.publishedSlug}.enc`);
    S.db.clients = S.db.clients.filter((x) => x.id !== c.id);
    S.page = 'overview';
    markDirty();
    render();
    toast('Cliente eliminato.');
  }

  /* ================= PUBBLICA ================= */
  async function publish() {
    if (S.busy) return;
    if (!S.gh) return openGitHub(false, publish);
    S.busy = true;
    render();
    const snapshot = { updatedAt: S.db.updatedAt, slugs: S.db.clients.map((c) => c.publishedSlug) };
    try {
      // qualcuno ha pubblicato da un altro dispositivo?
      const cur = await RS.gh.raw(S.gh, 'data/db.enc');
      if (cur) {
        const o = JSON.parse(cur);
        if (o.kdf && o.kdf.salt === S.salt) {
          const remote = await RS.crypto.decJSON(S.key, o);
          if ((remote.updatedAt || null) !== S.base && !confirm('I dati online sono stati modificati da un altro dispositivo dopo che li hai aperti. Pubblicando li sovrascrivi. Continuare?')) {
            throw new Error('Pubblicazione annullata.');
          }
        }
      }
      const files = [];
      const now = new Date().toISOString();
      S.db.updatedAt = now;
      for (const c of S.db.clients) {
        const t = themeOf(c);
        files.push({
          path: `data/c/${c.slug}.enc`,
          content: await RS.crypto.sealClient(c.key, c.link, c.pin, RS.clientView(S.db, c), { primary: t.primary, accent: t.accent, bg: t.bg, ink: t.ink, paper: t.paper })
        });
        if (c.publishedSlug && c.publishedSlug !== c.slug) files.push({ path: `data/c/${c.publishedSlug}.enc`, content: null });
        c.publishedSlug = c.slug;
      }
      const used = new Set();
      S.db.clients.forEach((c) => allMedia(c).forEach((id) => used.add(id)));
      for (const [id, rec] of S.pending) {
        if (used.has(id)) files.push({ path: `data/m/${id}.enc`, content: rec.enc });
      }
      S.deleted.forEach((p) => {
        const id = (p.match(/^data\/m\/(.+)\.enc$/) || [])[1];
        if (!id || !used.has(id)) files.push({ path: p, content: null });
      });
      files.push({ path: 'data/db.enc', content: await seal(S.db) });

      const existing = await existingPaths(files);
      const final = files.filter((f) => f.content != null || existing.has(f.path));
      await RS.gh.commit(S.gh, final, `Rendiconti: aggiornamento ${now.slice(0, 16).replace('T', ' ')}`);

      S.base = now;
      S.dirty = false;
      S.pending.clear();
      S.deleted.clear();
      idbClear();
      lsDel(LS_DRAFT);
      toast('Pubblicato. Il sito si aggiorna entro 1–2 minuti.', 'ok');
    } catch (e) {
      S.db.updatedAt = snapshot.updatedAt;
      S.db.clients.forEach((c, i) => (c.publishedSlug = snapshot.slugs[i]));
      toast(e.message === 'Pubblicazione annullata.' ? e.message : 'Errore di pubblicazione: ' + e.message, 'err');
    } finally {
      S.busy = false;
      render();
    }
  }
  async function existingPaths(files) {
    if (!files.some((f) => f.content == null)) return new Set();
    const ref = await RS.gh.req(S.gh, 'GET', `/git/ref/heads/${S.gh.branch}`);
    const commit = await RS.gh.req(S.gh, 'GET', `/git/commits/${ref.object.sha}`);
    const tree = await RS.gh.req(S.gh, 'GET', `/git/trees/${commit.tree.sha}?recursive=1`);
    return new Set(tree.tree.map((t) => t.path));
  }

  /* ---------- CSV ---------- */
  function exportCSV() {
    const rows = [['Cliente', 'Data', 'Movimento', 'Tipo', 'Descrizione', 'Importo', 'Stato', 'Link']];
    for (const c of S.db.clients) {
      const L = RS.ledger(c);
      L.works.forEach((w) =>
        rows.push([c.name, w.date, 'Contenuto', RS.TYPE_LABEL[w.type], w.title || '', (w.price / 100).toFixed(2).replace('.', ','), RS.STATE_LABEL[L.status[w.id].state], w.url || ''])
      );
      L.payments.forEach((p) => rows.push([c.name, p.date, 'Pagamento', p.method || '', p.note || '', (-p.amount / 100).toFixed(2).replace('.', ','), '', '']));
    }
    const csv = '﻿' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `rendiconti-${RS.today()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ================= EVENTI ================= */
  document.addEventListener('click', async (e) => {
    if (!S.db || e.target.closest('.modal')) return;
    if (e.target.closest('[data-stop]')) return;
    const shell = $('#shell');
    const t = e.target.closest('[data-act],[data-nav],[data-tab]');
    if (!t) {
      if (shell && shell.classList.contains('nav-open') && !e.target.closest('.side')) shell.classList.remove('nav-open');
      return;
    }
    const c = S.page === 'client' ? client(S.cid) : null;
    if (t.dataset.nav) {
      S.page = t.dataset.nav;
      if (t.dataset.id) S.cid = t.dataset.id;
      S.tab = t.dataset.tab || 'works';
      render();
      window.scrollTo(0, 0);
      return;
    }
    if (t.dataset.tab && c) {
      S.tab = t.dataset.tab;
      render();
      return;
    }
    const act = t.dataset.act;
    const id = t.dataset.id;
    switch (act) {
      case 'menu': shell.classList.toggle('nav-open'); break;
      case 'publish': publish(); break;
      case 'settings': openSettings(); break;
      case 'lock':
        if (!S.dirty || confirm('Le modifiche non pubblicate restano salvate su questo dispositivo. Bloccare?')) {
          S.dirty = false;
          location.reload();
        }
        break;
      case 'new-client': openNewClient(); break;
      case 'csv': exportCSV(); break;
      case 'add-work': openWork(c); break;
      case 'edit-work': openWork(c, c.works.find((w) => w.id === id)); break;
      case 'del-work': e.stopPropagation(); deleteWork(c, c.works.find((w) => w.id === id)); break;
      case 'add-payment': openPayment(c); break;
      case 'edit-payment': openPayment(c, c.payments.find((p) => p.id === id)); break;
      case 'del-payment': {
        e.stopPropagation();
        const p = c.payments.find((x) => x.id === id);
        if (p && confirm(`Eliminare il pagamento di ${RS.money(p.amount)} del ${RS.fmtDate(p.date)}?`)) {
          c.payments = c.payments.filter((x) => x.id !== id);
          markDirty();
          render();
        }
        break;
      }
      case 'copy-link':
        try {
          await navigator.clipboard.writeText(clientLink(c));
          toast(c.publishedSlug ? 'Link copiato.' : 'Link copiato. Funzionerà dopo “Pubblica”.');
        } catch (err) {
          prompt('Copia il link:', clientLink(c));
        }
        break;
      case 'copy-pin': copyText(c.pin, 'PIN copiato.'); break;
      case 'copy-access':
        copyText(`Ecco il tuo rendiconto social:\n${clientLink(c)}\n\nPIN: ${c.pin}`, c.publishedSlug ? 'Link e PIN copiati.' : 'Copiati. Funzioneranno dopo “Pubblica”.');
        break;
      case 'change-pin': openPin(c); break;
      case 'regen-key': regenKey(c); break;
      case 'del-client': deleteClient(c); break;
      case 'reset-theme':
        c.theme = Object.assign({}, RS.DEFAULT_THEME);
        markDirty();
        render();
        break;
      case 'reset-filters':
        S.f = { q: '', type: 'all', state: 'all', min: '', max: '', sort: 'date_desc' };
        renderView();
        break;
    }
  });

  document.addEventListener('input', (e) => {
    if (!S.db || e.target.closest('.modal')) return;
    const t = e.target;
    if (t.dataset.f) {
      S.f[t.dataset.f] = t.value;
      renderWorks();
    } else if (t.dataset.theme) {
      const c = client(S.cid);
      c.theme = Object.assign(themeOf(c), { [t.dataset.theme]: t.value });
      t.nextElementSibling.textContent = t.value.toUpperCase();
      $('#theme-prev').innerHTML = themePreview(c);
      markDirty();
    }
  });
  document.addEventListener('change', (e) => {
    if (!S.db || e.target.closest('.modal')) return;
    const t = e.target;
    const c = client(S.cid);
    if (t.dataset.theme) return render();
    if (!t.dataset.cset || !c) return;
    const k = t.dataset.cset;
    let v = t.value;
    if (k === 'name') {
      v = v.trim();
      if (!v) return render();
    }
    if (k === 'handle') v = v.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '');
    if (k === 'slug') {
      v = RS.slugify(v);
      if (S.db.clients.some((x) => x !== c && x.slug === v)) {
        toast('Indirizzo già usato da un altro cliente.', 'err');
        return render();
      }
    }
    c[k] = v;
    markDirty();
    if (k !== 'notes') render();
  });

  start();
})();
