'use strict';
// Zombopit: el pozo. Los bichos bajan en filas, vos tirás pelotas que rebotan y vuelven a tu mano.
// Juntás gemas, subís de nivel, elegís pelotas nuevas, las fusionás y bajás al jefe de la noche.

const FW = 540, FH = 960;          // cancha lógica (vertical)
const WALL_Y = 790;                // la barricada: si un bicho llega acá, te pega
const PLAYER_Y = 872;              // donde camina el personaje
const RETURN_Y = 940;              // si una pelota baja hasta acá, vuelve a la mano
const GEM_Y = 900;                 // las gemas caen hasta acá y quedan en el piso
const COLS = 8;
const WAVES = 10;               // oleadas por noche: a la mitad el grandote, al final el jefe
const CW = FW / COLS;          // ancho de una columna
const RH = 74;                 // alto de una fila de la formación

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, SC = 1, OX = 0, OY = 0;

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  // la cancha entra entera en la pantalla (el HUD de arriba ocupa ~64 px)
  const top = 58, bottom = 6;
  SC = Math.min(W / FW, (H - top - bottom) / FH);
  OX = (W - FW * SC) / 2;
  OY = top + (H - top - bottom - FH * SC) / 2;
}
window.addEventListener('resize', resize);
resize();

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function pick(weights) {
  let tot = 0;
  for (const k in weights) tot += weights[k];
  let r = Math.random() * tot;
  for (const k in weights) { r -= weights[k]; if (r <= 0) return k; }
  return Object.keys(weights)[0];
}

// ---------- Guardado ----------
const Save = {
  data: null,
  load() {
    let d = null;
    // ?test: partida de prueba que no toca el guardado de verdad
    if (!/[?&]test/.test(location.search)) try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { /* sin guardado */ }
    this.data = Object.assign({ res: null, planos: [], heroes: {}, figus: [], seen: {}, base: null, chars: [], harvestReady: false, introSeen: false, chapters: [], partner: null, feria: null, stages: ['barrio'], best: {}, wins: {}, runs: 0, kills: 0,
      settings: { sound: true, music: true, autoaim: false, shake: true, autofire: true, speed: 1 } }, d || {});
    if (!this.data.base) this.data.base = { lots: {}, cleared: BASE_START.slice() };
    this.data.res = Object.assign({ oro: this.data.coins || 0, madera: 0, ladrillo: this.data.bricks || 0, trigo: 0 }, this.data.res);
    for (const r in this.data.res) if (!Number.isFinite(this.data.res[r])) this.data.res[r] = 0;
    if (!Array.isArray(this.data.base.cleared)) this.data.base.cleared = BASE_START.slice();
    if (!this.data.base.lots) this.data.base.lots = {};
    for (const k in this.data.base.lots) if (!BUILDINGS[this.data.base.lots[k].b]) delete this.data.base.lots[k];
    this.data.settings = Object.assign({ sound: true, music: true, autoaim: false, shake: true, autofire: true, speed: 1 }, this.data.settings);
  },
  // nivel, experiencia y entrenamientos de un personaje
  hero(id) { const h = this.data.heroes[id] || (this.data.heroes[id] = { lvl: 1, xp: 0, train: {} }); h.train = h.train || {}; return h; },
  save() { if (/[?&]test/.test(location.search)) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* lleno o bloqueado */ } },
};
Save.load();

// ---------- Estado ----------
let G = null;              // la partida en curso
let state = 'menu';        // menu | play | levelup | pause | end
const input = { left: false, right: false, up: false, down: false, aimX: FW / 2, aimY: 300, mouse: false, touchX: null, touchY: null, dragFromX: 0, dragFromY: 0, pFromX: 0, pFromY: 0 };

function baseStats() {
  return { maxHp: 60, hp: 60, regen: 0, speed: 1, might: 1, fireRate: 1, balls: 0, pickup: 1, growth: 1, greed: 1, luck: 1,
    crit: 0.05, ballSpd: 1, area: 1, rerolls: 0, chain: 0, burnDur: 0, poisonDmg: 0, bossDmg: 0, dotDmg: 0, babies: 0, childMul: 1, critDmg: 0 };
}

function newGame(charId, stageId, partnerId, feriaId) {
  const ch = CHARACTERS.find(c => c.id === charId);
  const stage = STAGES.find(s => s.id === stageId);
  const p = baseStats();
  for (const k in Save.data.base.lots) { const lot = Save.data.base.lots[k], b = BUILDINGS[lot.b]; if (b.apply) b.apply(p, lot.lvl); }
  for (const k in ch.mods) p[k] = (p[k] || 0) + ch.mods[k];
  const partner = partnerId && partnerId !== charId ? CHARACTERS.find(c => c.id === partnerId) : null;
  if (partner) for (const k in partner.mods) p[k] = (p[k] || 0) + partner.mods[k];
  applyHeroStats(p, heroStats(ch.id), 1);
  if (partner) applyHeroStats(p, heroStats(partner.id), 0.5);
  p.might += Save.data.figus.length * 0.01; // álbum: +1% por figurita distinta
  if (ch.trait === 'pacto') p.maxHp = Math.round(p.maxHp / 2);
  p.hp = p.maxHp;
  G = {
    ch, stage, p, t: 0, x: FW / 2, y: PLAYER_Y, face: 0, moving: false, walkT: 0, atkT: 0,
    enemies: [], balls: [], gems: [], fx: [], parts: [], texts: [], spits: [], decals: [],
    bag: [{ id: ch.ball, lvl: startBallLvl(Save.hero(ch.id).lvl) }], passives: {}, seen: {}, hand: [], fireT: 0, partner,
    slots: START_SLOTS + (typeof isBuilt === 'function' && isBuilt('utileria') ? isBuilt('utileria').lvl : 0),
    loot: { oro: 0, madera: 0, ladrillo: 0, trigo: 0 }, planos: [], orbs: 0, elitesT: 0,
    lvl: 1, xp: 0, xpNext: xpFor(1), kills: 0, coins: 0, bricks: 0, rowT: 1.2, rows: 0,
    miniDone: false, bossDone: false, boss: null, won: false, shake: 0, hurtT: 0, pendingLv: 0,
    rerolls: p.rerolls, dmgDone: {}, scroll: 0, rowDist: RH, formV: 0, seed: Math.random() * 1000, banner: null,
  };
  if (partner && partner.ball !== ch.ball && ch.trait !== 'boleador') G.bag.push({ id: partner.ball, lvl: 1 });
  if (feriaId && PASSIVES[feriaId]) { G.passives[feriaId] = 1; PASSIVES[feriaId].apply(G.p); }
  syncHand();
  tilesOf(stage.ground);
  if (partner) loadSprite(partner.sprite);
  loadSprite(ch.sprite); if (ch.sprite !== 'pibe') loadSprite(ch.sprite + '_atk');
  for (const k in ENEMIES) loadSprite(ENEMIES[k].sprite);
  state = 'play';
  showBanner(stage.name.toUpperCase(), stage.depth + ' del Pozo');
  Sfx.play('boss');
}

// Stats de un personaje: los de su nivel más lo entrenado.
function heroStats(id) {
  const h = Save.hero(id), s = statsAtLevel(id, h.lvl);
  for (const k in h.train) s[k] = (s[k] || 0) + h.train[k];
  return s;
}
function applyHeroStats(p, s, k) {
  p.maxHp += (s.agu || 0) * 12 * k;
  p.might += (s.fue || 0) * 0.06 * k;
  p.dotDmg += (s.man || 0) * 0.08 * k; p.childMul += (s.man || 0) * 0.08 * k;
  p.babies += (s.lid || 0) * 0.15 * k;
  p.fireRate += (s.vel || 0) * 0.04 * k; p.speed += (s.vel || 0) * 0.03 * k;
  p.crit += (s.pun || 0) * 0.015 * k; p.critDmg += (s.pun || 0) * 0.05 * k;
}
// Experiencia del personaje al terminar una bajada. Devuelve los niveles que subió.
function giveHeroXp(id, xp) {
  const h = Save.hero(id), from = h.lvl;
  h.xp += Math.round(xp);
  while (h.lvl < MAX_HERO_LVL && h.xp >= xpNeed(h.lvl)) { h.xp -= xpNeed(h.lvl); h.lvl++; }
  if (h.lvl >= MAX_HERO_LVL) h.xp = 0;
  return { id, xp: Math.round(xp), from, to: h.lvl };
}
function xpFor(l) { return Math.round(4 + l * 4 + l * l * 0.6); }

// Cuántas pelotas de cada tipo hay en juego (en la mano + volando) y completa las que faltan.
function perType() { return 3 + G.p.balls; }
function syncHand() {
  const n = perType();
  for (const s of G.bag) {
    const have = G.hand.filter(h => h === s.id).length + G.balls.filter(b => b.id === s.id && !b.child).length;
    for (let i = have; i < n; i++) G.hand.push(s.id);
  }
  // mezclar para que salgan intercaladas
  for (let i = G.hand.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [G.hand[i], G.hand[j]] = [G.hand[j], G.hand[i]]; }
}
function slotOf(id) { return G.bag.find(s => s.id === id); }

const T = (k) => G && G.ch.trait === k;

// ---------- Disparo ----------
function aimAngle() {
  let tx, ty;
  const auto = Save.data.settings.autoaim || input.touchX != null || !input.mouse;
  if (auto) {
    // al que está más cerca de la barricada (los jefes cuentan como más peligrosos)
    let best = null, bs = -1e9;
    for (const e of G.enemies) {
      if (e.dead || e.y < -10) continue;
      const s = e.y + (e.def.boss ? 120 : 0) - Math.abs(e.x - G.x) * 0.15;
      if (s > bs) { bs = s; best = e; }
    }
    if (best) { tx = best.x; ty = best.y; } else { tx = G.x; ty = 0; }
  } else { tx = input.aimX; ty = input.aimY; }
  let a = Math.atan2(ty - (G.y - 30), tx - G.x);
  // siempre para arriba: entre -172° y -8°
  if (a > 0) a = a > Math.PI / 2 ? -Math.PI + 0.14 : -0.14;
  return clamp(a, -Math.PI + 0.14, -0.14);
}

