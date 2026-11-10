'use strict';
// Menús, HUD y pantallas (DOM). Mismo estilo que Zombolito.
// Flujo: Menú → (historia la primera vez) → Villa Zombolito (el pueblo) → Bajar al Pozo: personaje → nivel → partida
//        → botín → vuelta al pueblo con cosecha.

const $ = (s) => document.querySelector(s);
function emo(s) { return String(s); }
function fmtTime(s) { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function ballChip(id) {
  const b = BALLS[id];
  return `<img class="ball-px${b.fusion ? ' fus' : ''}" src="${pxUrl(id)}" alt="${b.name}" style="--c:${b.col}">`;
}
function resIcon(k) { return `<img class="ri-px" src="${pxUrl(k)}" alt="${RES[k].name}" title="${RES[k].name}">`; }
function itemPx(id) { return `<img class="item-px" src="${pxUrl(id)}" alt="">`; }
function resPills(r) { return RES_IDS.map(k => `<span class="coin-pill res-${k}">${resIcon(k)}${r[k] || 0}</span>`).join(''); }
// Miniatura de un edificio: el mismo dibujo del pueblo, en chiquito.
function bthumb(id) { return `<canvas class="bthumb" width="112" height="112" data-b="${id}"></canvas>`; }
function paintThumbs(root) {
  for (const cvs of root.querySelectorAll('canvas[data-b]')) {
    const c = cvs.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, 112, 112);
    drawBuilding(c, 0, { x: 0, y: 0 }, { b: cvs.dataset.b, lvl: 1 }, 0, 0, true);
  }
}
function show(id) {
  for (const el of document.querySelectorAll('.screen')) el.classList.add('hidden');
  if (id) $(id).classList.remove('hidden');
}
function click() { Sfx.init(); Sfx.play('click'); }

// ---------- Menú ----------
function openMenu() {
  G = null; state = 'menu';
  $('#hud').classList.add('hidden');
  show('#menu');
  $('#menu-res').innerHTML = resPills(Save.data.res);
  const d = Save.data;
  $('#menu-best').textContent = d.runs ? `Bajadas al Pozo: ${d.runs} · Bichos: ${d.kills} · Planos: ${d.planos.length}` : 'La Niebla sale de un pozo. Alguien tiene que bajar.';
}

// ---------- Historia ----------
let storyPages = [], storyI = 0, storyThen = null;
function openStory(pages, then) {
  storyPages = pages; storyI = 0; storyThen = then;
  show('#story');
  renderStory();
}
function renderStory() {
  const p = storyPages[storyI];
  $('#story-card').innerHTML = (`<h2>${p.title}</h2><p>${p.text}</p>
    <div class="dots">${storyPages.map((_, i) => `<i class="${i === storyI ? 'on' : ''}"></i>`).join('')}</div>`);
  $('#story-next').textContent = storyI < storyPages.length - 1 ? 'Seguir' : 'Vamos';
}
function storyNext() {
  click();
  if (storyI < storyPages.length - 1) { storyI++; renderStory(); return; }
  const fn = storyThen; storyThen = null;
  if (fn) fn(); else openMenu();
}
function allStory() {
  const pages = STORY.intro.slice();
  for (const st of STAGES) if (Save.data.chapters.includes(st.id)) { const ch = STORY.chapters[st.id]; pages.push({ title: `${st.depth}: ${ch.title}`, text: ch.text }); }
  return pages;
}
function play() {
  click();
  if (!Save.data.introSeen) { Save.data.introSeen = true; Save.save(); openStory(STORY.intro, () => openBase()); }
  else openBase();
}

// ---------- Elegir personaje (y compañero / objeto de la feria) ----------
let pickChar = 'pibe', pickStage = 'barrio', pickPartner = null, pickFeria = null, pickingPartner = false;
function openChars() {
  clearTimeout(openBase.tid);
  if (BV.harvest) endHarvest();
  show('#chars');
  if (!charOwned(pickChar)) pickChar = 'pibe';
  const club = !!isBuilt('club'), feria = !!isBuilt('feria');
  if (!club) pickPartner = null;
  const grid = $('#char-grid');
  grid.innerHTML = '';
  $('#chars-title').textContent = pickingPartner ? 'Elegí un compañero' : '¿Quién baja al Pozo?';
  for (const ch of CHARACTERS) {
    const own = charOwned(ch.id);
    const bid = own ? null : buildingFor(ch.id);
    const hasPlano = bid && (!BUILDINGS[bid].plano || Save.data.planos.includes(bid));
    const el = document.createElement('div');
    const sel = pickingPartner ? pickPartner === ch.id : pickChar === ch.id;
    el.className = 'char' + (own ? '' : ' locked') + (sel ? ' sel' : '') + (!pickingPartner && pickPartner === ch.id ? ' partner' : '');
    el.innerHTML = `<canvas width="96" height="96"></canvas><div class="name">${own ? ch.name : '???'}</div><div class="role">${ch.role}</div>
      <div class="wpn">${ballChip(ch.ball)} ${BALLS[ch.ball].name}</div><div class="perk">${ch.perk}</div>
      ${own ? '' : `<div class="lockinfo">${hasPlano ? 'Construí' : 'Encontrá el plano de'}: <b>${BUILDINGS[bid].name}</b></div>`}`;
    portrait(el.querySelector('canvas'), ch.sprite, !own);
    if (own) {
      el.addEventListener('click', () => {
        click();
        if (pickingPartner) { pickPartner = ch.id === pickChar || pickPartner === ch.id ? null : ch.id; pickingPartner = false; }
        else { pickChar = ch.id; if (pickPartner === ch.id) pickPartner = null; }
        openChars();
      });
      el.addEventListener('dblclick', () => { if (!pickingPartner) openStages(); });
    }
    grid.appendChild(el);
  }
  const ch = CHARACTERS.find(c => c.id === pickChar), pt = pickPartner && CHARACTERS.find(c => c.id === pickPartner);
  // compañero (Club Social) y objeto inicial (Feria Americana)
  let extra = '';
  if (club) extra += `<button id="pick-partner" class="btn small">Compañero: ${pt ? pt.name : 'ninguno'}</button>`;
  if (feria) extra += `<select id="pick-feria" class="btn small"><option value="">Feria: sin objeto</option>${Object.keys(PASSIVES).map(id => `<option value="${id}"${pickFeria === id ? ' selected' : ''}>Feria: ${PASSIVES[id].name}</option>`).join('')}</select>`;
  $('#chars-extra').innerHTML = extra;
  if (club) $('#pick-partner').addEventListener('click', () => { click(); pickingPartner = !pickingPartner; openChars(); });
  if (feria) $('#pick-feria').addEventListener('change', (e) => { pickFeria = e.target.value || null; });
  $('#chars-go').textContent = `Seguir con ${ch.name}${pt ? ' y ' + pt.name : ''}`;
  renderCharDetail();
}

