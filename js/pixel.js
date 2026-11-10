'use strict';
// Pixel art de cada pelota (12×12, dibujado a mano). '.' = transparente, 'k' = contorno.
// o: 'spin' gira al volar · 'dir' apunta para donde va · 'none' queda derecho.
const PX = {
  pelota: { o: 'spin', pal: { w: '#f4f1e6', g: '#a8a498', b: '#1c1a18' }, rows: [
    '....kkkk....', '..kkwwwwkk..', '.kwwwbbwwwk.', '.kwwbbbbwwk.', 'kwwwwbbwwbwk', 'kbwwwwwwbbgk',
    'kbbwwwwwwbgk', 'kbwwwbbwwwgk', '.kwwbbbbwgk.', '.kgwwbbwggk.', '..kkggggkk..', '....kkkk....'] },
  bala: { o: 'dir', pal: { b: '#c8a040', B: '#f2d27a', c: '#c86a3a', C: '#f0a070' }, rows: [
    '............', '............', '............', '.kkkkkkkkk..', '.kBBBBBBkCk.', '.kbbbbbbkCCk',
    '.kbbbbbbkcck', '.kbbbbbbkck.', '.kkkkkkkkk..', '............', '............', '............'] },
  hacha: { o: 'spin', pal: { s: '#d8dee4', S: '#7a8590', r: '#c8261f', W: '#c08a50', w: '#8a5a2a' }, rows: [
    '....kkkkk...', '...kssssSk..', '..ksssssSSk.', '..kssskkSrk.', '...kkkWkrrk.', '.....kWkkk..',
    '....kWk.....', '...kWk......', '..kWk.......', '.kWk........', 'kwk.........', 'kk..........'] },
  bisturi: { o: 'dir', pal: { G: '#8a96a0', s: '#d8f4ff', W: '#ffffff' }, rows: [
    '............', '............', '............', '............', '........kkk.', 'kkkkkkkkksWk',
    'kGGGGGGGkssk', 'kkkkkkkkkkk.', '............', '............', '............', '............'] },
  sierra: { o: 'spin', pal: { s: '#c9d2da', S: '#7a8590' }, rows: [
    '.....kk.....', '..k.kSSk.k..', '..kkSssSkk..', '.kSsssssSSk.', 'kSssskksssSk', '.kssk..kssk.',
    '.kssk..kssk.', 'kSssskksssSk', '.kSssssssSk.', '..kkSssSkk..', '..k.kSSk.k..', '.....kk.....'] },
  molotov: { o: 'spin', pal: { g: '#3a8a3a', G: '#7ac86a', o: '#ff8a1a', y: '#ffe04a', c: '#e8dcc8' }, rows: [
    '.....yo.....', '....oyyo....', '....oyo.....', '.....kck....', '.....kck....', '....kgGgk...',
    '...kgGggGk..', '...kgGgggk..', '...kgGgggk..', '...kgggggk..', '...kgggggk..', '....kkkkk...'] },
  taser: { o: 'dir', pal: { y: '#f2d23a', Y: '#c8a020', b: '#2a2a2a', e: '#7ad7ff', E: '#ffffff' }, rows: [
    '............', '............', '............', '........e.e.', '.kkkkkkk.eE.', 'kyyyyyyykk.e',
    'kyYYYyyybkE.', 'kyyyyyyykk.e', '.kbbkkkk.eE.', '.kbbk...e.e.', '.kkkk.......', '............'] },
  chancleta: { o: 'spin', pal: { p: '#ff5fa2', P: '#c83a7a', b: '#3a6ab8' }, rows: [
    '...kkkkk....', '..kpppppk...', '.kppbbbppk..', '.kpbpppbpk..', '.kpbpppbpk..', '.kppbpbppk..',
    '.kpppbpppk..', '.kpppppppk..', '.kPpppppPk..', '..kPpppPk...', '..kPPPPPk...', '...kkkkk....'] },
  llave: { o: 'spin', pal: { s: '#c8d0d8', S: '#7a8590' }, rows: [
    '............', '............', '............', '.kk......kk.', 'ksSk....kSsk', 'ksk.kkkk.ksk',
    'kssksssskssk', 'ksk.kkkk.ksk', 'ksSk....kSsk', '.kk......kk.', '............', '............'] },
  cuchilla: { o: 'dir', pal: { s: '#d8dee4', S: '#8a96a0', w: '#6a3a1a', r: '#c8261f' }, rows: [
    '............', '............', '...kkkkkkkk.', '..ksssssssSk', '..ksssssssSk', '..ksssssssSk',
    '..ksrssssrSk', 'kkksssssssSk', 'kwwkkkkkkkk.', 'kkk.........', '............', '............'] },
  tiza: { o: 'dir', pal: { w: '#f2f6ff', W: '#c8d0e0', d: '#ffffff' }, rows: [
    '............', '............', '............', '............', '..........d.', '.kkkkkkkk.d.',
    'kwwwwwwwwk.d', 'kWWWWWWWWkd.', '.kkkkkkkk..d', '............', '............', '............'] },
  guitarra: { o: 'spin', pal: { p: '#c27bff', P: '#8a4ac8', w: '#ffffff' }, rows: [
    '............', '..kkkkkkkk..', '.kppppppppk.', '.kpwwpppppk.', '.kpwppppppk.', '.kppppppPPk.',
    '..kppppPPk..', '..kpppPPPk..', '...kppPPk...', '...kpPPPk...', '....kPPk....', '.....kk.....'] },
  dron: { o: 'none', pal: { g: '#9bd34a', b: '#2a2a2a', r: '#c8d0d8', l: '#ff3030' }, rows: [
    'rrrr....rrrr', '.kk......kk.', '..kk....kk..', '...kkkkkk...', '..kggggggk..', '..kgbblbgk..',
    '..kggggggk..', '...kkkkkk...', '..kk....kk..', '.kk......kk.', 'rrrr....rrrr', '............'] },
  agua: { o: 'spin', pal: { b: '#8fd0ff', B: '#3a7ab8', w: '#ffffff', c: '#f2c641', g: '#d8f0ff' }, rows: [
    '....kkk.....', '....kgk.....', '...kkgkk....', '..kbbbbbk...', '.kbbbcbbbk..', '.kbbcccbbk..',
    '.kbwbcbbBk..', '.kbwbcbbBk..', '.kbbbbbBBk..', '..kBBBBBk...', '...kkkkk....', '............'] },
  granada: { o: 'spin', pal: { g: '#5a7a2a', G: '#8aaa4a', s: '#9aa0a8' }, rows: [
    '.....kk.....', '....kssk.k..', '....kkkkks..', '...kGGGGk...', '..kGgGgGgk..', '.kGgkgkgkgk.',
    '.kgGgGgGgGk.', '.kgkgkgkggk.', '.kGgGgGgGgk.', '..kggggggk..', '...kkkkkk...', '............'] },
  gas: { o: 'spin', pal: { g: '#7fe04a', G: '#4a9a2a', w: '#d8ff9a' }, rows: [
    '............', '...kkk.kk...', '..kgggkggk..', '.kgwwgggggk.', 'kgwggggggGgk', 'kgggkgggkGgk',
    'kggggggggGGk', '.kggkkkkgGk.', '..kGGGGGGk..', '...kkkkkk...', '............', '............'] },
  facon: { o: 'dir', pal: { s: '#e8e0c8', S: '#a8a090', w: '#6a3a1a', g: '#f2c641' }, rows: [
    '............', '............', '............', '............', '....kkkkkk..', 'kkk.ksssssk.',
    'kwwgksssssSk', 'kwwgkSSSSSk.', 'kkk.kkkkkk..', '............', '............', '............'] },
  boleadora: { o: 'spin', pal: { b: '#a77b4a', B: '#6a4a2a', r: '#d8c090' }, rows: [
    '....kkk.....', '...kbbBk....', '...kbBBk....', '....kkr.....', '.....r......', '....r.r.....',
    '...r...r....', '.kkk...kkk..', 'kbbBk.kbbBk.', 'kbBBk.kbBBk.', '.kkk...kkk..', '............'] },
  farol: { o: 'none', pal: { y: '#ffe08a', Y: '#ffb02e', m: '#4a3a2a' }, rows: [
    '.....kk.....', '....k..k....', '...kkkkkk...', '...kmmmmk...', '..kmyyyymk..', '..kyYyyyyk..',
    '..kyYYyyyk..', '..kyyYYyyk..', '..kmyyyymk..', '...kmmmmk...', '...kkkkkk...', '............'] },
  kultrun: { o: 'spin', pal: { l: '#e8d8b0', p: '#3a6ab8' }, rows: [
    '....kkkk....', '..kkllllkk..', '.kpllppllpk.', '.kllpllpllk.', 'kppppppppppk', 'kllllppllllk',
    'kllllppllllk', 'kppppppppppk', '.kllpllpllk.', '.kpllppllpk.', '..kkllllkk..', '....kkkk....'] },
  // ---------- Fusiones ----------
  azufre: { o: 'spin', pal: { r: '#ff2a1a', o: '#ff8a1a', y: '#ffe04a', d: '#4a0a0a' }, rows: [
    '....oyo.....', '...oyyyo.o..', '..koooyook..', '.krrooooork.', '.krdrrrdrrk.', 'krrdrrrdrrrk',
    'krrrrrrrrrrk', 'krrrdddrrrrk', '.krrrrrrrrk.', '.kkrrrrrrkk.', '..kkkkkkkk..', '............'] },
  tormenta: { o: 'none', pal: { c: '#a6e8ff', C: '#5a9ac8', y: '#ffe04a', w: '#ffffff' }, rows: [
    '...kkk.kk...', '..kwcckcck..', '.kcwcccccck.', 'kcccccccccCk', 'kCcccccccCCk', '.kCCCCCCCCk.',
    '..kkkyykkk..', '....yy......', '...yyyy.....', '.....yy.....', '.....y......', '............'] },
  garrafa: { o: 'spin', pal: { o: '#ff9a2a', O: '#c86a1a', s: '#9aa0a8', S: '#5a6068', w: '#fff0d0' }, rows: [
    '....kkkk....', '....ksSk....', '...kkkkkk...', '..koooooOk..', '.kowoooooOk.', '.kowoooooOk.',
    '.koooooooOk.', '.kkkkkkkkkk.', '.koooooooOk.', '.koooooooOk.', '..kOOOOOOk..', '...kkkkkk...'] },
  motosierra: { o: 'dir', pal: { r: '#ff4040', R: '#a82020', s: '#c9d2da', b: '#2a2a2a' }, rows: [
    '............', '............', '............', '.kkkk.......', 'krrrrkkkkkk.', 'krRrrkssssk.',
    'krrrrksssssk', 'kRRRRkkkkkk.', '.kbbk.......', '.kkkk.......', '............', '............'] },
  botin: { o: 'spin', pal: { y: '#ffcc33', Y: '#c8961a', w: '#fff3b0', s: '#5a4a1a' }, rows: [
    '............', '...kkkk.....', '...kyyk.....', '...kywk.....', '...kyyk.....', '...kyyykkk..',
    '..kyyyyyyyk.', '..kywyyyyyyk', '..kYYYYYYYYk', '...kskksksk.', '............', '............'] },
  luzmala: { o: 'none', pal: { y: '#ffe08a', Y: '#e0a030', w: '#ffffff' }, rows: [
    '....kkkk....', '..kkyyyykk..', '.kyywwyyyyk.', '.kywwyyyyyk.', 'kyyykyykyyyk', 'kyyykyykyyYk',
    'kyyyyyyyyyYk', 'kyyyyYYyyYYk', '.kyyyyyyYYk.', '.kYyyyyYYYk.', '..kkYYYYkk..', '....kkkk....'] },
  ceibo: { o: 'spin', pal: { r: '#ff4d6d', R: '#c8264a', g: '#3a8a3a', y: '#f2c641' }, rows: [
    '....kk.kk...', '...krrkrrk..', '..krrrkrrrk.', '.kkrrryrrkk.', 'krrrryyyrrrk', 'kRrrryyyrrRk',
    '.kkRrryrRkk.', '..kRRkkRRk..', '...kk.gkk...', '......g.....', '.....gg.....', '............'] },
};