function fire(dt) {
  const interval = 0.2 / G.p.fireRate;
  G.fireT -= dt;
  if (G.fireT > 0 || !G.hand.length) return;
  if (!Save.data.settings.autofire && !input.firing && input.touchX == null) return;
  G.fireT = interval;
  const id = G.hand.shift();
  const slot = slotOf(id);
  if (!slot) return fire(dt); // la pelota ya no existe (se fusionó)
  const a = aimAngle();
  const b = launch(id, slot.lvl, G.x + Math.cos(a) * 16, G.y - 34, a, false);
  if (T('kultrun') && Math.random() < 0.25) b.split = Math.max(b.split, 2);
  G.shots = (G.shots || 0) + 1;
  if (T('rafaga') && G.shots % 8 === 0) for (const da of [-0.22, 0.22]) launch(id, slot.lvl, G.x, G.y - 34, a + da, true);
  G.atkT = 0.22;
  Sfx.play('swing', { vol: 0.35, rate: 1.4 + Math.random() * 0.3 });
}
function launch(id, lvl, x, y, a, child) {
  const d = BALLS[id];
  const spd = d.spd * G.p.ballSpd * (child ? 0.9 : 1);
  const b = { id, lvl, d, x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, spd, r: child ? d.r * 0.7 : d.r, child, trail: [],
    pierce: (d.pierce || 0) * (d.pierce >= 99 ? 1 : lvl) + (T('taladro') && !child ? 1 : 0), hitCd: new Map(), split: child ? 0 : d.split || 0, bounces: 0, life: child ? 6 : 999, rootCd: 0 };
  G.balls.push(b);
  return b;
}

// ---------- Bichos ----------
function threat() { return G.stage.hpMul * (3.1 + G.t / 15 * 0.5 + Math.pow(G.t / 60, 2) * 0.55); }

function spawnEnemy(type, x, y, mul) {
  const def = ENEMIES[type];
  // los jefes dependen del nivel del Pozo (no del reloj), así un nivel más hondo es más duro pero no imposible
  const hp = def.hp * (def.boss ? Math.pow(G.stage.hpMul, 0.7) * 2.6 : threat()) * (mul || 1);
  const elite = !def.boss && !def.small && G.t > 20 && Math.random() < 0.035;
  const e = { type, def, x, y, hp: hp * (elite ? 3.5 : 1), maxHp: hp * (elite ? 3.5 : 1), elite, r: def.r, slowT: 0, stunT: 0, rootT: 0, burnT: 0, burnDps: 0, poison: 0, bleed: 0, bleedT: 0,
    flash: 0, seed: Math.random() * 100, atWall: false, actT: rand(1, 3), spd: def.spd * rand(0.9, 1.1), buffT: 0, phase: Math.random() * 4, vx: 0, ky: 0 };
  G.enemies.push(e);
  if (G.seen) G.seen[type] = 1;
  return e;
}

function spawnRow() {
  G.rows++;
  const prog = G.t / G.stage.len;
  const n = Math.min(COLS - 1, 3 + Math.floor(G.t / 25) + (Math.random() < 0.4 ? 1 : 0));
  const pool = Object.assign({}, G.stage.pool);
  if (prog > 0.4) for (const k in G.stage.late) pool[k] = (pool[k] || 0) + G.stage.late[k];
  // no entra nada en las columnas que todavía ocupa alguien arriba de todo (si no, lo empujaría para atrás)
  const free = new Set([...Array(COLS).keys()].filter(c => !G.enemies.some(e => !e.dead && e.col != null && e.y < RH * 0.9 && c >= e.col && c < e.col + e.span)));
  // de vez en cuando, una fila entera de ratas
  if (prog > 0.25 && Math.random() < 0.1) { for (const c of free) spawnEnemy('rata', CW * (c + 0.5), -RH / 2, 0.8); return; }
  let placed = 0;
  while (placed < n && free.size) {
    const type = pick(pool), def = ENEMIES[type];
    const span = def.big ? 2 : 1;
    const opts = [...free].filter(c => span === 1 || (free.has(c + 1) && c + 1 < COLS));
    if (!opts.length) { if (span === 2) continue; break; }
    const c = opts[(Math.random() * opts.length) | 0];
    for (let k = 0; k < span; k++) free.delete(c + k);
    const e = spawnEnemy(type, CW * (c + span / 2), -RH / 2);
    e.col = c; e.span = span;
    placed += span;
  }
}

function spawnBoss(type, final) {
  const e = spawnEnemy(type, FW / 2, -RH, final ? 1 : 0.8);
  e.isBoss = true; e.final = final; e.col = 2; e.span = 4;
  G.boss = e;
  showBanner(e.def.name, final ? 'Jefe de la noche' : 'Viene un grandote');
  Sfx.play('boss'); Sfx.play('rugido');
  G.shake = Math.max(G.shake, 10);
}

// ---------- Consejos (solo la primera vez que pasa cada cosa) ----------
const TIPS = {
  mover: 'Movete con A/D o las flechas (en el celu, arrastrá el dedo).',
  gema: 'Las gemas caen al piso: caminá hasta ellas para subir de nivel.',
  atrapar: 'Si te parás abajo de una pelota que baja, la atrapás y sale antes.',
  barricada: '¡Llegaron a las bolsas! Mientras estén ahí, te sacan vida.',
  orbe: 'Ese orbe de colores mejora tus cosas. Lo sueltan las élites doradas y los jefes.',
  botin: 'Oro, madera, ladrillos, trigo: todo lo que juntás vuelve al pueblo aunque mueras.',
};
function tip(id) {
  const d = Save.data;
  d.tips = d.tips || [];
  if (d.tips.includes(id) || d.runs > 6) return;
  d.tips.push(id); Save.save();
  if (typeof showTip === 'function') showTip(TIPS[id]);
}

// ---------- Golpes ----------
function dmgText(x, y, v, col, big) {
  if (G.texts.length > 60) return;
  G.texts.push({ x: x + rand(-6, 6), y, v: Math.round(v), col, life: 0.7, big });
}

function hurtEnemy(e, dmg, o = {}) {
  if (e.dead) return 0;
  if (e.def.boss) dmg *= 1 + G.p.bossDmg + (o.bossMul ? o.bossMul - 1 : 0);
  if ((e.def.boss || e.elite) && T('ronda')) dmg *= 1.5;
  if (e.def.armor && !o.dot) dmg *= 1 - e.def.armor;
  if (o.dot) dmg *= 1 + G.p.dotDmg;
  if (o.holy && e.def.undead) dmg *= o.holy;
  e.hp -= dmg;
  G.dmgDone[o.src || 'otros'] = (G.dmgDone[o.src || 'otros'] || 0) + dmg;
  if (!o.dot) { e.flash = 0.09; e.sq = 1; }
  if (!o.silent && (dmg >= 1)) dmgText(e.x, e.y - e.r * 2.2, dmg, o.crit ? '#ffcc33' : o.col || '#fff', o.crit);
  if (e.hp <= 0) killEnemy(e, o);
  return dmg;
}

function killEnemy(e, o = {}) {
  if (e.dead) return;
  e.dead = true;
  G.kills++;
  const d = e.def;
  G.hitstop = Math.max(G.hitstop || 0, d.boss ? 0.12 : e.elite || d.big ? 0.035 : 0);
  // gemas (los grandes tiran varias)
  const xp = d.xp;
  const nG = d.boss ? 12 : Math.min(4, xp);
  for (let i = 0; i < nG; i++) dropGem(e.x + rand(-e.r, e.r), e.y + rand(-e.r, 0), xp / nG, false);
  const at = () => [e.x + rand(-e.r, e.r), e.y + rand(-e.r, 0)];
  // oro: poquito (el Pozo es mezquino)
  const coinChance = d.thief || d.boss || e.elite ? 1 : 0.09 * G.p.luck;
  if (Math.random() < coinChance) {
    const nc = d.thief ? 10 : d.boss ? (e.final ? 25 : 10) : e.elite ? 2 : 1;
    for (let i = 0; i < nc * (T('abundancia') ? 2 : 1); i++) dropGem(...at(), 1, 'oro');
  }
  // materiales para el pueblo
  const nm = d.boss ? (e.final ? 10 : 5) : e.elite ? 1 : Math.random() < (d.big ? 0.15 : 0.045) * G.p.luck ? 1 : 0;
  for (let i = 0; i < nm * (T('abundancia') ? 2 : 1); i++) dropGem(...at(), 1, pick(G.stage.drops));
  // orbe de fisión: élites y jefes
  if (d.boss || e.elite) dropGem(...at(), 1, 'orbe');
  // planos: los jefes siempre (si quedan), las élites a veces
  if ((d.boss && (e.final || Save.data.planos.length < 3 || Math.random() < 0.5)) || (e.elite && Math.random() < 0.1)) {
    const faltan = G.stage.planos.filter(id => !Save.data.planos.includes(id) && !G.planos.includes(id) && !G.gems.some(g => g.plano === id));
    if (faltan.length) { const g = dropGem(...at(), 1, 'plano'); g.plano = faltan[(Math.random() * faltan.length) | 0]; }
  }
  // gore
  blood(e.x, e.y - e.r * 0.8, d.boss ? 40 : d.big ? 16 : 9, d.undead ? '#5a5a6a' : '#7a0f0a');
  G.fx.push({ t: 'blast', x: e.x, y: e.y - e.r * 0.8, s: d.boss ? 4 : d.big ? 2.4 : 1.6, life: 0.45, max: 0.45, img: GORE.blast[(Math.random() * GORE.blast.length) | 0] });
  G.decals.push({ x: e.x, y: e.y, r: e.r * rand(0.9, 1.4), rot: Math.random() * TAU, a: 0.5, col: d.undead ? '#2a2a33' : '#3a0505' });
  if (G.decals.length > 60) G.decals.shift();
  Sfx.play(d.boss ? 'die' : 'splat', { x: e.x });
  if (o.healOnKill) healPlayer(o.healOnKill);
  const near = (r) => G.enemies.filter(x => !x.dead && x !== e && Math.hypot(x.x - e.x, x.y - e.y) < r);
  if (T('contagio') && e.burnT > 0) for (const x of near(80)) { x.burnT = Math.max(x.burnT, 3); x.burnDps = Math.max(x.burnDps, e.burnDps); }
  if (T('maleficio') && e.poison > 0.5) for (const x of near(80)) x.poison += e.poison * 0.6;
  if (T('bendicion') && d.undead) { G.fx.push({ t: 'splash', x: e.x, y: e.y - e.r, r: 60, col: '#8fd0ff', life: 0.35, max: 0.35 }); for (const x of near(60)) hurtEnemy(x, x.maxHp * 0.15 + 5, { col: '#8fd0ff', src: 'agua', silent: true }); }
  if (d.explode) explode(e.x, e.y, 70, 0, '#d8e04a', true);
  if (d.boss) {
    G.shake = 16;
    Sfx.play('evolve');
    if (G.boss === e) G.boss = null;
    if (e.final) { G.won = true; G.endT = 2.4; showBanner('¡GANASTE LA NOCHE!', 'Juntá lo que quedó'); for (const x of G.enemies) if (!x.dead && !x.def.boss) killEnemy(x); }
  }
}

