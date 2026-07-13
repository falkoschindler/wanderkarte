(async () => {
  'use strict';

  /* ---------- Daten ---------- */
  const RAW = await fetch('termine.json').then(r => r.json());

  const parseDate = s => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = RAW
    .map(e => ({ ...e, dateObj: parseDate(e.date), isFuture: parseDate(e.date) > today }))
    .sort((a, b) => a.dateObj - b.dateObj);

  const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const MONTHS_SHORT = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  const WEEKDAYS = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  const fmtDate = d => `${WEEKDAYS[d.getDay()]} ${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  const fmtMonth = d => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

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
  const defaultLo = boundaries.findIndex(b => b.getTime() === monthStart(addMonths(today, -12)).getTime());
  let lo = defaultLo >= 0 ? defaultLo : 0;
  let hi = boundaries.length - 1;

  /* ---------- Karte ---------- */
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const map = L.map('map', { zoomControl: true }).setView([51.9607, 7.6261], 13);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

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
      color: '#FBFCFA',
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
      const containers = await fetch('glascontainer.json').then(r => r.json());
      containers.forEach(c => L.circleMarker([c.lat, c.lng], {
        pane: 'glass',
        radius: 4,
        stroke: false,
        fillColor: '#4A7FA5',
        fillOpacity: 0.65,
      }).bindTooltip(`${c.ort} (${c.viertel})`, { direction: 'top', offset: [0, -4] })
        .addTo(glassLayer));
    }
    if (glassToggle.checked) glassLayer.addTo(map);
    else map.removeLayer(glassLayer);
  });

  const inRange = e => e.dateObj >= boundaries[lo] && e.dateObj < boundaries[hi];

  function popupHtml(g) {
    const visible = g.events.filter(inRange);
    const rows = visible.map(e => `
      <div class="popup-date${e.isFuture ? ' future' : ''}"><i></i>${fmtDate(e.dateObj)}</div>
      ${e.note ? `<div class="popup-note">${e.note}</div>` : ''}`).join('');
    return `<div class="popup-loc">${visible[0]?.location ?? g.events[0].location}</div>${rows}`;
  }

  function updateMap() {
    markers.forEach(({ marker, group }) => {
      const visible = group.events.filter(inRange);
      if (visible.length === 0) {
        map.removeLayer(marker);
        return;
      }
      const anyFuture = visible.some(e => e.isFuture);
      marker.setStyle({ fillColor: anyFuture ? '#E2571B' : '#2F6B4F' });
      marker.setRadius(visible.length > 1 ? 11 : 9);
      marker.bindPopup(popupHtml(group));
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
        <span class="loc">${e.location}</span>
        ${e.note ? `<span class="note">${e.note}</span>` : ''}`;
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
    if (b.getMonth() === 0 || i === 0) {
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

  function applySelection() {
    renderTimeline();
    updateList();
    updateMap();
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

  /* ---------- Start ---------- */
  applySelection();
  fitVisible();
  addEventListener('resize', () => map.invalidateSize());
})();
