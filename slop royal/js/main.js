'use strict';

/* ===== Fix mobile viewport height (accounts for browser chrome) ===== */
function setVh() {
  const vh = (window.visualViewport ? window.visualViewport.height : window.innerHeight) * 0.01;
  document.documentElement.style.setProperty('--vh', vh + 'px');
}
setVh();
window.addEventListener('resize', setVh);
if (window.visualViewport) window.visualViewport.addEventListener('resize', setVh);

/* ===== DOM refs ===== */
const cv = document.getElementById('game');
const el = {
  timer: document.getElementById('timer'),
  phase: document.getElementById('phase-label'),
  crownsBlue: document.getElementById('crowns-blue'),
  crownsRed: document.getElementById('crowns-red'),
  hand: document.getElementById('hand'),
  next: document.getElementById('next-card'),
  elixirFill: document.getElementById('elixir-fill'),
  elixirNum: document.getElementById('elixir-num'),
  overlay: document.getElementById('overlay'),
  ovTitle: document.getElementById('ov-title'),
  ovBody: document.getElementById('ov-body'),
  ovBtn: document.getElementById('ov-btn'),
  ovBtn2: document.getElementById('ov-btn2'),
  ovBtn3: document.getElementById('ov-btn3'),
  deckScreen: document.getElementById('deck-screen'),
  deckGrid: document.getElementById('deck-grid'),
  deckCount: document.getElementById('deck-count'),
  deckSave: document.getElementById('deck-save'),
  deckBack: document.getElementById('deck-back'),
  bottombar: document.getElementById('bottombar'),
  sbCards: document.getElementById('sb-cards'),
  sbPause: document.getElementById('sb-pause'),
  deckRandom: document.getElementById('deck-random'),
  deckInsane: document.getElementById('deck-insane'),
};
let insaneToggle = false; // include insane cards in deck randomizer

/* ===== Game state ===== */
let units = [], towers = [], projectiles = [], effects = [];
let puddles = [], tsunamiWaves = [];
let crowns = { blue: 0, red: 0 };
let timeLeft = MATCH_TIME;
let suddenDeath = false;
let doubleElixir = false;
let tiebreaker = false;
// Enemy-lane deploy zones unlocked by destroying princess towers
let unlockedLanes = {
  blue: { left: false, right: false },
  red: { left: false, right: false },
};
let gameState = 'menu';                 // menu | playing | ended
let player = { elixir: 5, hand: [], queue: [] };
let ai = new AIController();
let selectedIdx = null;
let hover = null;
// Global match clock (drives blessings and other timed effects)
let gameClock = 0;
// Sandbox mode: no AI/clock, free spawning of any card as any team
let sandbox = false;
let paused = false;
let sandboxSel = null;
let sandboxTeam = TEAM_BLUE;

/* ===== Deck management =====
   The battle deck is exactly DECK_SIZE cards, picked in the deck menu and
   persisted to localStorage. Both the player and the AI draw from it. */
const DECK_STORAGE_KEY = 'slop-royale-deck';

function loadSavedDeck() {
  try {
    const saved = JSON.parse(localStorage.getItem(DECK_STORAGE_KEY));
    if (Array.isArray(saved) && saved.length === DECK_SIZE && saved.every(k => CARDS[k])) return saved;
  } catch (e) { /* corrupted save — fall through to default */ }
  return DECK.slice(0, DECK_SIZE);
}

let playerDeck = loadSavedDeck();
let deckPick = [];

function openDeckEditor() {
  deckPick = playerDeck.slice();
  buildDeckGrid();
  el.deckScreen.classList.remove('hidden');
}

function closeDeckEditor() { el.deckScreen.classList.add('hidden'); }