// Arma un canvas de 12×12 por pelota (y para las fusiones libres, mitad y mitad).
const PX_CACHE = {};
function pxCanvas(id) {
  if (PX_CACHE[id]) return PX_CACHE[id];
  const cv = document.createElement('canvas');
  cv.width = cv.height = 12;
  const c = cv.getContext('2d');
  if (id.startsWith('mix_')) {
    const [, a, b] = id.match(/^mix_(.+?)_(.+)$/) || [];
    if (a && b) { c.drawImage(pxCanvas(a), 0, 0, 6, 12, 0, 0, 6, 12); c.drawImage(pxCanvas(b), 6, 0, 6, 12, 6, 0, 6, 12); }
    return (PX_CACHE[id] = cv);
  }
  const s = PX[id];
  if (!s) return (PX_CACHE[id] = cv);
  const pal = Object.assign({ k: '#14100c' }, s.pal);
  s.rows.forEach((row, y) => {
    for (let x = 0; x < 12; x++) {
      const ch = row[x];
      if (!ch || ch === '.' || !pal[ch]) continue;
      c.fillStyle = pal[ch];
      c.fillRect(x, y, 1, 1);
    }
  });
  return (PX_CACHE[id] = cv);
}
function pxOrient(id) { return id.startsWith('mix_') ? 'spin' : (PX[id] && PX[id].o) || 'spin'; }
// Para el DOM (cartas, ranuras, personajes): una imagen grande, sin suavizado.
const PX_URL = {};
function pxUrl(id) {
  if (PX_URL[id]) return PX_URL[id];
  const big = document.createElement('canvas');
  big.width = big.height = 48;
  const c = big.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(pxCanvas(id), 0, 0, 48, 48);
  return (PX_URL[id] = big.toDataURL());
}

