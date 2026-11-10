'use strict';
// La Base: el barrio que vas reconstruyendo entre noches. Grilla de terrenos con calles; en cada terreno
// va un edificio (bonus para siempre, y algunos traen personajes que se mudan y pasean por el barrio).
// Los escombros se limpian con monedas y ladrillos para ganar lugar.

const LOT = 112, ROAD = 30;
const BW = BASE_COLS * LOT + (BASE_COLS + 1) * ROAD, BH = BASE_ROWS * LOT + (BASE_ROWS + 1) * ROAD;
const BV = { sc: 1, ox: 0, oy: 0, hover: -1, sel: -1, walkers: [], dust: [], built: {}, t: 0, harvest: null, pops: [], shake: {} };

function lotRect(i) {
  const c = i % BASE_COLS, r = (i / BASE_COLS) | 0;
  return { x: ROAD + c * (LOT + ROAD), y: ROAD + r * (LOT + ROAD), c, r };
}
function lotAt(x, y) {
  for (let i = 0; i < BASE_COLS * BASE_ROWS; i++) {
    const L = lotRect(i);
    if (x >= L.x && x < L.x + LOT && y >= L.y && y < L.y + LOT) return i;
  }
  return -1;
}
// ¿Qué se puede hacer ya con lo que hay? (para los avisos del mapa y del panel)
function knownBuilding(id) { return !BUILDINGS[id].plano || Save.data.planos.includes(id); }
function canBuildSomething() { return Object.keys(BUILDINGS).filter(id => !isBuilt(id) && knownBuilding(id) && canPay(buildCost(id, 0))); }
function canUpgrade(lot) { return lot.lvl < BUILDINGS[lot.b].max && canPay(buildCost(lot.b, lot.lvl)); }
function lotState(i) {
  const B = Save.data.base;
  if (i === BASE_PLAZA) return 'plaza';
  if (B.lots[i]) return 'built';
  return B.cleared.includes(i) ? 'empty' : 'rubble';
}

// ---------- ¿Quién vive en el barrio? ----------
function charOwned(id) {
  if (FREE_CHARS.includes(id) || Save.data.chars.includes(id)) return true;
  const lots = Save.data.base.lots;
  for (const k in lots) if ((BUILDINGS[lots[k].b].chars || []).includes(id)) return true;
  return false;
}
function buildingFor(charId) { for (const id in BUILDINGS) if ((BUILDINGS[id].chars || []).includes(charId)) return id; return null; }
function isBuilt(id) { const lots = Save.data.base.lots; for (const k in lots) if (lots[k].b === id) return lots[k]; return null; }
function canPay(c) { for (const r in c) if ((Save.data.res[r] || 0) < c[r]) return false; return true; }
function pay(c) { for (const r in c) Save.data.res[r] -= c[r]; }
function costHtml(c) {
  return RES_IDS.filter(r => c[r]).map(r => `<span class="cost${(Save.data.res[r] || 0) < c[r] ? ' falta' : ''}">${resIcon(r)}${c[r]}</span>`).join(' ');
}
// lo que tiene para cosechar un edificio de economía (vuelve a crecer con el tiempo real)
function stockOf(lot) {
  const pr = BUILDINGS[lot.b].prod;
  if (!pr) return 0;
  const cap = pr.cap * lot.lvl;
  if (lot.stock == null) { lot.stock = cap; lot.st = Date.now(); }
  const grown = (Date.now() - (lot.st || Date.now())) / REGROW_MS * cap;
  return Math.min(cap, lot.stock + grown);
}
function takeStock(lot, n) { const have = stockOf(lot), got = Math.min(Math.floor(have), n); lot.stock = have - got; lot.st = Date.now(); return got; }

// ---------- Recortes de assets/tiles/props.webp (LPC Modern Streets, como en Zombolito) ----------
const PROPS = { tacho_verde: [0, 0, 32, 32], tacho_rojo: [32, 0, 32, 32], tacho_naranja: [64, 0, 32, 32], cono: [96, 0, 32, 32], cono2: [128, 0, 32, 32], gomas: [160, 0, 64, 64], gomas2: [224, 0, 64, 32] };
const propsImg = new Image();
propsImg.src = 'assets/tiles/props.webp';
function drawProp(c, name, x, y, k) {
  const r = PROPS[name];
  if (!propsImg.complete || !propsImg.naturalWidth) return;
  c.drawImage(propsImg, r[0], r[1], r[2], r[3], x - r[2] * k / 2, y - r[3] * k, r[2] * k, r[3] * k);
}