function healPlayer(v) { G.p.hp = Math.min(G.p.maxHp, G.p.hp + v); }

function dropGem(x, y, v, coin) {
  const g = { x, y, vx: rand(-60, 60), vy: rand(-140, -40), v, coin, life: coin === 'plano' || coin === 'orbe' ? 30 : 14, magnet: false };
  G.gems.push(g);
  return g;
}

function blood(x, y, n, col) {
  for (let i = 0; i < n; i++) {
    G.parts.push({ x, y, vx: rand(-170, 170), vy: rand(-240, -40), life: rand(0.35, 0.7), size: rand(2, 4.5), col, grav: 700,
      img: Math.random() < 0.3 ? GORE.gib[(Math.random() * GORE.gib.length) | 0] : null, rot: Math.random() * TAU, vr: rand(-8, 8) });
  }
  if (G.parts.length > 500) G.parts.splice(0, G.parts.length - 500);
}

// explosión en área: dmg 0 = la de un Explosivo (lastima a los bichos y, si está cerca de la barricada, a vos)
function explode(x, y, rad, dmg, col, fromEnemy) {
  rad *= fromEnemy ? 1 : G.p.area;
  G.fx.push({ t: 'boom', x, y, r: rad, col, life: 0.4, max: 0.4 });
  Sfx.play('boom', { x });
  G.shake = Math.max(G.shake, fromEnemy ? 7 : 4);
  for (const e of G.enemies) {
    if (e.dead) continue;
    const dd = Math.hypot(e.x - x, e.y - y);
    if (dd < rad + e.r) hurtEnemy(e, fromEnemy ? 25 * threat() * 0.5 : dmg, { col, src: 'boom' });
  }
  if (fromEnemy && y > WALL_Y - 80) hurtPlayer(14);
}

function hurtPlayer(v) {
  if (G.won) return;
  G.p.hp -= v;
  if (G.hurtT <= 0) { Sfx.play('hurt'); if (navigator.vibrate && input.touchX != null) navigator.vibrate(25); G.hurtT = 0.35; G.shake = Math.max(G.shake, 5); }
}

// Efecto de una pelota al tocar a un bicho.
function onBallHit(b, e) {
  const d = b.d, L = b.lvl, P = G.p;
  const lvMul = 1 + (L - 1) * 0.5;
  let dmg = d.dmg * lvMul * P.might * (b.child ? 0.55 * P.childMul : 1);
  let crit = false;
  const cc = P.crit + (d.crit || 0);
  if (Math.random() < cc) { crit = true; G.shake = Math.max(G.shake, 2.5); dmg *= (T('payada') ? Math.max(4, d.critX || 0) : d.critX || (d.crit ? 3 : 2)) * (1 + P.critDmg); }
  if (T('rebote')) dmg *= 1 + Math.min(0.8, b.bounces * 0.08);
  if (b.id.includes('pelota') || b.id === 'botin') dmg *= 1 + Math.min(0.6, b.bounces * 0.04);
  hurtEnemy(e, dmg, { crit, col: d.col, holy: d.holy, bossMul: d.boss, src: b.id, healOnKill: d.heal ? d.heal * L : 0 });
  Sfx.play('hit', { x: e.x });
  G.fx.push({ t: 'spark', x: b.x, y: b.y, col: d.col, life: 0.18, max: 0.18, rot: Math.random() * TAU });
  if (crit && T('carnicera') && !e.dead) { e.bleed = Math.min(5, e.bleed + 1); e.bleedDps = Math.max(e.bleedDps || 0, dmg * 0.15); e.bleedT = 4; }
  if (T('chispazo') && (G.hits = (G.hits || 0) + 1) % 8 === 0) {
    let from = e;
    for (let k = 0; k < 3; k++) {
      const nx = G.enemies.filter(x => !x.dead && x !== from).sort((a, c) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(c.x - from.x, c.y - from.y))[0];
      if (!nx) break;
      G.fx.push({ t: 'bolt', x1: from.x, y1: from.y - from.r, x2: nx.x, y2: nx.y - nx.r, col: '#7ad7ff', life: 0.18, max: 0.18 });
      hurtEnemy(nx, dmg * 0.8, { col: '#7ad7ff', src: 'chispazo' });
      from = nx;
    }
    Sfx.play('zap', { x: e.x });
  }
  if (!e.dead) {
    if (d.light && e.def.ghost) { e.burnT = 3; e.burnDps = Math.max(e.burnDps, d.dmg * lvMul * P.might * 0.5); }
    if (d.burn) { e.burnT = 3 * (1 + P.burnDur); e.burnDps = Math.max(e.burnDps, d.burn * lvMul * P.might); }
    if (d.poison) e.poison += d.poison * lvMul * P.might * (1 + P.poisonDmg);
    if (d.bleed) { e.bleed = Math.min(d.pierce >= 99 ? 99 : 5, e.bleed + 1); e.bleedDps = d.bleed * lvMul * P.might; e.bleedT = 4; }
    if (d.slow) e.slowT = Math.max(e.slowT, d.slow);
    if (d.stun && !e.def.boss) e.stunT = Math.max(e.stunT, d.stun + (L - 1) * 0.15);
    if (d.knock && !e.def.boss) e.ky -= d.knock * (1 + (L - 1) * 0.3) * (e.def.big ? 0.4 : 1);
    if (d.root && b.rootCd <= 0 && !e.def.boss) { e.rootT = d.root; b.rootCd = 4 - L * 0.6; }
  }
  if (d.wave) {
    const rad = d.wave * (1 + (L - 1) * 0.2) * P.area;
    G.fx.push({ t: 'ring', x: e.x, y: e.y - e.r * 0.5, r: rad, col: d.col, life: 0.3, max: 0.3 });
    for (const o of G.enemies) if (o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < rad + o.r) hurtEnemy(o, dmg * 0.45, { col: d.col, src: b.id, silent: true });
  }
  if (d.splash) {
    const rad = d.splash * P.area;
    G.fx.push({ t: 'splash', x: e.x, y: e.y - e.r * 0.5, r: rad, col: d.col, life: 0.35, max: 0.35 });
    for (const o of G.enemies) if (o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < rad + o.r) hurtEnemy(o, dmg * 0.5, { col: d.col, holy: d.holy, src: b.id, silent: true });
  }
  if (d.boom) {
    explode(b.x, b.y, d.boom * (1 + (L - 1) * 0.15), dmg * 0.8, d.col, false);
    if (d.burn) for (const o of G.enemies) if (!o.dead && Math.hypot(o.x - b.x, o.y - b.y) < d.boom * P.area) { o.burnT = 3; o.burnDps = Math.max(o.burnDps, d.burn * P.might); }
  }
  if (d.chain) {
    const n = d.chain + (d.fusion ? 0 : L - 1) + P.chain;
    let from = e;
    const done = new Set([e]);
    for (let i = 0; i < n; i++) {
      let best = null, bd = 150;
      for (const o of G.enemies) {
        if (o.dead || done.has(o)) continue;
        const dd = Math.hypot(o.x - from.x, o.y - from.y);
        if (dd < bd) { bd = dd; best = o; }
      }
      if (!best) break;
      G.fx.push({ t: 'bolt', x1: from.x, y1: from.y - from.r, x2: best.x, y2: best.y - best.r, col: d.col, life: 0.18, max: 0.18 });
      hurtEnemy(best, dmg * 0.6, { col: d.col, holy: d.holy, src: b.id });
      if (d.splash) for (const o of G.enemies) if (!o.dead && o !== best && Math.hypot(o.x - best.x, o.y - best.y) < d.splash) hurtEnemy(o, dmg * 0.3, { silent: true, holy: d.holy, src: b.id });
      done.add(best); from = best;
    }
    Sfx.play('zap', { x: e.x });
  }
  if (b.split > 0) {
    const n = b.split + (L - 1);
    const base = Math.atan2(b.vy, b.vx);
    for (let i = 0; i < n; i++) launch(b.id, L, b.x, b.y, base + Math.PI + rand(-0.9, 0.9), true);
    b.split = 0;
  }
}

