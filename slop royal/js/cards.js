'use strict';

/* ===== Card definitions =====
   Troops: hp/dmg/hitSpeed/range/speed/radius/sight in tile units.
   targets: 'both' = units+towers, 'buildings' = towers only.
   Spells deal reduced damage to towers via towerFactor.            */
const CARDS = {
  knight: {
    name: 'Knight', glyph: '🗡️', cost: 3, count: 1, accent: '#8d6e63',
    hp: 640, dmg: 80, hitSpeed: 1.1, range: 0.8, speed: 1.0, radius: 0.45,
    sight: 5.5, targets: 'both',
  },
  archers: {
    name: 'Archers', glyph: '🏹', cost: 3, count: 2, accent: '#7cb342',
    hp: 130, dmg: 42, hitSpeed: 0.9, range: 5.0, speed: 1.0, radius: 0.32,
    sight: 5.5, targets: 'both', projectile: true,
  },
  goblins: {
    name: 'Goblins', glyph: '👺', cost: 2, count: 3, accent: '#43a047',
    hp: 100, dmg: 47, hitSpeed: 1.1, range: 0.5, speed: 1.6, radius: 0.28,
    sight: 5.0, targets: 'both', isGoblin: true,
  },
  giant: {
    name: 'Giant', glyph: '🗿', cost: 5, count: 1, accent: '#bf8f5f',
    hp: 2100, dmg: 120, hitSpeed: 1.5, range: 0.9, speed: 0.72, radius: 0.65,
    sight: 5.5, targets: 'buildings',
  },
  musketeer: {
    name: 'Musketeer', glyph: '🔫', cost: 4, count: 1, accent: '#5c6bc0',
    hp: 360, dmg: 105, hitSpeed: 1.0, range: 6.0, speed: 1.0, radius: 0.36,
    sight: 6.5, targets: 'both', projectile: true,
  },
  minipekka: {
    name: 'Mini P.E.K.K.A', glyph: '⚔️', cost: 4, count: 1, accent: '#455a64',
    hp: 620, dmg: 330, hitSpeed: 1.8, range: 0.8, speed: 1.25, radius: 0.45,
    sight: 5.5, targets: 'both',
  },
  wizard: {
    name: 'Wizard', glyph: '🧙', cost: 5, count: 1, accent: '#e64a19',
    hp: 350, dmg: 130, hitSpeed: 1.4, range: 5.5, speed: 1.0, radius: 0.36,
    sight: 6.0, targets: 'both', projectile: true, splash: 1.6, towerFactor: 0.4,
  },
  fireball: {
    name: 'Fireball', glyph: '☄️', cost: 4, spell: true, accent: '#ff7043',
    dmg: 300, radius: 2.2, towerFactor: 0.4,
  },
  bandit: {
    name: 'Bandit', glyph: '🃏', cost: 4, count: 1, accent: '#7e57c2',
    hp: 350, dmg: 160, hitSpeed: 1.6, range: 0.8, speed: 1.7, radius: 0.4,
    sight: 6.0, targets: 'both', dash: true, dashRange: 4, dashWindup: 0.6,
  },
  skarmy: {
    name: 'Skeleton Army', glyph: '💀', cost: 3, count: 15, accent: '#bdbdbd',
    hp: 45, dmg: 32, hitSpeed: 1.0, range: 0.4, speed: 1.6, radius: 0.4,
    sight: 5.0, targets: 'both', isGoblin: false,
  },
  goblinbarrel: {
    name: 'Goblin Barrel', glyph: '🛢️', cost: 3, barrel: true, accent: '#8d6e63',
    count: 3,
  },
  saintgoblinator: {
    name: 'Saint Goblinator', glyph: '😇', cost: 4, count: 1, accent: '#ffc94d',
    hp: 750, dmg: 40, hitSpeed: 1.0, range: 2.5, speed: 0.6, radius: 0.5,
    sight: 6.0, targets: 'both', saint: true, splash: 1.6,
    projectile: true,
  },
  slopmaster: {
    name: 'Slop Master', glyph: '🥣', cost: 6, count: 1, accent: '#607d8b',
    hp: 1000, dmg: 0, hitSpeed: 1.0, range: 0, speed: 1.3, radius: 0.55,
    sight: 99, targets: 'none', slop: true, grabChannel: 3, towerChannel: 8,
    carrySpeed: 2.5,
  },
  /* ===== Insane cards (not in normal rotation) ===== */
  hellfire: {
    name: 'Hellfire', glyph: '🔥', cost: 12, spell: true, accent: '#ff3d00',
    dmg: 0, radius: 0, towerFactor: 0, insane: true,
    bolts: 69,
  },
  colossus: {
    name: 'Colossus', glyph: '🪨', cost: 9, count: 1, accent: '#5d4037',
    hp: 10000, dmg: 4000, hitSpeed: 3.0, range: 1.0, speed: 0.1, radius: 1.2,
    sight: 5.5, targets: 'buildings', insane: true,
  },
  springfack: {
    name: 'Spring Fack', glyph: '🐸', cost: 2, count: 1, accent: '#8bc34a',
    hp: 60, dmg: 50, hitSpeed: 0.4, range: 0.3, speed: 0, radius: 0.22,
    sight: 5.0, targets: 'none', insane: true, springFack: true,
    hopRadius: 4, maxHops: 20, hopCooldown: 1,
  },
  tsunami: {
    name: 'Tsunami', glyph: '🌊', cost: 7, spell: true, accent: '#0288d1',
    dmg: 0, radius: 0, towerFactor: 0, insane: true,
    waveSpeed: 5, sweepForce: 8,
  },
  halftower: {
    name: 'Half Tower', glyph: '🧱', cost: 15, count: 1, accent: '#78909c',
    hp: 700, dmg: 0, hitSpeed: 0, range: 0, speed: 0, radius: 0.95,
    sight: 0, targets: 'none', insane: true, halfTower: true,
  },
  bigot: {
    name: 'Bigot', glyph: '🗣️', cost: 1, count: 1, accent: '#ff9800',
    hp: 30, dmg: 0, hitSpeed: 0, range: 0, speed: 3.0, radius: 0.3,
    sight: 99, targets: 'none', insane: true, bigot: true,
  },
  harden: {
    name: 'Harden', glyph: '🗿', cost: 5, spell: true, accent: '#607d8b',
    dmg: 0, radius: 2.5, towerFactor: 0, insane: true,
    hpMult: 5,
  },
  snowman: {
    name: 'Snowman', glyph: '⛄', cost: 3, count: 1, accent: '#b3e5fc',
    hp: 200, dmg: 0, hitSpeed: 0, range: 0, speed: 0, radius: 0.4,
    sight: 0, targets: 'none', insane: true, snowman: true,
    meltTime: 6, crippleSlow: 0.3, puddleRadius: 1.8,
  },
  /* ===== New Clash Royale cards ===== */
  witch: {
    name: 'Witch', glyph: '🧙‍♀️', cost: 5, count: 1, accent: '#9c27b0',
    hp: 600, dmg: 65, hitSpeed: 1.0, range: 5.0, speed: 0.9, radius: 0.4,
    sight: 6.0, targets: 'both', projectile: true,
    witch: true, spawnInterval: 7, spawnKey: 'skarmy',
  },
  babydragon: {
    name: 'Baby Dragon', glyph: '🐉', cost: 4, count: 1, accent: '#4caf50',
    hp: 800, dmg: 100, hitSpeed: 1.5, range: 3.5, speed: 1.4, radius: 0.5,
    sight: 5.5, targets: 'both', flying: true, projectile: true,
    splash: 1.2, towerFactor: 0.6,
  },
  minions: {
    name: 'Minions', glyph: '🦇', cost: 3, count: 3, accent: '#7e57c2',
    hp: 85, dmg: 45, hitSpeed: 1.0, range: 2.0, speed: 1.6, radius: 0.3,
    sight: 5.5, targets: 'both', flying: true, projectile: true,
  },
  hunter: {
    name: 'Hunter', glyph: '🎯', cost: 4, count: 1, accent: '#ff5722',
    hp: 520, dmg: 60, hitSpeed: 1.3, range: 2.5, speed: 1.0, radius: 0.42,
    sight: 5.5, targets: 'both', shotgun: true, pellets: 8,
  },
  /* ===== Insane cards — Spy, Green, Bomb Tray ===== */
  spy: {
    name: 'Spy', glyph: '🕵️', cost: 3, count: 1, accent: '#455a64',
    hp: 240, dmg: 40, hitSpeed: 0.5, range: 0.6, speed: 1.5, radius: 0.32,
    sight: 6.5, targets: 'both', insane: true, spy: true,
  },
  green: {
    name: 'Green', glyph: '🟢', cost: 13, spell: true, accent: '#39d353',
    dmg: 0, radius: 2.3, towerFactor: 0, insane: true, greenSpell: true,
  },
  bombtray: {
    name: 'Big Bomb Burger', glyph: '🍔', cost: 5, count: 1, accent: '#ff9800',
    hp: 9999, dmg: 0, hitSpeed: 0, range: 0, speed: 0, radius: 0.5,
    sight: 2.5, targets: 'none', insane: true, bombTray: true,
    trayTimer: 9, fireballDmg: 300, fireballRadius: 2.2,
  },
};