function buildDeckGrid() {
  el.deckGrid.innerHTML = '';
  // Normal cards
  for (const key of DECK) {
    const def = CARDS[key];
    const b = document.createElement('div');
    b.className = 'deck-card';
    b.dataset.key = key;
    b.style.setProperty('--accent', def.accent);
    b.innerHTML =
      `<span class="cost">${def.cost}</span>` +
      cardArtHTML(def) +
      `<span class="cname">${def.name}</span>`;
    b.addEventListener('pointerdown', () => toggleDeckCard(key));
    el.deckGrid.appendChild(b);
  }
  // Insane cards section
  if (INSANE_DECK.length > 0) {
    const sep = document.createElement('div');
    sep.style.cssText = 'grid-column:1/-1;text-align:center;color:#ff69b4;font-weight:bold;font-size:11px;padding:6px 0 2px;letter-spacing:1px;';
    sep.textContent = '🧪 INSANE CARDS';
    el.deckGrid.appendChild(sep);
    for (const key of INSANE_DECK) {
      const def = CARDS[key];
      const b = document.createElement('div');
      b.className = 'deck-card';
      b.dataset.key = key;
      b.style.setProperty('--accent', def.accent);
      b.innerHTML =
        `<span class="cost">${def.cost}</span>` +
        cardArtHTML(def) +
        `<span class="cname">${def.name}</span>`;
      b.addEventListener('pointerdown', () => toggleDeckCard(key));
      el.deckGrid.appendChild(b);
    }
  }
  refreshDeckHUD();
}

function toggleDeckCard(key) {
  const i = deckPick.indexOf(key);
  if (i >= 0) deckPick.splice(i, 1);
  else if (deckPick.length < DECK_SIZE) deckPick.push(key);
  refreshDeckHUD();
}

function randomDeck() {
  const pool = insaneToggle ? [...DECK, ...INSANE_DECK] : DECK;
  deckPick = [];
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  deckPick = shuffled.slice(0, DECK_SIZE);
  refreshDeckHUD();
}

function refreshDeckHUD() {
  [...el.deckGrid.children].forEach(c =>
    c.classList.toggle('picked', deckPick.includes(c.dataset.key)));
  el.deckCount.textContent = `${deckPick.length} / ${DECK_SIZE} CARDS`;
  el.deckSave.disabled = deckPick.length !== DECK_SIZE;
}

/* ===== Setup / reset ===== */
function setupTowers() {
  towers = [
    new Tower(TEAM_RED, 'princess', BRIDGES[0], PRINCESS_Y_RED),
    new Tower(TEAM_RED, 'princess', BRIDGES[1], PRINCESS_Y_RED),
    new Tower(TEAM_RED, 'king', ARENA_W / 2, 3),
    new Tower(TEAM_BLUE, 'princess', BRIDGES[0], PRINCESS_Y_BLUE),
    new Tower(TEAM_BLUE, 'princess', BRIDGES[1], PRINCESS_Y_BLUE),
    new Tower(TEAM_BLUE, 'king', ARENA_W / 2, 29),
  ];
}

function resetGame(startPlaying, asSandbox) {
  units = []; projectiles = []; effects = [];
  puddles = []; tsunamiWaves = [];
  crowns = { blue: 0, red: 0 };
  timeLeft = MATCH_TIME;
  suddenDeath = false;
  doubleElixir = false;
  tiebreaker = false;
  unlockedLanes = {
    blue: { left: false, right: false },
    red: { left: false, right: false },
  };
  setupTowers();
  player.elixir = 5;
  player.queue = shuffledDeck(playerDeck);
  player.hand = [];
  for (let i = 0; i < 4; i++) player.hand.push(player.queue.shift());
  ai.reset(playerDeck);
  ai.checkInsaneCards(playerDeck);
  selectedIdx = null;
  hover = null;
  gameClock = 0;
  sandbox = !!asSandbox;
  paused = false;
  sandboxSel = null;
  sandboxTeam = TEAM_BLUE;
  el.sbPause.textContent = '⏸';
  el.bottombar.classList.toggle('sandbox', sandbox);
  if (sandbox) buildSandboxDOM(); else buildHandDOM();
  if (startPlaying) {
    el.overlay.classList.add('hidden');
    gameState = 'playing';
  } else {
    // Menu: keep the overlay visible with its default intro content
    el.ovTitle.textContent = 'SLOP ROYALE';
    el.ovTitle.style.color = '';
    el.ovBtn.textContent = 'BATTLE!';
    gameState = 'menu';
  }
}