// ---------- Actualización ----------
function update(dt) {
  if (!G) return;
  const P = G.p;
  G.t += dt;
  // fin de la partida (ganada: unos segundos para juntar)
  if (G.won) { G.endT -= dt; for (const g of G.gems) g.magnet = true; if (G.endT <= 0) return endGame(true); }

  // ---- jugador ----
  const sp = 300 * P.speed;
  let mx = 0, my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  if (input.touchX != null) {
    const tx = input.pFromX + (input.touchX - input.dragFromX) * 1.4;
    const ty = input.pFromY + (input.touchY - input.dragFromY) * 1.4;
    const dx = tx - G.x, dy = ty - G.y;
    mx = Math.abs(dx) > 3 ? clamp(dx / 40, -1, 1) : 0;
    my = Math.abs(dy) > 3 ? clamp(dy / 40, -1, 1) : 0;
  }
  G.x = clamp(G.x + mx * sp * dt, 24, FW - 24);
  G.y = clamp(G.y + my * sp * 0.6 * dt, WALL_Y + 40, FH - 30);
  G.moving = Math.abs(mx) + Math.abs(my) > 0.05;
  if (G.moving) G.walkT += dt;
  if (Math.abs(mx) > 0.3) G.face = mx < 0 ? 1 : 3; else G.face = 0;
  G.atkT -= dt;
  G.hurtT -= dt;
  if (P.regen) healPlayer(P.regen * dt);
  if (G.t > 1.5) tip('mover');
  if (!G.won) fire(dt);
  // pibitos: pelotitas que salen solas, de algún tipo de la bolsa
  if (P.babies > 0 && !G.won) {
    G.babyT = (G.babyT == null ? 1 : G.babyT) - dt;
    if (G.babyT <= 0) {
      G.babyT = Math.max(0.4, 3.2 / P.babies);
      const s = G.bag[(Math.random() * G.bag.length) | 0];
      if (s) launch(s.id, s.lvl, G.x, G.y - 30, aimAngle() + rand(-0.35, 0.35), true);
    }
  }

  // ---- filas y jefes ----
  if (!G.won) {
    const prog = G.t / G.stage.len;
    const bossAlive = G.boss && !G.boss.dead;
    // la formación baja a velocidad pareja; cada RH de avance entra una fila nueva arriba
    G.formV = (24 + G.t * 0.09) * (bossAlive ? 0.55 : 1);
    // oleadas: al empezar cada una hay un respiro corto (no entran filas) y un cartel
    const wv = Math.min(WAVES, Math.floor(G.t / (G.stage.len / WAVES)) + 1);
    if (wv !== G.wave) {
      G.wave = wv;
      if (wv > 1) { G.breath = 2.5; showBanner(`OLEADA ${wv}`, wv === WAVES ? 'La última' : wv === WAVES / 2 + 1 ? 'Después del grandote' : ''); Sfx.play('warn'); }
    }
    G.breath = (G.breath || 0) - dt;
    G.rowDist += G.formV * dt;
    if (G.rowDist >= RH) { G.rowDist -= RH; if (G.breath <= 0) spawnRow(); }
    if (!G.miniDone && prog >= 0.5) { G.miniDone = true; spawnBoss(G.stage.mini, false); }
    if (!G.bossDone && prog >= 1) { G.bossDone = true; spawnBoss(G.stage.jefe, true); }
  }

  // ---- bichos ----
  const th = threat();
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = e.def;
    if (e.sq) e.sq = Math.max(0, e.sq - dt * 7);
    e.flash -= dt; e.slowT -= dt; e.stunT -= dt; e.rootT -= dt; e.buffT -= dt; e.phase += dt;
    // daño por tiempo
    if (e.burnT > 0) { e.burnT -= dt; hurtEnemy(e, e.burnDps * dt, { dot: true, silent: true, src: 'fuego' }); if (Math.random() < dt * 8) G.fx.push({ t: 'flame', x: e.x + rand(-e.r * 0.6, e.r * 0.6), y: e.y - rand(0, e.r * 2), life: 0.4, max: 0.4 }); }
    if (e.poison > 0 && !e.dead) { hurtEnemy(e, e.poison * dt, { dot: true, silent: true, src: 'veneno' }); e.poison *= Math.pow(0.85, dt); }
    if (e.bleed > 0 && !e.dead) { e.bleedT -= dt; hurtEnemy(e, e.bleed * (e.bleedDps || 2) * dt, { dot: true, silent: true, src: 'sangrado' }); if (e.bleedT <= 0) e.bleed = 0; if (Math.random() < dt * e.bleed * 2) blood(e.x, e.y - e.r, 1, '#9a1010'); }
    if (e.dead) continue;
    if (d.regen) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * d.regen * dt);
    // movimiento
    // todos marchan con la formación; los rápidos se adelantan hasta chocar con el de adelante
    let v = G.formV * clamp(d.spd / 15, 0.7, 2.2) * (e.slowT > 0 ? 0.5 : 1) * (e.buffT > 0 ? 1.5 : 1);
    if (e.stunT > 0 || e.rootT > 0) v = 0;
    if (e.ky) { e.y += e.ky * dt * 8; e.ky *= Math.pow(0.02, dt); if (Math.abs(e.ky) < 0.5) e.ky = 0; }
    const stopY = WALL_Y - 4;
    if (e.y < stopY) { e.y += v * dt; e.atWall = false; }
    else { e.y = stopY; e.atWall = true; }
    if (e.col == null) { e.span = d.big ? 2 : 1; e.col = clamp(Math.round(e.x / CW - e.span / 2), 0, COLS - e.span); }
    e.x += (CW * (e.col + e.span / 2) - e.x) * Math.min(1, dt * 8);
    // en la barricada: pega
    if (e.atWall && e.stunT <= 0) {
      tip('barricada');
      if (d.explode) { e.dead = true; explode(e.x, e.y, 70, 0, '#d8e04a', true); continue; }
      if (d.thief) { // el Pombero se lleva monedas y se va
        const robo = Math.min(10, G.loot.oro); G.loot.oro -= robo; e.dead = true; if (robo) { showBanner('El Pombero te robó', `-${robo} de oro`); Sfx.play('bag'); } continue;
      }
      const k = Math.min(th, 15);
      hurtPlayer(d.dmg * (d.boss ? 1 + k * 0.05 : 1.6 + k * 0.2) * (e.elite ? 2 : 1) * dt);
    }
    // habilidades
    e.actT -= dt;
    if (d.summon && e.y > 40 && (e.sumT = (e.sumT == null ? 4 : e.sumT) - dt) <= 0) {
      e.sumT = 7;
      // los invocados salen a los costados (en columnas que no son las del que invoca, para no empujarlo)
      const side = [...Array(COLS).keys()].filter(c => e.col == null || c < e.col || c >= e.col + e.span);
      for (let i = 0; i < 3 && side.length; i++) { const c = side.splice((Math.random() * side.length) | 0, 1)[0]; const m = spawnEnemy(d.summon, CW * (c + 0.5), e.y + rand(-20, 30), 0.7); m.col = c; m.span = 1; }
      Sfx.play('aullido', { vol: 0.6 });
    }
    if (e.actT <= 0 && e.y > 40) {
      if (d.spit && e.y < WALL_Y - 90) { e.actT = d.boss ? 1.8 : rand(4.5, 6.5); const a = Math.atan2(G.y - 20 - e.y, G.x - e.x); G.spits.push({ x: e.x, y: e.y - e.r, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, dmg: d.boss ? 10 : 5, life: 5 }); Sfx.play('gorgoteo', { vol: 0.4 }); }
      else if (d.lunge) { e.actT = rand(4, 6); e.ky += 9; }
      else if (d.healer) { e.actT = 2; for (const o of G.enemies) if (!o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 90) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.06); } G.fx.push({ t: 'ring', x: e.x, y: e.y - e.r, r: 90, col: '#c8261f', life: 0.4, max: 0.4 }); }
      else if (d.screamer) { e.actT = 6; for (const o of G.enemies) if (!o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 140) o.buffT = 2.5; G.fx.push({ t: 'ring', x: e.x, y: e.y - e.r, r: 140, col: '#be8cff', life: 0.5, max: 0.5 }); Sfx.play('scream', { vol: 0.5 }); }
      else e.actT = 99;
    }
  }
  // cola por columnas: cada bicho frena detrás del que tiene adelante (como ladrillos)
  const en = G.enemies.filter(e => !e.dead).sort((a, b) => b.y - a.y);
  for (let i = 0; i < en.length; i++) {
    const a = en[i];
    if (a.def.boss) continue; // el jefe no hace cola: se abre paso (si no, puede quedar trabado arriba, fuera de alcance)
    for (let j = 0; j < i; j++) {
      const b = en[j];
      if (a.col + a.span <= b.col || b.col + b.span <= a.col) continue;
      const gap = Math.max(RH * 0.82, (a.r + b.r) * 1.05);
      if (a.y > b.y - gap) { a.y = b.y - gap; a.atWall = false; }
    }
  }
  G.enemies = en.filter(e => e.y < FH + 50);

  // ---- pelotas ----
  for (const b of G.balls) {
    b.rootCd -= dt; b.life -= dt;
    if (b.d.homing || (T('gps') && !b.child)) {
      let best = null, bd = 1e9;
      for (const e of G.enemies) { const dd = Math.hypot(e.x - b.x, e.y - b.y); if (dd < bd && !b.hitCd.has(e)) { bd = dd; best = e; } }
      if (best && b.vy < 200) {
        const want = Math.atan2(best.y - best.r - b.y, best.x - b.x), cur = Math.atan2(b.vy, b.vx);
        let da = want - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
        const hk = b.d.homing || 0.45, na = cur + clamp(da, -2.4 * hk * dt, 2.4 * hk * dt), s = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(na) * s; b.vy = Math.sin(na) * s;
      }
    }
    for (const [e, t] of b.hitCd) { if (t - dt <= 0) b.hitCd.delete(e); else b.hitCd.set(e, t - dt); }
    const speed = Math.hypot(b.vx, b.vy);
    const steps = Math.max(1, Math.ceil(speed * dt / 5));
    const sdt = dt / steps;
    for (let s = 0; s < steps && !b.gone; s++) {
      b.x += b.vx * sdt; b.y += b.vy * sdt;
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); bounce(b); }
      if (b.x > FW - b.r) { b.x = FW - b.r; b.vx = -Math.abs(b.vx); bounce(b); }
      if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); bounce(b); }
      if (b.y > RETURN_Y && T('manguera') && !b.child && !b.floored && b.life > 0) { b.floored = true; b.y = RETURN_Y; b.vy = -Math.abs(b.vy); bounce(b); continue; }
      if (!b.child && b.vy > 0 && b.y > WALL_Y + 10 && G.t > 8) tip('atrapar');
      if (b.y > RETURN_Y || b.life <= 0) { b.gone = true; if (!b.child && slotOf(b.id)) { G.hand.push(b.id); ballBack(); } break; }
      if (!b.child && b.vy > 0 && b.y > WALL_Y && Math.hypot(b.x - G.x, b.y - (G.y - 24)) < 26) { b.gone = true; if (slotOf(b.id)) G.hand.unshift(b.id); G.catches = (G.catches || 0) + 1; Sfx.play('click', { vol: 0.6, rate: 1.6 }); if (T('atrapada')) healPlayer(2); ballBack(); G.fx.push({ t: 'spark', x: b.x, y: b.y, col: '#ffffff', life: 0.15, max: 0.15, rot: 0 }); break; }
      for (const e of G.enemies) {
        if (e.dead || b.hitCd.has(e)) continue;
        if (e.def.ghost && Math.sin(e.phase * 1.8) > 0.55 && !b.d.light) continue; // fantasma: a ratos no se lo puede tocar
        const ey = e.y - e.r * 0.9; // el centro del cuerpo, no los pies
        const dx = b.x - e.x, dy = b.y - ey, rr = e.r + b.r;
        if (dx * dx + dy * dy > rr * rr) continue;
        onBallHit(b, e);
        b.hitCd.set(e, 0.12);
        if (b.pierce > 0 && !e.def.boss) { b.pierce--; continue; }
        // rebote: refleja la velocidad contra la normal del choque
        const dd = Math.hypot(dx, dy) || 1, nx = dx / dd, ny = dy / dd;
        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
        b.x = e.x + nx * (rr + 0.5); b.y = ey + ny * (rr + 0.5);
        bounce(b);
        if (b.d.pierce >= 99) b.pierce = 99;
        break;
      }
    }
    b.trail.push(b.x, b.y);
    if (b.trail.length > 16) b.trail.splice(0, 2);
  }
  G.balls = G.balls.filter(b => !b.gone);
  // pelotas que quedaron en la mano pero cuyo tipo se fusionó
  G.hand = G.hand.filter(id => slotOf(id));

  // ---- escupitajos ----
  for (const s of G.spits) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (Math.hypot(s.x - G.x, s.y - (G.y - 22)) < 20) { s.life = 0; hurtPlayer(s.dmg); G.fx.push({ t: 'splash', x: s.x, y: s.y, r: 26, col: '#9be33a', life: 0.3, max: 0.3 }); }
    if (s.y > FH) s.life = 0;
  }
  G.spits = G.spits.filter(s => s.life > 0);

  // ---- gemas y monedas ----
  const pr = 85 * P.pickup;
  for (const g of G.gems) {
    g.life -= dt;
    const dx = G.x - g.x, dy = G.y - 20 - g.y, dd = Math.hypot(dx, dy);
    if (dd < pr || (T('pizarron') && !g.coin && g.y >= GEM_Y - 2)) g.magnet = true;
    if (g.magnet) {
      const s = 520 + (1 - Math.min(1, dd / 300)) * 300;
      g.x += dx / (dd || 1) * s * dt; g.y += dy / (dd || 1) * s * dt;
      if (dd < 16) { g.life = -1; collect(g); }
    } else {
      g.vy = Math.min(220, g.vy + 380 * dt); g.x += g.vx * dt; g.vx *= Math.pow(0.1, dt);
      g.y += g.vy * dt;
      if (g.y > GEM_Y) { g.y = GEM_Y; g.vy = 0; g.vx = 0; tip(g.coin === 'orbe' ? 'orbe' : g.coin && g.coin !== 'plano' ? 'botin' : 'gema'); }
    }
  }
  G.gems = G.gems.filter(g => g.life > 0);

  // ---- efectos ----
  for (const p of G.parts) {
    p.life -= dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if (p.y > FH) p.life = 0;
  }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const f of G.fx) f.life -= dt;
  G.fx = G.fx.filter(f => f.life > 0);
  for (const t of G.texts) { t.life -= dt; t.y -= 40 * dt; }
  G.texts = G.texts.filter(t => t.life > 0);
  for (const d of G.decals) d.a -= dt * 0.02;
  G.decals = G.decals.filter(d => d.a > 0);
  G.shake = Math.max(0, G.shake - dt * 30);
  G.scroll += G.formV * dt;
  for (const dc of G.decals) dc.y += G.formV * dt;

  // ---- muerte / nivel ----
  if (P.hp <= 0 && !G.won) return endGame(false);
  if (G.won) { /* ya está: nada de cartas */ }
  else if (G.pendingLv > 0 && state === 'play') { G.pendingLv--; openLevelUp(); }
  else if (G.orbs > 0 && state === 'play') { G.orbs--; openOrb(); }
}

