'use strict';
// Zombopit: definiciones. Personajes, pelotas, fusiones, pasivos, bichos, escenarios y mejoras de la base.
// Los personajes y los bichos son los de Zombolito (mismos sprites LPC de assets/sprites).

const SAVE_KEY = 'zombopit_v1';

// ---------- Pelotas ----------
// dmg = daño por golpe a nivel 1 · spd = velocidad (px/s) · r = radio · col = color del brillo
// Cada efecto se resuelve en game.js (onBallHit). lvl: cada nivel suma +35% de daño y mejora el efecto.
const BALLS = {
  pelota:   { name: 'Pelota de Potrero', col: '#f4f1e6', dmg: 10, spd: 620, r: 7,  desc: 'Cada rebote la acelera un poco. Simple y confiable.' },
  bala:     { name: 'Bala 9 mm',        col: '#ffd66a', dmg: 8,  spd: 720, r: 5,  desc: 'Atraviesa 1 bicho por nivel antes de rebotar.', pierce: 1 },
  hacha:    { name: 'Hacha de Bombero', col: '#ff8a3a', dmg: 27, spd: 470, r: 9,  desc: 'Lenta y pesada: mucho daño y empuja para atrás.', knock: 26 },
  bisturi:  { name: 'Bisturí',          col: '#bff3ff', dmg: 8,  spd: 700, r: 5,  desc: 'Hace sangrar. Cada muerte te cura 1 de vida.', bleed: 3, heal: 1 },
  sierra:   { name: 'Sierra Circular',  col: '#c9d2da', dmg: 5,  spd: 560, r: 8,  desc: 'Corta todo: atraviesa a todos los bichos sin rebotar.', pierce: 99 },
  molotov:  { name: 'Molotov',          col: '#ff6a1a', dmg: 7,  spd: 600, r: 7,  desc: 'Prende fuego: el bicho se quema 3 s.', burn: 4 },
  taser:    { name: 'Taser',            col: '#7ad7ff', dmg: 7,  spd: 650, r: 6,  desc: 'Un rayo salta a 2 bichos cercanos (+1 por nivel).', chain: 2 },
  chancleta:{ name: 'Chancleta',        col: '#ff5fa2', dmg: 9,  spd: 600, r: 8,  desc: 'Patada de abuela: aturde 0,6 s y empuja.', stun: 0.6, knock: 14 },
  llave:    { name: 'Llave Inglesa',    col: '#b7c0c8', dmg: 9,  spd: 620, r: 7,  desc: '35% de crítico x3. El tachero sabe dónde pegar.', crit: 0.35 },
  cuchilla: { name: 'Cuchilla',         col: '#ff3b3b', dmg: 8,  spd: 680, r: 6,  desc: 'Sangrado que se acumula (hasta 5 veces).', bleed: 4 },
  tiza:     { name: 'Tiza',             col: '#f2f6ff', dmg: 6,  spd: 640, r: 6,  desc: 'Polvo de tiza: frena a los bichos un 50% por 2 s.', slow: 2 },
  guitarra: { name: 'Púa de Guitarra',  col: '#c27bff', dmg: 7,  spd: 620, r: 7,  desc: 'Cada golpe suelta una onda que daña alrededor.', wave: 52 },
  dron:     { name: 'Dron',             col: '#9bd34a', dmg: 11,  spd: 560, r: 7,  desc: 'Se teledirige al bicho más cercano.', homing: 1 },
  agua:     { name: 'Agua Bendita',     col: '#8fd0ff', dmg: 8,  spd: 600, r: 7,  desc: 'Salpica alrededor. Doble daño a los no-muertos.', splash: 40, holy: 2 },
  granada:  { name: 'Granada',          col: '#d8e04a', dmg: 10, spd: 560, r: 8,  desc: 'Explota al tocar: daño en área.', boom: 60 },
  gas:      { name: 'Gas de la Salamanca', col: '#7fe04a', dmg: 5, spd: 600, r: 7, desc: 'Envenena: el veneno se acumula sin tope.', poison: 1.8 },
  facon:    { name: 'Facón',            col: '#e8e0c8', dmg: 12, spd: 700, r: 6,  desc: '+20% crítico y los críticos pegan x4.', crit: 0.2, critX: 4 },
  boleadora:{ name: 'Boleadoras',       col: '#a77b4a', dmg: 9,  spd: 580, r: 7,  desc: 'Enreda: el bicho queda quieto 1,2 s (cada 4 s).', root: 1.2 },
  farol:    { name: 'Farol del Sereno', col: '#ffe08a', dmg: 8,  spd: 600, r: 7,  desc: 'Toca a los fantasmas aunque se vuelvan transparentes y los prende fuego. +50% contra jefes.', boss: 1.5, light: true },
  kultrun:  { name: 'Kultrún',          col: '#57b6ff', dmg: 7,  spd: 620, r: 8,  desc: 'Al golpear, se divide en 2 pelotitas (1 vez).', split: 2 },
  // ---------- Fusiones (salen cuando dos pelotas llegan al nivel 3) ----------
  azufre:   { name: 'Azufre de Mandinga', col: '#ff2a1a', dmg: 16, spd: 640, r: 9, fusion: true, desc: 'Fuego + veneno del infierno. Todo lo que toca arde y se pudre.', burn: 8, poison: 4, wave: 40 },
  tormenta: { name: 'Tormenta de Santa Rosa', col: '#a6e8ff', dmg: 14, spd: 700, r: 8, fusion: true, desc: 'Rayos que saltan a 6 bichos y salpican agua bendita.', chain: 6, splash: 40, holy: 2 },
  garrafa:  { name: 'Garrafa de 10 kg', col: '#ff9a2a', dmg: 22, spd: 560, r: 10, fusion: true, desc: 'Explosión enorme que deja fuego en el piso.', boom: 110, burn: 6 },
  motosierra:{ name: 'Motosierra', col: '#ff4040', dmg: 14, spd: 600, r: 9, fusion: true, desc: 'Atraviesa todo y hace sangrar sin tope.', pierce: 99, bleed: 6 },
  botin:    { name: 'Botín de Oro', col: '#ffcc33', dmg: 26, spd: 760, r: 8, fusion: true, desc: 'El pibe la clava al ángulo: aturde, empuja y acelera con cada rebote.', stun: 0.8, knock: 30 },
  luzmala:  { name: 'Luz Mala', col: '#ffe08a', dmg: 14, spd: 560, r: 9, fusion: true, desc: 'Busca bichos sola, los frena de miedo y toca a los fantasmas.', homing: 2, slow: 3, boss: 1.4, light: true },
  ceibo:    { name: 'Flor de Ceibo', col: '#ff4d6d', dmg: 12, spd: 620, r: 8, fusion: true, desc: 'Se divide en 4 al golpear y cada pelotita sangra.', split: 4, bleed: 3 },
};
const MAX_BALL_LVL = 3;
// a + b (las dos a nivel 3) => resultado
const FUSIONS = [
  { a: 'molotov', b: 'gas', out: 'azufre' },
  { a: 'taser', b: 'agua', out: 'tormenta' },
  { a: 'granada', b: 'molotov', out: 'garrafa' },
  { a: 'sierra', b: 'cuchilla', out: 'motosierra' },
  { a: 'pelota', b: 'chancleta', out: 'botin' },
  { a: 'dron', b: 'farol', out: 'luzmala' },
  { a: 'kultrun', b: 'bisturi', out: 'ceibo' },
];