/* ===== Card spawning ===== */
function spawnCard(key, team, x, y) {
  const def = CARDS[key];
  if (def.spell) { castSpell(key, team, x, y); return; }
  if (def.barrel) { launchBarrel(key, team, x, y); return; }

  // Bomb Tray: place as a stationary unit on the ground
  if (def.bombTray) {
    const u = new Unit(def, team, clamp(x, 0.4, ARENA_W - 0.4), clamp(y, 0.4, ARENA_H - 0.4));
    units.push(u);
    effects.push(ringEffect(x, y, 0.9, '#ff9800'));
    return;
  }

  // Half Tower: check if another friendly half tower unit is nearby → combine
  if (def.halfTower) {
    let partner = null;
    for (const u of units) {
      if (u.dead || u.team !== team || !u.halfTower) continue;
      if (dist(u, { x, y }) < 3.0) { partner = u; break; }
    }
    if (partner) {
      // Combine into a full princess tower at the midpoint
      const mx = (partner.x + x) / 2;
      const my = (partner.y + y) / 2;
      partner.dead = true; // remove old half
      units = units.filter(u => !u.dead);
      const full = new Tower(team, 'princess', mx, my);
      towers.push(full);
      effects.push(ringEffect(mx, my, 2.0, '#ffd54f'));
      effects.push(popText(mx, my - 1, 'TOWER BUILT!', '#ffd54f'));
      return;
    }
    // No partner — place as a half tower (building that does nothing)
    const u = new Unit(def, team, clamp(x, 0.4, ARENA_W - 0.4), clamp(y, 0.4, ARENA_H - 0.4));
    u.halfTower = true; // mark on instance
    units.push(u);
    effects.push(ringEffect(x, y, 0.9, teamColor(team)));
    return;
  }

  const offs = spawnOffsets(def.count);
  for (const [ox, oy] of offs) {
    units.push(new Unit(
      def, team,
      clamp(x + ox, 0.4, ARENA_W - 0.4),
      clamp(y + oy, 0.4, ARENA_H - 0.4)
    ));
  }
  effects.push(ringEffect(x, y, 0.9, teamColor(team)));
}

function launchBarrel(key, team, x, y) {
  const def = CARDS[key];
  const king = towers.find(t => t.team === team && t.kind === 'king');
  const sx = king ? king.x : x, sy = king ? king.y : y;
  projectiles.push(new Projectile(sx, sy, { x, y }, 0, team, {
    speed: 6.5, size: 0.34, color: '#a0764f', arcHeight: 3,
    onHit: (lx, ly) => {
      effects.push(ringEffect(lx, ly, 0.8, '#8d6e63'));
      const offs = spawnOffsets(def.count);
      for (const [ox, oy] of offs) {
        units.push(new Unit(CARDS.goblins, team,
          clamp(lx + ox, 0.4, ARENA_W - 0.4),
          clamp(ly + oy, 0.4, ARENA_H - 0.4)));
      }
    },
  }));
}