// Cada pelota que vuelve a la mano (para Yami: el acorde).
function ballBack() {
  if (!T('pogo')) return;
  G.backs = (G.backs || 0) + 1;
  if (G.backs % 12) return;
  G.fx.push({ t: 'ring', x: FW / 2, y: WALL_Y, r: FW * 0.6, col: '#c27bff', life: 0.5, max: 0.5 });
  Sfx.play('riff');
  for (const e of G.enemies) if (!e.dead && e.y > WALL_Y - 160) { if (!e.def.boss) e.ky -= 30; hurtEnemy(e, 6 * G.p.might * (1 + G.lvl * 0.15), { col: '#c27bff', src: 'acorde', silent: true }); }
}

function bounce(b) {
  b.bounces++;
  // que nunca quede rebotando casi horizontal para siempre
  const s = Math.hypot(b.vx, b.vy);
  if (Math.abs(b.vy) < s * 0.18) { b.vy = (b.vy < 0 ? -1 : 1) * s * 0.18; b.vx = Math.sign(b.vx) * Math.sqrt(s * s - b.vy * b.vy); }
  // la Pelota y el Botín aceleran
  if (b.id === 'pelota' || b.id === 'botin') { const k = Math.min(1.03, (b.spd * 1.6) / s); b.vx *= k; b.vy *= k; }
}

// Juntar seguido sube el tono (combo), como en las tragamonedas.
function pickTone() {
  const now = G.t;
  G.combo = now - (G.comboT || -9) < 0.45 ? Math.min(24, (G.combo || 0) + 1) : 0;
  G.comboT = now;
  return 0.9 + G.combo * 0.045;
}
function collect(g) {
  if (g.coin === 'plano') { G.planos.push(g.plano); Sfx.play('chest'); showBanner('¡UN PLANO!', BUILDINGS[g.plano].name); return; }
  if (g.coin === 'orbe') { G.orbs++; Sfx.play('evolve'); return; }
  if (g.coin) { if (G.texts.length < 60) G.texts.push({ x: G.x + rand(-10, 10), y: G.y - 64, v: '+1', col: RES[g.coin].col, life: 0.6, big: false });
    G.loot[g.coin] += T('tarifa') && Math.random() < 0.5 ? 2 : 1; if (g.coin === 'oro') G.coins += 1; Sfx.play('coin', { vol: 0.5, rate: pickTone() * (g.coin === 'oro' ? 1 : g.coin === 'madera' ? 0.7 : g.coin === 'ladrillo' ? 0.6 : 0.85) }); return; }
  G.xp += g.v * G.p.growth;
  Sfx.play('gem', { vol: 0.5, rate: pickTone() });
  while (G.xp >= G.xpNext) { G.xp -= G.xpNext; G.lvl++; G.xpNext = xpFor(G.lvl); G.pendingLv++; }
}

// ---------- Subir de nivel: cartas ----------
function cardOptions() {
  const opts = [];
  const owned = new Set(G.bag.map(s => s.id));
  for (const s of G.bag) if (s.lvl < MAX_BALL_LVL && !BALLS[s.id].fusion) opts.push({ kind: 'up', id: s.id, w: 7 });
  if (G.bag.length < G.slots && !T('boleador')) {
    // las que sirven para una fusión con algo que ya tenés pesan más
    for (const id in BALLS) {
      if (owned.has(id) || BALLS[id].fusion) continue;
      const helps = FUSIONS.some(f => (f.a === id && owned.has(f.b)) || (f.b === id && owned.has(f.a)));
      opts.push({ kind: 'new', id, w: helps ? 6 : 3 });
    }
  }
  for (const id in PASSIVES) { const l = G.passives[id] || 0; if (l < PASSIVES[id].max) opts.push({ kind: 'pas', id, w: 3.5 }); }
  const out = [];
  const nCards = T('mimos') || Math.random() < (G.p.luck - 1) * 0.5 ? 4 : 3;
  const fus = opts.filter(o => o.kind === 'fusion');
  if (fus.length) out.push(fus[0]);
  const rest = opts.filter(o => o.kind !== 'fusion');
  while (out.length < nCards && rest.length) {
    let tot = 0; for (const o of rest) tot += o.w;
    let r = Math.random() * tot, i = 0;
    for (; i < rest.length; i++) { r -= rest[i].w; if (r <= 0) break; }
    out.push(rest.splice(Math.min(i, rest.length - 1), 1)[0]);
  }
  if (!out.length) out.push({ kind: 'heal', id: 'empanada' });
  return out;
}