// ---------- Personajes (los de Zombolito) ----------
// ball = pelota con la que arranca · mods = bonus de la partida
const CHARACTERS = [
  { id: 'pibe', sprite: 'pibe', name: 'El Pibe', role: 'Potrero', ball: 'pelota', cost: 0, perk: '+1 pelota en la bolsa', mods: { balls: 1 } },
  { id: 'policia', sprite: 'lichi', name: 'Lichi', role: 'Policía', ball: 'bala', cost: 0, perk: '+10% de daño', mods: { might: 0.1 } },
  { id: 'bombero', sprite: 'manolito', name: 'Manolito', role: 'Rescate', ball: 'hacha', cost: 250, perk: '+40 de vida, más lento', mods: { maxHp: 40, speed: -0.1 } },
  { id: 'medica', sprite: 'salva', name: 'Salva', role: 'Sanidad', ball: 'bisturi', cost: 300, perk: 'Regenera 0,5 de vida por segundo', mods: { regen: 0.5 } },
  { id: 'mecanico', sprite: 'dimitri', name: 'Dimitri', role: 'Taller', ball: 'sierra', cost: 400, perk: '+30% de imán para las gemas', mods: { pickup: 0.3 } },
  { id: 'quimica', sprite: 'vera', name: 'Vera', role: 'Laboratorio', ball: 'molotov', cost: 500, perk: 'El fuego dura 50% más', mods: { burnDur: 0.5 } },
  { id: 'electricista', sprite: 'ervolution', name: 'Ervolution', role: 'Electricidad', ball: 'taser', cost: 600, perk: 'Los rayos saltan a +1 bicho', mods: { chain: 1 } },
  { id: 'abuela', sprite: 'abuela', name: 'Doña Rosa', role: 'Jubilación', ball: 'chancleta', cost: 400, perk: '+30% de suerte en las cartas', mods: { luck: 0.3 } },
  { id: 'taxista', sprite: 'taxista', name: 'Cacho', role: 'Remisería', ball: 'llave', cost: 500, perk: '+25% de monedas', mods: { greed: 0.25 } },
  { id: 'tana', sprite: 'tana', name: 'La Tana', role: 'Mercado', ball: 'cuchilla', cost: 500, perk: '+15% de daño, -10 de vida', mods: { might: 0.15, maxHp: -10 } },
  { id: 'marta', sprite: 'marta', name: 'Profe Marta', role: 'Escuela', ball: 'tiza', cost: 600, perk: '+20% de experiencia y 1 cambio de cartas', mods: { growth: 0.2, rerolls: 1 } },
  { id: 'yami', sprite: 'yami', name: 'Yami', role: 'Banda', ball: 'guitarra', cost: 700, perk: '+20% de área en ondas y explosiones', mods: { area: 0.2 } },
  { id: 'nati', sprite: 'nati', name: 'Nati', role: 'Delivery', ball: 'dron', cost: 700, perk: '+15% de velocidad al caminar', mods: { speed: 0.15 } },
  { id: 'cura', sprite: 'cura', name: 'Padre Tito', role: 'Parroquia', ball: 'agua', cost: 800, perk: '+20 de vida y +20% de área', mods: { maxHp: 20, area: 0.2 } },
  { id: 'ekeko', sprite: 'ekeko', name: 'El Ekeko', role: 'Abundancia', ball: 'granada', cost: 900, perk: '+30% de monedas y +10% de suerte', mods: { greed: 0.3, luck: 0.1 } },
  { id: 'bruja', sprite: 'bruja', name: 'La Bruja de la Salamanca', role: 'Salamanca', ball: 'gas', cost: 900, perk: 'El veneno pega 30% más', mods: { poisonDmg: 0.3 } },
  { id: 'martinfierro', sprite: 'martinfierro', name: 'Martín Fierro', role: 'Payador', ball: 'facon', cost: 1000, perk: '+10% de crítico', mods: { crit: 0.1 } },
  { id: 'matrero', sprite: 'matrero', name: 'El Matrero', role: 'Desafío', ball: 'boleadora', cost: 1000, perk: 'Tira 25% más rápido, -20 de vida', mods: { fireRate: 0.25, maxHp: -20 } },
  { id: 'sereno', sprite: 'sereno', name: 'El Sereno', role: 'Vigilancia nocturna', ball: 'farol', cost: 1100, perk: '+25% de daño a jefes', mods: { bossDmg: 0.25 } },
  { id: 'machi', sprite: 'machi', name: 'La Machi', role: 'Machi mapuche', ball: 'kultrun', cost: 1200, perk: '+15 de vida y +0,3 de regeneración', mods: { maxHp: 15, regen: 0.3 } },
  { id: 'mandingaj', sprite: 'mandinga', name: 'Mandinga', role: 'Secreto', ball: 'molotov', cost: 3000, perk: '+30% de daño, +1 pelota, -30 de vida', mods: { might: 0.3, balls: 1, maxHp: -30 } },
];