function castSpell(key, team, x, y) {
  const def = CARDS[key];

  // Hellfire: launch N fireballs from the king tower
  if (def.bolts) {
    const king = towers.find(t => t.team === team && t.kind === 'king');
    const sx = king ? king.x : x, sy = king ? king.y : y;
    for (let i = 0; i < def.bolts; i++) {
      const tx = clamp(Math.random() * ARENA_W, 1, ARENA_W - 1);
      const ty = clamp(Math.random() * ARENA_H, 1, ARENA_H - 1);
      const fireDmg = 200 + Math.floor(Math.random() * 200);
      const boltDist = Math.hypot(tx - sx, ty - sy);
      projectiles.push(new Projectile(sx, sy, { x: tx, y: ty }, fireDmg, team, {
        speed: (6 + Math.random() * 1 + boltDist * 0.3) * 0.7,
        splash: 1.2 + Math.random() * 0.8,
        towerFactor: 0.3,
        color: '#db3e00',
        trailColor: '#ff0000',
        size: (0.4 + Math.random() * 0.1) * 1.15,
        arcHeight: 2.5 + Math.random() * 2,
        additive: true,
      }));
    }
    effects.push(ringEffect(sx, sy, 2.0, '#ff3d00'));
    effects.push(popText(sx, sy - 1, 'HELLFIRE!', '#ff3d00'));
    return;
  }

  // Tsunami: spawn a massive wave at the river pushing toward enemy side
  if (def.waveSpeed) {
    const enemyTop = team === TEAM_BLUE;
    const dir = enemyTop ? -1 : 1;  // blue pushes up, red pushes down
    const wy = (RIVER_TOP + RIVER_BOT) / 2;
    tsunamiWaves.push({
      x: ARENA_W / 2, y: wy,
      dir: dir,
      speed: def.waveSpeed,
      force: def.sweepForce,
      r: ARENA_H / 2,
      team: team,
      t: 0,
    });
    effects.push(ringEffect(ARENA_W / 2, wy, 3.0, '#4fc3f7'));
    effects.push(popText(ARENA_W / 2, wy - 1, 'TSUNAMI!', '#0288d1'));
    return;
  }

  // Harden: petrify all units in radius into stone statues
  if (def.hpMult) {
    for (const u of [...units, ...towers]) {
      if (u.dead || u.carriedBy) continue;
      if (u.isTower) continue;
      if (dist(u, { x, y }) > def.radius + u.radius) continue;
      // Stone: lose team, 5x HP, can't move or attack
      u.stone = true;
      u.team = 'stone';
      u.target = null;
      u.wanderTarget = null;
      const oldMax = u.maxHp;
      u.maxHp = u.maxHp * def.hpMult;
      u.hp = u.maxHp;
      // Remove from any slop pinning
      if (u.pinnedBy && u.pinnedBy.slopTarget === u) u.pinnedBy.slopTarget = null;
      u.pinnedBy = null;
      u.blessedUntil = 0;
      effects.push(ringEffect(u.x, u.y, 0.7, '#607d8b'));
    }
    effects.push(ringEffect(x, y, def.radius, '#607d8b'));
    effects.push(popText(x, y - 1, 'STONE!', '#90a4ae'));
    return;
  }

  // Green spell: everything in radius (except towers) joins the green team
  if (def.greenSpell) {
    for (const u of [...units]) {
      if (u.dead || u.isTower || u.team === TEAM_GREEN) continue;
      if (dist(u, { x, y }) > def.radius + (u.radius || 0.3)) continue;
      applyGreen(u);
      u.blessedUntil = 0;
      u.target = null;
      effects.push(ringEffect(u.x, u.y, 0.8, '#b9ffb9'));
    }
    effects.push({ type: 'ring', x, y, r: def.radius, t: 0, dur: 0.6, color: '#ffffff', fill: '#39d353', fillAlpha: 0.35 });
    effects.push(popText(x, y - 1, 'GREEN!', '#b9ffb9'));
    return;
  }

  // Default spell: fireball-like projectile from king tower with arc
  const king = towers.find(t => t.team === team && t.kind === 'king');
  const sx = king ? king.x : x, sy = king ? king.y : y;
  const fbDist = Math.hypot(x - sx, y - sy);
  projectiles.push(new Projectile(sx, sy, { x, y }, def.dmg, team, {
    speed: (7 + fbDist * 0.3) * 0.7, splash: def.radius, towerFactor: def.towerFactor,
    color: '#ff5e00', size: 0.38 * 1.15, arcHeight: 3,
  }));
}