function openStages() {
  pickingPartner = false;
  show('#stages');
  const list = $('#stage-list');
  list.innerHTML = '';
  for (const st of STAGES) {
    const open = Save.data.stages.includes(st.id);
    const wins = Save.data.wins[st.id] || 0, best = Save.data.best[st.id] || 0;
    const found = st.planos.filter(id => Save.data.planos.includes(id)).length;
    const el = document.createElement('button');
    el.className = 'stage' + (open ? '' : ' locked') + (pickStage === st.id ? ' sel' : '');
    el.disabled = !open;
    el.innerHTML = `<div class="st-img" style="background-image:url(assets/tiles/${st.ground}_0.webp)"><canvas width="64" height="64"></canvas></div>
      <div class="st-txt"><div class="depth">${st.depth}</div><div class="name">${open ? st.name : '???'}</div><div class="desc">${open ? st.desc : 'Ganale al jefe del nivel anterior.'}</div>
      <div class="meta">${open ? `Jefe: <b>${ENEMIES[st.jefe].name}</b> · Récord ${fmtTime(best)} / ${fmtTime(st.len)}${wins ? ` · ganado ${wins} ${wins === 1 ? 'vez' : 'veces'}` : ''}` : 'Cerrado'}</div>
      ${open ? `<div class="planos">${st.planos.map(id => `<i class="${Save.data.planos.includes(id) ? 'on' : ''}" title="${Save.data.planos.includes(id) ? BUILDINGS[id].name : '?'}"></i>`).join('')}<span>Planos ${found}/${st.planos.length}</span></div>` : ''}</div>`;
    if (open) portrait(el.querySelector('canvas'), ENEMIES[st.jefe].sprite, false);
    el.addEventListener('click', () => { click(); pickStage = st.id; openStages(); });
    list.appendChild(el);
  }
}

function startRun() {
  click();
  show(null);
  $('#hud').classList.remove('hidden');
  newGame(pickChar, pickStage, pickPartner, pickFeria);
  buildSlots();
  updateToggles();
}