function applyCard(o) {
  if (o.kind === 'new') { if (slotOf(o.id) || G.bag.length >= G.slots) return; G.bag.push({ id: o.id, lvl: 1 }); syncHand(); Sfx.play('chest'); }
  else if (o.kind === 'up') { const s = slotOf(o.id); if (s && s.lvl < MAX_BALL_LVL) s.lvl++; Sfx.play('level'); }
  else if (o.kind === 'pas') {
    if ((G.passives[o.id] || 0) >= PASSIVES[o.id].max) return;
    G.passives[o.id] = (G.passives[o.id] || 0) + 1; PASSIVES[o.id].apply(G.p);
    if (o.id === 'bolsa') syncHand();
    Sfx.play('level');
  } else if (o.kind === 'fusion') {
    if (slotOf(o.id) || !slotOf(o.a) || !slotOf(o.b)) return;
    if (!BALLS[o.id]) BALLS[o.id] = mixBall(o.a, o.b);
    // las dos pelotas se van y entra la fusionada (libera un lugar)
    G.bag = G.bag.filter(s => s.id !== o.a && s.id !== o.b);
    for (const b of G.balls) if (b.id === o.a || b.id === o.b) b.gone = true;
    G.hand = G.hand.filter(h => h !== o.a && h !== o.b);
    G.bag.push({ id: o.id, lvl: 3 });
    syncHand();
    Sfx.play('evolve');
    showBanner('¡FUSIÓN!', BALLS[o.id].name);
    G.fx.push({ t: 'ring', x: G.x, y: G.y - 30, r: 160, col: BALLS[o.id].col, life: 0.6, max: 0.6 });
  } else if (o.kind === 'fision') {
    // sube de nivel cosas al azar (pelotas y objetos)
    const pool = [];
    for (const s of G.bag) if (s.lvl < MAX_BALL_LVL) pool.push(['b', s.id]);
    for (const id in G.passives) if (G.passives[id] < PASSIVES[id].max) pool.push(['p', id]);
    const n = Math.min(pool.length, 1 + ((Math.random() * (2 + G.p.luck * 1.5)) | 0));
    const got = [];
    for (let i = 0; i < n; i++) {
      const [k, id] = pool.splice((Math.random() * pool.length) | 0, 1)[0];
      if (k === 'b') { slotOf(id).lvl++; got.push(BALLS[id].name); } else { G.passives[id]++; PASSIVES[id].apply(G.p); got.push(PASSIVES[id].name); }
    }
    if (!got.length) { G.loot.oro += 8; G.coins += 8; got.push('8 de oro'); }
    syncHand();
    Sfx.play('evolve');
    showBanner('FISIÓN', got.join(' · '));
  } else if (o.kind === 'heal') { healPlayer(40); G.loot.oro += 15; Sfx.play('eat'); }
}

// Fusión libre: una pelota nueva con los efectos de las dos.
function mixBall(a, b) {
  const A = BALLS[a], B = BALLS[b], out = {};
  for (const k in A) out[k] = A[k];
  for (const k in B) if (typeof B[k] === 'number' && typeof out[k] === 'number') out[k] = Math.max(out[k], B[k]); else if (out[k] == null) out[k] = B[k];
  out.dmg = Math.round((A.dmg + B.dmg) * 0.6);
  out.spd = Math.round((A.spd + B.spd) / 2);
  out.r = Math.max(A.r, B.r);
  out.name = A.name.split(' ')[0] + ' + ' + B.name.split(' ')[0];
  out.desc = 'Fusión: hace lo de las dos.';
  out.col = A.col; out.col2 = B.col; out.fusion = true; out.mix = true;
  return out;
}
function orbOptions() {
  const lab = typeof isBuilt === 'function' && isBuilt('fusiones');
  const opts = [{ kind: 'fision' }];
  if (lab) {
    const owned = new Set(G.bag.map(s => s.id));
    for (const f of FUSIONS) {
      const a = slotOf(f.a), b = slotOf(f.b);
      if (a && b && a.lvl >= MAX_BALL_LVL && b.lvl >= MAX_BALL_LVL && !owned.has(f.out)) opts.push({ kind: 'fusion', evo: true, id: f.out, a: f.a, b: f.b });
    }
    const top = G.bag.filter(s => s.lvl >= MAX_BALL_LVL && !BALLS[s.id].fusion);
    for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) {
      const a = top[i].id, b = top[j].id;
      if (FUSIONS.some(f => (f.a === a && f.b === b) || (f.a === b && f.b === a))) continue;
      opts.push({ kind: 'fusion', id: 'mix_' + a + '_' + b, a, b });
    }
  }
  return { lab: !!lab, opts };
}

// ---------- Fin ----------
function endGame(won) {
  if (state === 'end') return;
  state = 'end';
  const d = Save.data;
  const loot = Object.assign({}, G.loot);
  // paga por aguantar: aunque mueras rápido, algo traés
  const paga = { oro: Math.floor(G.t / 10), madera: Math.floor(G.t / 30) };
  loot.oro += paga.oro; loot.madera += paga.madera;
  loot.oro = Math.round((loot.oro + G.kills * 0.02 + (won ? G.stage.reward : 0)) * G.p.greed);
  if (won) { const si = STAGES.findIndex(s => s.id === G.stage.id); loot.madera += 4 + si * 3; loot.ladrillo += 2 + si * 3; loot.trigo += si * 3; }
  for (const r in loot) d.res[r] += loot[r];
  const planos = G.planos.filter(id => !d.planos.includes(id));
  d.planos.push(...planos);
  const real = won || G.t >= 45;
  if (real) d.runs++;
  for (const k in G.seen) d.seen[k] = 1;
  // experiencia del personaje (y la mitad para el compañero)
  const hxp = (G.kills * 0.3 + G.t / 6 + (won ? 150 : 0)) * (1 + (G.p.growth - 1) * 0.5);
  const ups = [giveHeroXp(G.ch.id, hxp)];
  if (G.partner) ups.push(giveHeroXp(G.partner.id, hxp * 0.5));
  d.kills += G.kills;
  if (real) d.harvestReady = true;
  const prev = d.best[G.stage.id] || 0;
  if (G.t > prev) d.best[G.stage.id] = Math.round(G.t);
  let unlocked = null, chapter = null;
  if (won) {
    d.wins[G.stage.id] = (d.wins[G.stage.id] || 0) + 1;
    const i = STAGES.findIndex(s => s.id === G.stage.id);
    const next = STAGES[i + 1];
    if (next && !d.stages.includes(next.id)) { d.stages.push(next.id); unlocked = next; }
    if (!d.chapters.includes(G.stage.id)) { d.chapters.push(G.stage.id); chapter = STORY.chapters[G.stage.id]; }
  }
  Save.save();
  Sfx.play(won ? 'evolve' : 'die');
  showEnd(won, loot, unlocked, planos, chapter, paga, ups);
}

// ---------- Dibujo ----------
function shadeOutside(c) {
  // todo lo que queda fuera de la cancha, más oscuro
  c.fillStyle = 'rgba(5,7,5,.62)';
  c.fillRect(-2000, -2000, 2000, FH + 4000);
  c.fillRect(FW, -2000, 2000, FH + 4000);
}

function drawGround(c, stage, t, scroll) {
  const tiles = tilesOf(stage.ground);
  const T = 256;
  const sc = scroll || 0, off = sc % T, base = Math.floor(sc / T);
  c.save(); c.translate(0, off);
  // tiles en coordenadas de la cancha, cubriendo toda la pantalla
  const x0 = Math.floor((-OX / SC) / T) - 1, x1 = Math.ceil(((W - OX) / SC) / T) + 1;
  const y0 = Math.floor((-OY / SC) / T) - 1, y1 = Math.ceil(((H - OY) / SC) / T) + 1;
  c.fillStyle = stage.tint;
  c.fillRect(x0 * T, y0 * T, (x1 - x0) * T, (y1 - y0) * T);
  for (let ty = y0 - 1; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) {
    const v = (hash2(tx, ty - base, 7) * 6) | 0;
    const im = tiles[v];
    if (im.complete && im.naturalWidth) c.drawImage(im, tx * T, ty * T, T + 1, T + 1);
  }
  c.restore();
}

function drawDecor(c, stage, scroll) {
  // props de escena a los costados de la cancha (árboles, tumbas); bajan con el piso
  const list = stage.decor, span = 13 * 82, sc = (scroll || 0) % span;
  const left = -OX / SC, right = (W - OX) / SC;
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    let y = -40 + (i >> 1) * 82 + hash2(i, 3, 9) * 30 + sc;
    if (y > FH + 120) y -= span;
    const x = side < 0 ? -30 - hash2(i, 1, 9) * 120 : FW + 30 + hash2(i, 2, 9) * 120;
    if (x < left - 120 || x > right + 120) continue;
    const tipo = list[i % list.length];
    drawEscena(c, tipo, hash2(i, 5, 9), x, y, tipo === 'tumba' ? 1 : 0.8);
  }
}

function drawWalls(c) {
  // bordes de la cancha: muros de ladrillo
  for (const x of [-14, FW]) {
    const g = c.createLinearGradient(x, 0, x + 14, 0);
    g.addColorStop(0, '#2a1f1a'); g.addColorStop(0.5, '#4a3a2e'); g.addColorStop(1, '#2a1f1a');
    c.fillStyle = g; c.fillRect(x, -20, 14, FH + 40);
    c.fillStyle = 'rgba(0,0,0,.35)';
    for (let y = 0; y < FH; y += 18) c.fillRect(x, y, 14, 2);
  }
  // niebla arriba, de donde salen los bichos
  const fg = c.createLinearGradient(0, 0, 0, 160);
  fg.addColorStop(0, 'rgba(6,8,6,.92)'); fg.addColorStop(1, 'rgba(6,8,6,0)');
  c.fillStyle = fg; c.fillRect(-20, -10, FW + 40, 170);
}

function drawBarricade(c, t) {
  const y = WALL_Y + 8;
  const hpk = G ? G.p.hp / G.p.maxHp : 1;
  // bolsas de arena
  for (let i = 0; i < 15; i++) {
    const x = 18 + i * 36 + (i % 2 ? 4 : 0);
    const dmg = hash2(i, 1, 4) > hpk + 0.1;
    c.fillStyle = 'rgba(0,0,0,.35)'; ell(c, x, y + 10, 21, 7); c.fill();
    c.fillStyle = dmg ? '#5a4a33' : '#8a7550';
    rrect(c, x - 19, y - 9, 38, 18, 8); c.fill();
    c.strokeStyle = '#3a2e1e'; c.lineWidth = 2; c.stroke();
    c.fillStyle = dmg ? 'rgba(0,0,0,.25)' : 'rgba(255,240,200,.12)'; rrect(c, x - 15, y - 7, 30, 5, 3); c.fill();
  }
  // línea de peligro cuando hay bichos pegando
  if (G && G.enemies.some(e => e.atWall)) {
    c.fillStyle = `rgba(200,38,31,${0.18 + Math.sin(t * 10) * 0.1})`;
    c.fillRect(0, y - 16, FW, 34);
  }
}

function enemySize(e) { return e.def.boss ? e.r * 3.4 : e.def.small ? 52 : 64 * (e.r / 19) * 0.95 + 8; }

