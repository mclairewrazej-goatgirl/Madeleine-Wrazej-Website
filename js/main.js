const header = document.querySelector('.site-header');
const navToggle = document.querySelector('.nav-toggle');
const navLinksList = document.querySelector('.nav-links');
const sections = document.querySelectorAll('section[id]');
const navLinkItems = document.querySelectorAll('.nav-links a');

// Scrolled state for header
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
  updateActiveNavLink();
}, { passive: true });

// Mobile menu toggle
navToggle.addEventListener('click', () => {
  const isOpen = navLinksList.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

// Close mobile menu when a link is clicked
navLinksList.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinksList.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// Highlight active nav link based on scroll position
function updateActiveNavLink() {
  let currentSection = '';
  sections.forEach(section => {
    if (window.scrollY >= section.offsetTop - 90) {
      currentSection = section.getAttribute('id');
    }
  });
  navLinkItems.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${currentSection}`);
  });
}

// Scroll-triggered fade-in animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Run active link check on load
updateActiveNavLink();

// Lightbox
const lightbox = document.getElementById('lightbox');
const lightboxImg = lightbox.querySelector('.lightbox-img');

document.querySelectorAll('.photo-card img').forEach(img => {
  img.addEventListener('click', () => {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
});

lightbox.addEventListener('click', e => {
  if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    lightbox.classList.remove('open');
    closeAllDemos();
  }
});

// Demo modals
function openDemo(id) {
  const modal = document.getElementById('modal-' + id);
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  if (id === 'phenology') initPhenoDemo();
  if (id === 'commuter') initCommuterDemo();
  if (id === 'pika') initPikaDemo();
}

function closeAllDemos() {
  document.querySelectorAll('.demo-modal').forEach(m => m.classList.remove('open'));
  document.body.style.overflow = '';
}

document.querySelectorAll('.demo-modal').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeAllDemos();
  });
});

document.querySelectorAll('.demo-modal-close').forEach(btn => {
  btn.addEventListener('click', closeAllDemos);
});

// ============================================================
// PHENOLOGY DEMO
// ============================================================

// Double logistic (Beck) curve
function gccBeck(doy, gMin, gMax, sl1, sl2, sosP, eosP) {
  const amp = gMax - gMin;
  const e1 = Math.min(700, Math.max(-700, -sl1 * (doy - sosP)));
  const e2 = Math.min(700, Math.max(-700,  sl2 * (doy - eosP)));
  return gMin + amp * (1 / (1 + Math.exp(e1)) + 1 / (1 + Math.exp(e2)) - 1);
}

// SVG coordinate system (viewBox 0 0 700 248)
const PC = { L: 55, R: 675, T: 18, B: 228, DMIN: 95, DMAX: 305, GMIN: 0.284, GMAX: 0.462 };
const pcX = doy => PC.L + (doy - PC.DMIN) / (PC.DMAX - PC.DMIN) * (PC.R - PC.L);
const pcY = gcc => PC.B - (gcc - PC.GMIN) / (PC.GMAX - PC.GMIN) * (PC.B - PC.T);

// Seeded XOR-shift random
function mkRand(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}

function makeCurve(params, n = 200) {
  return Array.from({ length: n }, (_, i) => {
    const doy = PC.DMIN + i / (n - 1) * (PC.DMAX - PC.DMIN);
    return { doy, gcc: gccBeck(doy, ...params) };
  });
}

function curveToPoints(curve) {
  return curve.map(p => `${pcX(p.doy).toFixed(1)},${pcY(p.gcc).toFixed(1)}`).join(' ');
}

function ciPath(curve, half) {
  const top = curve.map(p => `${pcX(p.doy).toFixed(1)},${pcY(p.gcc + half).toFixed(1)}`).join(' ');
  const bot = [...curve].reverse().map(p => `${pcX(p.doy).toFixed(1)},${pcY(p.gcc - half).toFixed(1)}`).join(' ');
  return `M ${top} L ${bot} Z`;
}

function scatterSVG(curve, n, seed, color, opacity) {
  const r = mkRand(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const doy = PC.DMIN + r() * (PC.DMAX - PC.DMIN);
    const idx = Math.round((doy - PC.DMIN) / (PC.DMAX - PC.DMIN) * (curve.length - 1));
    const gcc = curve[Math.min(curve.length - 1, Math.max(0, idx))].gcc + (r() - 0.5) * 0.026;
    if (gcc < PC.GMIN || gcc > PC.GMAX) continue;
    s += `<circle cx="${pcX(doy).toFixed(1)}" cy="${pcY(gcc).toFixed(1)}" r="2.4" fill="${color}" opacity="${opacity}"/>`;
  }
  return s;
}

function aggSVG(curve, n, seed, color) {
  const r = mkRand(seed + 5000);
  return Array.from({ length: n }, (_, i) => {
    const doy = PC.DMIN + i / (n - 1) * (PC.DMAX - PC.DMIN);
    const idx = Math.round(i / (n - 1) * (curve.length - 1));
    const gcc = curve[Math.min(curve.length - 1, idx)].gcc + (r() - 0.5) * 0.007;
    if (gcc < PC.GMIN || gcc > PC.GMAX) return '';
    return `<circle cx="${pcX(doy).toFixed(1)}" cy="${pcY(gcc).toFixed(1)}" r="3.5" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.8"/>`;
  }).join('');
}

const mkVline = (x, y, color) =>
  `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${PC.B}" stroke="${color}" stroke-width="1" stroke-dasharray="3,3" opacity="0.45"/>`;