function placementValid(def, x, y, team) {
  team = team || TEAM_BLUE;
  if (x < 0 || x > ARENA_W || y < 0 || y > ARENA_H) return false;
  if (def.spell || def.barrel) return true;
  if (x < 0.4 || x > ARENA_W - 0.4) return false;
  const midX = ARENA_W / 2;
  if (team === TEAM_BLUE) {
    // Own half below the river
    if (y >= RIVER_BOT + 0.4 && y <= ARENA_H - 0.4) return true;
    // Lanes unlocked by destroying enemy princess towers:
    // that side of the enemy half, down to just behind their tower row
    const lanes = unlockedLanes.blue;
    if (lanes.left && x <= midX && y >= PRINCESS_Y_RED - 1 && y <= RIVER_TOP) return true;
    if (lanes.right && x >= midX && y >= PRINCESS_Y_RED - 1 && y <= RIVER_TOP) return true;
  } else {
    if (y <= RIVER_TOP - 0.4 && y >= 0.4) return true;
    const lanes = unlockedLanes.red;
    if (lanes.left && x <= midX && y >= RIVER_BOT && y <= PRINCESS_Y_BLUE + 1) return true;
    if (lanes.right && x >= midX && y >= RIVER_BOT && y <= PRINCESS_Y_BLUE + 1) return true;
  }
  return false;
}

function tryPlace(i, x, y) {
  const key = player.hand[i];
  const def = CARDS[key];
  if (!def) return;
  if (player.elixir < def.cost) { bannerMsg('NOT ENOUGH ELIXIR'); return; }
  if (!placementValid(def, x, y, TEAM_BLUE)) { bannerMsg("CAN'T DEPLOY THERE"); return; }
  player.elixir -= def.cost;
  spawnCard(key, TEAM_BLUE, x, y);
  const played = player.hand[i];
  player.hand[i] = player.queue.shift();
  player.queue.push(played);
  buildHandDOM();
  selectCard(null);
}

/* ===== Hand UI ===== */
function cardArtHTML(def) {
  // Prefer the generated pixel-art sprite (the player is always blue);
  // spells have no sprite, so they keep their emoji glyph
  if (!def.spell && typeof SPRITE_CACHE !== 'undefined') {
    const slug = spriteSlug(def.name);
    if (SPRITE_CACHE[`${slug}_${TEAM_BLUE}`]) {
      return `<img class="glyph-img" src="assets/sprites/${slug}_${TEAM_BLUE}.png" alt="${def.name}">`;
    }
  }
  return `<span class="glyph">${def.glyph}</span>`;
}

function buildHandDOM() {
  el.hand.innerHTML = '';
  player.hand.forEach((key, i) => {
    const def = CARDS[key];
    const d = document.createElement('div');
    d.className = 'card';
    d.dataset.index = i;
    d.style.setProperty('--accent', def.accent);
    d.innerHTML =
      `<span class="cost">${def.cost}</span>` +
      cardArtHTML(def) +
      `<span class="cname">${def.name}</span>`;
    el.hand.appendChild(d);
  });
  const nd = CARDS[player.queue[0]];
  if (nd) el.next.innerHTML = cardArtHTML(nd);
}

function selectCard(i) {
  if (i != null && (i < 0 || i >= player.hand.length)) return;
  selectedIdx = (selectedIdx === i) ? null : i;
}