function drawEnemy(c, e, t) {
  const s = loadSprite(e.def.sprite);
  const size = enemySize(e);
  const ghost = e.def.ghost && Math.sin(e.phase * 1.8) > 0.55;
  c.save();
  if (ghost) c.globalAlpha = 0.35;
  c.fillStyle = 'rgba(0,0,0,.35)'; ell(c, e.x, e.y, e.r * 0.95, e.r * 0.36); c.fill();
  if (e.isBoss) drawFx(c, 'luz', '#c8261f', e.x, e.y - e.r, e.r * 5, 0.35 + Math.sin(t * 4) * 0.1, 0, true);
  if (e.elite) drawFx(c, 'luz', '#f2c641', e.x, e.y - e.r, e.r * 4, 0.3, 0, true);
  if (s.ok) {
    const moving = !e.atWall && e.stunT <= 0 && e.rootT <= 0;
    const col = e.atWall ? 1 + (Math.floor(t * 10 + e.seed) % 8) : moving ? 1 + (Math.floor(t * (6 + e.spd * 0.15) + e.seed) % 8) : 0;
    const row = e.atWall ? 2 : 2;
    let ov = null, oa = 0;
    if (e.flash > 0) { ov = '#ffffff'; oa = 0.85; }
    else if (e.slowT > 0 || e.rootT > 0) { ov = '#7ad7ff'; oa = 0.45; }
    else if (e.poison > 1) { ov = '#7fe04a'; oa = 0.3; }
    else if (e.buffT > 0) { ov = '#be8cff'; oa = 0.3; }
    if (e.elite) drawOutline(c, s, row, col, e.x, e.y, size, '#f2c641', 2.2);
    else if (e.isBoss || e.def.big) drawOutline(c, s, row, col, e.x, e.y, size, '#050505', 1.5);
    const bob = e.atWall ? Math.sin(t * 14 + e.seed) * 2 : 0;
    const q = e.sq || 0;
    if (q) { c.save(); c.translate(e.x, e.y); c.scale(1 + q * 0.14, 1 - q * 0.12); c.translate(-e.x, -e.y); }
    drawFrame(c, s, row, col, e.x + bob, e.y, size, ov, oa);
    if (q) c.restore();
  }
  if (e.stunT > 0) for (let i = 0; i < 3; i++) { const a = t * 5 + i * TAU / 3; c.fillStyle = '#ffe08a'; circ(c, e.x + Math.cos(a) * 12, e.y - size * 0.95 + Math.sin(a) * 4, 2.5); c.fill(); }
  if (e.rootT > 0) { c.strokeStyle = '#a77b4a'; c.lineWidth = 2; ell(c, e.x, e.y - 6, e.r, 6); c.stroke(); }
  c.restore();
  // vida
  if (!e.isBoss && e.hp < e.maxHp) {
    const w = Math.max(24, e.r * 1.6), k = Math.max(0, e.hp / e.maxHp);
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(e.x - w / 2, e.y + 5, w, 4);
    c.fillStyle = k > 0.5 ? '#9bd34a' : k > 0.25 ? '#f2c641' : '#c8261f'; c.fillRect(e.x - w / 2, e.y + 5, w * k, 4);
  }
}

function drawPlayer(c, t) {
  const P = G.p;
  const s = loadSprite(G.ch.sprite), sa = G.ch.sprite === 'pibe' ? s : loadSprite(G.ch.sprite + '_atk');
  const size = 72;
  c.fillStyle = 'rgba(0,0,0,.4)'; ell(c, G.x, G.y, 16, 6); c.fill();
  // círculo del imán
  c.strokeStyle = 'rgba(155,211,74,.12)'; c.lineWidth = 1.5; c.setLineDash([4, 6]);
  circ(c, G.x, G.y - 20, 85 * P.pickup); c.stroke(); c.setLineDash([]);
  const hurt = G.hurtT > 0.2;
  if (G.atkT > 0 && sa !== s && sa.ok && !G.moving) {
    const k = 1 - G.atkT / 0.22;
    const col = Math.min(sa.n - 1, Math.floor(k * sa.n));
    const kk = size / SPR_FRAME, S = sa.f * kk, off = (sa.f - SPR_FRAME) / 2 * kk;
    c.drawImage(sa.img, col * sa.f, 0, sa.f, sa.f, G.x - S / 2, G.y - size * 0.94 - off, S, S);
  } else if (s.ok) {
    const col = G.moving ? 1 + (Math.floor(G.walkT * 12) % 8) : 0;
    drawFrame(c, s, G.face, col, G.x, G.y, size, hurt ? '#ff3030' : null, 0.6);
  }
  if (G.partner) {
    const ps = loadSprite(G.partner.sprite);
    const px = clamp(G.x + 34, 20, FW - 20);
    if (ps.ok) drawFrame(c, ps, G.face, G.moving ? 1 + (Math.floor(G.walkT * 12 + 3) % 8) : 0, px, G.y + 4, 60);
  }
  // mira
  if (state === 'play' && !G.won) {
    const a = aimAngle();
    c.save();
    c.strokeStyle = 'rgba(232,236,217,.35)'; c.lineWidth = 2; c.setLineDash([6, 8]); c.lineDashOffset = -t * 40;
    c.beginPath(); c.moveTo(G.x, G.y - 40); c.lineTo(G.x + Math.cos(a) * 150, G.y - 40 + Math.sin(a) * 150); c.stroke();
    c.restore();
  }
}

function drawBall(c, b) {
  const col = b.d.col;
  // estela
  const tr = b.trail;
  for (let i = 0; i < tr.length; i += 2) {
    const k = i / tr.length;
    c.globalAlpha = k * 0.35;
    c.fillStyle = col;
    circ(c, tr[i], tr[i + 1], b.r * (0.4 + k * 0.6)); c.fill();
  }
  c.globalAlpha = 1;
  drawFx(c, 'luz', col, b.x, b.y, b.r * 7, b.d.fusion ? 0.75 : 0.5, 0, true);
  // el sprite en pixel art: gira, apunta para donde va o queda derecho
  const spr = pxCanvas(b.id), o = pxOrient(b.id);
  const size = Math.round(Math.max(18, b.r * 3) / 6) * 6;
  c.save();
  c.translate(Math.round(b.x), Math.round(b.y));
  if (o === 'dir') c.rotate(Math.atan2(b.vy, b.vx));
  else if (o === 'spin') { b.rot = (b.rot || 0) + (b.vx >= 0 ? 0.25 : -0.25); c.rotate(Math.round(b.rot / (Math.PI / 4)) * (Math.PI / 4)); }
  c.drawImage(spr, -size / 2, -size / 2, size, size);
  c.restore();
  if (b.id === 'molotov' || b.id === 'garrafa' || b.id === 'azufre') drawFx(c, 'llama', '#ff7a1a', b.x, b.y - b.r, b.r * 3.4, 0.7, 0, true);
}

