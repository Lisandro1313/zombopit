'use strict';
// Efectos de sonido sintetizados con WebAudio (sin archivos).
const Sfx = {
  ctx: null,
  master: null,
  on: true,
  vol: 0.7,
  last: {},
  throttle: { shot: 0.06, hit: 0.045, gem: 0.04, swing: 0.1, zap: 0.08, boom: 0.08, hurt: 0.15, coin: 0.05, fire: 0.15 },

  // Cadena: efectos (master) y música (musicBus, con filtro) -> compresor -> parlantes.
  // El compresor evita que 100 golpes por segundo saturen; el bus de música permite bajarla
  // un instante cuando pasa algo importante y "ahogarla" en los menús.
  init() {
    if (!this.ctx) {
      try {
        // En iPhone, "playback" hace que suene aunque el teléfono tenga el interruptor de silencio.
        if (navigator.audioSession) { try { navigator.audioSession.type = 'playback'; } catch (e) { /* no importa */ } }
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const c = this.ctx;
        this.comp = c.createDynamicsCompressor();
        this.comp.threshold.value = -12; this.comp.knee.value = 6; this.comp.ratio.value = 12;
        this.comp.attack.value = 0.003; this.comp.release.value = 0.25;
        this.comp.connect(c.destination);
        this.master = c.createGain();
        this.master.gain.value = 0.5 * this.vol;
        this.master.connect(this.comp);
        this.musicBus = c.createGain();
        this.musicLp = c.createBiquadFilter(); this.musicLp.type = 'lowpass'; this.musicLp.frequency.value = 20000;
        this.musicBus.connect(this.musicLp); this.musicLp.connect(this.comp);
      } catch (e) { this.ctx = null; }
    }
    this.wake();
    if (this.ctx) this.loadFiles();
    if (typeof Music !== 'undefined') Music.unlock();
  },

  // iOS deja el audio en "interrupted" después de una llamada o de Siri: se reanuda en el próximo toque.
  wake() {
    if (this.ctx && (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') && !document.hidden) this.ctx.resume().catch(() => {});
  },
  // Baja la música un momento (golpe, jefe, nivel, cofre) para que se escuche lo importante.
  duck(depth, hold) {
    if (!this.musicBus) return;
    const g = this.musicBus.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(depth, t, 0.03);
    g.setTargetAtTime(1, t + (hold || 0.3), 0.25);
  },
  // Música "ahogada" en los menús de la partida (cartas, cofre, pausa).
  muffle(on) {
    if (!this.musicLp || this.muffled === on) return;
    this.muffled = on;
    this.musicLp.frequency.setTargetAtTime(on ? 900 : 20000, this.ctx.currentTime, 0.08);
  },
  setVolume(v) {
    this.vol = Math.max(0, Math.min(1, v / 100));
    if (this.master) this.master.gain.value = 0.5 * this.vol;
  },

  tone(freq, dur, type, vol, slideTo) {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  noise(dur, vol, freq, q) {
    const c = this.ctx, t = c.currentTime;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 2000; f.Q.value = q || 1;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },

  // Sonidos grabados (assets/audio, CC0 de Juhani Junkala). Si alguno no carga, suena el sintetizado.
  files: ['shot', 'shotgun', 'hit', 'gem', 'coin', 'swing', 'zap', 'boom', 'fire', 'hurt', 'level', 'chest', 'boss', 'warn', 'eat', 'die', 'click', 'dash', 'splat', 'scream', 'riff', 'boom2', 'bag', 'evolve', 'shield', 'rugido', 'rugido2', 'aullido', 'siseo', 'gorgoteo'],
  gains: { shot: 0.32, shotgun: 0.45, hit: 0.3, gem: 0.22, coin: 0.35, swing: 0.4, zap: 0.3, boom: 0.55, fire: 0.3, hurt: 0.55, level: 0.5, chest: 0.6, boss: 0.7, warn: 0.3, eat: 0.5, die: 0.6, click: 0.35, dash: 0.4, splat: 0.3, scream: 0.35, riff: 0.45, boom2: 0.5, bag: 0.45, evolve: 0.7, shield: 0.55, rugido: 0.75, rugido2: 0.7, aullido: 0.6, siseo: 0.5, gorgoteo: 0.6 },
  buf: {},
  loading: false,
  loadFiles() {
    if (this.loading || !this.ctx) return;
    this.loading = true;
    for (const n of this.files) {
      fetch(`assets/audio/${n}.wav`)
        .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then(ab => new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej)))
        .then(b => { this.buf[n] = b; })
        .catch(() => { /* queda el sintetizado */ });
    }
  },
  // Tope de voces: si ya suenan muchas, lo de poca importancia (golpes, cristales) no entra.
  active: 0,
  prio: { hurt: 3, boss: 3, level: 3, evolve: 3, die: 3, chest: 2, coin: 2, bag: 2, shield: 2, eat: 2, boom: 2, boom2: 2, scream: 2, rugido: 3, rugido2: 3, aullido: 3, siseo: 2, gorgoteo: 2 },
  playBuf(name, o) {
    if (name === 'boom' && this.buf.boom2 && Math.random() < 0.5) name = 'boom2'; // que las explosiones no suenen todas iguales
    const pr = this.prio[name] || 1;
    if (this.active >= 24 && pr < 2) return;
    const c = this.ctx, src = c.createBufferSource(), g = c.createGain();
    src.buffer = this.buf[name];
    // un poco de variación para que no canse
    if (o && o.rate) src.playbackRate.value = o.rate;
    else if (name === 'hit' || name === 'shot' || name === 'splat') src.playbackRate.value = 0.9 + Math.random() * 0.2;
    g.gain.value = (this.gains[name] || 0.4) * (o && o.vol || 1) * (pr < 2 ? 0.85 + Math.random() * 0.3 : 1);
    if (o && o.x != null && typeof G !== 'undefined' && G && G.cam && c.createStereoPanner) {
      const rel = (o.x - G.cam.x) * (typeof ZOOM !== 'undefined' ? ZOOM : 1) / Math.max(1, (typeof W !== 'undefined' ? W : 800) / 2);
      const pn = c.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, rel)) * 0.7;
      if (Math.abs(rel) > 1.1) g.gain.value *= 0.5; // fuera de pantalla, más bajo
      src.connect(g); g.connect(pn); pn.connect(this.master);
    } else { src.connect(g); g.connect(this.master); }
    this.active++;
    src.onended = () => { this.active--; };
    src.start();
  },

  play(name, o) {
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const th = this.throttle[name] || 0.03;
    if (this.last[name] && now - this.last[name] < th) return;
    this.last[name] = now;
    if (name === 'hurt') this.duck(0.5, 0.25);
    else if (name === 'boss' || name === 'evolve' || name === 'level' || name === 'chest') this.duck(0.4, 0.6);
    if (this.buf[name]) { this.playBuf(name, o); return; }
    switch (name) {
      case 'shot': this.noise(0.07, 0.25, 3200); this.tone(260, 0.06, 'square', 0.05, 90); break;
      case 'hit': this.tone(180 + Math.random() * 60, 0.05, 'triangle', 0.12, 80); break;
      case 'gem': this.tone(880 + Math.random() * 200, 0.06, 'sine', 0.08, 1400); break;
      case 'coin': this.tone(1200, 0.05, 'square', 0.05); this.tone(1800, 0.08, 'square', 0.04); break;
      case 'swing': this.noise(0.12, 0.18, 900); break;
      case 'zap': this.tone(1400, 0.08, 'sawtooth', 0.06, 300); this.noise(0.06, 0.08, 6000); break;
      case 'boom': this.noise(0.45, 0.5, 500); this.tone(110, 0.35, 'sine', 0.3, 35); break;
      case 'fire': this.noise(0.3, 0.12, 700); break;
      case 'hurt': this.tone(160, 0.18, 'sawtooth', 0.18, 60); break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.on && this.tone(f, 0.14, 'square', 0.07), i * 70)); break;
      case 'chest': [392, 523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.on && this.tone(f, 0.16, 'triangle', 0.1), i * 80)); break;
      case 'boss': this.tone(70, 1.2, 'sawtooth', 0.25, 40); this.noise(1.0, 0.15, 300); break;
      case 'warn': this.tone(440, 0.12, 'square', 0.06); break;
      case 'eat': this.tone(300, 0.08, 'sine', 0.12, 600); break;
      case 'die': this.tone(300, 0.8, 'sawtooth', 0.2, 40); break;
      case 'click': this.tone(600, 0.04, 'square', 0.05); break;
      case 'shotgun': this.noise(0.15, 0.4, 1800); break;
      case 'dash': this.noise(0.1, 0.15, 1500); break;
      case 'splat': this.noise(0.08, 0.12, 600); break;
    }
  },
};
Sfx.throttle.splat = 0.07; Sfx.throttle.shotgun = 0.1; Sfx.throttle.scream = 0.6; Sfx.throttle.die = 0.4;