/* ===== Sandbox mode ===== */
function buildSandboxDOM() {
  el.sbCards.innerHTML = '';
  for (const key of [...DECK, ...INSANE_DECK]) {
    const def = CARDS[key];
    const b = document.createElement('div');
    b.className = 'sb-card';
    b.dataset.key = key;
    b.style.setProperty('--accent', def.accent);
    b.innerHTML =
      `<span class="cost">${def.cost}</span>` +
      cardArtHTML(def) +
      `<span class="cname">${def.name}</span>`;
    b.addEventListener('pointerdown', ev => {
      ev.stopPropagation();
      sandboxSel = (sandboxSel === key) ? null : key;
      [...el.sbCards.children].forEach(c => c.classList.toggle('sel', c.dataset.key === sandboxSel));
    });
    el.sbCards.appendChild(b);
  }
  document.querySelectorAll('.sb-team').forEach(btn => {
    btn.classList.toggle('sel', btn.dataset.team === sandboxTeam);
  });
}

function trySpawnSandbox(x, y) {
  if (!sandboxSel) return;
  let yy = y;
  if (inRiverBand(yy)) yy = yy < (RIVER_TOP + RIVER_BOT) / 2 ? RIVER_TOP - 0.5 : RIVER_BOT + 0.5;
  spawnCard(sandboxSel, sandboxTeam,
    clamp(x, 0.4, ARENA_W - 0.4), clamp(yy, 0.4, ARENA_H - 0.4));
}

function togglePause() {
  if (!sandbox || gameState !== 'playing') return;
  paused = !paused;
  el.sbPause.textContent = paused ? '▶' : '⏸';
}

/* ===== Tower destruction & match end ===== */
function handleTowerDestroyed(t, src) {
  // Ignore deaths that happen after the match result is already decided
  // (e.g. further towers melting in the same frame as a tiebreaker death)
  if (gameState !== 'playing') return;

  effects.push(ringEffect(t.x, t.y, 2.2, '#ffd54f'));
  effects.push(ringEffect(t.x, t.y, 3.2, '#ffd54f'));

  // Crown attribution: blue/red kills earn crowns directly. Green-team
  // kills award a crown to the OPPOSING team (the team the tower belonged to).
  const kt = src && src.team;
  let scorer;
  if (kt === TEAM_BLUE || kt === TEAM_RED) {
    scorer = kt;
  } else if (kt === TEAM_GREEN) {
    scorer = t.team === TEAM_BLUE ? TEAM_RED : TEAM_BLUE;
  } else {
    scorer = null;
  }

  // King Tower down = instant three-crown victory for whoever did it
  if (t.kind === 'king') {
    if (scorer) crowns[scorer] = 3;
    endMatch();
    return;
  }

  // Princess tower: wake the team's King; for blue/red killers also award
  // a crown and unlock that lane of the enemy half for deployments
  const king = towers.find(o => o.team === t.team && o.kind === 'king');
  if (king) king.active = true;
  if (scorer) {
    const lane = t.x < ARENA_W / 2 ? 'left' : 'right';
    unlockedLanes[scorer][lane] = true;
    bannerMsg(scorer === TEAM_BLUE ? 'LANE UNLOCKED!' : 'ENEMY UNLOCKED A LANE!');
    crowns[scorer]++;
  }

  if (suddenDeath || tiebreaker) endMatch();
}

function endMatch() {
  if (sandbox) return;   // sandbox never ends
  if (gameState !== 'playing') return;
  gameState = 'ended';
  let res;
  if (crowns.blue > crowns.red) res = ['VICTORY! 👑', '#7CFC9A'];
  else if (crowns.red > crowns.blue) res = ['DEFEAT…', '#ff8a7a'];
  else res = ['DRAW', '#ffe082'];
  showEnd(res[0], res[1]);
}

function showEnd(title, color) {
  el.ovTitle.textContent = title;
  el.ovTitle.style.color = color;
  el.ovBody.innerHTML =
    `<p>Final crowns — You: <b>${crowns.blue}</b> · Red King: <b>${crowns.red}</b></p>` +
    `<p style="margin-top:6px;opacity:.75">Tap below for a rematch.</p>`;
  el.ovBtn.textContent = 'PLAY AGAIN';
  el.overlay.classList.remove('hidden');
}