// ---------- Pasivos (cartas de mejora) ----------
const PASSIVES = {
  mate:      { name: 'Termo y Mate', icon: '🧉', max: 5, desc: '+0,4 de vida por segundo', apply: (p) => { p.regen += 0.4; } },
  zapatillas:{ name: 'Zapatillas Flecha', icon: '👟', max: 5, desc: '+12% de velocidad al caminar', apply: (p) => { p.speed += 0.12; } },
  bolsa:     { name: 'Bolsa de Red', icon: '🎒', max: 5, desc: '+1 pelota de cada tipo en la bolsa', apply: (p) => { p.balls += 1; } },
  guantes:   { name: 'Guantes de Arquero', icon: '🧤', max: 5, desc: '+15% de velocidad de tiro', apply: (p) => { p.fireRate += 0.15; } },
  biblia:    { name: 'Estampita', icon: '📿', max: 5, desc: '+12% de daño', apply: (p) => { p.might += 0.12; } },
  iman:      { name: 'Imán de Heladera', icon: '🧲', max: 3, desc: '+40% de alcance para juntar gemas', apply: (p) => { p.pickup += 0.4; } },
  barricada: { name: 'Barricada', icon: '🧱', max: 5, desc: '+25 de vida máxima (y te cura 25)', apply: (p) => { p.maxHp += 25; p.hp += 25; } },
  herradura: { name: 'Herradura', icon: '🧿', max: 3, desc: '+8% de crítico', apply: (p) => { p.crit += 0.08; } },
  inflador:  { name: 'Inflador', icon: '💨', max: 3, desc: '+12% de velocidad de las pelotas', apply: (p) => { p.ballSpd += 0.12; } },
  pibitos:   { name: 'Pibes del Barrio', icon: '', max: 5, desc: 'Sale sola una pelotita extra cada tanto (más seguido por nivel)', apply: (p) => { p.babies += 1; } },
  libreta:   { name: 'Libreta de Almacén', icon: '📒', max: 3, desc: '+20% de experiencia', apply: (p) => { p.growth += 0.2; } },
};

// ---------- Bichos (sprites de Zombolito) ----------
// hp a nivel de amenaza 1 · spd = px/s hacia abajo · r = radio de choque · dmg = daño/s a la barricada
const ENEMIES = {
  caminante: { name: 'Caminante', sprite: 'caminante', hp: 30, spd: 15, r: 19, dmg: 4, xp: 1 },
  corredor:  { name: 'Corredor', sprite: 'corredor', hp: 20, spd: 30, r: 17, dmg: 4, xp: 1 },
  rata:      { name: 'Rata', sprite: 'rata', hp: 10, spd: 40, r: 13, dmg: 2, xp: 1, small: true },
  esqueleto: { name: 'Esqueleto', sprite: 'esqueleto', hp: 26, spd: 22, r: 18, dmg: 5, xp: 1, undead: true },
  gordo:     { name: 'Gordo', sprite: 'gordo', hp: 110, spd: 10, r: 27, dmg: 9, xp: 4, big: true },
  escupidor: { name: 'Escupidor', sprite: 'escupidor', hp: 40, spd: 12, r: 19, dmg: 3, xp: 2, spit: true },
  explosivo: { name: 'Explosivo', sprite: 'explosivo', hp: 36, spd: 18, r: 20, dmg: 0, xp: 2, explode: true },
  chillon:   { name: 'Chillón', sprite: 'chillon', hp: 45, spd: 15, r: 19, dmg: 4, xp: 2, screamer: true },
  soldado:   { name: 'Soldado', sprite: 'soldado', hp: 120, spd: 13, r: 20, dmg: 7, xp: 4, armor: 0.35 },
  lobizon:   { name: 'Lobizón', sprite: 'lobizon', hp: 70, spd: 26, r: 20, dmg: 8, xp: 3, undead: true, lunge: true },
  vampiro:   { name: 'Vampiro', sprite: 'vampiro', hp: 80, spd: 14, r: 19, dmg: 6, xp: 3, undead: true, healer: true },
  mutante:   { name: 'Mutante', sprite: 'mutante', hp: 220, spd: 9, r: 27, dmg: 10, xp: 6, regen: 0.02, big: true },
  viuda:     { name: 'La Viuda', sprite: 'viuda', hp: 60, spd: 18, r: 19, dmg: 5, xp: 3, undead: true, ghost: true },
  pombero:   { name: 'El Pombero', sprite: 'ladron', hp: 90, spd: 34, r: 18, dmg: 0, xp: 8, thief: true },
  // jefes
  tanque:    { name: 'EL TANQUE', sprite: 'tanque', hp: 2600, spd: 6, r: 46, dmg: 20, xp: 40, boss: true },
  dama:      { name: 'LA DAMA DE BLANCO', sprite: 'dama', hp: 3200, spd: 7, r: 42, dmg: 18, xp: 50, boss: true, undead: true, summon: 'viuda' },
  mutanteJ:  { name: 'EL PACIENTE CERO', sprite: 'mutante', hp: 3600, spd: 6, r: 48, dmg: 22, xp: 50, boss: true, regen: 0.004, summon: 'rata' },
  mandinga:  { name: 'MANDINGA', sprite: 'mandinga', hp: 4500, spd: 6, r: 46, dmg: 30, xp: 80, boss: true, summon: 'lobizon', spit: true },
  ucumar:    { name: 'EL UCUMAR', sprite: 'ucumar', hp: 1400, spd: 8, r: 40, dmg: 16, xp: 25, boss: true },
  chancho:   { name: 'EL HOMBRE CHANCHO', sprite: 'chancho', hp: 1200, spd: 9, r: 38, dmg: 14, xp: 25, boss: true },
  futre:     { name: 'EL FUTRE', sprite: 'futre', hp: 1600, spd: 8, r: 38, dmg: 16, xp: 25, boss: true, undead: true },
};