// ---------- Objetos, recursos y gemas (mismo estilo: 12×12, contorno oscuro) ----------
const GEM_ROWS = ['............', '............', '.....kk.....', '....kwGk....', '...kwgGGk...', '..kwggGGGk..', '..kgggGGGk..', '...kggGGk...', '....kgGk....', '.....kk.....', '............', '............'];
Object.assign(PX, {
  // pasivos
  mate: { pal: { m: '#7a5a2a', M: '#a8823a', g: '#5a8a2a', s: '#c8d0d8' }, rows: [
    '.........ks.', '........ks..', '...kkkkks...', '..kgggggsgk.', '..kMMMMMMMk.', '.kMmmmmmmmMk',
    '.kmMmmmmmmmk', '.kmMmmmmmmmk', '.kmmmmmmmmmk', '..kmmmmmmmk.', '...kkmmmkk..', '....kkkkk...'] },
  zapatillas: { pal: { w: '#f4f1e6', b: '#3a6ab8', r: '#c8261f' }, rows: [
    '............', '............', '...kkkk.....', '..kbbbbk....', '..kbwbbbkk..', '..kbbbbbbbk.',
    '.kbbwbbwbbbk', 'kwwwwwwwwwwk', 'krrrrrrrrrrk', '.kkkkkkkkkk.', '............', '............'] },
  bolsa: { pal: { n: '#d8c090', w: '#f4f1e6', o: '#ff8a3a', b: '#57b6ff' }, rows: [
    '...kk..kk...', '...kn..nk...', '...kn..nk...', '..kknnnnkk..', '.kwwnnoonnk.', '.kwwnoooonk.',
    '.knnwwnbbnk.', '.knwwwnbbbk.', '.knnwnnbbnk.', '..knnnnnnk..', '...kkkkkk...', '............'] },
  guantes: { pal: { g: '#f2c641', G: '#c8961a', w: '#ffffff' }, rows: [
    '..k.k.k.....', '.kgkgkgk....', '.kgkgkgkk...', '.kgkgkgkgk..', '.kggggggggk.', '.kgwggggGgk.',
    '.kggggggGk..', '..kgggggGk..', '..kGGGGGGk..', '..kwwwwwwk..', '..kkkkkkkk..', '............'] },
  biblia: { pal: { p: '#e8e0c8', b: '#3a6ab8', y: '#f2c641', s: '#e8b090' }, rows: [
    '.kkkkkkkkkk.', '.kppppppppk.', '.kppyyyyppk.', '.kppyssyppk.', '.kpppsspppk.', '.kppbbbbppk.',
    '.kpbbbbbbpk.', '.kpbbbbbbpk.', '.kpbbbbbbpk.', '.kppppppppk.', '.kkkkkkkkkk.', '............'] },
  iman: { pal: { r: '#c8261f', R: '#8a1a14', s: '#d8dee4' }, rows: [
    '..kkkkkkkk..', '.kkrrrrrrkk.', 'krrrkkkkrrrk', 'krrk....krrk', 'krrk....krrk', 'kRRk....kRRk',
    'kRRk....kRRk', 'kssk....kssk', 'kssk....kssk', 'kkkk....kkkk', '............', '............'] },
  barricada: { pal: { b: '#8a7550', B: '#5a4a33', l: '#c8b080' }, rows: [
    '............', '............', '............', '...kkkkkk...', '..kllbbbbk..', '..kbbbbbBk..',
    '.kkkkkkkkkk.', 'kllbbbkllbbk', 'kbbbbBkbbbBk', 'kkkkkkkkkkkk', '............', '............'] },
  herradura: { pal: { s: '#a8b0b8', S: '#6a727a', h: '#2a2a2a' }, rows: [
    '..kkkkkkkk..', '.kssssssssk.', 'ksshkkkkhssk', 'kssk....kssk', 'kshk....khsk', 'kssk....kssk',
    'kSSk....kSSk', 'kShk....khSk', 'kSSk....kSSk', 'kkkk....kkkk', '............', '............'] },
  inflador: { pal: { b: '#3a6ab8', B: '#2a4a88', s: '#c8d0d8', r: '#c8261f' }, rows: [
    '..kkkkkkkk..', '..kssssssk..', '..kkkksskk..', '....kssk....', '...kkbbkk...', '...kbbbBk...',
    '...kbbbBk...', '...kbbbBk...', '...kbbbBk...', '...kbbbBkkk.', '..kkkkkkkrk.', '.........kk.'] },
  libreta: { pal: { c: '#8a3a2a', w: '#f4f1e6', l: '#9ab0c8' }, rows: [
    '............', '.kkkkkkkkk..', '.kcwwwwwwk..', '.kcwllllwk..', '.kcwwwwwwk..', '.kcwllllwk..',
    '.kcwwwwwwk..', '.kcwlllwwk..', '.kcwwwwwwk..', '.kcwllllwk..', '.kkkkkkkkk..', '............'] },
  pesa: { pal: { s: '#7a8590', S: '#c8d0d8' }, rows: [
    '............', '............', '.kk......kk.', 'kSSk....kSSk', 'kSsk....kSsk', 'kSskkkkkkSsk',
    'kSsSSSSSSSsk', 'kSskkkkkkSsk', 'kSsk....kSsk', 'kSSk....kSSk', '.kk......kk.', '............'] },
  cruz: { pal: { w: '#f4f1e6', r: '#c8261f' }, rows: [
    '............', '.kkkkkkkkkk.', '.kwwwwwwwwk.', '.kwwwrrwwwk.', '.kwwwrrwwwk.', '.kwrrrrrrwk.',
    '.kwrrrrrrwk.', '.kwwwrrwwwk.', '.kwwwrrwwwk.', '.kwwwwwwwwk.', '.kkkkkkkkkk.', '............'] },
  pibitos: { pal: { w: '#f4f1e6', b: '#1c1a18' }, rows: [
    '............', '..kkk.......', '.kwbwk......', '.kbwwk..kkk.', '.kwwbk.kwbwk', '..kkk..kbwwk',
    '.......kwwbk', '..kkk...kkk.', '.kwbwk......', '.kbwwk......', '..kkk.......', '............'] },
  // recursos
  oro: { pal: { y: '#f2c641', Y: '#a8801a', w: '#fff3b0' }, rows: [
    '............', '............', '....kkkk....', '...kyyyyk...', '..kywyyyYk..', '..kywyyyYk..',
    '..kyyyyyYk..', '..kyyyyYYk..', '...kYYYYk...', '....kkkk....', '............', '............'] },
  madera: { pal: { w: '#a8723a', W: '#6a4a2a', r: '#e8c08a' }, rows: [
    '............', '............', '............', '.kkkkkkkkkk.', 'kwwwwwwwkrrk', 'kWWwwWWwkrWk',
    'kwwwwwwwkrrk', '.kkkkkkkkkk.', '............', '............', '............', '............'] },
  ladrillo: { pal: { r: '#c8602a', R: '#e8925a' }, rows: [
    '............', '............', '............', 'kkkkkkkkkkkk', 'kRRRRRkRRRRk', 'krrrrrkrrrrk',
    'kkkkkkkkkkkk', 'kRRRkRRRRRRk', 'krrrkrrrrrrk', 'kkkkkkkkkkkk', '............', '............'] },
  trigo: { pal: { y: '#e8d27a', Y: '#c8a040', g: '#8a7a2a', r: '#c8261f' }, rows: [
    '..y..y..y...', '.yYy.yYy.yYy', '.yYy.yYy.yYy', '..Y..Y..Y...', '..g..g..g...', '...g.g.g....',
    '....ggg.....', '...rrrrr....', '....ggg.....', '...g.g.g....', '..g..g..g...', '............'] },
  plano: { pal: { b: '#2a6ab8', w: '#cfe6ff' }, rows: [
    '............', '.kkkkkkkkkk.', '.kbbbbbbbbk.', '.kbwwwbbwbk.', '.kbwbwbbwbk.', '.kbwwwwwwbk.',
    '.kbbbwbbbbk.', '.kbbbwwwwbk.', '.kbbbbbbbbk.', '.kkkkkkkkkk.', '............', '............'] },
  orbe: { pal: { r: '#ff4d6d', y: '#f2c641', g: '#9bd34a', b: '#57b6ff', p: '#c27bff', w: '#ffffff' }, rows: [
    '....kkkk....', '..kkrryykk..', '.krrryyyggk.', '.krwwyygggk.', 'krrwyyggbbbk', 'kprryyggbbbk',
    'kpprygggbbbk', 'kpppyggbbbbk', '.kppggbbbbk.', '.kpppbbbbpk.', '..kkppppkk..', '....kkkk....'] },
  // gemas de experiencia (verde, azul, lila)
  gema_v: { pal: { g: '#9bd34a', G: '#5a9a2a', w: '#e8ffc0' }, rows: GEM_ROWS },
  gema_a: { pal: { g: '#57b6ff', G: '#2a6ab8', w: '#d8f0ff' }, rows: GEM_ROWS },
  gema_l: { pal: { g: '#c27bff', G: '#7a3ab8', w: '#f0d8ff' }, rows: GEM_ROWS },
});
// Para dibujar en el canvas del juego, centrado.
function drawPx(c, id, x, y, size, rot) {
  const spr = pxCanvas(id);
  c.save();
  c.translate(Math.round(x), Math.round(y));
  if (rot) c.rotate(rot);
  c.drawImage(spr, -size / 2, -size / 2, size, size);
  c.restore();
}