/* ===== Update loop ===== */
function update(dt) {
  gameClock += dt;

  if (!sandbox) {
    // Clock
    if (!suddenDeath) {
      timeLeft -= dt;
      if (timeLeft <= DOUBLE_ELIXIR_WINDOW && !doubleElixir) {
        doubleElixir = true;
        bannerMsg('DOUBLE ELIXIR!');
      }
      if (timeLeft <= 0) {
        timeLeft = 0;
        if (crowns.blue !== crowns.red) { endMatch(); return; }
        suddenDeath = true;
        timeLeft = SUDDEN_DEATH_TIME;
        bannerMsg('SUDDEN DEATH!');
      }
    } else if (!tiebreaker) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        tiebreaker = true;
        bannerMsg('TIEBREAKER!');
      }
    }

    // Tiebreaker: every tower melts until the weakest one is destroyed
    if (tiebreaker) {
      for (const t of towers) {
        if (t.dead) continue;
        t.takeDamage(t.maxHp * TIEBREAKER_DRAIN_RATE * dt);
        if (t.dead) break;   // first tower to fall decides the tiebreaker
      }
    }

    // Elixir
    player.elixir = Math.min(MAX_ELIXIR, player.elixir + elixirRate() * dt);

    // AI
    ai.update(dt);
  } else {
    player.elixir = MAX_ELIXIR;   // free spawning
  }

  // Entities
  for (const u of units) u.update(dt);
  separation();
  for (const t of towers) t.update(dt);
  for (const p of projectiles) p.update(dt);
  for (const e of effects) e.t += dt;
  updateTsunamiWaves(dt);
  updatePuddles(dt);

  // Cleanup
  units = units.filter(u => !u.dead);
  projectiles = projectiles.filter(p => !p.dead);
  effects = effects.filter(e => e.t < e.dur);
}

function separation() {
  // Unit vs unit push-apart
  for (let i = 0; i < units.length; i++) {
    const a = units[i];
    if (a.dead) continue;
    for (let j = i + 1; j < units.length; j++) {
      const b = units[j];
      if (b.dead) continue;
      // Skip bomb tray ↔ carrier pairs so the burger stays glued
      if (a.def.bombTray && a.trayCarrier === b) continue;
      if (b.def.bombTray && b.trayCarrier === a) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      let d = Math.hypot(dx, dy);
      const min = a.radius + b.radius;
      if (d < min) {
        if (d < 1e-4) d = 0.01;
        const push = (min - d) / 2;
        const ux = dx / d, uy = dy / d;
        a.x -= ux * push; a.y -= uy * push;
        b.x += ux * push; b.y += uy * push;
      }
    }
  }
  // Units can't overlap towers
  for (const u of units) {
    if (u.dead) continue;
    for (const t of towers) {
      if (t.dead) continue;
      // A Slop Master hauling a tower must ignore its collision, or the
      // push-apart shoves him (and his cargo) off course every frame
      if (u.def.slop && u.slopState === 'carry' && u.slopTarget === t) continue;
      const dx = u.x - t.x, dy = u.y - t.y;
      let d = Math.hypot(dx, dy);
      const min = u.radius + t.radius;
      if (d < min) {
        if (d < 1e-4) d = 0.01;
        u.x = clamp(t.x + dx / d * min, u.radius, ARENA_W - u.radius);
        u.y = clamp(t.y + dy / d * min, u.radius, ARENA_H - u.radius);
      }
    }
  }
}