// ---------- Música (assets/audio, "5 Chiptunes (Action)" de Juhani Junkala, CC0) ----------
// menu = pantalla de inicio · calma / intenso = partida · jefe = con un jefe vivo · final = fin de partida
const Music = {
  tracks: { menu: 'menu.mp3', calma: 'calma.mp3', intenso: 'intenso.mp3', jefe: 'jefe.mp3', final: 'final.mp3' },
  els: {},
  cur: null,
  vol: 0.5,
  on: true,
  unlocked: false,
  el(name) {
    if (!this.els[name]) {
      const a = new Audio(`assets/audio/${this.tracks[name]}`);
      a.loop = name !== 'final';
      a.preload = 'auto';
      a.volume = 0;
      // En iPhone el volumen de <audio> no se puede cambiar: se pasa por WebAudio y se usa una ganancia.
      if (Sfx.ctx) {
        try {
          const src = Sfx.ctx.createMediaElementSource(a), g = Sfx.ctx.createGain();
          g.gain.value = 0;
          src.connect(g); g.connect(Sfx.musicBus || Sfx.ctx.destination);
          a.volume = 1;
          a._g = g;
        } catch (e) { /* queda el volumen común */ }
      }
      this.els[name] = a;
    }
    return this.els[name];
  },
  setVolume(v) { this.vol = Math.max(0, Math.min(1, v / 100)); },
  // El navegador solo deja arrancar audio después de un toque o una tecla.
  unlock() { this.unlocked = true; },
  want(name) {
    if (!this.unlocked || !this.on || this.vol <= 0) name = null;
    if (name === this.cur) return;
    const prev = this.cur;
    this.cur = name;
    if (name) {
      const a = this.el(name);
      if (name === 'final' || prev === null) a.currentTime = 0;
      a.play().catch(() => { this.cur = null; });
    }
  },
  // Fundido suave entre pistas; se llama en cada cuadro.
  tick(dt) {
    for (const n in this.els) {
      const a = this.els[n];
      const target = n === this.cur ? this.vol * 0.55 : 0;
      const cur = a._g ? a._g.gain.value : a.volume;
      const v = Math.max(0, Math.min(1, cur + (target - cur) * Math.min(1, dt * 2.5)));
      if (a._g) a._g.gain.value = v; else a.volume = v;
      if (n !== this.cur && v < 0.01 && !a.paused) a.pause();
    }
  },
  // Al minimizar: silencio total (y que no siga sonando en segundo plano).
  pauseAll() { for (const n in this.els) this.els[n].pause(); this.cur = null; },
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { Music.pauseAll(); if (Sfx.ctx && Sfx.ctx.state === 'running') Sfx.ctx.suspend(); }
  else if (Music.unlocked) Sfx.wake();
});
// Cada toque o tecla reintenta despertar el audio (por si iOS lo dejó interrumpido).
window.addEventListener('pointerdown', () => { if (Music.unlocked) Sfx.wake(); }, true);
window.addEventListener('keydown', () => { if (Music.unlocked) Sfx.wake(); }, true);
