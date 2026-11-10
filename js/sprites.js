'use strict';
// Sprites LPC de Zombolito (assets/sprites), pisos, efectos y gore. Mismo formato que en Zombolito:
// hojas de cuadros de 64×64, filas 0-3 = caminar hacia arriba, izquierda, abajo, derecha (9 cuadros; el 0 es parado).
// Fila 4 (si la hoja mide 320 de alto) = herido/muerte. Las hojas <id>_atk tienen 4 filas de ataque.

const TAU = Math.PI * 2;
const SPR = {};
const SPR_FRAME = 64;

function hash2(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); }
function rrect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function loadSprite(id) {
  if (SPR[id]) return SPR[id];
  const img = new Image();
  const s = { img, ok: false, f: SPR_FRAME, n: 8, missing: false };
  img.onload = () => {
    s.ok = true;
    if (id.endsWith('_atk')) { s.f = img.naturalHeight / 4; s.n = Math.round(img.naturalWidth / s.f); }
  };
  img.onerror = () => { s.missing = true; };
  img.src = `assets/sprites/${id}.png`;
  SPR[id] = s;
  return s;
}

// Siluetas de color (golpe blanco, hielo, veneno) por hoja; se crean la primera vez que se usan.
function silOf(s, col) {
  if (!s.ok) return null;
  s.sil = s.sil || {};
  if (s.sil[col]) return s.sil[col];
  const cv = document.createElement('canvas');
  cv.width = s.img.naturalWidth; cv.height = s.img.naturalHeight;
  const c = cv.getContext('2d');
  c.drawImage(s.img, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = col;
  c.fillRect(0, 0, cv.width, cv.height);
  return (s.sil[col] = cv);
}

// Cuadro con los pies en (x, y). size = alto en pantalla del cuadro de 64.
function drawFrame(c, s, row, col, x, y, size, overlay, oa) {
  const F = s.f, sx = col * F, sy = row * F;
  const k = size / SPR_FRAME, S = F * k, off = (F - SPR_FRAME) / 2 * k;
  const dx = x - S / 2, dy = y - size * 0.94 - off;
  c.drawImage(s.img, sx, sy, F, F, dx, dy, S, S);
  if (overlay) {
    const ov = silOf(s, overlay);
    if (ov) { const a = c.globalAlpha; c.globalAlpha = a * oa; c.drawImage(ov, sx, sy, F, F, dx, dy, S, S); c.globalAlpha = a; }
  }
}
function drawOutline(c, s, row, col, x, y, size, color, w) {
  const ol = silOf(s, color || '#050505');
  if (!ol) return;
  const F = s.f, sx = col * F, sy = row * F, dx = x - size / 2, dy = y - size * 0.94;
  const a = c.globalAlpha;
  c.globalAlpha = a * 0.9;
  for (const [ox, oy] of [[-w, 0], [w, 0], [0, -w], [0, w]]) c.drawImage(ol, sx, sy, F, F, dx + ox, dy + oy, size, size);
  c.globalAlpha = a;
}

// ---------- Efectos (assets/fx: texturas blancas que se tiñen) ----------
const FX = {};
for (const n of ['anillo', 'chispa', 'corte', 'destello', 'fogonazo', 'fuego', 'humo', 'humo2', 'llama', 'luz', 'magia', 'quemado', 'rayo', 'remolino', 'salpicon']) {
  const im = new Image(); im.src = `assets/fx/${n}.webp`; FX[n] = im;
}
const fxTint = {};
function fxTex(name, col) {
  const key = name + col;
  if (fxTint[key]) return fxTint[key];
  const img = FX[name];
  if (!img || !img.complete || !img.naturalWidth) return null;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.drawImage(img, 0, 0, 128, 128);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = col;
  c.fillRect(0, 0, 128, 128);
  return (fxTint[key] = cv);
}
function drawFx(c, name, col, x, y, size, alpha, rot, add) {
  const tex = fxTex(name, col);
  if (!tex) return;
  c.save();
  if (add) c.globalCompositeOperation = 'lighter';
  c.globalAlpha *= alpha;
  c.translate(x, y);
  if (rot) c.rotate(rot);
  c.drawImage(tex, -size / 2, -size / 2, size, size);
  c.restore();
}

// ---------- Gore ----------
const GORE = { gib: [], blast: [] };
for (let i = 1; i <= 21; i++) { const im = new Image(); im.src = `assets/gore/gib${i}.png`; GORE.gib.push(im); }
for (let i = 1; i <= 13; i++) { const im = new Image(); im.src = `assets/gore/blast${i}.png`; GORE.blast.push(im); }

// ---------- Pisos (assets/tiles: 10 baldosas de 256 por piso; las 6 primeras son piso, el resto calle) ----------
const TILES = {};
function tilesOf(name) {
  if (TILES[name]) return TILES[name];
  const arr = [];
  for (let i = 0; i < 10; i++) { const im = new Image(); im.src = `assets/tiles/${name}_${i}.webp`; arr.push(im); }
  return (TILES[name] = arr);
}
const escenaImg = new Image();
escenaImg.src = 'assets/tiles/escena.webp';
// Recorte de ESCENA (js/escena.js) con la base en (x, y).
function drawEscena(c, tipo, v, x, y, escala) {
  const lista = typeof ESCENA !== 'undefined' && ESCENA[tipo];
  if (!lista || !escenaImg.complete || !escenaImg.naturalWidth) return;
  const r = lista[Math.min(lista.length - 1, (v * lista.length) | 0)];
  const w = r[2] * escala, h = r[3] * escala;
  c.drawImage(escenaImg, r[0], r[1], r[2], r[3], x - w / 2, y - h + 8 * escala, w, h);
}

// Retrato para los menús: el personaje mirando de frente, recortado y agrandado.
function portrait(canvas, spriteId, locked) {
  const s = loadSprite(spriteId);
  const draw = () => {
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.imageSmoothingEnabled = false;
    // en la hoja de 64, el cuerpo ocupa más o menos x 16..48, y 10..64
    const sc = canvas.height / 56;
    c.drawImage(s.img, 0, 2 * 64 + 8, 64, 56, (canvas.width - 64 * sc) / 2, 0, 64 * sc, 56 * sc);
    if (locked) { c.globalCompositeOperation = 'source-in'; c.fillStyle = '#0a0c09'; c.fillRect(0, 0, canvas.width, canvas.height); c.globalCompositeOperation = 'source-over'; }
  };
  if (s.ok) draw(); else s.img.addEventListener('load', draw, { once: true });
}