/* ===== HUD refresh ===== */
function formatTime(s) {
  s = Math.max(0, Math.ceil(s));
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function refreshHUD() {
  el.timer.textContent = sandbox ? '∞' : formatTime(timeLeft);
  el.phase.textContent = sandbox ? (paused ? 'PAUSED' : 'SANDBOX')
    : tiebreaker ? 'TIEBREAKER'
    : suddenDeath ? 'OVERTIME'
    : (doubleElixir ? '2× ELIXIR' : '');
  el.crownsBlue.textContent = crowns.blue;
  el.crownsRed.textContent = crowns.red;
  el.elixirFill.style.width = (player.elixir / MAX_ELIXIR * 100) + '%';
  el.elixirNum.textContent = Math.floor(player.elixir);
  if (!sandbox) {
    [...el.hand.children].forEach((cardEl, i) => {
      const def = CARDS[player.hand[i]];
      if (!def) return;
      cardEl.classList.toggle('poor', def.cost > player.elixir);
      cardEl.classList.toggle('selected', selectedIdx === i);
    });
  }
}

/* ===== Input ===== */
function toTiles(e) {
  const r = cv.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) / r.width * CANVAS_W / TILE,
    y: (e.clientY - r.top) / r.height * CANVAS_H / TILE,
  };
}

cv.addEventListener('pointermove', e => { hover = toTiles(e); });
cv.addEventListener('pointerleave', () => { hover = null; });

cv.addEventListener('pointerdown', e => {
  if (gameState !== 'playing') return;
  const p = toTiles(e);
  hover = p;
  if (sandbox) { trySpawnSandbox(p.x, p.y); return; }
  if (selectedIdx != null) tryPlace(selectedIdx, p.x, p.y);
});

el.hand.addEventListener('pointerdown', e => {
  if (gameState !== 'playing') return;
  const cardEl = e.target.closest('.card');
  if (!cardEl) return;
  selectCard(+cardEl.dataset.index);
});

cv.addEventListener('contextmenu', e => { e.preventDefault(); selectCard(null); });

window.addEventListener('keydown', e => {
  if (gameState !== 'playing') return;
  if (sandbox) {
    if (e.key === 'p' || e.key === 'P' || e.key === ' ') { e.preventDefault(); togglePause(); }
    if (e.key === 'Escape') {
      sandboxSel = null;
      [...el.sbCards.children].forEach(c => c.classList.remove('sel'));
    }
    return;
  }
  if (e.key >= '1' && e.key <= '4') selectCard(+e.key - 1);
  if (e.key === 'Escape') selectCard(null);
});

el.ovBtn.addEventListener('click', () => resetGame(true));
el.ovBtn2.addEventListener('click', () => resetGame(true, true));
el.ovBtn3.addEventListener('click', openDeckEditor);
el.deckBack.addEventListener('click', closeDeckEditor);
el.deckSave.addEventListener('click', () => {
  if (deckPick.length !== DECK_SIZE) return;
  playerDeck = deckPick.slice();
  try { localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(playerDeck)); } catch (e) {}
  closeDeckEditor();
});
el.deckRandom.addEventListener('click', randomDeck);
el.deckInsane.addEventListener('click', () => {
  insaneToggle = !insaneToggle;
  el.deckInsane.classList.toggle('active', insaneToggle);
});
document.querySelectorAll('.sb-team').forEach(btn => {
  btn.addEventListener('click', () => {
    sandboxTeam = btn.dataset.team;
    document.querySelectorAll('.sb-team').forEach(b => b.classList.toggle('sel', b === btn));
  });
});
el.sbPause.addEventListener('click', togglePause);

// Surface unexpected errors on the overlay instead of failing silently
window.addEventListener('error', ev => {
  if (gameState === 'ended') return;
  el.ovTitle.textContent = 'Oops!';
  el.ovTitle.style.color = '#ff8a7a';
  el.ovBody.textContent = String(ev.message || 'Unknown error');
  el.ovBtn.textContent = 'RESTART';
  el.overlay.classList.remove('hidden');
});

/* ===== Main loop ===== */
let lastTs = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
  lastTs = ts;
  if (gameState === 'playing' && !paused) update(dt);
  render();
  refreshHUD();
  requestAnimationFrame(frame);
}

/* ===== Boot ===== */
buildTerrain();
preloadSprites();
resetGame(false);
requestAnimationFrame(frame);