// ---------- Escenarios ----------
// rows = cada cuánto baja una fila nueva (s) · len = duración de la noche (s) hasta el jefe final
// pool = probabilidades de bichos · mini = jefe de mitad · jefe = jefe final · decor = props a los costados
const STAGES = [
  { id: 'barrio', depth: 'Nivel 1', name: 'El Barrio', desc: 'Pasto, asfalto y los primeros vecinos que se levantan.', ground: 'pasto', tint: '#1f2a1a',
    len: 300, hpMul: 0.8, pool: { caminante: 10, corredor: 4, rata: 2, gordo: 1.5, explosivo: 1 }, late: { escupidor: 2, chillon: 1 },
    mini: 'chancho', jefe: 'tanque', decor: ['arbol', 'arbusto'], reward: 40, drops: { madera: 3, ladrillo: 1, trigo: 0.5 },
    planos: ['trigal', 'cuartel', 'mercado', 'abuela', 'plazoleta', 'fusiones'] },
  { id: 'cementerio', depth: 'Nivel 2', name: 'Cementerio', desc: 'Tierra, tumbas y esqueletos. La Dama de Blanco te espera.', ground: 'tierra', tint: '#1d1a17',
    len: 300, hpMul: 1.3, pool: { caminante: 6, esqueleto: 6, viuda: 3, lobizon: 2, gordo: 1.5, explosivo: 1 }, late: { vampiro: 2, chillon: 1.5, pombero: 0.4 },
    mini: 'futre', jefe: 'dama', decor: ['tumba', 'arbolSeco'], reward: 80, drops: { madera: 1, ladrillo: 3, trigo: 1 },
    planos: ['gomeria', 'escuela', 'biblioteca', 'chatarreria', 'quiniela', 'feria', 'escuelita'] },
  { id: 'hospital', depth: 'Nivel 3', name: 'Hospital', desc: 'Baldosas, camillas y lo que salió del laboratorio.', ground: 'baldosa', tint: '#1c1f1f',
    len: 320, hpMul: 1.45, pool: { corredor: 4, escupidor: 2, caminante: 7, mutante: 1.5, soldado: 2, rata: 2 }, late: { vampiro: 2, explosivo: 2, pombero: 0.5 },
    mini: 'ucumar', jefe: 'mutanteJ', decor: ['arbusto'], reward: 130, drops: { madera: 1, ladrillo: 2, trigo: 3 },
    planos: ['laboratorio', 'almacen', 'parroquia', 'herreria', 'usina'] },
  { id: 'frigorifico', depth: 'Nivel 4', name: 'El Frigorífico', desc: 'Donde empezó todo. Abajo de las cámaras, Mandinga.', ground: 'metal', tint: '#1a1f24',
    len: 340, hpMul: 1.9, pool: { rata: 4, soldado: 4, mutante: 2, lobizon: 3, vampiro: 2, explosivo: 2, escupidor: 1.5, caminante: 3 }, late: { gordo: 2, chillon: 2, pombero: 0.6 },
    mini: 'ucumar', jefe: 'mandinga', decor: ['arbolSeco'], reward: 200, drops: { madera: 2, ladrillo: 2, trigo: 2 },
    planos: ['sala', 'rancho', 'ruca', 'club', 'salamanca'] },
];

// ---------- Recursos ----------
// oro (monedas), madera, ladrillos y trigo. Caen de los bichos y salen de la cosecha del barrio.
const RES = {
  oro:      { name: 'Oro', icon: '🪙', col: '#f2c641' },
  madera:   { name: 'Madera', icon: '🪓', col: '#a8723a' },
  ladrillo: { name: 'Ladrillos', icon: '🧱', col: '#d2643a' },
  trigo:    { name: 'Trigo', icon: '🌾', col: '#e8d27a' },
};
const RES_IDS = Object.keys(RES);