const DECK = Object.keys(CARDS).filter(k => !CARDS[k].insane);
const INSANE_DECK = Object.keys(CARDS).filter(k => CARDS[k].insane);
const DECK_SIZE = 8;                   // cards per battle deck

/* Shuffle a deck; `keys` defaults to every card (sandbox). Battle decks
   pass the player's chosen 8 keys. */
function shuffledDeck(keys) {
  const d = (keys || DECK).slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/* Spawn formations per unit count (grid layout for anything beyond 3) */
const SPAWN_OFFSETS = {
  1: [[0, 0]],
  2: [[-0.55, 0], [0.55, 0]],
  3: [[0, -0.55], [-0.6, 0.4], [0.6, 0.4]],
};

function spawnOffsets(count) {
  if (SPAWN_OFFSETS[count]) return SPAWN_OFFSETS[count];
  const offs = [];
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  for (let i = 0; i < count; i++) {
    const cx = i % cols, cy = Math.floor(i / cols);
    offs.push([(cx - (cols - 1) / 2) * 0.42, (cy - (rows - 1) / 2) * 0.42]);
  }
  return offs;
}

/* ===== Tower stats ===== */
const TOWER_STATS = {
  princess: { hp: 1400, dmg: 55, hitSpeed: 0.8, range: 7.5, radius: 0.95 },
  king:     { hp: 2600, dmg: 60, hitSpeed: 1.0, range: 7.0, radius: 1.25 },
};