// ---------- Dibujo ----------
function drawLotGround(c, L, kind) {
  const t = tilesOf(kind === 'built' || kind === 'empty' ? 'tierra' : 'tierra');
  const im = t[(L.c * 3 + L.r) % 6];
  if (im.complete && im.naturalWidth) c.drawImage(im, (L.c * 37) % 140, (L.r * 53) % 140, LOT, LOT, L.x, L.y, LOT, LOT);
  else { c.fillStyle = '#3a3226'; c.fillRect(L.x, L.y, LOT, LOT); }
  c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 3; c.strokeRect(L.x + 1.5, L.y + 1.5, LOT - 3, LOT - 3);
}

function drawRubble(c, i, L) {
  c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(L.x, L.y, LOT, LOT);
  // piedras y escombros
  for (let k = 0; k < 14; k++) {
    const x = L.x + 14 + hash2(i, k, 1) * (LOT - 28), y = L.y + 20 + hash2(i, k, 2) * (LOT - 34), r = 5 + hash2(i, k, 3) * 9;
    c.fillStyle = 'rgba(0,0,0,.35)'; ell(c, x + 2, y + 3, r, r * 0.6); c.fill();
    c.fillStyle = ['#6a625a', '#7a7068', '#5a524a', '#8a5a3a'][(hash2(i, k, 4) * 4) | 0];
    ell(c, x, y, r, r * 0.7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.12)'; ell(c, x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.25); c.fill();
  }
  const names = ['gomas', 'tacho_rojo', 'cono', 'gomas2', 'tacho_verde', 'cono2'];
  drawProp(c, names[i % names.length], L.x + 30 + hash2(i, 9, 1) * 50, L.y + 70 + hash2(i, 9, 2) * 30, 1.1);
  drawProp(c, names[(i + 3) % names.length], L.x + 50 + hash2(i, 8, 1) * 40, L.y + 100, 1);
  // cinta de peligro
  c.save();
  c.beginPath(); c.rect(L.x, L.y, LOT, LOT); c.clip();
  c.strokeStyle = 'rgba(242,198,65,.55)'; c.lineWidth = 2; c.setLineDash([8, 6]);
  c.strokeRect(L.x + 5, L.y + 5, LOT - 10, LOT - 10);
  c.restore();
}

function drawPlaza(c, L, t) {
  const im = tilesOf('pasto')[2];
  if (im.complete && im.naturalWidth) c.drawImage(im, 40, 40, LOT, LOT, L.x, L.y, LOT, LOT);
  // senderos en cruz
  c.fillStyle = '#8a7a5a';
  c.fillRect(L.x + LOT / 2 - 9, L.y, 18, LOT); c.fillRect(L.x, L.y + LOT / 2 - 9, LOT, 18);
  // fuente
  const cx = L.x + LOT / 2, cy = L.y + LOT / 2;
  c.fillStyle = 'rgba(0,0,0,.35)'; ell(c, cx + 2, cy + 4, 24, 14); c.fill();
  c.fillStyle = '#9a9488'; ell(c, cx, cy, 24, 14); c.fill();
  c.fillStyle = '#3a7ab8'; ell(c, cx, cy, 19, 10); c.fill();
  c.fillStyle = 'rgba(200,235,255,.5)'; ell(c, cx + Math.sin(t * 2) * 4, cy - 2, 7, 3); c.fill();
  c.fillStyle = '#b8b2a4'; c.fillRect(cx - 3, cy - 18, 6, 16);
  for (let k = 0; k < 4; k++) { const a = t * 3 + k * 1.6; c.fillStyle = 'rgba(180,220,255,.7)'; circ(c, cx + Math.cos(a) * 6, cy - 18 + ((t * 30 + k * 8) % 16), 1.6); c.fill(); }
  // bancos y árboles en las esquinas
  drawEscena(c, 'arbol', 0.1, L.x + 18, L.y + 34, 0.32);
  drawEscena(c, 'arbol', 0.6, L.x + LOT - 18, L.y + 34, 0.32);
  drawEscena(c, 'arbusto', 0.3, L.x + 18, L.y + LOT - 8, 0.45);
  drawEscena(c, 'arbusto', 0.8, L.x + LOT - 18, L.y + LOT - 8, 0.45);
}

// Lo que va en el cartel: la cara del vecino (viviendas), el recurso (economía) o un objeto en pixel art.
const SIGN_PX = { gimnasio: 'pesa', dispensario: 'cruz', canchita: 'pelota', plazoleta: 'mate', biblioteca: 'libreta', quiniela: 'herradura',
  herreria: 'facon', chatarreria: 'iman', escuelita: 'pibitos', utileria: 'bolsa', fusiones: 'orbe', feria: 'biblia', club: 'guantes' };