// ---------- Villa Zombolito: el pueblo que reconstruís entre noches ----------
// cat: eco (se cosecha), casa (trae vecinos), guerra (bonus para siempre), util (cambia las reglas)
// cost = recursos del nivel 1 (cada nivel cuesta más) · plano = hace falta encontrar el plano en el Pozo
// prod (eco): qué junta cada golpe en la cosecha y cuánto aguanta (stock por nivel; vuelve a crecer con el tiempo)
// chars (casa): personajes que se mudan · wall/roof/trim: colores del dibujo
const BUILDINGS = {
  // --- Economía ---
  kiosco:    { cat: 'eco', name: 'Kiosco 24 Horas', icon: '🪙', cost: { oro: 10, madera: 6 }, max: 5, desc: 'Se cosecha: da oro.', prod: { res: 'oro', hit: 1, cap: 20 }, wall: '#d8c070', roof: '#c8261f', trim: '#f2c641' },
  aserradero:{ cat: 'eco', name: 'Aserradero', icon: '🪓', cost: { oro: 15 }, max: 5, desc: 'Se cosecha: da madera.', prod: { res: 'madera', hit: 1, cap: 16 }, wall: '#8a6a3a', roof: '#5a4a2a', trim: '#e8a050', thatch: true },
  corralon:  { cat: 'eco', name: 'Corralón de Materiales', icon: '🧱', cost: { oro: 20, madera: 10 }, max: 5, desc: 'Se cosecha: da ladrillos.', prod: { res: 'ladrillo', hit: 1, cap: 12 }, wall: '#9a5a3a', roof: '#5a4a3a', trim: '#e8a050' },
  trigal:    { cat: 'eco', name: 'Trigal', icon: '🌾', cost: { oro: 25, madera: 12 }, max: 5, plano: true, desc: 'Se cosecha: da trigo.', prod: { res: 'trigo', hit: 1, cap: 12 }, garden: true, wall: '#8a6a3a', roof: '#5a8a2a', trim: '#f2c641' },
  // --- Viviendas (cada una trae vecinos para jugar) ---
  comisaria: { cat: 'casa', name: 'Comisaría', icon: '🚨', cost: { oro: 30, madera: 15, ladrillo: 8 }, max: 1, desc: 'Se muda Lichi.', chars: ['policia'], wall: '#3a5a8a', roof: '#2a2a3a', trim: '#57b6ff' },
  salita:    { cat: 'casa', name: 'Salita de Primeros Auxilios', icon: '🩺', cost: { oro: 40, madera: 20, ladrillo: 10 }, max: 1, desc: 'Se muda Salva.', chars: ['medica'], wall: '#d8d4c4', roof: '#3a6ea8', trim: '#c8261f' },
  cuartel:   { cat: 'casa', name: 'Cuartel de Bomberos', icon: '🧯', cost: { oro: 50, madera: 25, ladrillo: 15 }, max: 1, plano: true, desc: 'Se muda Manolito.', chars: ['bombero'], wall: '#b83a2a', roof: '#4a4a4a', trim: '#f2c641' },
  mercado:   { cat: 'casa', name: 'Mercado de Abasto', icon: '🍖', cost: { oro: 50, madera: 20, trigo: 10 }, max: 1, plano: true, desc: 'Se muda La Tana.', chars: ['tana'], wall: '#d8b070', roof: '#a83a2a', trim: '#ffffff' },
  abuela:    { cat: 'casa', name: 'La Casa de la Abuela', icon: '🫖', cost: { oro: 45, madera: 20, trigo: 10 }, max: 1, plano: true, desc: 'Se muda Doña Rosa.', chars: ['abuela'], wall: '#e8c8b0', roof: '#7a3a5a', trim: '#ff8ab0' },
  gomeria:   { cat: 'casa', name: 'Gomería y Taller', icon: '🔧', cost: { oro: 70, madera: 30, ladrillo: 20 }, max: 1, plano: true, desc: 'Se mudan Dimitri y Cacho.', chars: ['mecanico', 'taxista'], wall: '#7a8a94', roof: '#3a4a54', trim: '#f2c641' },
  escuela:   { cat: 'casa', name: 'Escuela N° 1', icon: '📚', cost: { oro: 70, madera: 35, ladrillo: 25 }, max: 1, plano: true, desc: 'Se muda la Profe Marta.', chars: ['marta'], wall: '#e8e0c8', roof: '#8a3a2a', trim: '#57b6ff' },
  laboratorio:{ cat: 'casa', name: 'Laboratorio de la Cooperativa', icon: '🧪', cost: { oro: 90, madera: 30, ladrillo: 30, trigo: 15 }, max: 1, plano: true, desc: 'Se mudan Vera y la Bruja.', chars: ['quimica', 'bruja'], wall: '#c8d8d8', roof: '#4a7a6a', trim: '#7fe04a' },
  almacen:   { cat: 'casa', name: 'Almacén de Ramos Generales', icon: '🏪', cost: { oro: 90, madera: 40, trigo: 20 }, max: 1, plano: true, desc: 'Se mudan el Ekeko y Nati.', chars: ['ekeko', 'nati'], wall: '#d8b070', roof: '#2a6a4a', trim: '#c8261f' },
  parroquia: { cat: 'casa', name: 'Parroquia San Expedito', icon: '⛪', cost: { oro: 110, madera: 40, ladrillo: 40 }, max: 1, plano: true, desc: 'Se mudan el Padre Tito y el Sereno.', chars: ['cura', 'sereno'], church: true, wall: '#e8e4d8', roof: '#5a3a2a', trim: '#f2c641' },
  usina:     { cat: 'casa', name: 'Usina de la Cooperativa', icon: '⚡', cost: { oro: 120, madera: 30, ladrillo: 50 }, max: 1, plano: true, desc: 'Se muda Ervolution.', chars: ['electricista'], wall: '#8a8a7a', roof: '#3a3a3a', trim: '#7ad7ff' },
  sala:      { cat: 'casa', name: 'Sala de Ensayo', icon: '🎸', cost: { oro: 120, madera: 50, ladrillo: 30 }, max: 1, plano: true, desc: 'Se muda Yami.', chars: ['yami'], wall: '#5a6a8a', roof: '#2a2a4a', trim: '#c27bff' },
  rancho:    { cat: 'casa', name: 'Rancho Gaucho', icon: '🐂', cost: { oro: 150, madera: 70, trigo: 40 }, max: 1, plano: true, desc: 'Se mudan Martín Fierro y el Matrero.', chars: ['martinfierro', 'matrero'], thatch: true, wall: '#c8a878', roof: '#8a7a4a', trim: '#5a3a1a' },
  ruca:      { cat: 'casa', name: 'Ruca Mapuche', icon: '🔮', cost: { oro: 150, madera: 80, trigo: 40 }, max: 1, plano: true, desc: 'Se muda la Machi.', chars: ['machi'], thatch: true, wall: '#9a7a5a', roof: '#a8905a', trim: '#57b6ff' },
  salamanca: { cat: 'casa', name: 'La Salamanca', icon: '😈', cost: { oro: 666, madera: 66, ladrillo: 66, trigo: 66 }, max: 1, plano: true, desc: 'Se muda Mandinga. Ahí adentro no se pregunta.', chars: ['mandingaj'], cave: true, wall: '#2a1a1a', roof: '#4a0a0a', trim: '#ff2a1a' },
  // --- Guerra (bonus para todos los personajes) ---
  gimnasio:  { cat: 'guerra', name: 'Gimnasio del Club', icon: '💪', cost: { oro: 25, madera: 10, ladrillo: 5 }, max: 5, desc: '+10% de daño', apply: (p, l) => { p.might += 0.1 * l; }, wall: '#c8b890', roof: '#a83a2a', trim: '#2a5aa8' },
  dispensario:{ cat: 'guerra', name: 'Dispensario', icon: '❤️', cost: { oro: 20, madera: 10 }, max: 5, desc: '+20 de vida máxima', apply: (p, l) => { p.maxHp += 20 * l; }, wall: '#e8e8e0', roof: '#c8261f', trim: '#ffffff' },
  canchita:  { cat: 'guerra', name: 'Canchita de Fútbol 5', icon: '⚽', cost: { oro: 30, madera: 15 }, max: 5, desc: '+10% de velocidad de tiro', apply: (p, l) => { p.fireRate += 0.1 * l; }, field: true, wall: '#3a7a2a', roof: '#e8ecd9', trim: '#ffffff' },
  plazoleta: { cat: 'guerra', name: 'Plazoleta del Mate', icon: '🧉', cost: { oro: 30, madera: 20, trigo: 5 }, max: 5, plano: true, desc: '+0,3 de vida por segundo', apply: (p, l) => { p.regen += 0.3 * l; }, garden: true, wall: '#6a8a3a', roof: '#5a8a2a', trim: '#9bd34a' },
  biblioteca:{ cat: 'guerra', name: 'Biblioteca Popular', icon: '📖', cost: { oro: 35, madera: 20, ladrillo: 10 }, max: 5, plano: true, desc: '+15% de experiencia', apply: (p, l) => { p.growth += 0.15 * l; }, wall: '#c8a888', roof: '#3a5a3a', trim: '#f2c641' },
  quiniela:  { cat: 'guerra', name: 'Agencia de Quiniela', icon: '🎲', cost: { oro: 40, madera: 15, ladrillo: 10 }, max: 5, plano: true, desc: '+15% de suerte y +15% de oro', apply: (p, l) => { p.luck += 0.15 * l; p.greed += 0.15 * l; }, wall: '#2a6a4a', roof: '#1a3a2a', trim: '#f2c641' },
  herreria:  { cat: 'guerra', name: 'Herrería', icon: '⚔', cost: { oro: 45, madera: 20, ladrillo: 20 }, max: 5, plano: true, desc: '+5% de crítico', apply: (p, l) => { p.crit += 0.05 * l; }, wall: '#5a5a5a', roof: '#3a2a2a', trim: '#ff8a3a' },
  chatarreria:{ cat: 'guerra', name: 'Chatarrería', icon: '🧲', cost: { oro: 25, madera: 15 }, max: 5, plano: true, desc: '+20% de imán', apply: (p, l) => { p.pickup += 0.2 * l; }, wall: '#7a6a5a', roof: '#4a3a2a', trim: '#c8261f' },
  escuelita: { cat: 'guerra', name: 'Escuelita de Fútbol', cost: { oro: 50, madera: 25, ladrillo: 10 }, max: 3, plano: true, desc: '+1 pibito: pelotitas extra que salen solas', apply: (p, l) => { p.babies += l; }, field: true, wall: '#3a7a2a', roof: '#e8ecd9', trim: '#f2c641' },
  // --- Utilidad (cambian cómo se juega) ---
  utileria:  { cat: 'util', name: 'Utilería del Club', icon: '🎒', cost: { oro: 40, madera: 20, ladrillo: 10 }, max: 2, desc: '+1 lugar para pelotas en la bolsa', wall: '#5a6a8a', roof: '#2a2a4a', trim: '#c27bff' },
  fusiones:  { cat: 'util', name: 'Taller de Fusiones', icon: '🧬', cost: { oro: 60, madera: 25, ladrillo: 20 }, max: 1, plano: true, desc: 'Con el orbe de fisión vas a poder FUSIONAR y EVOLUCIONAR pelotas.', wall: '#4a3a6a', roof: '#2a1a3a', trim: '#c27bff' },
  feria:     { cat: 'util', name: 'Feria Americana', icon: '🧰', cost: { oro: 80, madera: 30, trigo: 20 }, max: 1, plano: true, desc: 'Antes de cada noche elegís un objeto para arrancar.', wall: '#d8a8a8', roof: '#6a3a5a', trim: '#f2c641' },
  club:      { cat: 'util', name: 'Club Social y Deportivo', icon: '🤝', cost: { oro: 150, madera: 60, ladrillo: 40, trigo: 30 }, max: 1, plano: true, desc: 'Bajás al Pozo de a dos: un compañero suma su pelota y su bonus.', wall: '#e8e0c8', roof: '#2a5aa8', trim: '#c8261f' },
};
const CATS = { eco: 'Economía', casa: 'Viviendas', guerra: 'Guerra', util: 'Utilidad' };
function buildCost(id, lvl) {
  // los dos primeros salen baratos para arrancar; el resto cuesta el doble. Cada nivel, bastante más.
  const c = BUILDINGS[id].cost, k = (1 + lvl * 1.8) * ((id === 'kiosco' || id === 'aserradero') && lvl === 0 ? 1 : 2), out = {};
  for (const r in c) out[r] = Math.round(c[r] * k * (r === 'oro' && k > 1 ? 0.7 : 1));
  return out;
}
// el pueblo: grilla de 5×5 terrenos; el del medio es la plaza; al principio solo están libres los 8 de alrededor
const BASE_COLS = 5, BASE_ROWS = 5, BASE_PLAZA = 12;
const BASE_START = [6, 7, 8, 11, 13, 16, 17, 18];
function clearCost(n) { return { oro: 25 + n * 25, madera: 8 + n * 8, ladrillo: n * 5 }; }
const FREE_CHARS = ['pibe'];
const START_SLOTS = 3;
// cosecha: el stock de cada edificio de economía se llena del todo en este tiempo (tiempo real)
const REGROW_MS = 4 * 60 * 1000;
const HARVEST_TIME = 18;

