'use strict';

/* Enemy AI: keeps a hand like the player, defends against pushes, attacks
   lanes, casts spells only on unit clusters (never at towers), and avoids
   elixir leaks by falling back to its cheapest playable troop. */
class AIController {
  constructor() { this.reset(); }

  reset(deckKeys) {
    this.elixir = 5;
    this.queue = shuffledDeck(deckKeys);
    this.hand = [];
    for (let i = 0; i < 4; i++) this.hand.push(this.queue.shift());
    this.think = 2.0;
    this.insaneAllowed = false; // only true if player has an insane card
  }

  /* Check if the player's deck contains any insane cards */
  checkInsaneCards(playerDeckKeys) {
    this.insaneAllowed = playerDeckKeys.some(k => CARDS[k] && CARDS[k].insane);
  }

  update(dt) {
    this.elixir = Math.min(MAX_ELIXIR, this.elixir + elixirRate() * dt);
    this.think -= dt;
    if (this.think <= 0) {
      this.act();
      this.think = 0.7 + Math.random() * 1.1;
    }
  }

  act() {
    const threats = units.filter(u => !u.dead && u.team !== TEAM_RED && u.y < RIVER_BOT + 2.5);
    const leaking = this.elixir >= MAX_ELIXIR - 0.4;

    // Evaluate every affordable card in hand and play the best option.
    // Spells are only cast on unit clusters — never at towers, so the
    // enemy King never gets activated by a pointless Fireball.
    let best = null; // { idx, pos, score }
    for (let i = 0; i < this.hand.length; i++) {
      const def = CARDS[this.hand[i]];
      if (def.cost > this.elixir) continue;

      // Saint Goblinator is only worth playing when there are goblins to
      // bless (friendly) or convert (enemy) — skip it on an empty arena.
      if (this.hand[i] === 'saintgoblinator' && !this.goblinsOnArena()) continue;

      // Insane cards: only use if the player also has insane cards
      if (CARDS[this.hand[i]].insane && !this.insaneAllowed) continue;

      if (def.spell) {
        // Insane spells have special AI targeting
        if (this.hand[i] === 'hellfire') {
          // Hellfire: fire when enemies are on the map
          let score = units.some(u => !u.dead && u.team !== TEAM_RED) ? 80 : 10;
          if (leaking) score += 30;
          const pos = { x: ARENA_W / 2, y: ARENA_H / 2 };
          if (score > (best ? best.score : -Infinity)) best = { idx: i, pos, score };
        } else if (this.hand[i] === 'tsunami') {
          // Tsunami: sweep when enemies are near the river
          const nearRiver = units.filter(u => !u.dead && u.team !== TEAM_RED &&
            u.y > RIVER_TOP - 3 && u.y < RIVER_BOT + 3);
          let score = nearRiver.length * 40 + 20;
          if (leaking) score += 30;
          const pos = { x: ARENA_W / 2, y: (RIVER_TOP + RIVER_BOT) / 2 };
          if (score > (best ? best.score : -Infinity)) best = { idx: i, pos, score };
        } else if (this.hand[i] === 'harden') {
          // Harden: petrify enemy clusters
          const spot = this.bestSpellSpot(def);
          if (spot && spot.score > (best ? best.score : -Infinity)) {
            best = { idx: i, pos: { x: spot.x, y: spot.y }, score: spot.score };
          }
        } else if (this.hand[i] === 'green') {
          // Green spell: convert enemy clusters to green team
          const spot = this.bestGreenSpellSpot(def);
          if (spot && spot.score > (best ? best.score : -Infinity)) {
            best = { idx: i, pos: { x: spot.x, y: spot.y }, score: spot.score };
          }
        } else {
          const spot = this.bestSpellSpot(def);
          if (spot && spot.score > (best ? best.score : -Infinity)) {
            best = { idx: i, pos: { x: spot.x, y: spot.y }, score: spot.score };
          }
        }
      } else if (def.barrel) {
        // Lob the barrel across the river to the ENEMY side, targeting
        // towers and troops — never on our own side.
        let pos = null;
        let score = 0;
        // Priority 1: enemy towers (princess or king)
        const enemyTowers = towers.filter(t => !t.dead && t.team !== TEAM_RED);
        if (enemyTowers.length > 0) {
          const t = enemyTowers.reduce((a, b) => (a.hp < b.hp ? a : b));
          pos = { x: t.x + (Math.random() * 2 - 1) * 0.8, y: t.y + (Math.random() * 2 - 1) * 0.8 };
          score = 70;
        }
        // Priority 2: cluster of enemy troops on enemy side
        if (!pos) {
          const enemyTroops = units.filter(u => !u.dead && u.team === TEAM_BLUE && !u.def.bombTray);
          let bestCluster = null, bestN = 0;
          for (const u of enemyTroops) {
            if (u.y <= RIVER_BOT) continue; // must be on enemy side
            let n = 0;
            for (const v of enemyTroops) {
              if (dist(u, v) <= 2.5) n++;
            }
            if (n > bestN) { bestN = n; bestCluster = u; }
          }
          if (bestCluster) {
            pos = { x: bestCluster.x, y: bestCluster.y };
            score = 50 + bestN * 15;
          }
        }
        // Fallback: land in enemy half near a bridge
        if (!pos) {
          const lane = Math.random() < 0.5 ? BRIDGES[0] : BRIDGES[1];
          pos = {
            x: clamp(lane + (Math.random() * 2 - 1) * 1.5, 1, ARENA_W - 1),
            y: clamp(RIVER_BOT + 3 + Math.random() * 4, RIVER_BOT + 1, ARENA_H - 2),
          };
          score = 30;
        }
        if (leaking) score += 40;
        if (score > (best ? best.score : -Infinity)) best = { idx: i, pos, score };
      } else if (def.bombTray) {
        // Bomb Tray: place near enemy clusters or in lanes
        let score = 25;
        const spot = this.bestBombTraySpot();
        if (spot) score += spot.score * 0.5;
        if (leaking) score += 40;
        const pos = spot ? { x: spot.x, y: spot.y } : this.attackSpot(def);
        if (score > (best ? best.score : -Infinity)) best = { idx: i, pos, score };
      } else {
        const pos = threats.length > 0 ? this.defendSpot(def, threats) : this.attackSpot(def);
        let score = threats.length > 0 ? 60 + def.hp * 0.01 : 20;
        if (leaking) score += 50;           // strongly prefer spending when nearly full
        if (score > (best ? best.score : -Infinity)) best = { idx: i, pos, score };
      }
    }

    if (!best) { this.think = 0.5; return; }

    const key = this.hand[best.idx];
    this.elixir -= CARDS[key].cost;
    spawnCard(key, TEAM_RED, best.pos.x, best.pos.y);
    this.hand.splice(best.idx, 1);
    this.hand.push(this.queue.shift());
    this.queue.push(key);
  }