function drawSign(c, id, cx, cy, t) {
  const d = BUILDINGS[id];
  c.imageSmoothingEnabled = false;
  if (d.chars) {
    const ch = CHARACTERS.find(x => x.id === d.chars[0]);
    const s = ch && loadSprite(ch.sprite);
    if (s && s.ok) { c.drawImage(s.img, 16, 2 * 64 + 6, 32, 30, cx - 13, cy - 12, 26, 24); return; }
  }
  const px = d.prod ? d.prod.res : SIGN_PX[id];
  if (px) drawPx(c, px, cx, cy, 22, 0);
}

// Edificio dibujado a mano, vista de 3/4 desde arriba (como las escenografías de Zombolito).
function drawBuilding(c, i, L, lot, t, pop, thumb) {
  const d = BUILDINGS[lot.b];
  const cx = L.x + LOT / 2, base = L.y + LOT - 14;
  const k = pop ? 1 + Math.sin(Math.min(1, pop) * Math.PI) * 0.12 : 1;
  c.save();
  c.translate(cx, base); c.scale(k, 2 - k); c.translate(-cx, -base);
  // vereda
  c.fillStyle = 'rgba(190,180,160,.35)'; c.fillRect(L.x + 6, base - 2, LOT - 12, 12);
  c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(L.x + 14, base - 4, LOT - 22, 8);
  if (d.field) drawField(c, L, d);
  else if (d.garden) drawGarden(c, L, d, t);
  else if (d.cave) drawCave(c, L, d, t);
  else drawHouse(c, L, d, lot.lvl, t);
  // cartel con el ícono
  const sy = d.field || d.garden ? L.y + 18 : base - 74;
  c.fillStyle = '#2a1f14'; rrect(c, cx - 15, sy - 15, 30, 30, 6); c.fill();
  c.strokeStyle = d.trim; c.lineWidth = 2; rrect(c, cx - 15, sy - 15, 30, 30, 6); c.stroke();
  drawSign(c, lot.b, cx, sy, t);
  // estrellitas de nivel
  if (!thumb) for (let s = 0; s < d.max; s++) {
    c.fillStyle = s < lot.lvl ? '#f2c641' : 'rgba(0,0,0,.55)';
    circ(c, cx - (d.max - 1) * 5 + s * 10, sy + 21, 3.2); c.fill();
    c.strokeStyle = '#000'; c.lineWidth = 1; c.stroke();
  }
  c.restore();
}