function markerSVG(type, x, y, color) {
  switch (type) {
    case 'snowFree': {
      const d = 7;
      return `<path d="M${x},${y-d} L${x+d},${y} L${x},${y+d} L${x-d},${y} Z" fill="none" stroke="${color}" stroke-width="1.8"/>`;
    }
    case 'sos':
      return `<polygon points="${x},${y-9} ${x-7},${y+5} ${x+7},${y+5}" fill="${color}" opacity="0.85"/>`;
    case 'peak': {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = i * Math.PI / 5 - Math.PI / 2;
        const rv = i % 2 === 0 ? 9 : 4;
        return `${(x + rv * Math.cos(a)).toFixed(1)},${(y + rv * Math.sin(a)).toFixed(1)}`;
      });
      return `<polygon points="${pts.join(' ')}" fill="${color}" opacity="0.9"/>`;
    }
    case 'eos':
      return `<polygon points="${x},${y+9} ${x-7},${y-5} ${x+7},${y-5}" fill="${color}" opacity="0.85"/>`;
    case 'snowCover': {
      const d = 6;
      return `<line x1="${x-d}" y1="${y-d}" x2="${x+d}" y2="${y+d}" stroke="${color}" stroke-width="2"/>` +
             `<line x1="${x+d}" y1="${y-d}" x2="${x-d}" y2="${y+d}" stroke="${color}" stroke-width="2"/>`;
    }
    default: return '';
  }
}

function axisSVG() {
  const gTicks = [0.30, 0.33, 0.36, 0.39, 0.42, 0.45];
  const months = [
    [105,'Apr'],[135,'May'],[166,'Jun'],[196,'Jul'],[227,'Aug'],[258,'Sep'],[288,'Oct']
  ];
  let s = '';
  for (const g of gTicks) {
    const y = pcY(g).toFixed(1);
    s += `<line x1="${PC.L}" y1="${y}" x2="${PC.R}" y2="${y}" stroke="#E5E7EB" stroke-width="1"/>`;
    s += `<text x="${PC.L-5}" y="${(+y+3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#9CA3AF">${g.toFixed(2)}</text>`;
  }
  s += `<line x1="${PC.L}" y1="${PC.T}" x2="${PC.L}" y2="${PC.B}" stroke="#D1D5DB" stroke-width="1.5"/>`;
  s += `<line x1="${PC.L}" y1="${PC.B}" x2="${PC.R}" y2="${PC.B}" stroke="#D1D5DB" stroke-width="1.5"/>`;
  for (const [doy, lbl] of months) {
    s += `<text x="${pcX(doy).toFixed(1)}" y="${PC.B+14}" text-anchor="middle" font-size="9" fill="#9CA3AF">${lbl}</text>`;
  }
  s += `<text x="${((PC.L+PC.R)/2).toFixed(1)}" y="${PC.B+28}" text-anchor="middle" font-size="10" fill="#6B7280">Day of Year (standard_doy)</text>`;
  s += `<text x="11" y="${((PC.T+PC.B)/2).toFixed(1)}" text-anchor="middle" font-size="10" fill="#6B7280" transform="rotate(-90,11,${((PC.T+PC.B)/2).toFixed(1)})">gcc</text>`;
  return s;
}