  /* True if any live goblin (either team) is on the arena */
  goblinsOnArena() {
    return units.some(u => !u.dead && u.def && u.def.isGoblin);
  }

  /* Best cluster of blue units worth a fireball */
  bestSpellSpot(def) {
    let best = null, bestScore = 0;
    for (const u of units) {
      if (u.dead || u.team !== TEAM_BLUE) continue;
      let n = 0, hp = 0, cx = 0, cy = 0;
      for (const v of units) {
        if (v.dead || v.team !== TEAM_BLUE) continue;
        if (dist(u, v) <= def.radius) { n++; hp += v.hp; cx += v.x; cy += v.y; }
      }
      const score = n * 100 + hp * 0.2;
      if (score > bestScore) { bestScore = score; best = { x: cx / n, y: cy / n, score }; }
    }
    return bestScore >= 220 ? best : null;   // ~3 small units or one chunky tank
  }

  /* Best spot for green spell: most enemy units clustered */
  bestGreenSpellSpot(def) {
    let best = null, bestScore = 0;
    for (const u of units) {
      if (u.dead || u.team !== TEAM_BLUE) continue;
      let n = 0, hp = 0, cx = 0, cy = 0;
      for (const v of units) {
        if (v.dead || v.team !== TEAM_BLUE) continue;
        if (dist(u, v) <= def.radius) { n++; hp += v.hp; cx += v.x; cy += v.y; }
      }
      const score = n * 120 + hp * 0.3;
      if (score > bestScore) { bestScore = score; best = { x: cx / n, y: cy / n, score }; }
    }
    return bestScore >= 300 ? best : null;
  }