function drawHouse(c, L, d, lvl, t) {
  const cx = L.x + LOT / 2, base = L.y + LOT - 14;
  const w = d.church ? 70 : 84, h = 40, roofH = d.thatch ? 34 : 28;
  const x0 = cx - w / 2, y0 = base - h;
  // sombra
  c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(x0 + 6, base - 4, w, 8);
  // frente
  c.fillStyle = d.wall; c.fillRect(x0, y0, w, h);
  // ladrillos / textura
  c.fillStyle = 'rgba(0,0,0,.08)';
  for (let y = y0 + 6; y < base; y += 7) for (let x = x0 + ((y / 7) % 2) * 6; x < x0 + w; x += 12) c.fillRect(x, y, 10, 1);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x0, base - 4, w, 4); c.fillRect(x0 + w - 5, y0, 5, h);
  // techo
  c.fillStyle = d.roof;
  c.beginPath();
  if (d.thatch) { c.moveTo(x0 - 8, y0 + 4); c.quadraticCurveTo(cx, y0 - roofH * 1.6, x0 + w + 8, y0 + 4); }
  else { c.moveTo(x0 - 6, y0 + 2); c.lineTo(x0 + 10, y0 - roofH); c.lineTo(x0 + w - 10, y0 - roofH); c.lineTo(x0 + w + 6, y0 + 2); }
  c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 2; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.12)';
  if (!d.thatch) for (let y = y0 - roofH + 5; y < y0; y += 6) c.fillRect(x0 + 6, y, w - 12, 1.5);
  else for (let x = x0; x < x0 + w; x += 5) c.fillRect(x, y0 - 18 + Math.abs(x - cx) * 0.3, 1.5, 14);
  // campanario de la parroquia
  if (d.church) {
    c.fillStyle = d.wall; c.fillRect(cx - 9, y0 - roofH - 26, 18, 30);
    c.fillStyle = d.roof; c.beginPath(); c.moveTo(cx - 12, y0 - roofH - 24); c.lineTo(cx, y0 - roofH - 42); c.lineTo(cx + 12, y0 - roofH - 24); c.fill();
    c.fillStyle = d.trim; c.fillRect(cx - 1.5, y0 - roofH - 52, 3, 12); c.fillRect(cx - 5, y0 - roofH - 48, 10, 3);
  }
  // puerta y ventanas (de noche están prendidas)
  c.fillStyle = '#2a1a10'; c.fillRect(cx - 7, base - 20, 14, 20);
  c.fillStyle = d.trim; c.fillRect(cx - 9, base - 22, 18, 3);
  const glow = 0.75 + Math.sin(t * 2 + L.x) * 0.08;
  for (const wx of [x0 + 10, x0 + w - 24]) {
    c.fillStyle = '#1a140c'; c.fillRect(wx - 1, y0 + 9, 16, 13);
    c.fillStyle = `rgba(255,214,106,${glow})`; c.fillRect(wx, y0 + 10, 14, 11);
    c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(wx + 6.5, y0 + 10, 1, 11); c.fillRect(wx, y0 + 15, 14, 1);
  }
  drawFx(c, 'luz', '#ffd66a', x0 + 17, y0 + 16, 34, 0.25, 0, true);
  drawFx(c, 'luz', '#ffd66a', x0 + w - 17, y0 + 16, 34, 0.25, 0, true);
  // nivel 2: chimenea con humo · nivel 3: bandera
  if (lvl >= 2 && !d.thatch && !d.church) {
    c.fillStyle = '#5a3a2a'; c.fillRect(x0 + w - 26, y0 - roofH - 6, 10, 16);
    drawFx(c, 'humo', '#9a9a9a', x0 + w - 21, y0 - roofH - 14 - ((t * 10) % 12), 22, 0.35, t * 0.5, false);
  }
  if (lvl >= 3) {
    const fx = x0 + 14, fy = y0 - roofH - 2;
    c.fillStyle = '#3a2a1a'; c.fillRect(fx, fy - 24, 2, 24);
    c.fillStyle = d.trim; c.beginPath(); c.moveTo(fx + 2, fy - 24); c.lineTo(fx + 16 + Math.sin(t * 6) * 2, fy - 19); c.lineTo(fx + 2, fy - 14); c.fill();
  }
}

function drawField(c, L, d) {
  const x0 = L.x + 10, y0 = L.y + 34, w = LOT - 20, h = LOT - 50;
  c.fillStyle = '#2f6a22'; c.fillRect(x0, y0, w, h);
  c.fillStyle = 'rgba(255,255,255,.06)'; for (let x = x0; x < x0 + w; x += 16) c.fillRect(x, y0, 8, h);
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5;
  c.strokeRect(x0 + 3, y0 + 3, w - 6, h - 6);
  c.beginPath(); c.moveTo(L.x + LOT / 2, y0 + 3); c.lineTo(L.x + LOT / 2, y0 + h - 3); c.stroke();
  circ(c, L.x + LOT / 2, y0 + h / 2, 9); c.stroke();
  c.strokeRect(x0 + 3, y0 + h / 2 - 8, 8, 16); c.strokeRect(x0 + w - 11, y0 + h / 2 - 8, 8, 16);
  // alambrado
  c.strokeStyle = 'rgba(200,200,200,.35)'; c.lineWidth = 1;
  for (let x = x0; x <= x0 + w; x += 6) { c.beginPath(); c.moveTo(x, y0 - 6); c.lineTo(x, y0); c.stroke(); }
}

function drawGarden(c, L, d, t) {
  const x0 = L.x + 12, y0 = L.y + 36;
  for (let r = 0; r < 4; r++) {
    c.fillStyle = '#5a3a1a'; c.fillRect(x0, y0 + r * 16, LOT - 24, 10);
    for (let k = 0; k < 7; k++) {
      const x = x0 + 6 + k * 12.5, y = y0 + r * 16 + 4, sway = Math.sin(t * 2 + k + r) * 1.2;
      c.fillStyle = r % 2 ? '#5aa82a' : '#7ac83a';
      c.beginPath(); c.moveTo(x - 4, y + 4); c.lineTo(x + sway, y - 8); c.lineTo(x + 4, y + 4); c.fill();
      if (r % 2 === 0 && k % 2) { c.fillStyle = '#f2c641'; c.fillRect(x - 1.5 + sway, y - 6, 3, 6); }
    }
  }
  drawProp(c, 'tacho_verde', L.x + LOT - 16, L.y + 34, 0.8);
}