function renderGAMChart(groups) {
  let s = axisSVG();
  for (const g of groups) {
    const curve = makeCurve(g.params);
    s += `<path d="${ciPath(curve, 0.008)}" fill="${g.color}" opacity="0.12"/>`;
    s += scatterSVG(curve, 65, g.seed, g.color, 0.35);
    s += aggSVG(curve, 24, g.seed, g.color);
    s += `<polyline points="${curveToPoints(curve)}" fill="none" stroke="${g.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
    for (const [type, doy] of Object.entries(g.events)) {
      const gcc = gccBeck(doy, ...g.params);
      const x = pcX(doy), y = pcY(gcc);
      s += mkVline(x, y, g.color);
      s += markerSVG(type, x, y, g.color);
    }
    s += `<text x="${pcX(g.events.peak).toFixed(1)}" y="${(pcY(gccBeck(g.events.peak,...g.params))-13).toFixed(1)}" text-anchor="middle" font-size="9" fill="${g.color}" font-weight="600">PEAK</text>`;
  }
  return s;
}

function renderCompareChart(methods) {
  const baseCurve = makeCurve(PHENO_GROUPS[0].params);
  let s = axisSVG();
  s += scatterSVG(baseCurve, 65, PHENO_GROUPS[0].seed, '#6B7280', 0.28);
  s += aggSVG(baseCurve, 24, PHENO_GROUPS[0].seed, '#374151');
  for (const m of methods) {
    const curve = makeCurve(m.params);
    s += `<polyline points="${curveToPoints(curve)}" fill="none" stroke="${m.color}" stroke-width="2.2" stroke-linejoin="round"/>`;
    for (const [type, doy] of [['sos', m.events.sos], ['peak', m.events.peak], ['eos', m.events.eos]]) {
      s += markerSVG(type, pcX(doy), pcY(gccBeck(doy, ...m.params)), m.color);
    }
  }
  return s;
}

const PHENO_GROUPS = [
  { label: 'BNF_Meadow_01 | 2024', color: '#1f77b4', seed: 42,
    params: [0.330, 0.448, 0.087, 0.083, 158, 252],
    events: { snowFree: 133, sos: 148, peak: 198, eos: 264, snowCover: 279 } },
  { label: 'YHO_Alpine_03 | 2024', color: '#ff7f0e', seed: 137,
    params: [0.312, 0.430, 0.082, 0.078, 166, 258],
    events: { snowFree: 147, sos: 162, peak: 206, eos: 270, snowCover: 284 } },
];

const PHENO_METHODS = [
  { label: 'GAM (mgcv)', color: '#1f77b4', params: [0.330,0.448,0.087,0.083,158,252],
    events: { sos:148, peak:198, eos:264 }, r2:0.936, rmse:0.0061, aic:-892.4 },
  { label: 'Phenopix spline', color: '#ff7f0e', params: [0.330,0.447,0.090,0.081,156,254],
    events: { sos:151, peak:197, eos:261 }, r2:0.921, rmse:0.0073, aic:-874.1 },
  { label: 'Double logistic + SG', color: '#2ca02c', params: [0.329,0.450,0.085,0.085,160,249],
    events: { sos:145, peak:200, eos:266 }, r2:0.908, rmse:0.0082, aic:-851.7 },
];

function groupLegendHTML(groups) {
  return groups.map(g =>
    `<span class="st-legend-item"><span class="st-legend-line" style="background:${g.color}"></span><span class="st-legend-dot" style="background:${g.color}"></span>${g.label}</span>`
  ).join('');
}

function methodLegendHTML(methods) {
  const obs = `<span class="st-legend-item"><span class="st-legend-dot" style="background:#6B7280;width:10px;height:10px"></span>Raw observed</span>`;
  const lines = methods.map(m =>
    `<span class="st-legend-item"><span class="st-legend-line" style="background:${m.color}"></span>${m.label}</span>`
  ).join('');
  const evLegend = `<span class="st-legend-item" style="gap:4px">
    <svg width="14" height="14"><polygon points="7,1 1,13 13,13" fill="#555"/></svg> SOS
  </span><span class="st-legend-item" style="gap:4px">
    <svg width="14" height="14"><polygon points="7,13 1,1 13,1" fill="#555"/></svg> EOS
  </span>`;
  return obs + lines + evLegend;
}

function buildMetricsTable() {
  const rows = PHENO_GROUPS.map(g => {
    const ev = g.events;
    return `<tr><td>${g.label.split(' | ')[0]}</td><td>${g.label.split(' | ')[1]}</td>
      <td>ts</td><td>25</td><td>23.4</td><td>0.936</td><td>0.941</td><td>98.8%</td><td>-892.4</td>
      <td>${ev.snowFree}</td><td>${ev.sos}</td><td>${ev.peak}</td><td>${ev.eos}</td><td>${ev.snowCover}</td></tr>`;
  }).join('');
  return `<table class="st-tbl"><thead><tr>
    <th>site</th><th>year</th><th>basis</th><th>selected_k</th><th>edf</th>
    <th>R²</th><th>adj_r²</th><th>dev_expl</th><th>AIC</th>
    <th>SnowFree_x</th><th>SOS_x</th><th>PEAK_x</th><th>EOS_x</th><th>SnowCover_x</th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

function buildKTable() {
  const ks  = [10,15,20,25,30,35,40,45,50];
  const eds = [8.2,12.6,17.1,23.4,26.8,29.1,31.2,32.5,33.1];
  const dvs = ['94.1%','96.8%','97.9%','98.8%','99.1%','99.2%','99.3%','99.3%','99.3%'];
  const kIs = ['0.98','1.00','1.04','1.06','1.09','1.11','1.11','1.12','1.13'];
  const wIn = [false,false,false,true,true,true,true,true,true];
  const rows = ks.map((k,i) =>
    `<tr style="${i===3?'background:#f0fdf4;font-weight:600':''}">
      <td>${k}</td><td>ts</td><td>${eds[i]}</td><td>${dvs[i]}</td><td>${kIs[i]}</td>
      <td>${wIn[i]?'<span style="color:#065f46">✓</span>':'<span style="color:#D1D5DB">✗</span>'}</td>
      <td>${i===3?'<span style="color:#1B4332">← selected</span>':''}</td>
    </tr>`
  ).join('');
  return `<table class="st-tbl"><thead><tr>
    <th>k</th><th>basis</th><th>edf</th><th>dev_expl</th><th>k_index</th><th>within_threshold</th><th></th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

function buildSeasonalTable() {
  const rows = PHENO_GROUPS.map(g => {
    const ev = g.events;
    const los = ev.snowCover - ev.snowFree;
    return `<tr><td>${g.label.split(' | ')[0]}</td><td>${g.label.split(' | ')[1]}</td>
      <td>${ev.snowFree}</td><td>${ev.sos}</td><td>${ev.peak}</td><td>${ev.eos}</td><td>${ev.snowCover}</td>
      <td>${los}</td><td>${(0.386*los/10).toFixed(3)}</td><td>Curve shape</td><td>3-day, 90th pct</td></tr>`;
  }).join('');
  return `<table class="st-tbl"><thead><tr>
    <th>site</th><th>year</th><th>snowfree_x</th><th>SOS_x</th><th>peak_x</th>
    <th>EOS_x</th><th>snowcover_x</th><th>LOS</th><th>IVI</th><th>SOS_EOS_logic</th><th>data_aggregation</th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

function buildPreviewTable() {
  const r = mkRand(77);
  const headers = ['site','year','standard_doy','gcc','rcc','bcc','pixel_visibility_fraction','_parsed_date'];
  const rows = Array.from({length:10},(_,i) => {
    const site = i < 5 ? 'BNF_Meadow_01' : 'YHO_Alpine_03';
    const doy = 140 + i * 8;
    const params = i < 5 ? PHENO_GROUPS[0].params : PHENO_GROUPS[1].params;
    const gcc = (gccBeck(doy,...params)+(r()-0.5)*0.012).toFixed(4);
    const mon = doy<152?'05':doy<182?'06':'07';
    return `<tr><td>${site}</td><td>2024</td><td>${doy}</td><td>${gcc}</td>
      <td>${(0.312+r()*0.02).toFixed(4)}</td><td>${(0.284+r()*0.02).toFixed(4)}</td>
      <td>${(0.88+r()*0.1).toFixed(3)}</td><td>2024-${mon}-${String(Math.floor(r()*28)+1).padStart(2,'0')}</td></tr>`;
  }).join('');
  return `<table class="st-tbl"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

function buildCmpMetricsTable(methods) {
  const rows = methods.map(m =>
    `<tr><td>BNF_Meadow_01</td><td>2024</td><td>${m.label}</td>
      <td>${m.r2}</td><td>${m.rmse}</td><td>${m.aic}</td>
      <td>${m.events.sos}</td><td>${m.events.peak}</td><td>${m.events.eos}</td></tr>`
  ).join('');
  return `<table class="st-tbl"><thead><tr>
    <th>site</th><th>year</th><th>method</th><th>R²</th><th>RMSE</th><th>AIC</th>
    <th>SOS_x</th><th>PEAK_x</th><th>EOS_x</th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

let phenoDemoInited = false;
function initPhenoDemo() {
  if (phenoDemoInited) return;
  phenoDemoInited = true;

  // Charts
  const gamSvg = document.getElementById('pheno-gam-svg');
  if (gamSvg) { gamSvg.innerHTML = renderGAMChart(PHENO_GROUPS); }
  document.getElementById('pheno-gam-legend').innerHTML = groupLegendHTML(PHENO_GROUPS);

  const cmpSvg = document.getElementById('pheno-cmp-svg');
  if (cmpSvg) { cmpSvg.innerHTML = renderCompareChart(PHENO_METHODS); }
  document.getElementById('pheno-cmp-legend').innerHTML = methodLegendHTML(PHENO_METHODS);

  // Tables
  document.getElementById('pheno-metrics-tbl').innerHTML = buildMetricsTable();
  document.getElementById('pheno-k-tbl').innerHTML = buildKTable();
  document.getElementById('pheno-seasonal-tbl').innerHTML = buildSeasonalTable();
  document.getElementById('pheno-preview-tbl').innerHTML = buildPreviewTable();
  document.getElementById('cmp-metrics-tbl').innerHTML = buildCmpMetricsTable(PHENO_METHODS);
  document.getElementById('cmp-preview-tbl').innerHTML = buildPreviewTable();

  // Snow threshold slider
  const sl = document.getElementById('pheno-snow-thresh');
  const sv = document.getElementById('pheno-snow-val');
  if (sl && sv) sl.addEventListener('input', () => { sv.textContent = (sl.value/100).toFixed(2); });

  // Plot mode radio
  document.querySelectorAll('input[name="pheno-plot-mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.st-radio-opt').forEach(l => l.classList.remove('st-radio-active'));
      radio.closest('.st-radio-opt').classList.add('st-radio-active');
    });
  });

  // Compare toggles
  ['cmp-gam','cmp-spline','cmp-dl'].forEach((id, i) => {
    const cb = document.getElementById(id);
    if (!cb) return;
    cb.addEventListener('change', () => {
      const active = PHENO_METHODS.filter((_, j) =>
        document.getElementById(['cmp-gam','cmp-spline','cmp-dl'][j])?.checked
      );
      document.getElementById('pheno-cmp-svg').innerHTML = renderCompareChart(active);
      document.getElementById('pheno-cmp-legend').innerHTML = methodLegendHTML(active);
      document.getElementById('cmp-metrics-tbl').innerHTML = buildCmpMetricsTable(active);
    });
  });

  // Main tab switching (data-target on .st-tab buttons)
  document.querySelectorAll('#modal-phenology .st-tabs-bar .st-tab[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const bar = btn.closest('.st-tabs-bar');
      bar.querySelectorAll('.st-tab').forEach(b => b.classList.remove('st-tab-active'));
      btn.classList.add('st-tab-active');
      const container = bar.parentElement;
      const target = btn.dataset.target;
      container.querySelectorAll(':scope > .st-panel').forEach(p => {
        p.classList.toggle('st-panel-hidden', p.id !== target);
      });
    });
  });

  // Sub-tab switching
  document.querySelectorAll('#modal-phenology .st-subtabs-bar .st-subtab').forEach(btn => {
    btn.addEventListener('click', () => {
      const bar = btn.closest('.st-subtabs-bar');
      bar.querySelectorAll('.st-subtab').forEach(b => b.classList.remove('st-subtab-active'));
      btn.classList.add('st-subtab-active');
      const target = btn.dataset.subtarget;
      bar.parentElement.querySelectorAll('.st-subpanel').forEach(sp => {
        sp.classList.toggle('st-subpanel-active', sp.id === target);
      });
    });
  });

  // Prevent re-init but allow download buttons to show "demo only" feedback
  document.querySelectorAll('#modal-phenology .st-dl-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const orig = btn.textContent;
      btn.textContent = 'Demo only — no download';
      setTimeout(() => { btn.textContent = orig; }, 1800);
    });
  });
}