  /* Best spot for bomb tray as a trap: place near bridges on own side,
     in the path where enemy troops will walk. Prefer chokepoints. */
  bestBombTraySpot() {
    let best = null, bestScore = 0;
    // Candidate trap spots: near each bridge on the red (own) side,
    // and mid-lane positions between bridge and own princess towers
    const spots = [];
    for (const bx of BRIDGES) {
      // Just above river on own side (troops crossing bridge walk through here)
      spots.push({ x: bx, y: RIVER_TOP - 1.5 });
      spots.push({ x: bx, y: RIVER_TOP - 3.0 });
      spots.push({ x: bx, y: RIVER_TOP - 4.5 });
      // Slightly off-center from bridges for variety
      spots.push({ x: bx + 1.5, y: RIVER_TOP - 2.0 });
      spots.push({ x: bx - 1.5, y: RIVER_TOP - 2.0 });
    }
    // Also consider spots near advancing blue troops (defensive trap)
    const blueTroops = units.filter(u => !u.dead && u.team === TEAM_BLUE && !u.def.bombTray && !u.flying);
    for (const bt of blueTroops) {
      // Place trap ahead of their march path
      if (bt.y > RIVER_BOT) {
        spots.push({ x: bt.x, y: clamp(bt.y - 3.0, RIVER_BOT + 0.5, ARENA_H - 1) });
      }
    }
    for (const s of spots) {
      if (s.x < 0.5 || s.x > ARENA_W - 0.5 || s.y < 0.5 || s.y > ARENA_H - 0.5) continue;
      // Only place on own side (above river)
      if (s.y >= RIVER_TOP) continue;
      // Score: how many blue troops are nearby (walking toward this trap)
      let n = 0;
      for (const v of units) {
        if (v.dead || v.team !== TEAM_BLUE || v.def.bombTray) continue;
        if (dist(s, v) <= 5.0) n++;
      }
      // Also check if there are already bomb trays too close
      let tooClose = false;
      for (const u of units) {
        if (u.dead || !u.def.bombTray) continue;
        if (dist(s, u) < 2.0) { tooClose = true; break; }
      }
      if (tooClose) continue;
      const score = n * 60 + 40; // base score for a good trap position
      if (score > bestScore) { bestScore = score; best = { x: s.x, y: s.y, score }; }
    }
    return bestScore >= 40 ? best : null;
  }

  defendSpot(def, threats) {
    // React to the deepest pusher, near its lane's bridge
    const t = threats.reduce((a, b) => (a.y < b.y ? a : b));
    const laneX = t.x < ARENA_W / 2 ? BRIDGES[0] : BRIDGES[1];
    return {
      x: clamp(laneX + (Math.random() * 2 - 1) * 1.2, 1, ARENA_W - 1),
      y: clamp(t.y - 2.2, 1.5, RIVER_TOP - 0.6),
    };
  }

  attackSpot(def) {
    const lane = Math.random() < 0.5 ? BRIDGES[0] : BRIDGES[1];
    return {
      x: clamp(lane + (Math.random() * 2 - 1) * 1.5, 1, ARENA_W - 1),
      y: 3 + Math.random() * 5,
    };
  }
}