function drawCave(c, L, d, t) {
  const cx = L.x + LOT / 2, base = L.y + LOT - 14;
  c.fillStyle = '#3a3230'; c.beginPath(); c.ellipse(cx, base - 10, 46, 40, 0, Math.PI, 0); c.fill();
  c.fillStyle = '#4a4240'; c.beginPath(); c.ellipse(cx - 10, base - 22, 30, 24, 0, Math.PI, 0); c.fill();
  c.fillStyle = '#0a0404'; c.beginPath(); c.ellipse(cx, base - 4, 20, 24, 0, Math.PI, 0); c.fill();
  drawFx(c, 'luz', '#ff2a1a', cx, base - 14, 60, 0.5 + Math.sin(t * 3) * 0.15, 0, true);
  drawFx(c, 'llama', '#ff4a1a', cx - 26, base - 6, 20, 0.8, 0, true);
  drawFx(c, 'llama', '#ff4a1a', cx + 26, base - 6, 20, 0.8, 0, true);
}

function drawRoads(c) {
  const t = tilesOf('pasto');
  // pasto de fondo y calles de asfalto
  for (let y = -256; y < BH + 256; y += 256) for (let x = -256; x < BW + 256; x += 256) {
    const im = t[(hash2(x, y, 3) * 6) | 0];
    if (im.complete && im.naturalWidth) c.drawImage(im, x, y, 257, 257);
  }
  c.fillStyle = '#2a2c2e';
  for (let i = 0; i <= BASE_COLS; i++) c.fillRect(i * (LOT + ROAD), 0, ROAD, BH);
  for (let i = 0; i <= BASE_ROWS; i++) c.fillRect(0, i * (LOT + ROAD), BW, ROAD);
  c.fillStyle = 'rgba(210,190,90,.35)';
  for (let i = 0; i <= BASE_COLS; i++) for (let y = 4; y < BH; y += 22) c.fillRect(i * (LOT + ROAD) + ROAD / 2 - 1, y, 2, 10);
  for (let i = 0; i <= BASE_ROWS; i++) for (let x = 4; x < BW; x += 22) c.fillRect(x, i * (LOT + ROAD) + ROAD / 2 - 1, 10, 2);
  // borde del barrio
  c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 6; c.strokeRect(-3, -3, BW + 6, BH + 6);
}

// ---------- Vecinos que pasean por las calles ----------
function roadPt(i, j) { return { x: i * (LOT + ROAD) + ROAD / 2, y: j * (LOT + ROAD) + ROAD / 2 }; }
function syncWalkers() {
  const want = CHARACTERS.filter(ch => charOwned(ch.id));
  BV.walkers = BV.walkers.filter(w => want.some(ch => ch.id === w.id));
  for (const ch of want) {
    if (BV.walkers.some(w => w.id === ch.id)) continue;
    loadSprite(ch.sprite);
    const i = (Math.random() * (BASE_COLS + 1)) | 0, j = (Math.random() * (BASE_ROWS + 1)) | 0, p = roadPt(i, j);
    BV.walkers.push({ id: ch.id, sprite: ch.sprite, i, j, x: p.x, y: p.y, ti: i, tj: j, wait: Math.random() * 2, dx: 0, dy: 1, spd: rand(34, 48), walkT: 0 });
  }
}
function updateWalkers(dt) {
  for (const w of BV.walkers) {
    if (w.wait > 0) { w.wait -= dt; continue; }
    const p = roadPt(w.ti, w.tj), dx = p.x - w.x, dy = p.y - w.y, dd = Math.hypot(dx, dy);
    if (dd < 1) {
      w.i = w.ti; w.j = w.tj;
      if (Math.random() < 0.3) w.wait = rand(0.8, 3);
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => w.i + a >= 0 && w.i + a <= BASE_COLS && w.j + b >= 0 && w.j + b <= BASE_ROWS);
      const [a, b] = opts[(Math.random() * opts.length) | 0];
      w.ti = w.i + a; w.tj = w.j + b;
      continue;
    }
    const s = Math.min(dd, w.spd * dt);
    w.x += dx / dd * s; w.y += dy / dd * s; w.dx = dx; w.dy = dy; w.walkT += dt;
  }
}
function drawWalkers(c) {
  for (const w of BV.walkers.slice().sort((a, b) => a.y - b.y)) {
    const s = loadSprite(w.sprite);
    if (!s.ok) continue;
    c.fillStyle = 'rgba(0,0,0,.35)'; ell(c, w.x, w.y + 4, 9, 3.5); c.fill();
    const row = Math.abs(w.dx) > Math.abs(w.dy) ? (w.dx < 0 ? 1 : 3) : (w.dy < 0 ? 0 : 2);
    const col = w.wait > 0 ? 0 : 1 + (Math.floor(w.walkT * 9) % 8);
    drawFrame(c, s, w.wait > 0 ? 2 : row, col, w.x, w.y + 4, 48);
  }
}