// ---------- La historia ----------
const STORY = {
  intro: [
    { icon: '🌫️', title: 'Después de la Niebla', text: 'La noche del Frigorífico se terminó, pero la Niebla no se fue. Sale de un pozo que abrió la Luz Mala debajo de la planta de Laboratorios Mandinga, y cada noche sube con algo nuevo.' },
    { icon: '🏘️', title: 'Villa Zombolito', text: 'Del pueblo quedó la plaza y poco más. El Pibe juntó a los que pudo, armó una barricada con bolsas de arena y prendió un fuego en la fuente seca.' },
    { icon: '⚽', title: 'El Pozo', text: 'Los bichos suben en fila, como si los llamara alguien. Con balas no alcanza. El Pibe descubrió que una pelota que rebota pega diez veces. Ahora bajan todas las noches.' },
    { icon: '🧱', title: 'Levantar el pueblo', text: 'De cada bajada se trae lo que se puede: oro, madera, ladrillos, trigo. Y a veces, entre los escombros, un plano de lo que fue el pueblo. Con eso, de a poco, Villa Zombolito vuelve a tener vecinos.' },
  ],
  // cuando ganás una noche por primera vez
  chapters: {
    barrio: { title: 'Primera bajada', text: 'El Tanque era el carnicero. Lo bajaste con una pelota de potrero. En el bolsillo del delantal tenía un llavero de Laboratorios Mandinga: "Nivel -1, Cementerio".' },
    cementerio: { title: 'Los que no descansan', text: 'La Dama de Blanco no venía del hospital: estaba enterrada acá. Alguien la sacó. En la tumba vacía había una ficha médica: "Paciente cero. Trasladar a la guardia".' },
    hospital: { title: 'La guardia', text: 'El Paciente Cero se deshizo en el piso de la guardia. Su ficha decía Frigorífico La Patria, sector cámaras. El Pozo sigue para abajo, justo ahí.' },
    frigorifico: { title: 'El fondo del Pozo', text: 'Mandinga se rió hasta el final. "Ustedes levantan el pueblo, yo levanto a los muertos. Vamos a ver quién se cansa primero." La Niebla bajó un poco. Un poco.' },
  },
  // lo que dicen los vecinos cuando se mudan
  moveIn: {
    policia: 'Lichi: «Traje la escopeta pero ya vi que acá se juega a la pelota. Bueno.»',
    medica: 'Salva: «Primeros auxilios, segundos auxilios, lo que haga falta.»',
    bombero: 'Manolito: «Si algo se prende fuego, me avisan. Si no, también.»',
    tana: 'La Tana: «La cuchilla la afilé con un ladrillo del corralón. Gracias.»',
    abuela: 'Doña Rosa: «¿Comieron? No me importa si están muertos, ¿comieron?»',
    mecanico: 'Dimitri: «Una sierra circular es una rueda que se enojó.»',
    taxista: 'Cacho: «Hago Villa Zombolito – el Pozo ida y vuelta, precio fijo.»',
    marta: 'Profe Marta: «Mañana prueba escrita. De supervivencia.»',
    quimica: 'Vera: «El VITALIX lo hice yo. Ya sé. Por eso estoy acá.»',
    bruja: 'La Bruja: «La Salamanca queda abajo del Pozo. No pregunten cómo sé.»',
    ekeko: 'El Ekeko: «Cada cosa que me traen, la multiplico. Casi siempre.»',
    nati: 'Nati: «Delivery al Pozo en 15 minutos o es gratis.»',
    cura: 'Padre Tito: «Agua bendita hay. Lo que falta es fe en la defensa.»',
    sereno: 'El Sereno: «Yo de noche no duermo. Nunca dormí. Ahora sirve.»',
    electricista: 'Ervolution: «Le conecté la usina al taser. No me pidan que lo desenchufe.»',
    yami: 'Yami: «Hagan lo que quieran pero el ensayo es a las diez.»',
    martinfierro: 'Martín Fierro: «Aquí me pongo a cantar, al compás de la vigüela…»',
    matrero: 'El Matrero: «Yo con las boleadoras y nada más. No me ofrezcan otra cosa.»',
    machi: 'La Machi: «El kultrún escucha al Pozo. Hoy está enojado.»',
    mandingaj: 'Mandinga: «¿Sorprendidos? Yo también vivo acá, che.»',
  },
};

