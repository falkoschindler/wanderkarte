document.documentElement.classList.add('js');

(async () => {
  'use strict';

  /* ---------- Daten ---------- */
  const RAW = await fetch('termine.json', { cache: 'no-cache' }).then(r => r.json());

  const DEFAULT_TIME = '13:00';   // Uhrzeit, wenn im Termin kein "time" steht
  const DURATION_MIN = 90;

  const parseDate = s => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = RAW
    .map(e => ({ ...e, dateObj: parseDate(e.date), isFuture: parseDate(e.date) >= today }))
    .sort((a, b) => a.dateObj - b.dateObj);

  const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const MONTHS_SHORT = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  const WEEKDAYS = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  const WEEKDAYS_LONG = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = d => `${WEEKDAYS[d.getDay()]} ${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
  const fmtMonth = d => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const fmtLong = d => `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Nächster Termin ---------- */
  const upcoming = events.filter(e => e.isFuture);
  const nextCard = document.getElementById('next-card');
  const nextFollowing = document.getElementById('next-following');

  function icsUrl(e) {
    const [h, min] = (e.time ?? DEFAULT_TIME).split(':').map(Number);
    const start = new Date(e.dateObj);
    start.setHours(h, min, 0, 0);
    const end = new Date(start.getTime() + DURATION_MIN * 60000);
    const local = d => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const ical = s => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Muellwandern Muenster//Termine//DE',
      'BEGIN:VEVENT',
      `UID:${e.date}@muellwandern-muenster`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${local(start)}`,
      `DTEND:${local(end)}`,
      'SUMMARY:Müllwandern Münster – Clean-Up',
      `LOCATION:${ical(e.location)}`,
      'DESCRIPTION:Greifzangen, Handschuhe und Säcke werden gestellt. Infos: instagram.com/muellwandern.muenster',
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    return URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
  }

  function renderNext() {
    if (!upcoming.length) {
      nextCard.innerHTML = '<p class="next-loading">Für die kommenden Monate steht noch kein Termin fest – schau auf Instagram vorbei.</p>';
      return;
    }
    const e = upcoming[0];
    const days = Math.round((e.dateObj - today) / 86400000);
    const countdown = days === 0 ? 'heute' : days === 1 ? 'morgen' : `in ${days} Tagen`;
    const time = e.time ?? DEFAULT_TIME;
    const osm = e.lat != null
      ? `https://www.openstreetmap.org/?mlat=${e.lat}&mlon=${e.lng}#map=18/${e.lat}/${e.lng}`
      : null;

    nextCard.innerHTML = `
      <div class="next-date">
        <span class="weekday">${WEEKDAYS_LONG[e.dateObj.getDay()]}</span>
        <span class="day">${e.dateObj.getDate()}</span>
        <span class="month">${MONTHS_SHORT[e.dateObj.getMonth()]} ${e.dateObj.getFullYear()}</span>
      </div>
      <div class="next-body">
        <h3>${esc(e.location)}</h3>
        <p class="next-meta">
          <span>${time} Uhr</span><span>ca. ${DURATION_MIN} Minuten</span>
          <span class="next-countdown">${countdown}</span>
        </p>
        ${e.note ? `<p class="next-note">${esc(e.note)}</p>` : ''}
        <p>Greifzangen, Handschuhe und Müllsäcke bringen wir mit. Keine Anmeldung nötig – komm einfach dazu.</p>
        <div class="next-actions">
          <a class="btn btn-primary" href="#" data-ics>In den Kalender</a>
          ${e.lat != null ? '<a class="btn" href="#karte" data-focus>Auf der Karte zeigen</a>' : ''}
          ${osm ? `<a class="btn" href="${osm}" target="_blank" rel="noopener">Treffpunkt öffnen</a>` : ''}
        </div>
      </div>`;

    const icsLink = nextCard.querySelector('[data-ics]');
    icsLink.href = icsUrl(e);
    icsLink.download = `muellwandern-${e.date}.ics`;

    const focusLink = nextCard.querySelector('[data-focus]');
    if (focusLink) {
      focusLink.addEventListener('click', ev => {
        ev.preventDefault();
        focusEvent(e);
      });
    }

    const following = upcoming.slice(1, 4);
    if (following.length) {
      nextFollowing.innerHTML = `Danach: <b>${following.map(f => esc(fmtLong(f.dateObj))).join(' · ')}</b>.`;
    }
  }

  /* ---------- Zahlen ---------- */
  const spots = new Set(events.filter(e => e.lat != null).map(e => `${e.lat},${e.lng}`));
  const figure = (key, value) => {
    const el = document.querySelector(`[data-figure="${key}"]`);
    if (el) el.textContent = value;
  };
  figure('events', events.length);
  figure('spots', spots.size);

  /* ---------- Zeitdomäne: Monatsgrenzen ---------- */
  const monthStart = d => new Date(d.getFullYear(), d.getMonth(), 1);
  const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);

  const domainStart = monthStart(events[0].dateObj);
  const lastEvent = events[events.length - 1].dateObj;
  const domainEnd = addMonths(monthStart(lastEvent > today ? lastEvent : today), 1);

  const boundaries = [];
  for (let d = domainStart; d <= domainEnd; d = addMonths(d, 1)) boundaries.push(d);

  const t0 = domainStart.getTime();
  const t1 = domainEnd.getTime();
  const frac = date => (date.getTime() - t0) / (t1 - t0);

  /* Auswahl als Indizes in `boundaries` (lo inklusiv, hi exklusiv als Grenze) */
  const clampIdx = (i, min, max) => Math.max(min, Math.min(max, i));
  const lastIdx = boundaries.length - 1;
  const idxOfMonth = d => boundaries.findIndex(b => b.getTime() === monthStart(d).getTime());

  /* Voreingestellte Zeiträume – die Schalter unter der Karte */
  function presetRange(key) {
    if (key === 'all') return [0, lastIdx];
    if (key === 'next') {
      const i = idxOfMonth(today);
      return [i < 0 ? 0 : i, lastIdx];
    }
    const start = idxOfMonth(new Date(today.getFullYear(), 0, 1));
    const end = idxOfMonth(new Date(today.getFullYear() + 1, 0, 1));
    return [start < 0 ? 0 : start, end < 0 ? lastIdx : end];
  }

  let [lo, hi] = presetRange('year');
  if (hi <= lo) [lo, hi] = presetRange('all');

  /* ---------- Karte ---------- */
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const map = L.map('map', { zoomControl: true, scrollWheelZoom: false }).setView([51.9607, 7.6261], 13);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  /* Mausrad zoomt erst nach einem Klick in die Karte – sonst würde Scrollen auf der Seite hängen bleiben */
  map.on('click', () => map.scrollWheelZoom.enable());
  map.getContainer().addEventListener('mouseleave', () => map.scrollWheelZoom.disable());

  /* Termine nach Ort gruppieren (gleiche Koordinaten = ein Marker) */
  const groups = new Map();
  events.forEach(e => {
    if (e.lat == null || e.lng == null) return;
    const key = `${e.lat},${e.lng}`;
    if (!groups.has(key)) groups.set(key, { lat: e.lat, lon: e.lng, events: [] });
    groups.get(key).events.push(e);
  });

  const markers = new Map();
  groups.forEach((g, key) => {
    const marker = L.circleMarker([g.lat, g.lon], {
      radius: 9,
      weight: 2.5,
      color: '#FFFFFF',
      fillOpacity: 0.95,
    });
    marker.on('popupopen', () => setActiveListItem(g.events.filter(inRange)[0]));
    markers.set(key, { marker, group: g });
  });

  /* ---------- Altglascontainer (optional einblendbar) ---------- */
  const glassPane = map.createPane('glass');
  glassPane.style.zIndex = 380; // unter den Termin-Markern (overlayPane: 400)
  const glassLayer = L.layerGroup();
  const glassToggle = document.getElementById('glass-toggle');
  let glassLoaded = false;
  glassToggle.addEventListener('change', async () => {
    if (glassToggle.checked && !glassLoaded) {
      glassLoaded = true;
      const containers = await fetch('glascontainer.json', { cache: 'no-cache' }).then(r => r.json());
      containers.forEach(c => L.circleMarker([c.lat, c.lng], {
        pane: 'glass',
        radius: 4.5,
        weight: 1,
        color: '#2F2A27',
        opacity: 0.45,
        fillColor: '#E8B1F8',
        fillOpacity: 0.9,
      }).bindTooltip(`${c.ort} (${c.viertel})`, { direction: 'top', offset: [0, -4] })
        .addTo(glassLayer));
    }
    if (glassToggle.checked) glassLayer.addTo(map);
    else map.removeLayer(glassLayer);
  });

  const inRange = e => e.dateObj >= boundaries[lo] && e.dateObj < boundaries[hi];

  /* Instagram-Glyph fürs Popup */
  const IG_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="17.8" cy="6.2" r="1.3" class="ig-dot"/></svg>`;

  function popupHtml(g) {
    const visible = g.events.filter(inRange);
    /* Foto des jüngsten sichtbaren Termins, der eins hat */
    const shot = [...visible].reverse().find(e => e.photo && e.post);
    const photo = shot ? `
      <a class="popup-photo" href="${esc(shot.post)}" target="_blank" rel="noopener">
        <img src="${esc(shot.photo)}" width="540" height="405" loading="lazy"
             alt="Gruppenfoto vom Clean-Up am ${fmtDate(shot.dateObj)}">
        <span class="popup-photo-cta">${IG_ICON}Auf Instagram ansehen</span>
      </a>` : '';
    const rows = visible.map(e => `
      <div class="popup-date${e.isFuture ? ' future' : ''}"><i></i>${fmtDate(e.dateObj)}</div>
      ${e.note ? `<div class="popup-note">${esc(e.note)}</div>` : ''}`).join('');
    return `${photo}<div class="popup-body">
      <div class="popup-loc">${esc(visible[0]?.location ?? g.events[0].location)}</div>${rows}
    </div>`;
  }

  function updateMap() {
    markers.forEach(({ marker, group }) => {
      const visible = group.events.filter(inRange);
      if (visible.length === 0) {
        map.removeLayer(marker);
        return;
      }
      const anyFuture = visible.some(e => e.isFuture);
      marker.setStyle({ fillColor: anyFuture ? '#F66C72' : '#127354' });
      marker.setRadius(visible.length > 1 ? 11 : 9);
      marker.bindPopup(popupHtml(group), { minWidth: 230, maxWidth: 260 });
      if (!map.hasLayer(marker)) marker.addTo(map);
    });
  }

  function fitVisible() {
    const pts = [];
    markers.forEach(({ group }) => {
      if (group.events.some(inRange)) pts.push([group.lat, group.lon]);
    });
    if (pts.length) map.fitBounds(pts, { padding: [45, 45], animate: !reducedMotion });
  }

  /* Einen Termin sichtbar machen: Zeitraum ggf. aufziehen, hinscrollen, Popup öffnen */
  function focusEvent(e) {
    if (e.lat == null) return;
    const idx = boundaries.findIndex(b => b.getTime() === monthStart(e.dateObj).getTime());
    if (idx >= 0) {
      lo = Math.min(lo, idx);
      hi = Math.max(hi, idx + 1);
      applySelection();
    }
    document.getElementById('karte').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    const entry = markers.get(`${e.lat},${e.lng}`);
    if (!entry) return;
    map.flyTo([e.lat, e.lng], Math.max(map.getZoom(), 15), { animate: !reducedMotion, duration: 0.8 });
    setTimeout(() => entry.marker.openPopup(), reducedMotion ? 0 : 600);
  }

  /* ---------- Liste ---------- */
  const listEl = document.getElementById('list');
  const countEl = document.getElementById('count');

  function setActiveListItem(e) {
    listEl.querySelectorAll('.event.active').forEach(el => el.classList.remove('active'));
    if (!e) return;
    const el = listEl.querySelector(`[data-date="${e.date}"]`);
    if (el) {
      el.classList.add('active');
      el.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }

  function updateList() {
    const visible = events.filter(inRange).sort((a, b) => b.dateObj - a.dateObj);
    listEl.innerHTML = '';
    if (visible.length === 0) {
      listEl.innerHTML = '<div class="empty">Keine Termine im gewählten Zeitraum. Zieh die Griffe am Zeitstrahl weiter auf.</div>';
    }
    let year = null;
    visible.forEach(e => {
      if (e.dateObj.getFullYear() !== year) {
        year = e.dateObj.getFullYear();
        const div = document.createElement('div');
        div.className = 'year-divider';
        div.textContent = year;
        listEl.appendChild(div);
      }
      const item = document.createElement('div');
      item.className = 'event' + (e.isFuture ? ' future' : '') + (e.lat == null ? ' nomap' : '');
      item.dataset.date = e.date;
      item.innerHTML = `
        <span class="dot"></span>
        <span class="date">${fmtDate(e.dateObj)}${e.isFuture ? '<span class="badge">geplant</span>' : ''}</span>
        <span class="loc">${esc(e.location)}</span>
        ${e.note ? `<span class="note">${esc(e.note)}</span>` : ''}`;
      if (e.lat != null) {
        item.addEventListener('click', () => {
          const entry = markers.get(`${e.lat},${e.lng}`);
          if (!entry) return;
          map.flyTo([e.lat, e.lng], Math.max(map.getZoom(), 14), { animate: !reducedMotion, duration: 0.6 });
          entry.marker.openPopup();
          setActiveListItem(e);
        });
      }
      listEl.appendChild(item);
    });
    countEl.textContent = `${visible.length} von ${events.length} Terminen`;
  }

  /* ---------- Zeitstrahl ---------- */
  const tl = document.getElementById('timeline');
  const rangeLabel = document.getElementById('range-label');

  const track = document.createElement('div');
  track.className = 'tl-track';
  tl.appendChild(track);

  boundaries.forEach((b, i) => {
    if (i === boundaries.length - 1) return;
    const tick = document.createElement('div');
    tick.className = 'tl-tick' + (b.getMonth() === 0 ? ' year' : '');
    tick.style.left = `${frac(b) * 100}%`;
    tl.appendChild(tick);
    /* Beschriftung: jeder Januar, dazu der Domänenanfang – außer er klebt am ersten Januar */
    const firstJanuary = boundaries.find(x => x.getMonth() === 0);
    const crowded = i === 0 && firstJanuary && frac(firstJanuary) - frac(b) < 0.05;
    if ((b.getMonth() === 0 || i === 0) && !crowded) {
      const label = document.createElement('div');
      label.className = 'tl-tick-label';
      label.style.left = `${frac(b) * 100}%`;
      label.textContent = b.getMonth() === 0 ? String(b.getFullYear()) : `${MONTHS_SHORT[b.getMonth()]} ${b.getFullYear()}`;
      tl.appendChild(label);
    }
  });

  if (today >= domainStart && today <= domainEnd) {
    const t = document.createElement('div');
    t.className = 'tl-today';
    t.style.left = `${frac(today) * 100}%`;
    tl.appendChild(t);
    const tLabel = document.createElement('div');
    tLabel.className = 'tl-today-label';
    tLabel.style.left = `${frac(today) * 100}%`;
    tLabel.textContent = 'heute';
    tl.appendChild(tLabel);
  }

  const dots = events.map(e => {
    const dot = document.createElement('div');
    dot.className = 'tl-dot' + (e.isFuture ? ' future' : '');
    dot.style.left = `${frac(e.dateObj) * 100}%`;
    dot.title = `${fmtDate(e.dateObj)} – ${e.location}`;
    tl.appendChild(dot);
    return { dot, e };
  });

  const windowEl = document.createElement('div');
  windowEl.className = 'tl-window';
  tl.appendChild(windowEl);

  const mkHandle = label => {
    const h = document.createElement('button');
    h.className = 'tl-handle';
    h.setAttribute('aria-label', label);
    tl.appendChild(h);
    return h;
  };
  const handleLo = mkHandle('Zeitraum-Beginn');
  const handleHi = mkHandle('Zeitraum-Ende');

  function renderTimeline() {
    const xLo = frac(boundaries[lo]) * 100;
    const xHi = frac(boundaries[hi]) * 100;
    handleLo.style.left = `${xLo}%`;
    handleHi.style.left = `${xHi}%`;
    windowEl.style.left = `${xLo}%`;
    windowEl.style.width = `${xHi - xLo}%`;
    dots.forEach(({ dot, e }) => dot.classList.toggle('in', inRange(e)));
    const endMonth = addMonths(boundaries[hi], -1);
    rangeLabel.textContent = `${fmtMonth(boundaries[lo])} – ${fmtMonth(endMonth)}`;
    handleLo.setAttribute('aria-valuetext', fmtMonth(boundaries[lo]));
    handleHi.setAttribute('aria-valuetext', fmtMonth(endMonth));
  }

  /* ---------- Voreinstellungen ---------- */
  const presetButtons = [...document.querySelectorAll('.preset')];
  presetButtons.forEach(btn => {
    if (btn.dataset.preset === 'year') btn.textContent = String(today.getFullYear());
    if (btn.dataset.preset === 'all') btn.textContent = `Alle ${events.length}`;
    btn.addEventListener('click', () => {
      [lo, hi] = presetRange(btn.dataset.preset);
      applySelection();
      fitVisible();
    });
  });

  function syncPresets() {
    presetButtons.forEach(btn => {
      const [pLo, pHi] = presetRange(btn.dataset.preset);
      const active = pLo === lo && pHi === hi;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
    });
  }

  function applySelection() {
    renderTimeline();
    updateList();
    updateMap();
    syncPresets();
  }

  const idxFromClientX = clientX => {
    const rect = tl.getBoundingClientRect();
    const f = (clientX - rect.left) / rect.width;
    return clampIdx(Math.round(f * (boundaries.length - 1)), 0, boundaries.length - 1);
  };

  function dragHandle(handle, isLo) {
    handle.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      handle.setPointerCapture(ev.pointerId);
      const move = e2 => {
        const i = idxFromClientX(e2.clientX);
        if (isLo) lo = clampIdx(i, 0, hi - 1);
        else hi = clampIdx(i, lo + 1, boundaries.length - 1);
        applySelection();
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        fitVisible();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
    });
    handle.addEventListener('keydown', ev => {
      const step = { ArrowLeft: -1, ArrowRight: 1 }[ev.key];
      if (step === undefined && ev.key !== 'Home' && ev.key !== 'End') return;
      ev.preventDefault();
      if (isLo) {
        lo = ev.key === 'Home' ? 0 : ev.key === 'End' ? hi - 1 : clampIdx(lo + step, 0, hi - 1);
      } else {
        hi = ev.key === 'End' ? boundaries.length - 1 : ev.key === 'Home' ? lo + 1 : clampIdx(hi + step, lo + 1, boundaries.length - 1);
      }
      applySelection();
      fitVisible();
    });
  }
  dragHandle(handleLo, true);
  dragHandle(handleHi, false);

  /* Fenster als Ganzes verschieben */
  windowEl.addEventListener('pointerdown', ev => {
    ev.preventDefault();
    windowEl.setPointerCapture(ev.pointerId);
    const startIdx = idxFromClientX(ev.clientX);
    const startLo = lo, startHi = hi;
    const width = hi - lo;
    const move = e2 => {
      const delta = idxFromClientX(e2.clientX) - startIdx;
      lo = clampIdx(startLo + delta, 0, boundaries.length - 1 - width);
      hi = lo + width;
      applySelection();
    };
    const up = () => {
      windowEl.removeEventListener('pointermove', move);
      windowEl.removeEventListener('pointerup', up);
      fitVisible();
    };
    windowEl.addEventListener('pointermove', move);
    windowEl.addEventListener('pointerup', up);
  });

  /* ---------- Navigation: aktiven Abschnitt markieren ---------- */
  const navLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const sections = navLinks
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const seen = new Map();
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => seen.set(en.target.id, en.intersectionRatio));
      let best = null, bestRatio = 0;
      seen.forEach((ratio, id) => { if (ratio > bestRatio) { bestRatio = ratio; best = id; } });
      navLinks.forEach(a => a.classList.toggle('current', best !== null && a.getAttribute('href') === `#${best}`));
    }, { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] });
    sections.forEach(s => io.observe(s));
  }

  /* ---------- Impressum/Datenschutz im Footer auf- und zuklappen ---------- */
  const legalLinks = [...document.querySelectorAll('.foot-links a[aria-controls]')];
  const setLegal = (id, open) => {
    legalLinks.forEach(a => {
      const panel = document.getElementById(a.getAttribute('aria-controls'));
      const on = open && a.getAttribute('aria-controls') === id;
      panel.classList.toggle('is-open', on);
      a.setAttribute('aria-expanded', String(on));
    });
  };
  // Nach dem Aufklappen den Block ins Bild holen – der Footer wächst sonst unsichtbar nach unten
  document.querySelectorAll('.legal-body').forEach(panel => panel.addEventListener('transitionend', ev => {
    if (ev.target === panel && panel.classList.contains('is-open')) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }));
  legalLinks.forEach(a => a.addEventListener('click', ev => {
    ev.preventDefault();
    const id = a.getAttribute('aria-controls');
    setLegal(id, a.getAttribute('aria-expanded') !== 'true');
  }));
  const openLegalFromHash = () => {
    const id = location.hash.slice(1);
    if (legalLinks.some(a => a.getAttribute('aria-controls') === id)) setLegal(id, true);
  };
  openLegalFromHash();
  window.addEventListener('hashchange', openLegalFromHash);

  /* ---------- Start ---------- */
  renderNext();
  applySelection();
  fitVisible();
  addEventListener('resize', () => map.invalidateSize());
})();
