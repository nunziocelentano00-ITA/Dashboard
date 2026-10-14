/* Pagina cliente: legge il rendiconto cifrato e lo mostra.
   URL: /cliente/?c=<slug>#k=<chiave>  — la chiave dopo "#" non lascia mai il browser. */
(function () {
  'use strict';
  const esc = RS.esc;
  const app = document.getElementById('app');

  const I = {
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    draft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>',
    euro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 6.5A7 7 0 1 0 17.5 17.5"/><path d="M4 10h9M4 14h9"/></svg>'
  };

  // Etichette per il cliente: tono neutro, niente "Da saldare" ripetuto ovunque.
  const ST = { saldato: 'Saldato', parziale: 'Pagato in parte', da_saldare: 'In attesa' };

  function fail(title, msg) {
    app.innerHTML = `<div class="boot"><h1>${esc(title)}</h1><p>${esc(msg)}</p></div>`;
  }

  let key, data, L;
  const mediaCache = new Map();
  function media(id) {
    if (!mediaCache.has(id)) {
      mediaCache.set(
        id,
        (async () => {
          const bytes = await RS.fetchSite(`../data/m/${encodeURIComponent(id)}.enc`, true, false);
          if (!bytes) throw new Error('missing');
          const plain = await RS.crypto.decBytes(key, bytes);
          return URL.createObjectURL(new Blob([plain], { type: 'image/jpeg' }));
        })()
      );
    }
    return mediaCache.get(id);
  }
  function hydrateMedia(root) {
    root.querySelectorAll('img[data-media]').forEach((img) => {
      media(img.dataset.media).then(
        (u) => (img.src = u),
        () => img.replaceWith(Object.assign(document.createElement('div'), { className: 'ph', innerHTML: I.draft + '<span>Immagine non disponibile</span>' }))
      );
    });
  }

  async function boot() {
    const slug = (new URLSearchParams(location.search).get('c') || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    const k = new URLSearchParams(location.hash.slice(1)).get('k');
    if (!slug || !k) return fail('Link incompleto', 'Apri il link completo che hai ricevuto: contiene la chiave per leggere il tuo rendiconto.');
    let txt;
    try {
      txt = await RS.fetchSite(`../data/c/${slug}.enc`, false, true);
    } catch (e) {
      return fail('Connessione non riuscita', 'Controlla la connessione e ricarica la pagina.');
    }
    if (!txt) return fail('Rendiconto non trovato', 'Il link potrebbe essere stato aggiornato. Chiedi il nuovo link.');
    let file;
    try {
      file = JSON.parse(txt);
    } catch (e) {
      return fail('Rendiconto non leggibile', 'Riprova tra qualche minuto.');
    }
    if (file.theme) RS.applyTheme(document.documentElement, file.theme);

    // formato senza PIN (compatibilità)
    if (!file.wk) {
      try {
        key = await RS.crypto.fromKeyString(k);
        data = await RS.crypto.decJSON(key, file);
      } catch (e) {
        return fail('Link non valido', 'La chiave del link non corrisponde. Chiedi il link aggiornato.');
      }
      return show();
    }

    // PIN ricordato su questo dispositivo o in questa sessione
    const remembered = store.get(slug);
    if (remembered) {
      try {
        ({ key, data } = await RS.crypto.openClient(file, k, remembered));
        return show();
      } catch (e) {
        store.del(slug);
      }
    }
    askPin(slug, k, file);
  }

  function paidFor(p) {
    const names = (p.works || []).map((id) => L.works.find((w) => w.id === id)).filter(Boolean).map(RS.workName);
    return names.length ? `<small>Salda: ${esc(names.join(', '))}</small>` : '';
  }

  function show() {
    L = RS.ledger(data);
    RS.applyTheme(document.documentElement, data.client.theme);
    document.title = `Rendiconto · ${data.client.name}`;
    render();
  }

  /* ---------- PIN ---------- */
  const store = {
    get(slug) {
      try {
        return sessionStorage.getItem('rs.pin.' + slug) || localStorage.getItem('rs.pin.' + slug);
      } catch (e) {
        return null;
      }
    },
    set(slug, pin, persist) {
      try {
        sessionStorage.setItem('rs.pin.' + slug, pin);
        if (persist) localStorage.setItem('rs.pin.' + slug, pin);
      } catch (e) {}
    },
    del(slug) {
      try {
        sessionStorage.removeItem('rs.pin.' + slug);
        localStorage.removeItem('rs.pin.' + slug);
      } catch (e) {}
    }
  };

  function askPin(slug, k, file) {
    app.innerHTML = `<div class="lock">
      <div class="quote-mark open" aria-hidden="true">“</div>
      <div class="quote-mark close" aria-hidden="true">”</div>
      <form class="lock-card" id="pinf" autocomplete="off">
        <div class="lock-ico">${I.lock}</div>
        <h1>Rendiconto riservato</h1>
        <p>Inserisci il PIN che hai ricevuto insieme al link.</p>
        <input id="pin" class="pin-in" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="one-time-code" placeholder="••••••" aria-label="PIN" required>
        <label class="remember"><input type="checkbox" id="rem"> Ricorda su questo dispositivo</label>
        <button class="pin-btn" type="submit">Apri il rendiconto</button>
        <p class="pin-err" id="perr" role="alert"></p>
      </form>
    </div>`;
    const form = document.getElementById('pinf');
    const input = document.getElementById('pin');
    const btn = form.querySelector('button');
    input.focus();
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 8);
      document.getElementById('perr').textContent = '';
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = input.value;
      if (!RS.validPin(pin)) return (document.getElementById('perr').textContent = 'Il PIN è di 4–8 cifre.');
      btn.disabled = true;
      btn.textContent = 'Verifica…';
      try {
        ({ key, data } = await RS.crypto.openClient(file, k, pin));
        store.set(slug, pin, document.getElementById('rem').checked);
        show();
      } catch (err) {
        await new Promise((r) => setTimeout(r, 600));
        btn.disabled = false;
        btn.textContent = 'Apri il rendiconto';
        document.getElementById('perr').textContent = 'PIN errato. Controlla e riprova.';
        form.classList.remove('shake');
        void form.offsetWidth;
        form.classList.add('shake');
        input.select();
      }
    });
  }

  /* ---------- render ---------- */
  function nameHTML(n) {
    const parts = String(n || '').trim().split(/\s+/);
    if (parts.length < 2) return esc(n);
    const last = parts.pop();
    return `${esc(parts.join(' '))} <span>${esc(last)}</span>`;
  }

  function cardHTML(w) {
    let inner;
    if (w.media && w.media[0]) inner = `<img data-media="${esc(w.media[0])}" alt="">`;
    else if (w.type === 'published' && RS.igEmbed(w.url)) inner = `<iframe src="${esc(RS.igEmbed(w.url))}" loading="lazy" scrolling="no" tabindex="-1" title="Post Instagram"></iframe>`;
    else inner = `<div class="ph">${I.draft}<span>${esc(w.title || 'Contenuto')}</span></div>`;
    const badge = w.type === 'draft' ? `<span class="badge draft">${I.draft} Bozza</span>` : `<span class="badge">${I.ig} Pubblicato</span>`;
    return `<button class="card" data-open="${esc(w.id)}" aria-label="${esc(w.title || 'Apri contenuto')}">
      ${badge}<div class="frame">${inner}</div>
      <div class="shade">${esc(w.title || RS.TYPE_LABEL[w.type])}<small>${RS.fmtDate(w.date)}</small></div>
    </button>`;
  }

  function render() {
    const c = data.client;
    const owner = (data.owner && data.owner.name) || '';
    const heroWorks = L.works.slice().reverse();
    const pct = L.total ? Math.min(100, Math.round((L.paid / L.total) * 100)) : 0;
    const settled = L.total > 0 && L.due === 0;
    const handle = (c.handle || '').replace(/^@/, '');
    const pay = L.due > 0 ? RS.payLink(data.owner && data.owner.payLink) : '';

    app.innerHTML = `
      <header class="hero">
        <div class="quote-mark open" aria-hidden="true">“</div>
        <div class="quote-mark close" aria-hidden="true">”</div>
        <div class="topbar">
          <div class="brand"><b>Rendiconto</b> <span>social${owner ? ' · ' + esc(owner) : ''}</span></div>
          <button class="btn-ghost" data-act="print">${I.pdf} Esporta PDF</button>
        </div>
        <div class="hero-head">
          <p class="kicker">Rendiconto contenuti</p>
          <h1>${nameHTML(c.name)}</h1>
          <p class="hero-sub">${L.works.length} contenuti realizzati — <b>${L.published}</b> pubblicati e <b>${L.drafts}</b> in bozza${owner ? `, curati da <b>${esc(owner)}</b>` : ''}.</p>
          ${handle ? `<a class="handle" href="https://www.instagram.com/${esc(handle)}/" target="_blank" rel="noopener">${I.ig} @${esc(handle)}</a>` : ''}
        </div>
        ${
          heroWorks.length
            ? `<div class="reel">
                <div class="reel-track" id="track">${heroWorks.map(cardHTML).join('')}</div>
                <div class="reel-nav"><button data-act="prev" aria-label="Precedente">${I.left}</button><button data-act="next" aria-label="Successivo">${I.right}</button></div>
              </div>`
            : `<div class="reel-empty">I contenuti appariranno qui.</div>`
        }
        <svg class="torn" viewBox="0 0 1200 46" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30 L40 22 L70 28 L110 16 L150 26 L190 18 L230 30 L270 20 L320 27 L360 14 L400 25 L450 19 L490 29 L530 17 L580 26 L620 21 L660 30 L700 15 L750 26 L790 20 L830 29 L880 18 L920 27 L960 16 L1010 28 L1050 21 L1090 30 L1130 19 L1170 26 L1200 22 L1200 46 L0 46 Z"/></svg>
      </header>

      <main>
        <section class="summary">
          <div class="kpi"><div class="lbl">Totale</div><div class="val" data-count="${L.total}">${RS.money(0)}</div><div class="hint">${L.works.length} contenuti · IVA inclusa</div></div>
          <div class="kpi"><div class="lbl">Pagato</div><div class="val" data-count="${L.paid}">${RS.money(0)}</div><div class="hint">${L.payments.length} ${L.payments.length === 1 ? 'pagamento' : 'pagamenti'}</div></div>
          <div class="kpi ${settled ? 'done' : 'due'}"><div class="lbl">${settled ? 'Tutto saldato' : 'Residuo'}</div><div class="val" data-count="${L.due}">${RS.money(0)}</div><div class="hint">${
            L.credit ? 'Credito a tuo favore: ' + RS.money(L.credit) : settled ? 'Grazie!' : 'Aggiornato al ' + RS.fmtDate(data.updatedAt.slice(0, 10))
          }</div>${pay ? `<a class="pay-btn" href="${esc(pay)}" target="_blank" rel="noopener">${I.euro} ${RS.payLabel(pay)}</a>` : ''}</div>
          <div class="progress">
            <div class="progress-row"><span>Avanzamento pagamenti</span><span>${pct}%</span></div>
            <div class="bar"><i data-pct="${pct}"></i></div>
          </div>
        </section>

        <section class="receipt-wrap">
          <div class="section-title">
            <h2>Ricevuta digitale</h2>
            <div class="chips" role="group" aria-label="Filtra">
              ${chip('all', 'Tutti', L.works.length)}
              ${chip('published', 'Pubblicati', L.published)}
              ${chip('draft', 'Bozze', L.drafts)}
            </div>
          </div>
          <article class="receipt">
            <div class="r-head">
              <div><h3>Rendiconto</h3><div class="big">${esc(c.name)}</div></div>
              <div class="r-meta">
                ${owner ? `<div>Fornitore <b>${esc(owner)}</b></div>` : ''}
                <div>Aggiornato al <b>${RS.fmtDate(data.updatedAt.slice(0, 10))}</b></div>
                <div>Importi <b>IVA inclusa</b></div>
              </div>
            </div>
            <ul class="r-list" id="rows"></ul>
            <div class="r-block">
              <h4>Pagamenti ricevuti</h4>
              ${
                L.payments.length
                  ? L.payments
                      .map(
                        (p) => `<div class="r-line"><div>${RS.fmtDate(p.date)}${p.method ? ' · ' + esc(p.method) : ''}${p.note ? `<small>${esc(p.note)}</small>` : ''}${paidFor(p)}</div><div class="neg">− ${RS.money(p.amount)}</div></div>`
                      )
                      .join('')
                  : '<div class="r-line"><div style="color:var(--muted)">Nessun pagamento registrato</div></div>'
              }
            </div>
            <div class="r-block">
              <div class="r-line"><div>Totale contenuti</div><div><b>${RS.money(L.total)}</b></div></div>
              <div class="r-line"><div>Totale pagato</div><div class="neg">− ${RS.money(L.paid)}</div></div>
              ${L.credit ? `<div class="r-line"><div>Credito a tuo favore</div><div><b>${RS.money(L.credit)}</b></div></div>` : ''}
            </div>
            <div class="r-total"><span>Residuo</span><strong>${RS.money(L.due)}</strong></div>
            ${pay ? `<p class="pay-print">Puoi pagare su: ${esc(pay.replace(/^https:\/\//, '').replace(/\/$/, ''))}</p>` : ''}
            ${settled ? '<div class="stamp">SALDATO</div>' : ''}
            <p class="r-foot">Documento di rendicontazione dei servizi social. Non costituisce documento fiscale.</p>
          </article>
        </section>

        <footer class="page-foot">
          <button class="btn" data-act="print">${I.pdf} Scarica PDF</button>
          <div>${owner ? esc(owner) + ' · ' : ''}Rendiconto social</div>
        </footer>
      </main>`;

    renderRows();
    hydrateMedia(app);
    countUp();
    setupReel();
  }

  let filter = 'all';
  function chip(id, label, n) {
    return `<button class="chip" data-filter="${id}" aria-pressed="${filter === id}">${label}<b>${n}</b></button>`;
  }
  function filtered() {
    return L.works.filter((w) =>
      filter === 'all' ? true : filter === 'open' ? L.status[w.id].state !== 'saldato' : w.type === filter
    );
  }
  function renderRows() {
    const rows = filtered();
    const ul = document.getElementById('rows');
    ul.innerHTML = rows.length
      ? rows
          .map((w) => {
            const st = L.status[w.id];
            const thumb = w.media && w.media[0] ? `<img data-media="${esc(w.media[0])}" alt="">` : w.type === 'published' ? I.ig : I.draft;
            return `<li class="r-row" tabindex="0" data-open="${esc(w.id)}">
              <div class="r-thumb">${thumb}</div>
              <div style="min-width:0">
                <div class="r-title">${esc(w.title || RS.TYPE_LABEL[w.type])}</div>
                <div class="r-sub"><span>${RS.fmtDate(w.date)}</span><span class="tag ${w.type === 'draft' ? 'draft' : ''}">${RS.TYPE_LABEL[w.type]}</span>${
                  st.state === 'da_saldare' ? '' : `<span class="state ${st.state}">${ST[st.state]}${st.state === 'parziale' ? ' · ' + RS.money(st.covered) : ''}</span>`
                }</div>
              </div>
              <div class="r-price">${RS.money(w.price)}</div>
            </li>`;
          })
          .join('')
      : '<li class="r-empty">Nessun contenuto in questa vista.</li>';
    hydrateMedia(ul);
  }

  function countUp() {
    const els = app.querySelectorAll('[data-count]');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    const dur = 1100;
    function tick(t) {
      const p = reduce ? 1 : Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      els.forEach((el) => (el.textContent = RS.money(Math.round(+el.dataset.count * e))));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => app.querySelectorAll('[data-pct]').forEach((b) => (b.style.width = b.dataset.pct + '%')))
    );
  }

  /* carosello che scorre da solo; si ferma quando ci si interagisce */
  let reelTimer;
  function setupReel() {
    const track = document.getElementById('track');
    clearInterval(reelTimer);
    if (!track) return;
    let pausedUntil = 0;
    const pause = (ms) => (pausedUntil = Date.now() + ms);
    ['pointerenter', 'focusin'].forEach((ev) => track.addEventListener(ev, () => pause(1e9)));
    ['pointerleave', 'focusout'].forEach((ev) => track.addEventListener(ev, () => pause(1500)));
    track.addEventListener('touchstart', () => pause(7000), { passive: true });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    reelTimer = setInterval(() => {
      if (Date.now() < pausedUntil || document.hidden || document.querySelector('.modal')) return;
      step(track, 1);
    }, 3600);
  }
  function step(track, dir) {
    const card = track.querySelector('.card');
    if (!card) return;
    const w = card.getBoundingClientRect().width + 18;
    const max = track.scrollWidth - track.clientWidth;
    if (dir > 0 && track.scrollLeft >= max - 4) track.scrollTo({ left: 0, behavior: 'smooth' });
    else if (dir < 0 && track.scrollLeft <= 4) track.scrollTo({ left: max, behavior: 'smooth' });
    else track.scrollBy({ left: dir * w, behavior: 'smooth' });
  }

  /* ---------- modale dettaglio ---------- */
  let openId = null;
  function openWork(id) {
    const w = L.works.find((x) => x.id === id);
    if (!w) return;
    openId = id;
    const st = L.status[id];
    let mediaHTML;
    if (w.type === 'published' && RS.igEmbed(w.url)) {
      mediaHTML = `<iframe src="${esc(RS.igEmbed(w.url, true))}" title="Post Instagram" allowtransparency="true"></iframe>`;
    } else if (w.media && w.media.length) {
      mediaHTML = `<div class="slides" data-i="0">
        ${w.media.map((m, i) => `<img data-media="${esc(m)}" alt="" ${i ? 'hidden' : ''}>`).join('')}
        ${
          w.media.length > 1
            ? `<button class="nav prev" data-slide="-1" aria-label="Immagine precedente">${I.left}</button><button class="nav next" data-slide="1" aria-label="Immagine successiva">${I.right}</button>
               <div class="dots">${w.media.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div>`
            : ''
        }
      </div>`;
    } else {
      mediaHTML = `<div style="color:#fff;opacity:.7;padding:40px;text-align:center">Nessuna anteprima</div>`;
    }
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(w.title || 'Contenuto')}">
      <button class="x" data-act="close" aria-label="Chiudi">${I.x}</button>
      <div class="sheet-media">${mediaHTML}</div>
      <div class="sheet-body">
        <div><span class="tag ${w.type === 'draft' ? 'draft' : ''}">${RS.TYPE_LABEL[w.type]}</span></div>
        <h3>${esc(w.title || RS.TYPE_LABEL[w.type])}</h3>
        <div class="facts">
          <div class="fact"><span>Data</span><b>${RS.fmtDate(w.date)}</b></div>
          <div class="fact"><span>Importo</span><b>${RS.money(w.price)}</b></div>
          <div class="fact"><span>Stato</span><b class="state ${st.state}">${ST[st.state]}</b></div>
          <div class="fact"><span>Coperto</span><b>${RS.money(st.covered)}</b></div>
        </div>
        ${w.caption ? `<div class="caption">${esc(w.caption)}</div>` : ''}
        ${
          w.type === 'draft'
            ? '<p style="margin:0;font-size:13px;color:var(--muted)">Contenuto realizzato e consegnato, non pubblicato.</p>'
            : ''
        }
        <div class="sheet-actions">
          ${w.type === 'published' && w.url ? `<a class="primary" href="${esc(RS.igLink(w.url))}" target="_blank" rel="noopener">${I.ext} Apri su Instagram</a>` : ''}
          <button data-act="close">Chiudi</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(m);
    document.body.style.overflow = 'hidden';
    hydrateMedia(m);
    m.querySelector('.x').focus();
  }
  function closeModal() {
    const m = document.querySelector('.modal');
    if (m) m.remove();
    document.body.style.overflow = '';
    openId = null;
  }

  /* ---------- eventi ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act],[data-open],[data-filter],[data-slide]');
    if (e.target.classList.contains('modal')) return closeModal();
    if (!t) return;
    if (t.dataset.open) return openWork(t.dataset.open);
    if (t.dataset.filter) {
      filter = t.dataset.filter;
      document.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c.dataset.filter === filter));
      return renderRows();
    }
    if (t.dataset.slide) {
      const box = t.closest('.slides');
      const imgs = box.querySelectorAll('img');
      const i = (+box.dataset.i + +t.dataset.slide + imgs.length) % imgs.length;
      box.dataset.i = i;
      imgs.forEach((im, j) => (im.hidden = j !== i));
      box.querySelectorAll('.dots i').forEach((d, j) => d.classList.toggle('on', j === i));
      return;
    }
    const act = t.dataset.act;
    if (act === 'print') window.print();
    else if (act === 'close') closeModal();
    else if (act === 'prev' || act === 'next') step(document.getElementById('track'), act === 'next' ? 1 : -1);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return closeModal();
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.open && e.target.tagName === 'LI') openWork(e.target.dataset.open);
    if (openId && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const list = filtered();
      const i = list.findIndex((w) => w.id === openId);
      const next = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
      closeModal();
      if (next) openWork(next.id);
    }
  });

  // se cambia la chiave nel link (stessa pagina), ricarica da capo
  window.addEventListener('hashchange', () => location.reload());

  boot();
})();