// ---------- Rasgos: cada personaje cambia una regla del juego (no solo un número) ----------
const CHAR_TRAITS = {
  pibe:         { trait: 'rebote', perk: 'Cada rebote de una pelota suma +8% de daño (hasta +80%).', mods: {} },
  policia:      { trait: 'rafaga', perk: 'Cada 8 tiros sale una ráfaga de 3 pelotas en abanico.', mods: {} },
  bombero:      { trait: 'manguera', perk: 'Las pelotas rebotan una vez en el piso antes de volver. +20 de vida.', mods: { maxHp: 20 } },
  medica:       { trait: 'atrapada', perk: 'Cada pelota que atrapás te cura 2.', mods: {} },
  mecanico:     { trait: 'taladro', perk: 'Todas las pelotas atraviesan al primer bicho que tocan.', mods: {} },
  quimica:      { trait: 'contagio', perk: 'Si muere un bicho prendido fuego, el fuego salta a los de al lado.', mods: {} },
  electricista: { trait: 'chispazo', perk: 'Cada 8 golpes, un rayo salta a 3 bichos.', mods: {} },
  abuela:       { trait: 'mimos', perk: 'Siempre elegís entre 4 cartas y tenés 1 cambio más.', mods: { rerolls: 1 } },
  taxista:      { trait: 'tarifa', perk: '+50% de oro y materiales, pero -15 de vida.', mods: { maxHp: -15 } },
  tana:         { trait: 'carnicera', perk: 'Los críticos hacen sangrar. +5% de crítico.', mods: { crit: 0.05 } },
  marta:        { trait: 'pizarron', perk: 'Las gemas vienen solas a tu mano y das +15% de experiencia.', mods: { growth: 0.15 } },
  yami:         { trait: 'pogo', perk: 'Cada 12 pelotas que vuelven, un acorde empuja a todos los bichos de la barricada.', mods: {} },
  nati:         { trait: 'gps', perk: 'Todas las pelotas se teledirigen un poco. +10% de velocidad.', mods: { speed: 0.1 } },
  cura:         { trait: 'bendicion', perk: 'Los no-muertos revientan en agua bendita al morir.', mods: {} },
  ekeko:        { trait: 'abundancia', perk: 'Los bichos sueltan el doble de botín, pero -20 de vida.', mods: { maxHp: -20 } },
  bruja:        { trait: 'maleficio', perk: 'El veneno se contagia a los de al lado cuando muere el bicho.', mods: {} },
  martinfierro: { trait: 'payada', perk: 'Los críticos pegan x4. +5% de crítico.', mods: { crit: 0.05 } },
  matrero:      { trait: 'boleador', perk: 'DESAFÍO: una sola pelota en toda la partida, pero pega el doble y sale 30% más rápido.', mods: { might: 1, fireRate: 0.3 } },
  sereno:       { trait: 'ronda', perk: '+50% de daño a élites y jefes.', mods: {} },
  machi:        { trait: 'kultrun', perk: 'Cada pelota tiene 25% de chance de dividirse en 2 al primer golpe.', mods: {} },
  mandingaj:    { trait: 'pacto', perk: '+40% de daño y +1 pelota por tipo, pero la mitad de la vida.', mods: { might: 0.4, balls: 1 } },
};
for (const c of CHARACTERS) if (CHAR_TRAITS[c.id]) Object.assign(c, CHAR_TRAITS[c.id]);