// ============================================================
// COMMUTER DEMO
// ============================================================

const COMMUTER_MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const COMMUTER_DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Pre-set some commute days for demo realism (day-of-month → state)
// state: 'commuted' | 'absent' | '' (unlogged)
function buildCommuteDemoState(year, month) {
  const state = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayD = today.getDate();

  // Pre-fill realistic commute pattern for past days
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    const isPast = isCurrentMonth ? d < todayD : new Date(year, month, d) < today;
    if (!isPast) { state[d] = ''; continue; }
    if (dow === 0 || dow === 6) { state[d] = ''; continue; } // weekends untracked
    // roughly 3 commute days, 2 remote per week
    state[d] = (d % 5 < 3) ? 'commuted' : 'absent';
  }
  return state;
}

let commuterState = {};
let commuterYear, commuterMonth, commuterSelected;

function renderCommuterCalendar() {
  const grid = document.getElementById('commuter-cal-grid');
  if (!grid) return;
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === commuterYear && today.getMonth() === commuterMonth;
  const todayD = isCurrentMonth ? today.getDate() : -1;
  const firstDow = new Date(commuterYear, commuterMonth, 1).getDay();
  const daysInMonth = new Date(commuterYear, commuterMonth + 1, 0).getDate();

  let html = COMMUTER_DAY_LABELS.map(l => `<div class="cc-dow">${l}</div>`).join('');
  // Empty cells before first day
  for (let i = 0; i < firstDow; i++) html += `<div></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const status = commuterState[d] || '';
    const isToday = d === todayD;
    const isSel = d === commuterSelected;
    const isFuture = isCurrentMonth && d > todayD;
    const dow = new Date(commuterYear, commuterMonth, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    let cls = 'cc-day';
    if (status === 'commuted') cls += ' cc-commuted';
    else if (status === 'absent') cls += ' cc-absent';
    if (isToday) cls += ' cc-today';
    if (isSel) cls += ' cc-selected';
    if (isFuture || isWeekend) cls += ' cc-future';
    const clickable = !isFuture && !isWeekend;
    html += `<div class="${cls}" ${clickable ? `data-day="${d}"` : ''}>${d}</div>`;
  }
  grid.innerHTML = html;
  grid.querySelectorAll('.cc-day[data-day]').forEach(el => {
    el.addEventListener('click', () => {
      commuterSelected = parseInt(el.dataset.day);
      renderCommuterCalendar();
      renderCommuterLogCard();
    });
  });
}

function renderCommuterLogCard() {
  const card = document.getElementById('commuter-log-card');
  if (!card || !commuterSelected) return;
  const d = commuterSelected;
  const status = commuterState[d];
  const today = new Date();
  const isToday = today.getFullYear() === commuterYear && today.getMonth() === commuterMonth && d === today.getDate();
  const dateLabel = isToday ? 'Today' : 'Selected date';
  const dow = COMMUTER_DAY_LABELS[new Date(commuterYear, commuterMonth, d).getDay()];
  const full = `${dow}, ${COMMUTER_MONTHS[commuterMonth]} ${d}`;

  let inner = `<div class="cc-date-head"><span class="cc-date-badge">${dateLabel}</span><span class="cc-date-full">${full}</span></div>`;
  if (status === 'commuted') {
    inner += `<div class="cc-status cc-status-yes">✓ Commuted to worksite</div>
      <button class="cc-undo-btn" data-day="${d}">Undo log</button>`;
  } else if (status === 'absent') {
    inner += `<div class="cc-status cc-status-no">✗ Not at worksite</div>
      <button class="cc-undo-btn" data-day="${d}">Undo log</button>`;
  } else {
    inner += `<div class="cc-prompt">Did you commute today?</div>
      <div class="cc-action-btns">
        <button class="cc-yes-btn" data-day="${d}">Yes</button>
        <button class="cc-no-btn" data-day="${d}">No</button>
      </div>`;
  }
  card.innerHTML = inner;

  card.querySelector('.cc-undo-btn')?.addEventListener('click', e => {
    const day = parseInt(e.target.dataset.day);
    commuterState[day] = '';
    renderCommuterCalendar(); renderCommuterLogCard();
  });
  card.querySelector('.cc-yes-btn')?.addEventListener('click', e => {
    commuterState[parseInt(e.target.dataset.day)] = 'commuted';
    renderCommuterCalendar(); renderCommuterLogCard(); updateCommuterExport();
  });
  card.querySelector('.cc-no-btn')?.addEventListener('click', e => {
    commuterState[parseInt(e.target.dataset.day)] = 'absent';
    renderCommuterCalendar(); renderCommuterLogCard(); updateCommuterExport();
  });
}

function updateCommuterExport() {
  const el = document.getElementById('commuter-export-count');
  if (!el) return;
  const count = Object.values(commuterState).filter(s => s === 'commuted').length;
  el.textContent = count;
}

function renderCommuterMonthNav() {
  const el = document.getElementById('commuter-month-label');
  if (el) el.textContent = `${COMMUTER_MONTHS[commuterMonth]} ${commuterYear}`;
  const prevBtn = document.getElementById('commuter-prev-month');
  const nextBtn = document.getElementById('commuter-next-month');
  const now = new Date();
  if (prevBtn) prevBtn.disabled = commuterYear <= 2025 && commuterMonth <= 0;
  if (nextBtn) nextBtn.disabled = commuterYear === now.getFullYear() && commuterMonth === now.getMonth();
}

let commuterDemoInited = false;
function initCommuterDemo() {
  if (commuterDemoInited) return;
  commuterDemoInited = true;

  const now = new Date();
  commuterYear = now.getFullYear();
  commuterMonth = now.getMonth();
  commuterSelected = now.getDate();
  commuterState = buildCommuteDemoState(commuterYear, commuterMonth);

  // Quarter banner
  const qEl = document.getElementById('commuter-quarter');
  if (qEl) {
    const q = Math.floor(commuterMonth / 3) + 1;
    qEl.textContent = `Q${q} ${commuterYear}`;
  }

  renderCommuterMonthNav();
  renderCommuterCalendar();
  renderCommuterLogCard();
  updateCommuterExport();

  // Month navigation
  document.getElementById('commuter-prev-month')?.addEventListener('click', () => {
    if (commuterMonth === 0) { commuterMonth = 11; commuterYear--; }
    else commuterMonth--;
    commuterState = buildCommuteDemoState(commuterYear, commuterMonth);
    commuterSelected = null;
    const qEl = document.getElementById('commuter-quarter');
    if (qEl) qEl.textContent = `Q${Math.floor(commuterMonth/3)+1} ${commuterYear}`;
    renderCommuterMonthNav(); renderCommuterCalendar();
    document.getElementById('commuter-log-card').innerHTML = `<p class="cc-prompt">Select a day to log your commute.</p>`;
  });
  document.getElementById('commuter-next-month')?.addEventListener('click', () => {
    const now = new Date();
    if (commuterYear === now.getFullYear() && commuterMonth === now.getMonth()) return;
    if (commuterMonth === 11) { commuterMonth = 0; commuterYear++; }
    else commuterMonth++;
    commuterState = buildCommuteDemoState(commuterYear, commuterMonth);
    commuterSelected = null;
    const qEl = document.getElementById('commuter-quarter');
    if (qEl) qEl.textContent = `Q${Math.floor(commuterMonth/3)+1} ${commuterYear}`;
    renderCommuterMonthNav(); renderCommuterCalendar();
    document.getElementById('commuter-log-card').innerHTML = `<p class="cc-prompt">Select a day to log your commute.</p>`;
  });

  // Bottom nav tabs
  document.querySelectorAll('#modal-commuter .commuter-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#modal-commuter .commuter-nav-btn').forEach(b => b.classList.remove('commuter-nav-active'));
      btn.classList.add('commuter-nav-active');
      const tab = btn.dataset.tab;
      document.querySelectorAll('#modal-commuter .commuter-page').forEach(p => {
        p.classList.toggle('commuter-page-hidden', p.dataset.page !== tab);
      });
    });
  });

  // Export download button
  document.getElementById('commuter-dl-btn')?.addEventListener('click', btn => {
    const el = document.getElementById('commuter-dl-btn');
    const orig = el.textContent;
    el.textContent = 'Demo only — no download';
    setTimeout(() => { el.textContent = orig; }, 1800);
  });
}

// ============================================================
// PIKA SPATIAL QAQC DEMO
// ============================================================

// Map coordinate system (viewBox 0 0 700 300); grid cell = 40px = 10m
const PM = { L: 30, R: 670, T: 20, B: 270, CELL: 40 };

const PIKA_WAYPOINTS = [
  { id: '1', x: 80,  y: 230 },
  { id: '2', x: 170, y: 195 },
  { id: '3', x: 260, y: 220 },
  { id: '4', x: 360, y: 180 },
  { id: '5', x: 460, y: 205 },
  { id: '6', x: 560, y: 165 },
];

const PIKA_OBS = [
  { obs: 1,  pointID: '1',  species: 'Pika',   distance: 4,  direction: 45,  visual: 'Y', comments: '',            x: 95,  y: 215, flag: null },
  { obs: 2,  pointID: '1',  species: 'Marmot', distance: 12, direction: 130, visual: 'Y', comments: '',            x: 110, y: 250, flag: null },
  { obs: 3,  pointID: '2',  species: 'Pika',   distance: 6,  direction: 300, visual: 'N', comments: 'Heard only',  x: 155, y: 178, flag: null },
  { obs: 4,  pointID: '3',  species: 'Pika',   distance: 3,  direction: 80,  visual: 'Y', comments: '',            x: 272, y: 208, flag: 'dup' },
  { obs: 5,  pointID: '3',  species: 'Pika',   distance: 3,  direction: 84,  visual: 'Y', comments: '',            x: 276, y: 210, flag: 'dup' },
  { obs: 6,  pointID: '4',  species: 'Marmot', distance: 9,  direction: 200, visual: 'Y', comments: '',            x: 345, y: 198, flag: null },
  { obs: 7,  pointID: '4',  species: 'Pika',   distance: 5,  direction: 15,  visual: '',  comments: '',            x: 365, y: 155, flag: 'warn' },
  { obs: 8,  pointID: '5',  species: 'Pika',   distance: 7,  direction: 250, visual: 'Y', comments: '',            x: 440, y: 222, flag: null },
  { obs: 9,  pointID: '12', species: 'Marmot', distance: 4,  direction: 60,  visual: 'Y', comments: '',            x: 630, y: 250, flag: 'pointid', unplaced: true },
  { obs: 10, pointID: '6',  species: 'Pika',   distance: 2,  direction: 100, visual: 'Y', comments: '',            x: 540, y: 185, flag: null },
  { obs: 11, pointID: '6',  species: 'Marmot', distance: 15, direction: 10,  visual: 'Y', comments: '',            x: 565, y: 135, flag: null },
];

function pikaGridSVG() {
  let s = '';
  for (let x = PM.L; x <= PM.R + 0.01; x += PM.CELL) {
    s += `<line x1="${x}" y1="${PM.T}" x2="${x}" y2="${PM.B}" stroke="#E5E7EB" stroke-width="1"/>`;
  }
  for (let y = PM.T; y <= PM.B + 0.01; y += PM.CELL) {
    s += `<line x1="${PM.L}" y1="${y}" x2="${PM.R}" y2="${y}" stroke="#E5E7EB" stroke-width="1"/>`;
  }
  s += `<rect x="${PM.L}" y="${PM.T}" width="${PM.R - PM.L}" height="${PM.B - PM.T}" fill="none" stroke="#D1D5DB" stroke-width="1.5"/>`;
  s += `<text x="${PM.L}" y="${PM.T - 6}" font-size="9" fill="#9CA3AF">Grid: 10 × 10 m</text>`;
  const sbX = PM.R - PM.CELL, sbY = PM.B + 14;
  s += `<line x1="${sbX}" y1="${sbY}" x2="${sbX + PM.CELL}" y2="${sbY}" stroke="#6B7280" stroke-width="2"/>`;
  s += `<text x="${sbX + PM.CELL / 2}" y="${sbY + 12}" text-anchor="middle" font-size="9" fill="#6B7280">10 m</text>`;
  return s;
}

function pikaWaypointsSVG() {
  let s = `<polyline points="${PIKA_WAYPOINTS.map(w => `${w.x},${w.y}`).join(' ')}" fill="none" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="5,4"/>`;
  PIKA_WAYPOINTS.forEach(w => {
    s += `<rect x="${w.x - 5}" y="${w.y - 5}" width="10" height="10" fill="#4B5563"/>`;
    s += `<text x="${w.x}" y="${w.y - 9}" text-anchor="middle" font-size="9" fill="#374151" font-weight="600">${w.id}</text>`;
  });
  return s;
}

function pikaObsMarkerSVG(o, selected) {
  if (o.unplaced) {
    const r = selected ? 12 : 10;
    return `<g class="pika-map-marker" data-obs="${o.obs}">
      <circle cx="${o.x}" cy="${o.y}" r="${r}" fill="#F3F4F6" stroke="#9CA3AF" stroke-width="1.5" stroke-dasharray="3,3"/>
      <text x="${o.x}" y="${o.y + 4}" text-anchor="middle" font-size="11" fill="#6B7280" font-weight="700">?</text>
      <text x="${o.x}" y="${o.y + 20}" text-anchor="middle" font-size="8" fill="#6B7280">#${o.obs}</text>
    </g>`;
  }
  const color = o.species === 'Pika' ? '#d97706' : '#2563eb';
  const r = selected ? 9 : 6.5;
  let ring = '';
  if (o.flag === 'dup') ring = `<circle cx="${o.x}" cy="${o.y}" r="${r + 5}" fill="none" stroke="#dc2626" stroke-width="1.6" stroke-dasharray="3,2"/>`;
  else if (o.flag === 'warn') ring = `<circle cx="${o.x}" cy="${o.y}" r="${r + 5}" fill="none" stroke="#d97706" stroke-width="1.6" stroke-dasharray="3,2"/>`;
  const selRing = selected ? `<circle cx="${o.x}" cy="${o.y}" r="${r + 3}" fill="none" stroke="#1B4332" stroke-width="2"/>` : '';
  return `<g class="pika-map-marker" data-obs="${o.obs}">
    ${ring}
    <circle cx="${o.x}" cy="${o.y}" r="${r}" fill="${color}" fill-opacity="0.85" stroke="white" stroke-width="1.3"/>
    ${selRing}
    <text x="${o.x}" y="${o.y - r - 6}" text-anchor="middle" font-size="8.5" fill="${color}" font-weight="700">#${o.obs}</text>
  </g>`;
}

function renderPikaMap(selectedObs) {
  let s = pikaGridSVG() + pikaWaypointsSVG();
  PIKA_OBS.forEach(o => { s += pikaObsMarkerSVG(o, o.obs === selectedObs); });
  return s;
}

function pikaLegendHTML() {
  return `
    <span class="pika-legend-item"><span class="pika-legend-swatch" style="background:#d97706"></span>Pika observation</span>
    <span class="pika-legend-item"><span class="pika-legend-swatch" style="background:#2563eb"></span>Marmot observation</span>
    <span class="pika-legend-item"><span class="pika-legend-swatch" style="background:#4B5563;border-radius:2px"></span>Transect waypoint</span>
    <span class="pika-legend-item"><span class="pika-legend-swatch" style="border:1.6px dashed #dc2626;background:none"></span>Possible duplicate</span>
    <span class="pika-legend-item"><span class="pika-legend-swatch" style="border:1.6px dashed #d97706;background:none"></span>Flagged / incomplete</span>
    <span class="pika-legend-item"><span class="pika-legend-swatch" style="border:1.6px dashed #9CA3AF;background:none"></span>PointID not found</span>
  `;
}

function pikaFlagPill(o) {
  if (o.flag === 'dup') return `<span class="pika-flag-pill pika-flag-pill-dup">Possible duplicate</span>`;
  if (o.flag === 'warn') return `<span class="pika-flag-pill pika-flag-pill-warn">Incomplete</span>`;
  if (o.flag === 'pointid') return `<span class="pika-flag-pill pika-flag-pill-warn">PointID not found</span>`;
  return `<span class="pika-flag-pill pika-flag-pill-ok">OK</span>`;
}

function buildPikaObsTable(selectedObs) {
  const rows = PIKA_OBS.map(o => {
    const rowClass = o.flag === 'dup' ? 'pika-tbl-row-dup' : (o.flag ? 'pika-tbl-row-warn' : '');
    const selClass = o.obs === selectedObs ? 'pika-tbl-row-selected' : '';
    return `<tr class="${rowClass} ${selClass}" data-obs="${o.obs}" style="cursor:pointer">
      <td>#${o.obs}</td><td>LLYK-T03</td><td>${o.pointID}</td><td>${o.species}</td>
      <td>${o.distance}</td><td>${o.direction}°</td><td>${o.visual || '<em>blank</em>'}</td>
      <td>${o.comments || ''}</td><td>${pikaFlagPill(o)}</td>
    </tr>`;
  }).join('');
  return `<table class="st-tbl"><thead><tr>
    <th>ObsNum</th><th>Transect</th><th>PointID</th><th>Species</th><th>Dist (m)</th><th>Dir</th><th>Visual</th><th>Comments</th><th>Flag</th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

function buildPikaChecksTable() {
  const rows = [
    ['Survey date vs. file name', 'ok', 'Match — 2026-06-02'],
    ['Transect name vs. reference list', 'ok', 'Match — LLYK-T03'],
    ['PointID numeric format', 'ok', 'All 11 PointIDs valid'],
    ['TransectFileName vs. XY files', 'warn', 'Auto-matched — Obs #9 uses a PointID not present in the XY file'],
    ['Observation completeness', 'warn', '1 flagged — Obs #7 is missing Visual'],
    ['Duplicate detection (10×10m grid)', 'warn', '1 possible duplicate — Obs #4 and #5 within ~0.5 m'],
    ['Survey info completion', 'warn', '1 field missing — Number of Observers'],
  ];
  const body = rows.map(([label, status, detail]) => {
    const pill = status === 'ok'
      ? '<span class="pika-flag-pill pika-flag-pill-ok">✓ Pass</span>'
      : '<span class="pika-flag-pill pika-flag-pill-warn">⚠ Flagged</span>';
    return `<tr><td>${label}</td><td>${pill}</td><td>${detail}</td></tr>`;
  }).join('');
  return `<table class="st-tbl"><thead><tr><th>Check</th><th>Result</th><th>Detail</th></tr></thead><tbody>${body}</tbody></table>`;
}

function buildPikaFlagList() {
  const items = [
    ['ok', '✓ Survey date matches file name'],
    ['ok', '✓ Transect name matches reference list'],
    ['ok', '✓ TransectFileName auto-matched to XY file'],
    ['warn', '⚠ 1 PointID not found in XY file (Obs #9)'],
    ['warn', '⚠ 1 incomplete observation (Obs #7)'],
    ['warn', '⚠ Possible duplicate — Obs #4 & #5'],
    ['warn', '⚠ 1 survey info field missing'],
  ];
  return items.map(([type, text]) => `<li class="pika-flag-${type}">${text}</li>`).join('');
}

function renderPikaObsDetail(obsNum) {
  const panel = document.getElementById('pika-obs-detail');
  if (!panel) return;
  const o = PIKA_OBS.find(x => x.obs === obsNum);
  if (!o) {
    panel.innerHTML = `<p class="st-note">Click a marker on the map, or pick an ObsNum above, to review an observation.</p>`;
    return;
  }
  panel.innerHTML = `
    <div class="pika-obs-detail-title">Observation #${o.obs} ${pikaFlagPill(o)}</div>
    <div class="pika-obs-detail-grid">
      <div><span>Transect</span>LLYK-T03</div>
      <div><span>PointID</span>${o.pointID}${o.flag === 'pointid' ? ' <span style="color:#991b1b">(not in XY file)</span>' : ''}</div>
      <div><span>Species</span>${o.species}</div>
      <div><span>Distance</span>${o.distance} m</div>
      <div><span>Direction</span>${o.direction}°</div>
      <div><span>Visual</span>${o.visual || '(blank)'}</div>
      <div><span>Comments</span>${o.comments || '—'}</div>
    </div>
  `;
}

function buildPikaSurveyPanel() {
  const fields = [
    ['Transect', 'LLYK-T03', false],
    ['Transect File Name', 'LLYK-T03_2026-06-02.xlsx', false],
    ['Date', '2026-06-02', false],
    ['Survey #', '1', false],
    ['Observers', 'M. Wrazej, J. Sinclair', false],
    ['Number of Observers', 'Missing', true],
    ['Time Start', '08:40', false],
    ['Time End', '11:15', false],
    ['Pika/Marmot Survey', 'Yes', false],
  ];
  return fields.map(([label, value, flagged]) => `
    <div class="pika-field${flagged ? ' pika-field-flagged' : ''}">
      <span>${label}</span>
      <div class="pika-field-value">${value}</div>
    </div>
  `).join('');
}

function attachPikaMapHandlers() {
  document.querySelectorAll('#pika-map-svg .pika-map-marker').forEach(el => {
    el.addEventListener('click', () => selectPikaObs(parseInt(el.dataset.obs, 10)));
  });
}

function attachPikaTableHandlers() {
  document.querySelectorAll('#pika-obs-tbl tr[data-obs]').forEach(row => {
    row.addEventListener('click', () => selectPikaObs(parseInt(row.dataset.obs, 10)));
  });
}

function selectPikaObs(obsNum) {
  const svg = document.getElementById('pika-map-svg');
  if (svg) svg.innerHTML = renderPikaMap(obsNum);
  renderPikaObsDetail(obsNum);
  const tbl = document.getElementById('pika-obs-tbl');
  if (tbl) tbl.innerHTML = buildPikaObsTable(obsNum);
  const sel = document.getElementById('pika-obs-select');
  if (sel) sel.value = String(obsNum);
  attachPikaMapHandlers();
  attachPikaTableHandlers();
}

let pikaSurveyOpen = false;
function togglePikaSurveyPanel() {
  const panel = document.getElementById('pika-survey-panel');
  const btn = document.getElementById('pika-survey-info-btn');
  if (!panel) return;
  pikaSurveyOpen = !pikaSurveyOpen;
  panel.hidden = !pikaSurveyOpen;
  if (pikaSurveyOpen) panel.innerHTML = buildPikaSurveyPanel();
  if (btn) btn.textContent = pikaSurveyOpen ? 'View / Edit All Survey Info ▴' : 'View / Edit All Survey Info ▾';
}

let pikaDemoInited = false;
function initPikaDemo() {
  if (pikaDemoInited) return;
  pikaDemoInited = true;

  document.getElementById('pika-flag-list').innerHTML = buildPikaFlagList();
  document.getElementById('pika-legend').innerHTML = pikaLegendHTML();
  document.getElementById('pika-checks-tbl').innerHTML = buildPikaChecksTable();
  document.getElementById('pika-obs-select').innerHTML = '<option value="">— Select —</option>' +
    PIKA_OBS.map(o => `<option value="${o.obs}">#${o.obs} — ${o.species} (PointID ${o.pointID})</option>`).join('');
  document.getElementById('pika-obs-tbl').innerHTML = buildPikaObsTable(null);

  const svg = document.getElementById('pika-map-svg');
  if (svg) svg.innerHTML = renderPikaMap(null);
  attachPikaMapHandlers();
  attachPikaTableHandlers();

  document.getElementById('pika-obs-select')?.addEventListener('change', e => {
    if (e.target.value) selectPikaObs(parseInt(e.target.value, 10));
  });

  document.getElementById('pika-survey-info-btn')?.addEventListener('click', togglePikaSurveyPanel);

  // Field unit / datasheet format toggles (visual only)
  document.querySelectorAll('#pika-unit-grp .st-radio-opt, #pika-format-grp .st-radio-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.st-radio-grp').querySelectorAll('.st-radio-opt').forEach(b => b.classList.remove('st-radio-active'));
      btn.classList.add('st-radio-active');
    });
  });

  // Main tab switching
  document.querySelectorAll('#modal-pika .st-tabs-bar .st-tab[data-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const bar = btn.closest('.st-tabs-bar');
      bar.querySelectorAll('.st-tab').forEach(b => b.classList.remove('st-tab-active'));
      btn.classList.add('st-tab-active');
      const container = bar.parentElement;
      const target = btn.dataset.target;
      container.querySelectorAll(':scope > .st-panel').forEach(p => {
        p.classList.toggle('st-panel-hidden', p.id !== target);
      });
    });
  });

  document.getElementById('pika-dl-btn')?.addEventListener('click', () => {
    const btn = document.getElementById('pika-dl-btn');
    const orig = btn.textContent;
    btn.textContent = 'Demo only — no download';
    setTimeout(() => { btn.textContent = orig; }, 1800);
  });
}