function render(now, dt) {
  const t = now / 1000;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#0d0f0c';
  ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;
  if (!G) { if (state === 'base') renderBase(t, dt); else renderMenu(t, dt); return; }
  const sh = Save.data.settings.shake ? G.shake : 0;
  const sx = sh ? rand(-sh, sh) * 0.4 : 0, sy = sh ? rand(-sh, sh) * 0.4 : 0;
  ctx.setTransform(DPR * SC, 0, 0, DPR * SC, DPR * (OX + sx), DPR * (OY + sy));
  drawGround(ctx, G.stage, t, G.scroll);
  drawDecor(ctx, G.stage, G.scroll);
  shadeOutside(ctx);
  // manchas de sangre en el piso
  for (const d of G.decals) { ctx.globalAlpha = d.a; ctx.fillStyle = d.col; ell(ctx, d.x, d.y, d.r, d.r * 0.45); ctx.fill(); }
  ctx.globalAlpha = 1;
  // zona de la base (abajo de la barricada), un poco más clara
  ctx.fillStyle = 'rgba(255,240,200,.04)'; ctx.fillRect(0, WALL_Y + 24, FW, FH - WALL_Y);
  drawWalls(ctx);
  drawBarricade(ctx, t);

  // gemas
  for (const g of G.gems) {
    const blink = g.life < 3 && Math.sin(t * 20) > 0;
    if (blink) continue;
    // todo lo que cae es pixel art (js/pixel.js), con un brillo suave del color del recurso
    const bob = Math.sin(t * 4 + g.x) * 1.5;
    if (g.coin === 'orbe') {
      drawFx(ctx, 'luz', `hsl(${(t * 200) % 360},90%,60%)`, g.x, g.y, 46, 0.6, 0, true);
      drawPx(ctx, 'orbe', g.x, g.y + bob, 24, Math.round(t * 4) * (Math.PI / 2));
    } else if (g.coin === 'plano') {
      drawFx(ctx, 'luz', '#7ab8ff', g.x, g.y, 42, 0.5 + Math.sin(t * 6) * 0.15, 0, true);
      drawPx(ctx, 'plano', g.x, g.y + bob, 24, 0);
    } else if (g.coin) {
      drawFx(ctx, 'luz', RES[g.coin].col, g.x, g.y, 26, 0.35, 0, true);
      drawPx(ctx, g.coin, g.x, g.y + bob, g.coin === 'oro' ? 18 : 20, 0);
    } else {
      const big = g.v >= 3, mid = g.v >= 1.5;
      drawFx(ctx, 'luz', big ? '#c27bff' : mid ? '#57b6ff' : '#9bd34a', g.x, g.y, big ? 32 : 22, 0.4, 0, true);
      drawPx(ctx, big ? 'gema_l' : mid ? 'gema_a' : 'gema_v', g.x, g.y + bob, big ? 22 : mid ? 18 : 14, 0);
    }
  }

  // bichos (de atrás para adelante)
  const order = G.enemies.slice().sort((a, b) => a.y - b.y);
  for (const e of order) drawEnemy(ctx, e, t);
  // llamas sobre los que se queman
  for (const f of G.fx) if (f.t === 'flame') drawFx(ctx, 'llama', '#ff7a1a', f.x, f.y - (1 - f.life / f.max) * 14, 18, f.life / f.max, 0, true);

  drawPlayer(ctx, t);

  // escupitajos
  for (const s of G.spits) { drawFx(ctx, 'luz', '#9be33a', s.x, s.y, 28, 0.5, 0, true); ctx.fillStyle = '#6aa82a'; circ(ctx, s.x, s.y, 6); ctx.fill(); ctx.fillStyle = '#c8f07a'; circ(ctx, s.x - 2, s.y - 2, 2.5); ctx.fill(); }

  // pelotas
  for (const b of G.balls) drawBall(ctx, b);

  // partículas
  for (const p of G.parts) {
    ctx.globalAlpha = Math.min(1, p.life * 3);
    if (p.img && p.img.complete && p.img.naturalWidth) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.drawImage(p.img, -p.img.naturalWidth / 2, -p.img.naturalHeight / 2);
      ctx.restore();
    } else { ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, p.size, p.size); }
  }
  ctx.globalAlpha = 1;

  // efectos
  for (const f of G.fx) {
    const k = f.life / f.max;
    if (f.t === 'spark') drawFx(ctx, 'chispa', f.col, f.x, f.y, 34 * (1.4 - k * 0.4), k, f.rot, true);
    else if (f.t === 'boom') {
      drawFx(ctx, 'fogonazo', f.col, f.x, f.y, f.r * 2.4 * (1.2 - k * 0.4), k, 0, true);
      drawFx(ctx, 'anillo', '#fff1c0', f.x, f.y, f.r * 2.4 * (1.3 - k), k * 0.8, 0, true);
      drawFx(ctx, 'humo', '#2a2622', f.x, f.y - (1 - k) * 20, f.r * 2, k * 0.5, k, false);
    } else if (f.t === 'ring') drawFx(ctx, 'anillo', f.col, f.x, f.y, f.r * 2 * (1.15 - k * 0.5), k, 0, true);
    else if (f.t === 'splash') drawFx(ctx, 'salpicon', f.col, f.x, f.y, f.r * 2.2 * (1.2 - k * 0.3), k * 0.9, 0, true);
    else if (f.t === 'blast' && f.img && f.img.complete && f.img.naturalWidth) {
      ctx.globalAlpha = k; const w = f.img.naturalWidth * f.s * (1.3 - k * 0.3), h = f.img.naturalHeight * f.s * (1.3 - k * 0.3);
      ctx.drawImage(f.img, f.x - w / 2, f.y - h / 2, w, h); ctx.globalAlpha = 1;
    } else if (f.t === 'bolt') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = k;
      for (const [w, col] of [[6, f.col], [2, '#ffffff']]) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(f.x1, f.y1);
        for (let i = 1; i < 6; i++) { const q = i / 6; ctx.lineTo(f.x1 + (f.x2 - f.x1) * q + rand(-10, 10), f.y1 + (f.y2 - f.y1) * q + rand(-10, 10)); }
        ctx.lineTo(f.x2, f.y2); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // números de daño
  ctx.textAlign = 'center';
  for (const tx of G.texts) {
    ctx.globalAlpha = Math.min(1, tx.life * 2.5);
    ctx.font = `900 ${tx.big ? 20 : 14}px "Segoe UI", system-ui, sans-serif`;
    ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(tx.v, tx.x, tx.y);
    ctx.fillStyle = tx.col; ctx.fillText(tx.v, tx.x, tx.y);
  }
  ctx.globalAlpha = 1;

  // viñeta y golpe
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (G.hurtT > 0) { ctx.fillStyle = `rgba(200,38,31,${G.hurtT * 0.5})`; ctx.fillRect(0, 0, W, H); }
  const low = G.p.hp / G.p.maxHp;
  if (low < 0.3) { ctx.fillStyle = `rgba(200,38,31,${(0.3 - low) * (0.5 + Math.sin(t * 6) * 0.3)})`; ctx.fillRect(0, 0, W, H); }
}

// Fondo del menú: el pozo con bichos que bajan y pelotas que rebotan.
const MENU = { enemies: [], balls: [], t: 0 };
function renderMenu(t, dt) {
  const stage = STAGES[0];
  ctx.setTransform(DPR * SC, 0, 0, DPR * SC, DPR * OX, DPR * OY);
  drawGround(ctx, stage, t);
  drawDecor(ctx, stage);
  shadeOutside(ctx);
  drawWalls(ctx);
  drawBarricade(ctx, t);
  MENU.t -= dt;
  if (MENU.t <= 0 && MENU.enemies.length < 14) {
    MENU.t = 1.4;
    const types = ['caminante', 'corredor', 'gordo', 'esqueleto', 'lobizon', 'explosivo'];
    const type = types[(Math.random() * types.length) | 0];
    MENU.enemies.push({ type, def: ENEMIES[type], x: rand(40, FW - 40), y: -40, r: ENEMIES[type].r, spd: ENEMIES[type].spd * 2, seed: Math.random() * 10, stunT: 0, rootT: 0, slowT: 0, flash: 0, phase: 0, hp: 1, maxHp: 1 });
  }
  if (MENU.balls.length < 6 && Math.random() < 0.02) {
    const ids = Object.keys(BALLS), id = ids[(Math.random() * ids.length) | 0], a = rand(-2.6, -0.5);
    MENU.balls.push({ id, d: BALLS[id], r: BALLS[id].r, x: FW / 2, y: PLAYER_Y - 30, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, trail: [] });
  }
  for (const e of MENU.enemies) { e.y += e.spd * dt; e.flash -= dt; if (e.y > WALL_Y - 4) e.dead = true; }
  for (const b of MENU.balls) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < b.r || b.x > FW - b.r) b.vx *= -1;
    if (b.y < b.r) b.vy = Math.abs(b.vy);
    for (const e of MENU.enemies) {
      if (e.dead) continue;
      if (Math.hypot(b.x - e.x, b.y - (e.y - e.r)) < e.r + b.r) { b.vy = Math.abs(b.vy); e.flash = 0.1; e.hits = (e.hits || 0) + 1; if (e.hits > 2) e.dead = true; }
    }
    if (b.y > RETURN_Y) b.gone = true;
    b.trail.push(b.x, b.y); if (b.trail.length > 16) b.trail.splice(0, 2);
  }
  MENU.enemies = MENU.enemies.filter(e => !e.dead);
  MENU.balls = MENU.balls.filter(b => !b.gone);
  for (const e of MENU.enemies.slice().sort((a, b) => a.y - b.y)) { e.atWall = false; drawEnemy(ctx, e, t); }
  for (const b of MENU.balls) drawBall(ctx, b);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = 'rgba(5,6,5,.45)'; ctx.fillRect(0, 0, W, H);
}

// ---------- Bucle ----------
let last = performance.now();
function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state === 'play') {
    // dos pasos si el cuadro vino largo, para que las pelotas no atraviesen nada
    const sp = Save.data.settings.speed || 1, full = dt * sp;
    const n = Math.ceil(full / 0.0167);
    if (G && G.hitstop > 0) G.hitstop -= dt;
    else for (let i = 0; i < n && state === 'play'; i++) update(full / n);
    updateHud();
  }
  const real = Math.min(0.05, (now - (frame.prev || now)) / 1000);
  if (state !== 'play' && state !== 'menu') dt = 0;
  render(now, state === 'menu' || state === 'base' ? real : dt);
  frame.prev = now;
  if (typeof Music !== 'undefined') {
    Music.want(!G ? (state === 'base' ? 'calma' : 'menu') : state === 'end' ? 'final' : G.boss && !G.boss.dead ? 'jefe' : G.t > G.stage.len * 0.4 ? 'intenso' : 'calma');
    Music.tick(1 / 60);
  }
  requestAnimationFrame(frame);
}

// ---------- Entrada ----------
function toField(clientX, clientY) { return { x: (clientX - OX) / SC, y: (clientY - OY) / SC }; }
const KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
window.addEventListener('keydown', (e) => {
  if (KEYS[e.code]) { input[KEYS[e.code]] = true; input.mouse = input.mouse && true; e.preventDefault(); }
  if ((e.code === 'Escape' || e.code === 'KeyP') && G) togglePause();
  if (e.code === 'Space') { input.firing = true; e.preventDefault(); }
  if (e.code === 'KeyF' && G && state === 'play') { toggleAutofire(); updateToggles(); }
  if (e.code === 'KeyR' && G && state === 'play') { cycleSpeed(); updateToggles(); }
  if (e.code === 'KeyE' && G && state === 'play') { Save.data.settings.autoaim = !Save.data.settings.autoaim; Save.save(); showBanner(Save.data.settings.autoaim ? 'Puntería automática' : 'Apuntás con el mouse', ''); }
});
window.addEventListener('keyup', (e) => { if (KEYS[e.code]) input[KEYS[e.code]] = false; if (e.code === 'Space') input.firing = false; });
cv.addEventListener('mousedown', () => { input.firing = true; });
window.addEventListener('mouseup', () => { input.firing = false; });
function toggleAutofire() { const s = Save.data.settings; s.autofire = !s.autofire; Save.save(); showBanner(s.autofire ? 'Tiro automático' : 'Tiro manual', s.autofire ? '' : 'Clic o espacio para tirar'); }
function cycleSpeed() { const s = Save.data.settings; s.speed = s.speed >= 2 ? 1 : s.speed >= 1.5 ? 2 : 1.5; Save.save(); showBanner('Velocidad x' + String(s.speed).replace('.', ','), ''); }
cv.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') { const p = toField(e.clientX, e.clientY); input.aimX = p.x; input.aimY = p.y; input.mouse = true; }
  else if (input.touchX != null) { const p = toField(e.clientX, e.clientY); input.touchX = p.x; input.touchY = p.y; }
});
cv.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse' && G) {
    const p = toField(e.clientX, e.clientY);
    input.touchX = input.dragFromX = p.x; input.touchY = input.dragFromY = p.y;
    input.pFromX = G.x; input.pFromY = G.y;
    input.mouse = false;
  }
});
const endTouch = () => { input.touchX = null; input.touchY = null; };
cv.addEventListener('pointerup', endTouch);
cv.addEventListener('pointercancel', endTouch);
window.addEventListener('blur', () => { input.left = input.right = input.up = input.down = false; input.firing = false; endTouch(); if (G && state === 'play') togglePause(); });

requestAnimationFrame(frame);