// ---------- Stats de los personajes (suben con el nivel y entrenando) ----------
const STATS = {
  agu: { name: 'Aguante', short: 'AGU', desc: '+12 de vida por punto' },
  fue: { name: 'Fuerza', short: 'FUE', desc: '+6% de daño directo por punto' },
  man: { name: 'Maña', short: 'MAÑ', desc: '+8% de daño de fuego, veneno, sangrado y pelotitas' },
  lid: { name: 'Liderazgo', short: 'LID', desc: 'Más pibitos: pelotitas que salen solas' },
  vel: { name: 'Velocidad', short: 'VEL', desc: '+4% de tiro y +3% al caminar' },
  pun: { name: 'Puntería', short: 'PUN', desc: '+1,5% de crítico y +5% de daño crítico' },
};
const STAT_IDS = Object.keys(STATS);
// En qué crece cada uno (pesos): de ahí salen los puntos de cada nivel.
const CHAR_PROFILE = {
  pibe: { vel: 3, lid: 2, agu: 1, fue: 1, pun: 1 }, policia: { pun: 3, fue: 2, vel: 2, agu: 1 }, bombero: { agu: 4, fue: 3, vel: 1 },
  medica: { agu: 2, man: 3, lid: 2, vel: 1 }, mecanico: { fue: 2, man: 2, agu: 2, pun: 2 }, quimica: { man: 4, lid: 2, vel: 1, agu: 1 },
  electricista: { man: 3, vel: 2, pun: 2, lid: 1 }, abuela: { lid: 4, agu: 2, man: 1, pun: 1 }, taxista: { vel: 3, agu: 2, pun: 2, fue: 1 },
  tana: { fue: 4, pun: 2, agu: 2 }, marta: { lid: 3, man: 2, pun: 2, vel: 1 }, yami: { man: 2, vel: 3, lid: 2, fue: 1 },
  nati: { vel: 4, lid: 2, pun: 2 }, cura: { agu: 3, man: 3, lid: 2 }, ekeko: { lid: 3, agu: 2, man: 2, pun: 1 },
  bruja: { man: 4, lid: 2, pun: 1, agu: 1 }, martinfierro: { pun: 4, fue: 3, vel: 1 }, matrero: { fue: 4, vel: 2, pun: 2 },
  sereno: { agu: 2, pun: 3, fue: 2, man: 1 }, machi: { lid: 3, man: 3, agu: 2 }, mandingaj: { fue: 4, man: 3, pun: 1 },
};
const MAX_HERO_LVL = 25;
// experiencia para pasar del nivel L al L+1: el 2 sale en 2-3 partidas, después cada uno cuesta más
function xpNeed(L) { return Math.round(60 * Math.pow(L, 1.4)); }
// hitos: a nivel 5 y 10 el personaje arranca con su pelota más subida
function startBallLvl(L) { return L >= 10 ? 3 : L >= 5 ? 2 : 1; }
// Puntos de cada stat a un nivel: 6 al arrancar + 3 por nivel, repartidos según el perfil.
function statsAtLevel(chId, L) {
  const w = CHAR_PROFILE[chId] || { agu: 1, fue: 1, vel: 1 };
  const tot = Object.values(w).reduce((a, b) => a + b, 0), pts = 6 + (L - 1) * 3, out = {};
  let given = 0;
  const rem = [];
  for (const s of STAT_IDS) { const exact = (w[s] || 0) / tot * pts; out[s] = Math.floor(exact); given += out[s]; rem.push([exact - out[s], s]); }
  rem.sort((a, b) => b[0] - a[0]);
  for (let i = 0; given < pts; i++, given++) out[rem[i % rem.length][1]]++;
  return out;
}
// entrenar: +1 punto en un stat; cada entrenamiento de ese personaje sale más caro
function trainCost(n) { return { oro: 30 + n * 25, trigo: 4 + n * 4 }; }

// ---------- Figuritas (sobres del Kiosco) ----------
// Las de vecinos dan experiencia a ese personaje; las de bichos llenan el álbum. Cada figurita distinta: +1% de daño para todos.
const SOBRE_COST = { oro: 40 };
const FIGU_CHAR_XP = 25;
// bichos del Pozo con su ficha en la historia de Zombolito (js/lore.js); clave = tipo en ENEMIES, valor = clave en LORE
const LORE_KEY = { esqueleto: 'perro', pombero: 'ladron', mutanteJ: 'paciente0' };
function loreKey(type) { return LORE_KEY[type] || type; }