// ---------- Vista ----------
function baseLayout() {
  const wide = W >= 900;
  const panelW = wide ? 360 : 0;
  const top = 58, bottom = wide ? 10 : Math.min(H * 0.42, 340);
  const aw = W - panelW - 20, ah = H - top - bottom;
  BV.sc = Math.min(aw / BW, ah / BH);
  BV.ox = 10 + (aw - BW * BV.sc) / 2;
  BV.oy = top + (ah - BH * BV.sc) / 2;
}
function renderBase(t, dt) {
  baseLayout();
  updateWalkers(dt);
  if (BV.harvest) updateHarvest(dt);
  const c = ctx;
  c.setTransform(DPR * BV.sc, 0, 0, DPR * BV.sc, DPR * BV.ox, DPR * BV.oy);
  c.imageSmoothingEnabled = false;
  drawRoads(c);
  BV.canBuild = canBuildSomething().length > 0;
  // terrenos de arriba hacia abajo (los techos tapan un poco al de atrás)
  for (let i = 0; i < BASE_COLS * BASE_ROWS; i++) {
    const L = lotRect(i), st = lotState(i);
    if (st === 'plaza') { drawPlaza(c, L, t); continue; }
    drawLotGround(c, L, st);
    if (st === 'rubble') drawRubble(c, i, L);
    else if (st === 'empty') {
      const ok = BV.canBuild;
      c.strokeStyle = ok ? `rgba(155,211,74,${0.55 + Math.sin(t * 4) * 0.3})` : 'rgba(232,236,217,.35)'; c.lineWidth = 2; c.setLineDash([6, 6]);
      c.strokeRect(L.x + 10, L.y + 10, LOT - 20, LOT - 20); c.setLineDash([]);
      c.fillStyle = ok ? '#9bd34a' : 'rgba(232,236,217,.45)'; c.font = '900 34px "Segoe UI", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('+', L.x + LOT / 2, L.y + LOT / 2);
    }
  }
  for (let i = 0; i < BASE_COLS * BASE_ROWS; i++) {
    const lot = Save.data.base.lots[i];
    if (lot) { const L = lotRect(i), pop = BV.built[i];
      const sk = BV.shake[i] ? Math.sin(t * 60) * BV.shake[i] * 4 : 0;
      if (BV.shake[i]) { BV.shake[i] -= dt * 4; if (BV.shake[i] <= 0) delete BV.shake[i]; }
      c.save(); c.translate(sk, 0); drawBuilding(c, i, L, lot, t, pop); c.restore();
      // flechita verde: se puede mejorar
      if (!BV.harvest && canUpgrade(lot)) {
        const ax = L.x + LOT - 16, ay = L.y + 26 + Math.sin(t * 5) * 2;
        c.fillStyle = '#000'; c.beginPath(); c.moveTo(ax, ay - 9); c.lineTo(ax + 8, ay + 1); c.lineTo(ax - 8, ay + 1); c.fill();
        c.fillRect(ax - 4, ay, 8, 8);
        c.fillStyle = '#9bd34a'; c.beginPath(); c.moveTo(ax, ay - 7); c.lineTo(ax + 6, ay); c.lineTo(ax - 6, ay); c.fill();
        c.fillRect(ax - 2.5, ay, 5, 6);
      }
      const pr = BUILDINGS[lot.b].prod;
      if (pr) {
        const k = stockOf(lot) / (pr.cap * lot.lvl);
        c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(L.x + 10, L.y + 6, LOT - 20, 7);
        c.fillStyle = RES[pr.res].col; c.fillRect(L.x + 11, L.y + 7, (LOT - 22) * k, 5);
      } if (pop) { BV.built[i] -= dt * 2.5; if (BV.built[i] <= 0) delete BV.built[i]; } }
  }
  if (BV.harvest) drawHarvest(c, t); else drawWalkers(c);
  // números de lo cosechado
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const p of BV.pops) {
    p.life -= dt; p.y -= 30 * dt;
    c.globalAlpha = Math.min(1, p.life * 2);
    c.font = '900 18px "Segoe UI", sans-serif'; c.lineWidth = 4; c.strokeStyle = '#000';
    c.strokeText(p.txt, p.x, p.y); c.fillStyle = p.col; c.fillText(p.txt, p.x, p.y);
  }
  c.globalAlpha = 1;
  BV.pops = BV.pops.filter(p => p.life > 0);
  // polvareda al construir
  for (const p of BV.dust) { p.life -= dt; drawFx(c, 'humo', '#b8a890', p.x, p.y - (1 - p.life) * 20, p.s * (1.5 - p.life * 0.5), p.life * 0.6, p.r, false); }
  BV.dust = BV.dust.filter(p => p.life > 0);
  // mudanza: los terrenos libres titilan
  if (BV.moving != null) for (let i = 0; i < BASE_COLS * BASE_ROWS; i++) if (lotState(i) === 'empty') {
    const L = lotRect(i);
    c.fillStyle = `rgba(155,211,74,${0.12 + Math.sin(t * 6) * 0.08})`; c.fillRect(L.x, L.y, LOT, LOT);
  }
  // selección
  for (const [i, col, a] of [[BV.hover, '#e8ecd9', 0.35], [BV.sel, '#9bd34a', 0.9]]) {
    if (i < 0) continue;
    const L = lotRect(i);
    c.strokeStyle = col; c.globalAlpha = a; c.lineWidth = 4; rrect(c, L.x - 3, L.y - 3, LOT + 6, LOT + 6, 10); c.stroke(); c.globalAlpha = 1;
  }
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
}
function dust(i) {
  const L = lotRect(i);
  for (let k = 0; k < 10; k++) BV.dust.push({ x: L.x + rand(10, LOT - 10), y: L.y + rand(30, LOT - 6), s: rand(30, 60), life: rand(0.6, 1), r: Math.random() * 6 });
  BV.built[i] = 1;
}