// ---------- Villa Zombolito (el pueblo) ----------
function openBase(o = {}) {
  G = null; state = 'base';
  $('#hud').classList.add('hidden');
  show('#base');
  syncWalkers();
  BV.sel = -1; BV.want = o.want || null;
  baseRes();
  renderBasePanel();
  clearTimeout(openBase.tid);
  if (Save.data.harvestReady) openBase.tid = setTimeout(() => { if (state === 'base' && !$('#base').classList.contains('hidden') && startHarvest()) renderBasePanel(); }, 700);
}
function baseRes() { $('#base-res').innerHTML = resPills(Save.data.res); }
function afterHarvest() { baseRes(); renderBasePanel(); }
function updateHarvestHud() {
  const H = BV.harvest, el = $('#harvest-live');
  if (!H || !el) return;
  el.innerHTML = `<div class="h-t">${Math.ceil(Math.max(0, H.t))}</div>` + RES_IDS.map(r => `<span>${resIcon(r)}+${H.gains[r]}</span>`).join('');
}
function selectLot(i) {
  if (BV.harvest) return;
  // mudando un edificio: el próximo terreno libre que toques es el nuevo lugar
  if (BV.moving != null) {
    const from = BV.moving;
    BV.moving = null;
    if (i !== from && lotState(i) === 'empty') {
      const B = Save.data.base;
      B.lots[i] = B.lots[from]; delete B.lots[from];
      Save.save(); dust(i); Sfx.play('chest', { vol: 0.5 });
      BV.sel = i; renderBasePanel(); return;
    }
  }
  BV.sel = i; renderBasePanel();
}
function charFaces(ids) {
  return ids.map(id => { const ch = CHARACTERS.find(c => c.id === id); return `<span class="face" title="${ch.name}"><canvas width="40" height="40" data-spr="${ch.sprite}"></canvas>${ch.name}</span>`; }).join('');
}
function paintFaces(root) { for (const cvs of root.querySelectorAll('canvas[data-spr]')) portrait(cvs, cvs.dataset.spr, false); }
function bonusSummary() {
  const p = baseStats(), b = baseStats();
  for (const k in Save.data.base.lots) { const lot = Save.data.base.lots[k], d = BUILDINGS[lot.b]; if (d.apply) d.apply(p, lot.lvl); }
  const out = [];
  const pct = (k, name) => { const v = p[k] - b[k]; if (v > 0.001) out.push(`+${Math.round(v * 100)}% ${name}`); };
  if (p.maxHp > b.maxHp) out.push(`+${p.maxHp - b.maxHp} vida`);
  if (p.regen > b.regen) out.push(`+${p.regen.toFixed(2).replace('.', ',')} vida/s`);
  pct('might', 'daño'); pct('fireRate', 'tiro'); pct('luck', 'suerte'); pct('pickup', 'imán'); pct('growth', 'experiencia');
  pct('greed', 'oro'); pct('crit', 'crítico');
  const u = isBuilt('utileria'); if (u) out.push(`${START_SLOTS + u.lvl} lugares en la bolsa`);
  return out;
}
function renderBasePanel() {
  const el = $('#base-panel');
  const B = Save.data.base;
  if (BV.harvest) {
    el.innerHTML = `<h3>Cosecha</h3><p class="hint">Cada golpe en un edificio de economía junta lo que tenga.</p>
      <div id="harvest-live" class="harvest-live"></div><button id="bp-skip" class="btn small">Terminar ya</button>`;
    el.classList.add('open');
    el.querySelector('#bp-skip').addEventListener('click', () => { click(); endHarvest(); });
    updateHarvestHud();
    return;
  }
  const i = BV.sel, st = i >= 0 ? lotState(i) : null;
  let h = '';
  if (i < 0 || st === 'plaza') {
    const bon = bonusSummary();
    const vecinos = CHARACTERS.filter(c => charOwned(c.id)).length;
    const prod = Object.keys(B.lots).map(k => B.lots[k]).filter(l => BUILDINGS[l.b].prod);
    h = `<h3>Villa Zombolito</h3>
      <button id="bp-dive" class="btn big wide">Bajar al Pozo</button>
      ${(() => {
        const can = canBuildSomething(), ups = Object.keys(B.lots).filter(k => canUpgrade(B.lots[k]));
        const nuevos = Save.data.planos.filter(id => !isBuilt(id));
        const free = [...Array(BASE_COLS * BASE_ROWS).keys()].some(k => lotState(k) === 'empty');
        const out = [];
        if (can.length) out.push(free ? `Podés construir: <b>${can.map(id => BUILDINGS[id].name).join(', ')}</b>` : `Alcanza para construir, pero no hay terreno libre: limpiá escombros.`);
        if (ups.length) out.push(`Podés mejorar: <b>${ups.map(k => BUILDINGS[B.lots[k].b].name).join(', ')}</b>`);
        if (nuevos.length) out.push(`Planos sin construir: <b>${nuevos.map(id => BUILDINGS[id].name).join(', ')}</b>`);
        return out.length ? `<div class="todo">${out.map(x => `<p>${x}</p>`).join('')}</div>` : '';
      })()}
      <div class="kv"><span>Edificios</span><b>${Object.keys(B.lots).length} / ${Object.keys(BUILDINGS).length}</b></div>
      <div class="kv"><span>Vecinos</span><b>${vecinos} / ${CHARACTERS.length}</b></div>
      <div class="kv"><span>Planos encontrados</span><b>${Save.data.planos.length} / ${STAGES.reduce((a, s) => a + s.planos.length, 0)}</b></div>
      ${prod.length ? `<h4>Para cosechar</h4>${prod.map(l => { const pr = BUILDINGS[l.b].prod; return `<div class="kv"><span>${BUILDINGS[l.b].name}</span><b>${resIcon(pr.res)}${Math.floor(stockOf(l))} / ${pr.cap * l.lvl}</b></div>`; }).join('')}` : ''}
      <h4>Bonus del pueblo</h4>
      <div class="bonus">${bon.length ? bon.map(x => `<span>${x}</span>`).join('') : '<span class="muted">Nada todavía.</span>'}</div>
      <button id="bp-story" class="btn small">Álbum</button>`;
  } else if (st === 'rubble') {
    const cost = clearCost(B.cleared.length - BASE_START.length), ok = canPay(cost);
    h = `<h3>Escombros</h3>
      <p class="hint">Limpiarlos te deja un terreno más.</p>
      <button id="bp-clear" class="btn big wide"${ok ? '' : ' disabled'}>Limpiar</button><div class="costs">${costHtml(cost)}</div>`;
  } else if (st === 'empty') {
    const ids = Object.keys(BUILDINGS).filter(id => !isBuilt(id));
    const known = (id) => !BUILDINGS[id].plano || Save.data.planos.includes(id);
    h = `<h3>Terreno libre</h3>`;
    for (const cat in CATS) {
      const list = ids.filter(id => BUILDINGS[id].cat === cat).sort((a, b) => known(b) - known(a));
      if (!list.length) continue;
      h += `<h4>${CATS[cat]}</h4><div class="blist">` + list.map(id => {
        const d = BUILDINGS[id], cost = buildCost(id, 0), ok = canPay(cost);
        if (!known(id)) { const st2 = STAGES.find(s => s.planos.includes(id)); return `<div class="bitem plano"><div class="bic q">?</div><div class="btxt"><div class="name">Plano sin encontrar</div><div class="desc">Está en ${st2.name} (${st2.depth} del Pozo).</div></div></div>`; }
        return `<div class="bitem${ok ? '' : ' poor'}">
          <div class="bic">${bthumb(id)}</div>
          <div class="btxt"><div class="name">${d.name}</div><div class="desc">${d.desc}${d.max > 1 ? ' <span class="muted">(mejora hasta nv ' + d.max + ')</span>' : ''}</div>
          ${d.chars ? `<div class="faces">${charFaces(d.chars)}</div>` : ''}<div class="costs">${costHtml(cost)}</div></div>
          <button class="btn small" data-build="${id}"${ok ? '' : ' disabled'}>Construir</button></div>`;
      }).join('') + '</div>';
    }
  } else if (st === 'built') {
    const lot = B.lots[i], d = BUILDINGS[lot.b];
    const max = lot.lvl >= d.max, cost = buildCost(lot.b, lot.lvl), ok = canPay(cost);
    const pr = d.prod;
    h = `<div class="bhead">${bthumb(lot.b)}<div><h3>${d.name}</h3><div class="cat">${CATS[d.cat]}</div></div></div>
      <div class="lvl">${[...Array(d.max)].map((_, k) => `<i class="${k < lot.lvl ? 'on' : ''}"></i>`).join('')}<span>Nivel ${lot.lvl}${max ? ' · máximo' : ''}</span></div>
      ${pr ? `<div class="kv"><span>Stock</span><b>${resIcon(pr.res)}${Math.floor(stockOf(lot))} / ${pr.cap * lot.lvl}</b></div>
        <div class="kv"><span>Por golpe</span><b>${pr.hit * lot.lvl}</b></div><p class="hint small">Se vuelve a llenar en ${REGROW_MS / 60000} minutos.</p>`
        : `<div class="kv"><span>Efecto</span><b>${d.desc}${d.max > 1 ? ` ×${lot.lvl}` : ''}</b></div>`}
      ${lot.b === 'kiosco' ? `<h4>Figuritas</h4><p class="hint small">Sobre de 3: las de vecinos les dan experiencia; las de bichos llenan el álbum (+1% de daño cada una distinta).</p><button id="bp-sobre" class="btn wide"${canPay(SOBRE_COST) ? '' : ' disabled'}>Comprar sobre</button><div class="costs">${costHtml(SOBRE_COST)}</div>` : ''}
      ${d.chars ? `<h4>Viven acá</h4><div class="faces big">${charFaces(d.chars)}</div>` : ''}
      ${max ? '' : `<button id="bp-up" class="btn big wide"${ok ? '' : ' disabled'}>Mejorar a nivel ${lot.lvl + 1}</button><div class="costs">${costHtml(cost)}</div>`}
      <button id="bp-move" class="btn small${BV.moving === i ? ' on' : ''}">${BV.moving === i ? 'Tocá un terreno libre…' : 'Mover'}</button>`;
  }
  el.innerHTML = (i >= 0 ? `<button class="bp-close btn small" aria-label="Cerrar">✕</button>` : '') + h;
  el.classList.toggle('open', i >= 0);
  paintFaces(el);
  paintThumbs(el);
  const on = (sel, fn) => { const b = el.querySelector(sel); if (b) b.addEventListener('click', fn); };
  on('.bp-close', () => { click(); BV.sel = -1; renderBasePanel(); });
  on('#bp-dive', () => { click(); openChars(); });
  on('#bp-story', () => { click(); openAlbum(() => openBase()); });
  on('#bp-sobre', () => { click(); abrirSobre(); });
  on('#bp-clear', () => {
    const cost = clearCost(B.cleared.length - BASE_START.length);
    if (!canPay(cost)) return;
    pay(cost); B.cleared.push(i); Save.save(); dust(i); Sfx.play('boom', { vol: 0.5 }); baseRes(); renderBasePanel();
  });
  for (const btn of el.querySelectorAll('[data-build]')) btn.addEventListener('click', () => {
    const id = btn.dataset.build, cost = buildCost(id, 0);
    if (!canPay(cost) || isBuilt(id) || lotState(i) !== 'empty') return;
    pay(cost); B.lots[i] = { b: id, lvl: 1 }; Save.save();
    dust(i); Sfx.play('chest');
    syncWalkers(); baseRes(); renderBasePanel();
    for (const c of BUILDINGS[id].chars || []) baseToast(STORY.moveIn[c]);
  });
  on('#bp-move', () => { click(); BV.moving = BV.moving === i ? null : i; renderBasePanel(); });
  on('#bp-up', () => {
    const lot = B.lots[i], cost = buildCost(lot.b, lot.lvl);
    if (!canPay(cost) || lot.lvl >= BUILDINGS[lot.b].max) return;
    const keep = BUILDINGS[lot.b].prod ? stockOf(lot) : 0;
    pay(cost); lot.lvl++;
    if (BUILDINGS[lot.b].prod) { lot.stock = keep; lot.st = Date.now(); }
    Save.save(); dust(i); Sfx.play('level'); baseRes(); renderBasePanel();
  });
}
function baseToast(html) {
  const box = $('#toasts');
  const t = document.createElement('div');
  t.className = 'toast'; t.innerHTML = html;
  box.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

// ---------- Opciones ----------
function openOptions() {
  show('#options');
  const s = Save.data.settings;
  $('#opt-sound').checked = s.sound; $('#opt-music').checked = s.music; $('#opt-auto').checked = s.autoaim; $('#opt-shake').checked = s.shake; $('#opt-fire').checked = s.autofire;
}
function applySettings() { const s = Save.data.settings; Sfx.on = s.sound; Music.on = s.music; }

// ---------- HUD ----------
function buildSlots() {
  const el = $('#slots');
  const empty = Math.max(0, G.slots - G.bag.length);
  el.innerHTML = G.bag.map(s => `<div class="slot" title="${BALLS[s.id].name}">${ballChip(s.id)}<span class="pips">${'<i class="on"></i>'.repeat(s.lvl)}${BALLS[s.id].fusion ? '' : '<i></i>'.repeat(Math.max(0, MAX_BALL_LVL - s.lvl))}</span></div>`).join('')
    + '<div class="slot empty"></div>'.repeat(empty)
    + Object.keys(G.passives).map(id => `<div class="slot pas" title="${PASSIVES[id].name}">${itemPx(id)}<span class="lv">${G.passives[id]}</span></div>`).join('');
}
function updateToggles() {
  const s = Save.data.settings;
  $('#btn-speed').textContent = 'x' + String(s.speed || 1).replace('.', ',');
  $('#btn-fire').classList.toggle('off', !s.autofire);
  $('#btn-fire').textContent = s.autofire ? 'AUTO' : 'MANUAL';
}
let hudPrev = {};
function updateHud() {
  if (!G) return;
  const P = G.p;
  const hp = Math.max(0, P.hp);
  setW('#hpfill', hp / P.maxHp);
  setT('#hptxt', `${Math.ceil(hp)} / ${Math.round(P.maxHp)}`);
  setW('#xpfill', G.xp / G.xpNext);
  setT('#lvl', `Nv ${G.lvl}`);
  setW('#progfill', Math.min(1, G.t / G.stage.len));
  setT('#timer', G.won ? '¡GANASTE!' : G.t >= G.stage.len ? 'JEFE' : `OLEADA ${G.wave || 1}/${WAVES}`);
  setT('#kills', G.kills);
  for (const r of RES_IDS) setT('#loot-' + r, G.loot[r]);
  setT('#planos-n', G.planos.length);
  setT('#balls-txt', `${G.hand.length}/${G.hand.length + G.balls.filter(b => !b.child).length}`);
  const boss = G.boss && !G.boss.dead ? G.boss : null;
  $('#bossbar').classList.toggle('hidden', !boss);
  if (boss) { setT('#bossname', boss.def.name); setW('#bossfill', boss.hp / boss.maxHp); }
  if (G.banner) {
    if (performance.now() > G.banner.until) { $('#banner').classList.add('hidden'); G.banner = null; }
  }
}
function setW(sel, k) { k = Math.max(0, Math.min(1, k)); const key = sel + 'w'; const v = Math.round(k * 1000); if (hudPrev[key] === v) return; hudPrev[key] = v; $(sel).style.width = (k * 100) + '%'; }
function setT(sel, v) { if (hudPrev[sel] === v) return; hudPrev[sel] = v; const el = $(sel); if (el) el.textContent = v; }

function showTip(txt) {
  const el = $('#tip');
  el.textContent = txt;
  el.classList.remove('hidden');
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  clearTimeout(showTip.t);
  showTip.t = setTimeout(() => el.classList.add('hidden'), 4500);
}
function showBanner(title, sub) {
  const el = $('#banner');
  el.innerHTML = `<div class="b-t">${title}</div>${sub ? `<div class="b-s">${sub}</div>` : ''}`;
  el.classList.remove('hidden');
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  if (G) G.banner = { until: performance.now() + 2400 };
}

// ---------- Subir de nivel / orbe ----------
function openLevelUp() {
  state = 'levelup';
  Sfx.play('level'); Sfx.muffle(true);
  $('#lv-title').textContent = '¡SUBISTE DE NIVEL!';
  renderCards(cardOptions(), true);
  show('#levelup');
}
// Orbe de fisión: fisión siempre; fusión y evolución si construiste el Taller de Fusiones.
function openOrb() {
  state = 'levelup';
  Sfx.play('evolve'); Sfx.muffle(true);
  const { lab, opts } = orbOptions();
  $('#lv-title').textContent = 'ORBE DE FISIÓN';
  renderCards(opts, false, lab ? '' : 'Construí el Taller de Fusiones en el pueblo para poder fusionar y evolucionar pelotas.');
  show('#levelup');
}
function cardHtml(o) {
  if (o.kind === 'fision') {
    return `<div class="tag fis">FISIÓN</div><div class="ic">${itemPx('orbe')}</div><div class="name">Fisión</div><div class="desc">Sube de nivel entre 1 y 4 cosas al azar: pelotas u objetos.</div>`;
  }
  if (o.kind === 'fusion') {
    const b = BALLS[o.id] || mixBall(o.a, o.b);
    return `<div class="tag fus">${o.evo ? 'EVOLUCIÓN' : 'FUSIÓN'}</div><div class="ic">${ballChip(o.a)}<span class="plus">+</span>${ballChip(o.b)}</div>
      <div class="name">${b.name}</div><div class="desc">${b.desc}</div><div class="own">${o.evo ? 'Receta secreta' : 'Se libera un lugar en la bolsa'}</div>`;
  }
  if (o.kind === 'new' || o.kind === 'up') {
    const b = BALLS[o.id], s = slotOf(o.id);
    const owner = CHARACTERS.find(c => c.ball === o.id);
    return `<div class="tag ${o.kind === 'new' ? 'new' : ''}">${o.kind === 'new' ? 'PELOTA NUEVA' : `NIVEL ${s.lvl + 1}`}</div>
      <div class="ic">${ballChip(o.id)}</div><div class="name">${b.name}</div><div class="desc">${o.kind === 'new' ? b.desc : '+50% de daño y el efecto pega más fuerte.'}</div>
      ${o.kind === 'new' && owner ? `<div class="own">La de ${owner.name}</div>` : ''}${fusionHint(o.id)}`;
  }
  if (o.kind === 'pas') {
    const p = PASSIVES[o.id], l = G.passives[o.id] || 0;
    return `<div class="tag pas">${l ? `NIVEL ${l + 1}` : 'OBJETO'}</div><div class="ic">${itemPx(o.id)}</div><div class="name">${p.name}</div><div class="desc">${p.desc}</div>`;
  }
  return `<div class="tag">YAPA</div><div class="ic"></div><div class="name">Empanada</div><div class="desc">Te cura 40 y suma 15 de oro.</div>`;
}
function fusionHint(id) {
  if (!isBuilt('fusiones')) return '';
  const f = FUSIONS.find(f => f.a === id || f.b === id);
  if (!f) return '';
  const other = f.a === id ? f.b : f.a;
  return `<div class="hint-f">Con ${BALLS[other].name} a nivel 3 → <b>${BALLS[f.out].name}</b></div>`;
}
function renderCards(opts, canReroll, note) {
  const box = $('#cards');
  box.innerHTML = '';
  for (const o of opts) {
    const el = document.createElement('button');
    el.className = 'card' + (o.kind === 'fusion' ? ' fusion' : o.kind === 'fision' ? ' fision' : o.kind === 'new' ? ' new' : '');
    el.innerHTML = cardHtml(o);
    el.addEventListener('click', () => {
      if (state !== 'levelup') return; // un solo clic por carta
      state = 'play';
      applyCard(o);
      buildSlots();
      show(null);
      Sfx.muffle(false);
    });
    box.appendChild(el);
  }
  $('#lv-note').textContent = note || '';
  const rr = $('#reroll');
  rr.classList.toggle('hidden', !canReroll || G.rerolls <= 0);
  rr.textContent = `Cambiar cartas (${G.rerolls})`;
}

// ---------- Pausa y fin ----------
function togglePause() {
  if (state === 'play') {
    state = 'pause'; Sfx.muffle(true); show('#pause');
    $('#pause-stats').innerHTML = (G.bag.map(s => `<div class="row">${ballChip(s.id)} ${BALLS[s.id].name} <span class="muted">nv ${s.lvl}</span></div>`).join('')
      + `<div class="row muted">Mover: A/D o flechas · Apuntar: mouse (E = automático) · F = tiro auto/manual · R = velocidad · Atrapá las pelotas que bajan para tirarlas antes.</div>`);
  } else if (state === 'pause') { state = 'play'; Sfx.muffle(false); show(null); }
}
let lastChapter = null;
function showEnd(won, loot, unlocked, planos, chapter, paga, ups) {
  Sfx.muffle(true);
  show('#end');
  lastChapter = chapter;
  $('#end-title').innerHTML = won ? '¡SALISTE DEL POZO!' : 'TE COMIÓ EL POZO';
  $('#end-title').className = won ? 'glow' : 'blood';
  const top = Object.entries(G.dmgDone).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const name = (k) => BALLS[k] ? `${ballChip(k)} ${BALLS[k].name}` : { fuego: 'Fuego', veneno: 'Veneno', sangrado: 'Sangrado', boom: 'Explosiones', otros: 'Otros' }[k] || k;
  $('#end-stats').innerHTML = (`
    <div class="row"><span>${G.stage.depth} · ${G.stage.name}</span><b>${fmtTime(G.t)}</b></div>
    <div class="row"><span>Bichos</span><b>${G.kills}</b></div>
    <h3>Botín</h3>${paga && (paga.oro || paga.madera) ? `<p class="hint" style="text-align:left">Incluye ${resIcon('oro')}${paga.oro}${paga.madera ? ` y ${resIcon('madera')}${paga.madera}` : ''} por aguantar ${fmtTime(G.t)}.</p>` : ''}
    <div class="loot">${RES_IDS.map(r => `<span class="coin-pill res-${r}">${resIcon(r)}+${loot[r]}</span>`).join('')}</div>
    ${planos.length ? `<h3>Planos encontrados</h3>${planos.map(id => `<div class="unlock">${bthumb(id)} ${BUILDINGS[id].name}</div>`).join('')}` : ''}
    ${unlocked ? `<div class="unlock">Nuevo nivel del Pozo: <b>${unlocked.name}</b></div>` : ''}
    <h3>Experiencia</h3>${(ups || []).map(u => { const c = CHARACTERS.find(x => x.id === u.id), h = Save.hero(u.id); return `<div class="row${u.to > u.from ? ' lvup' : ''}"><span>${c.name} +${u.xp}</span><b>${u.to > u.from ? `¡Nivel ${u.to}!` : `Nv ${h.lvl} · ${h.xp}/${xpNeed(h.lvl)}`}</b></div>`; }).join('')}
    <h3>Daño</h3>${top.map(([k, v]) => `<div class="row"><span>${name(k)}</span><b>${Math.round(v)}</b></div>`).join('')}`);
}
function backToTown() {
  click(); Sfx.muffle(false);
  if (lastChapter) { const ch = lastChapter; lastChapter = null; openStory([{ title: ch.title, text: ch.text }], () => openBase()); }
  else openBase();
}

// ---------- Botones ----------
function bind(sel, fn) { $(sel).addEventListener('click', fn); }
document.addEventListener('DOMContentLoaded', () => {
  applySettings();
  for (const im of document.querySelectorAll('img[data-px]')) im.src = pxUrl(im.dataset.px);
  openMenu();
  bind('#btn-play', play);
  bind('#btn-story', () => { click(); openAlbum(() => openMenu()); });
  bind('#album-back', () => { click(); openAlbum.back(); });
  for (const t of document.querySelectorAll('#album .tab')) t.addEventListener('click', () => { click(); albumTab = t.dataset.tab; openAlbum(); });
  bind('#sobre-ok', () => { click(); show('#base'); });
  bind('#btn-options', () => { click(); openOptions(); });
  bind('#btn-help', () => { click(); show('#help'); });
  bind('#story-next', storyNext);
  bind('#chars-back', () => { click(); pickingPartner = false; openBase(); });
  bind('#chars-go', () => { click(); openStages(); });
  bind('#stages-back', () => { click(); openChars(); });
  bind('#stages-go', startRun);
  bind('#base-back', () => { click(); if (BV.harvest) endHarvest(); openMenu(); });
  bind('#help-back', () => { click(); openMenu(); });
  bind('#opt-back', () => {
    const s = Save.data.settings;
    s.sound = $('#opt-sound').checked; s.music = $('#opt-music').checked; s.autoaim = $('#opt-auto').checked; s.shake = $('#opt-shake').checked; s.autofire = $('#opt-fire').checked;
    Save.save(); applySettings(); click(); openMenu();
  });
  bind('#btn-pause', () => togglePause());
  bind('#btn-speed', () => { cycleSpeed(); updateToggles(); });
  bind('#btn-fire', () => { toggleAutofire(); updateToggles(); });
  bind('#pause-resume', () => togglePause());
  bind('#pause-quit', () => { click(); Sfx.muffle(false); show(null); endGame(false); });
  bind('#end-town', backToTown);
  bind('#end-again', () => { Sfx.muffle(false); startRun(); });
  bind('#reroll', () => { if (G.rerolls <= 0) return; G.rerolls--; click(); renderCards(cardOptions(), true); });
  window.addEventListener('pointerdown', () => Sfx.init(), { once: true });
});

// ---------- Ficha del personaje: nivel, stats y entrenamiento ----------
function statBars(s, base) {
  return STAT_IDS.map(k => `<div class="st-row" title="${STATS[k].desc}"><span>${STATS[k].name}</span>
    <i class="st-bar"><b style="width:${Math.min(100, (s[k] || 0) * 4)}%"></b></i><em>${s[k] || 0}${base && s[k] > base[k] ? `<small>+${s[k] - base[k]}</small>` : ''}</em></div>`).join('');
}
function renderCharDetail() {
  const el = $('#char-detail');
  const ch = CHARACTERS.find(c => c.id === pickChar);
  if (!ch || !charOwned(ch.id)) { el.innerHTML = ''; return; }
  const h = Save.hero(ch.id), s = heroStats(ch.id), base = statsAtLevel(ch.id, h.lvl);
  const need = xpNeed(h.lvl), max = h.lvl >= MAX_HERO_LVL;
  const nTrain = Object.values(h.train).reduce((a, b) => a + b, 0), cost = trainCost(nTrain), ok = canPay(cost);
  const hito = h.lvl < 5 ? `A nivel 5 arranca con su pelota a nivel 2.` : h.lvl < 10 ? `A nivel 10 arranca con su pelota a nivel 3.` : `Arranca con su pelota a nivel 3.`;
  const bio = typeof LORE !== 'undefined' && LORE.chars[ch.id];
  el.innerHTML = `<div class="cd-head"><canvas width="72" height="72"></canvas><div><div class="cd-name">${ch.name} <span class="cd-lvl">Nv ${h.lvl}</span></div>
      <div class="bar xpb"><div style="width:${max ? 100 : h.xp / need * 100}%"></div><span>${max ? 'Nivel máximo' : `${h.xp} / ${need} de experiencia`}</span></div>
      <div class="cd-perk">${ch.perk}</div></div></div>
    <div class="cd-cols"><div class="cd-stats">${statBars(s, base)}</div>
    <div class="cd-side">${bio ? `<p class="cd-bio">${bio}</p>` : ''}<p class="hint small">${hito}</p>
      <div class="cd-train"><b>Entrenar</b> <span class="muted">(+1 punto donde elijas)</span><div class="costs">${costHtml(cost)}</div>
      <div class="tr-btns">${STAT_IDS.map(k => `<button class="btn small" data-train="${k}"${ok ? '' : ' disabled'}>+${STATS[k].short}</button>`).join('')}</div></div></div></div>`;
  portrait(el.querySelector('canvas'), ch.sprite, false);
  for (const b of el.querySelectorAll('[data-train]')) b.addEventListener('click', () => {
    const c = trainCost(nTrain);
    if (!canPay(c)) return;
    pay(c); h.train[b.dataset.train] = (h.train[b.dataset.train] || 0) + 1; Save.save(); Sfx.play('level'); renderCharDetail();
  });
}

// ---------- Figuritas ----------
function figuPool() {
  const out = CHARACTERS.map(c => ({ id: 'c:' + c.id, w: 1 }));
  for (const k in ENEMIES) if (typeof LORE !== 'undefined' && LORE.enemies[loreKey(k)]) out.push({ id: 'b:' + k, w: 1.3 });
  return out;
}
function abrirSobre() {
  if (!canPay(SOBRE_COST)) return;
  pay(SOBRE_COST);
  const pool = figuPool(), got = [];
  for (let i = 0; i < 3; i++) {
    let tot = 0; for (const f of pool) tot += f.w;
    let r = Math.random() * tot, f = pool[0];
    for (const x of pool) { r -= x.w; if (r <= 0) { f = x; break; } }
    const gold = Math.random() < 0.06;
    const isNew = !Save.data.figus.includes(f.id);
    if (isNew) Save.data.figus.push(f.id);
    let extra = '';
    if (f.id.startsWith('c:')) { const up = giveHeroXp(f.id.slice(2), FIGU_CHAR_XP * (gold ? 4 : 1)); extra = `+${up.xp} de experiencia${up.to > up.from ? ` · ¡nivel ${up.to}!` : ''}${charOwned(f.id.slice(2)) ? '' : ' (se la guarda hasta que se mude)'}`; }
    else if (!isNew) { Save.data.res.oro += 5; extra = 'Repetida: +5 de oro'; }
    got.push({ ...f, gold, isNew, extra });
  }
  Save.save();
  Sfx.play('chest');
  showSobre(got);
  baseRes(); renderBasePanel();
}
function figuCard(f) {
  const isChar = f.id.startsWith('c:'), key = f.id.slice(2);
  const ch = isChar && CHARACTERS.find(c => c.id === key), en = !isChar && ENEMIES[key];
  return `<div class="figu ${isChar ? 'fc' : 'fb'}${f.gold ? ' gold' : ''}">${f.isNew ? '<span class="nueva">NUEVA</span>' : ''}
    <canvas width="80" height="80" data-spr="${isChar ? ch.sprite : en.sprite}"></canvas>
    <div class="fn">${isChar ? ch.name : en.name}</div><div class="fx">${f.extra || (f.isNew ? 'Al álbum' : '')}</div></div>`;
}
function showSobre(got) {
  const box = $('#sobre-cards');
  box.innerHTML = got.map(figuCard).join('');
  paintFaces(box);
  show('#sobre');
}

// ---------- Álbum: historia, vecinos y bichos ----------
let albumTab = 'vecinos';
function openAlbum(back) {
  openAlbum.back = back || openAlbum.back || (() => openMenu());
  show('#album');
  for (const b of document.querySelectorAll('#album .tab')) b.classList.toggle('on', b.dataset.tab === albumTab);
  const el = $('#album-body');
  const n = Save.data.figus.length, total = figuPool().length;
  $('#album-count').textContent = `Figuritas ${n}/${total} · +${n}% de daño`;
  if (albumTab === 'historia') {
    el.innerHTML = allStory().map(p => `<div class="story-entry"><h3>${p.title}</h3><p>${p.text}</p></div>`).join('');
    return;
  }
  if (albumTab === 'vecinos') {
    el.innerHTML = `<div class="album-grid">${CHARACTERS.map(c => {
      const own = charOwned(c.id), fig = Save.data.figus.includes('c:' + c.id), h = Save.hero(c.id);
      const known = own || fig;
      return `<div class="alb${known ? '' : ' locked'}${fig ? ' fig' : ''}"><canvas width="64" height="64" data-spr="${c.sprite}"></canvas>
        <div class="an">${known ? c.name : '???'}</div><div class="ar">${known ? `${c.role}${own ? ` · Nv ${h.lvl}` : ''}` : ''}</div>
        ${known && LORE.chars[c.id] ? `<p>${LORE.chars[c.id]}</p>` : ''}${fig && LORE.quotes[c.id] ? `<p class="q">${[].concat(LORE.quotes[c.id])[0]}</p>` : ''}</div>`;
    }).join('')}</div>`;
  } else {
    const ids = Object.keys(ENEMIES).filter(k => LORE.enemies[loreKey(k)]);
    el.innerHTML = `<p class="hint">Los que viste en el Pozo aparecen acá. Con su figurita se completa la ficha: de dónde viene la leyenda y cómo enfrentarlo.</p><div class="album-grid">${ids.map(k => {
      const e = ENEMIES[k], lk = loreKey(k), seen = !!Save.data.seen[k], fig = Save.data.figus.includes('b:' + k);
      return `<div class="alb bicho${seen || fig ? '' : ' locked'}${fig ? ' fig' : ''}"><canvas width="64" height="64" data-spr="${e.sprite}"></canvas>
        <div class="an">${seen || fig ? e.name : '???'}</div>${LORE.origen[lk] && fig ? `<div class="ar">${LORE.origen[lk]}</div>` : ''}
        ${seen || fig ? `<p>${LORE.enemies[lk]}</p>` : ''}
        ${fig && LORE.mas[lk] ? `<p>${LORE.mas[lk]}</p>` : ''}${fig && LORE.tips[lk] ? `<p class="q">${LORE.tips[lk]}</p>` : ''}
        ${seen && !fig ? '<p class="muted small">Falta su figurita.</p>' : ''}</div>`;
    }).join('')}</div>`;
  }
  for (const cvs of el.querySelectorAll('canvas[data-spr]')) portrait(cvs, cvs.dataset.spr, cvs.closest('.locked') != null);
}
