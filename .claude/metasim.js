// Simulación de muchas partidas seguidas (solo para balancear; se carga a mano en una pestaña con ?test).
// Un bot juega, vuelve al pueblo, cosecha, construye con una prioridad simple y vuelve a bajar.
(function () {
  const realNow = Date.now.bind(Date);
  window.MS = window.MS || { run: 0, clock: 0, log: [], playMin: 0 };
  Date.now = () => realNow() + MS.clock;
  Sfx.on = false;
  const PRIO = ['kiosco', 'aserradero', 'corralon', 'dispensario', 'comisaria', 'gimnasio', 'canchita', 'utileria', 'trigal', 'salita',
    'fusiones', 'escuelita', 'plazoleta', 'cuartel', 'mercado', 'abuela', 'biblioteca', 'herreria', 'quiniela', 'chatarreria', 'feria', 'gomeria', 'escuela'];
  function botRun(charId, stageId, cap) {
    newGame(charId, stageId);
    let steps = 0;
    while (steps < cap * 60 && state !== 'end') {
      if (state === 'levelup') { const o = cardOptions(); applyCard((G.bag.length < 3 && o.find(x => x.kind === 'new')) || o.find(x => x.kind === 'up') || o[0]); state = 'play'; }
      if (G.orbs > 0) { G.orbs--; const oo = orbOptions().opts; applyCard(oo.find(x => x.kind === 'fusion' && x.evo) || oo[0]); }
      let g = null, bd = 1e9;
      for (const x of G.gems) { if (x.y < GEM_Y - 40) continue; const d = Math.abs(x.x - G.x); if (d < bd) { bd = d; g = x; } }
      input.left = !!g && g.x < G.x - 10; input.right = !!g && g.x > G.x + 10;
      update(1 / 60); steps++;
    }
    input.left = input.right = false;
    const t = G.t, won = G.won;
    if (state !== 'end') endGame(won);
    return { t, won, lvl: G.lvl };
  }
  function harvest() {
    const d = Save.data, got = { oro: 0, madera: 0, ladrillo: 0, trigo: 0 };
    if (!d.harvestReady) return got;
    for (const k in d.base.lots) { const lot = d.base.lots[k], pr = BUILDINGS[lot.b].prod; if (!pr) continue; const n = takeStock(lot, Math.floor(stockOf(lot) * 0.75)); got[pr.res] += n; d.res[pr.res] += n; }
    d.harvestReady = false;
    return got;
  }
  function spend() {
    const d = Save.data, B = d.base, done = [];
    for (let guard = 0; guard < 20; guard++) {
      const free = [...Array(BASE_COLS * BASE_ROWS).keys()].filter(i => lotState(i) === 'empty');
      const known = PRIO.filter(id => !isBuilt(id) && knownBuilding(id)).concat(Object.keys(BUILDINGS).filter(id => !PRIO.includes(id) && !isBuilt(id) && knownBuilding(id)));
      const want = known.find(id => canPay(buildCost(id, 0)));
      if (want && free.length) { pay(buildCost(want, 0)); B.lots[free[0]] = { b: want, lvl: 1 }; done.push('+' + want); continue; }
      if (want && !free.length) {
        const rub = [...Array(BASE_COLS * BASE_ROWS).keys()].find(i => lotState(i) === 'rubble');
        const cc = clearCost(B.cleared.length - BASE_START.length);
        if (rub != null && canPay(cc)) { pay(cc); B.cleared.push(rub); done.push('limpia'); continue; }
      }
      // mejorar: primero economía, después guerra
      const ups = Object.keys(B.lots).map(k => B.lots[k]).filter(l => l.lvl < BUILDINGS[l.b].max && BUILDINGS[l.b].cat !== 'casa')
        .sort((a, b) => (BUILDINGS[a.b].cat === 'eco' ? 0 : 1) - (BUILDINGS[b.b].cat === 'eco' ? 0 : 1) || a.lvl - b.lvl);
      const up = ups.find(l => canPay(buildCost(l.b, l.lvl)));
      if (up && !(want && !canPay(buildCost(want, 0)) && Math.random() < 0.5)) { pay(buildCost(up.b, up.lvl)); up.lvl++; done.push('^' + up.b + up.lvl); continue; }
      break;
    }
    return done;
  }
  window.metaStep = function (n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      MS.run++;
      const owned = CHARACTERS.filter(c => charOwned(c.id));
      const ch = owned[(Math.random() * owned.length) | 0].id;
      const st = Save.data.stages[Save.data.stages.length - 1];
      const r = botRun(ch, st, STAGES.find(s => s.id === st).len + 120);
      MS.playMin += r.t / 60 + 0.7;
      MS.clock += (r.t + 60) * 1000;
      const h = harvest();
      const bought = spend();
      const res = Save.data.res;
      out.push(`#${MS.run} ${ch}@${st} ${Math.round(r.t)}s${r.won ? ' GANÓ' : ''} nv${r.lvl} | cosecha ${h.oro}/${h.madera}/${h.ladrillo}/${h.trigo} | ${bought.join(' ') || '-'} | quedan ${res.oro}/${res.madera}/${res.ladrillo}/${res.trigo} | planos ${Save.data.planos.length} | ${Math.round(MS.playMin)} min`);
    }
    MS.log.push(...out);
    return out;
  };
})();