// ---------- Entrada ----------
function baseToLocal(cx, cy) { return { x: (cx - BV.ox) / BV.sc, y: (cy - BV.oy) / BV.sc }; }
cv.addEventListener('pointermove', (e) => {
  if (state !== 'base') return;
  const p = baseToLocal(e.clientX, e.clientY);
  BV.hover = e.pointerType === 'mouse' ? lotAt(p.x, p.y) : -1;
  cv.style.cursor = BV.hover >= 0 ? 'pointer' : '';
});
cv.addEventListener('pointerdown', (e) => {
  if (state !== 'base') return;
  const p = baseToLocal(e.clientX, e.clientY);
  const i = lotAt(p.x, p.y);
  if (i < 0) return;
  Sfx.init(); Sfx.play('click');
  selectLot(i);
});


// ---------- La cosecha ----------
// Después de cada noche, los vecinos salen disparados como pelotas por el pueblo: cada golpe en un
// edificio de economía junta lo que tenga. Nadie los controla; por eso importa dónde construís.
function harvestObstacles() {
  const out = [];
  for (let i = 0; i < BASE_COLS * BASE_ROWS; i++) {
    const st = lotState(i);
    if (st === 'empty' || st === 'plaza') continue;
    const L = lotRect(i), m = 8;
    out.push({ i, x0: L.x + m, y0: L.y + m, x1: L.x + LOT - m, y1: L.y + LOT - m, lot: Save.data.base.lots[i] || null });
  }
  return out;
}
function startHarvest() {
  const d = Save.data;
  if (!d.harvestReady || BV.harvest) return false;
  const who = CHARACTERS.filter(ch => charOwned(ch.id));
  const balls = [];
  // salen de la fuente de la plaza, en todas direcciones: cada vecino tira 2 (mínimo 4 pelotas)
  const P = lotRect(BASE_PLAZA), cx = P.x + LOT / 2, cy = P.y + LOT / 2;
  const n = Math.max(4, who.length * 2);
  for (let k = 0; k < n; k++) {
    const ch = who[k % who.length];
    loadSprite(ch.sprite);
    const a = (k / n) * TAU + rand(-0.3, 0.3);
    balls.push({ ch, x: cx, y: cy, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, delay: k * 0.15, r: 13, trail: [], spin: 0 });
  }
  BV.harvest = { t: HARVEST_TIME, balls, gains: { oro: 0, madera: 0, ladrillo: 0, trigo: 0 }, obs: harvestObstacles() };
  BV.sel = -1;
  Sfx.play('boss', { vol: 0.4 });
  return true;
}
function updateHarvest(dt) {
  const H = BV.harvest;
  H.t -= dt;
  let left = 0;
  for (const o of H.obs) if (o.lot && BUILDINGS[o.lot.b].prod) left += stockOf(o.lot) >= 1 ? 1 : 0;
  for (const b of H.balls) {
    if (b.delay > 0) { b.delay -= dt; continue; }
    const steps = 4;
    for (let k = 0; k < steps; k++) {
      b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x > BW - b.r) { b.x = BW - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
      if (b.y > BH - b.r) { b.y = BH - b.r; b.vy = -Math.abs(b.vy); }
      for (const o of H.obs) {
        const cx = Math.max(o.x0, Math.min(b.x, o.x1)), cy = Math.max(o.y0, Math.min(b.y, o.y1));
        const dx = b.x - cx, dy = b.y - cy;
        if (dx * dx + dy * dy > b.r * b.r) continue;
        // rebote: según de qué lado entró
        if (Math.abs(dx) > Math.abs(dy)) { b.vx = Math.sign(dx || 1) * Math.abs(b.vx); b.x = cx + Math.sign(dx || 1) * b.r; }
        else { b.vy = Math.sign(dy || 1) * Math.abs(b.vy); b.y = cy + Math.sign(dy || 1) * b.r; }
        b.vx += rand(-25, 25);
        onHarvestHit(o, b);
        break;
      }
    }
    b.spin += dt * 10;
    b.trail.push(b.x, b.y); if (b.trail.length > 14) b.trail.splice(0, 2);
  }
  if (H.t <= 0 || (left === 0 && H.t < HARVEST_TIME - 3)) endHarvest();
  if (typeof updateHarvestHud === 'function') updateHarvestHud();
}
function onHarvestHit(o, b) {
  if (!o.lot) { Sfx.play('hit', { vol: 0.3 }); return; }
  const pr = BUILDINGS[o.lot.b].prod;
  BV.shake[o.i] = 1;
  if (!pr) { Sfx.play('hit', { vol: 0.35 }); return; }
  const got = takeStock(o.lot, pr.hit * o.lot.lvl);
  if (got <= 0) { Sfx.play('hit', { vol: 0.3 }); return; }
  BV.harvest.gains[pr.res] += got;
  BV.pops.push({ x: b.x, y: b.y - 14, txt: '+' + got, col: RES[pr.res].col, life: 0.9 });
  Sfx.play('coin', { vol: 0.5, rate: ({ oro: 1.1, madera: 0.7, ladrillo: 0.6, trigo: 0.9 }[pr.res] || 1) * (0.95 + Math.random() * 0.1) });
}
function endHarvest() {
  const H = BV.harvest;
  if (!H) return;
  BV.harvest = null;
  const d = Save.data;
  for (const r in H.gains) d.res[r] += H.gains[r];
  d.harvestReady = false;
  Save.save();
  Sfx.play('chest');
  const parts = RES_IDS.filter(r => H.gains[r]).map(r => `${resIcon(r)}+${H.gains[r]}`);
  if (typeof baseToast === 'function') baseToast(parts.length ? `Cosecha: ${parts.join(' ')}` : 'No había nada para cosechar.');
  if (typeof afterHarvest === 'function') afterHarvest();
}
function drawHarvest(c, t) {
  for (const b of BV.harvest.balls) {
    if (b.delay > 0) continue;
    const tr = b.trail;
    for (let i = 0; i < tr.length; i += 2) { c.globalAlpha = i / tr.length * 0.3; c.fillStyle = '#f2c641'; circ(c, tr[i], tr[i + 1], b.r * (i / tr.length)); c.fill(); }
    c.globalAlpha = 1;
    drawFx(c, 'luz', '#f2c641', b.x, b.y, 60, 0.45, 0, true);
    c.fillStyle = '#000'; circ(c, b.x, b.y, b.r + 2.5); c.fill();
    c.fillStyle = '#2c3726'; circ(c, b.x, b.y, b.r); c.fill();
    const s = loadSprite(b.ch.sprite);
    if (s.ok) {
      c.save(); circ(c, b.x, b.y, b.r); c.clip();
      // la cara del personaje (cuadro mirando de frente)
      c.drawImage(s.img, 16, 2 * 64 + 8, 32, 32, b.x - b.r * 1.15, b.y - b.r * 1.05, b.r * 2.3, b.r * 2.3);
      c.restore();
    }
    c.strokeStyle = '#f2c641'; c.lineWidth = 2; circ(c, b.x, b.y, b.r + 1); c.stroke();
  }
}
