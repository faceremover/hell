'use strict';

/* ===== Small helpers ===== */
function dist(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return Math.hypot(dx, dy); }
function edgeDist(a, b) { return dist(a, b) - a.radius - b.radius; }
function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }
function inRiverBand(y) { return y > RIVER_TOP && y < RIVER_BOT; }
function onBridge(x) {
  for (const bx of BRIDGES) if (Math.abs(x - bx) <= BRIDGE_HALF_W) return true;
  return false;
}

/* Waypoint routing across the river via bridges */
function nextWaypoint(unit, tx, ty) {
  const mid = (RIVER_TOP + RIVER_BOT) / 2;
  const unitSide = unit.y < mid ? -1 : 1;
  const targetSide = ty < mid ? -1 : 1;
  if (unitSide === targetSide && !inRiverBand(unit.y)) return { x: tx, y: ty };

  // Need to cross — head to nearest bridge
  const bx = Math.abs(unit.x - BRIDGES[0]) < Math.abs(unit.x - BRIDGES[1]) ? BRIDGES[0] : BRIDGES[1];
  if (Math.abs(unit.x - bx) > BRIDGE_HALF_W * 0.6) {
    const entryY = unitSide < 0 ? RIVER_TOP - 0.8 : RIVER_BOT + 0.8;
    return { x: bx, y: entryY };
  }
  const exitY = targetSide < 0 ? RIVER_TOP - 0.8 : RIVER_BOT + 0.8;
  return { x: bx, y: exitY };
}

/* Area damage against enemies of `team` (spells / splash). Towers take towerFactor. */
function damageArea(team, x, y, r, dmg, towerFactor) {
  const tf = towerFactor === undefined ? 1 : towerFactor;
  for (const e of [...units, ...towers]) {
    if (e.dead || e.team === team || e.carriedBy) continue;
    if (e.def && e.def.springFack) continue;   // untargetable
    if (Math.hypot(e.x - x, e.y - y) <= r + (e.radius || 0.3)) {
      e.takeDamage(e.isTower ? dmg * tf : dmg, team);
    }
  }
}

/* ===== Green team =====
   Green units attack everyone else. They spawn with heavy stat penalties
   (GREEN_MODS) so a green outbreak stays containable. */
function applyGreen(u) {
  u.team = TEAM_GREEN;
  u.greenHp = GREEN_MODS.hp;
  u.greenDmg = GREEN_MODS.dmg;
  u.greenSpd = GREEN_MODS.speed;
  u.greenHs = GREEN_MODS.hitSpeed;
  u.greenRange = GREEN_MODS.range;
  u.maxHp = u.def.hp * u.greenHp;
  u.hp = u.maxHp;
}

/* Bless a goblin: permanent blessing + triple HP (applied once). When
   `converted` is true the goblin also switches to `team`. */
function blessGoblin(g, team, converted) {
  if (g.insane) return;               // snapped goblins can't be blessed or converted
  if (g.team === TEAM_GREEN) return;  // green goblins are immune to blessing
  if (converted) g.team = team;
  g.blessedUntil = Infinity;            // permanent blessing
  if (!g.blessedHp) {                   // triple HP exactly once
    g.maxHp *= 1.5;
    g.hp = g.maxHp;
    g.blessedHp = true;
  }
  g.target = null;
  effects.push(ringEffect(g.x, g.y, 0.9, '#ffc94d'));
  effects.push(popText(g.x, g.y - 0.8, converted ? 'CONVERTED' : 'BLESSED', '#ffc94d'));
}

function convertGoblin(g, team) {
  if (g.insane) return;               // snapped goblins are past saving
  if (g.team === TEAM_GREEN) return;  // green goblins are immune to conversion
  g.saintConverts = (g.saintConverts || 0) + 1;
  // Converted twice (by any source): the goblin snaps — it defects to
  // the rogue green team and goes permanently insane.
  if (g.saintConverts >= 2) { snapGreen(g); return; }
  blessGoblin(g, team, true);
}

/* A goblin pushed over the edge by repeated conversions: joins the
   rogue green team and fights everyone until it burns out. */
function snapGreen(g) {
  const pinner = g.pinnedBy;
  applyGreen(g);
  g.insane = true;
  g.blessedUntil = 0;
  g.target = null;
  g.wanderTarget = null;
  g.pinnedBy = null;
  g.carriedBy = null;
  if (pinner && pinner.slopTarget === g) pinner.slopTarget = null;
  effects.push(ringEffect(g.x, g.y, 1.2, '#39d353'));
  effects.push(popText(g.x, g.y - 0.8, 'INSANE!', '#39d353'));
}

/* A green-team kill converts the victim into a green version instead of
   destroying it. Towers are immune. */
function tryGreenConvert(victim, srcTeam) {
  if (srcTeam !== TEAM_GREEN || victim.isTower || victim.insane || victim.team === TEAM_GREEN) return false;
  const pinner = victim.pinnedBy;
  applyGreen(victim);
  victim.blessedUntil = 0;
  victim.target = null;
  victim.pinnedBy = null;
  victim.carriedBy = null;
  if (pinner && pinner.slopTarget === victim) pinner.slopTarget = null;
  effects.push(ringEffect(victim.x, victim.y, 1.0, '#39d353'));
  effects.push(popText(victim.x, victim.y - 0.8, 'JOINED GREEN', '#39d353'));
  return true;
}

/* ===== Tsunami wave update ===== */
function updateTsunamiWaves(dt) {
  for (const w of tsunamiWaves) {
    w.t += dt;
    w.y += w.dir * w.speed * dt;
    // Push units in the wave's path
    for (const u of units) {
      if (u.dead) continue;
      const dy = Math.abs(u.y - w.y);
      if (dy <= w.r && Math.abs(u.x - w.x) <= ARENA_W / 2 + 2) {
        const push = w.dir * w.force * dt;
        u.y = clamp(u.y + push, u.radius, ARENA_H - u.radius);
        // Push x slightly toward center if near edges
        if (u.x < 1) u.x = u.radius;
        if (u.x > ARENA_W - 1) u.x = ARENA_W - u.radius;
        // Visual feedback
        if (Math.random() < dt * 3) effects.push(ringEffect(u.x, u.y, 0.3, '#4fc3f7'));
      }
    }
    // Visual effect along the wave front
    if (Math.random() < dt * 8) {
      const rx = (Math.random() - 0.5) * ARENA_W;
      effects.push(ringEffect(
        clamp(w.x + rx, 1, ARENA_W - 1),
        w.y + (Math.random() - 0.5) * w.r * 0.5,
        0.4 + Math.random() * 0.3, '#4fc3f7'));
    }
  }
  tsunamiWaves = tsunamiWaves.filter(w => w.t < 3.0);
}

/* ===== Puddle update (Snowman melt puddles) ===== */
function updatePuddles(dt) {
  for (const p of puddles) {
    p.t += dt;
    // Apply cripple slow to enemies standing in the puddle
    for (const u of units) {
      if (u.dead || u.team === p.team) continue;
      if (u.stone || u.def.springFack) continue;
      if (dist(u, p) <= p.r + u.radius) {
        u.crippledUntil = gameClock + 0.5; // refresh while in puddle
        if (!u.smCripple) {
          u.smCripple = true;
          effects.push(popText(u.x, u.y - 0.8, 'CRIPPLED!', '#b3e5fc'));
        }
      }
    }
  }
  puddles = puddles.filter(p => p.t < p.dur);
}

/* ===== Effects factories ===== */
function ringEffect(x, y, r, color) {
  return { type: 'ring', x, y, r, t: 0, dur: 0.45, color: color || '#ffffff' };
}
function popText(x, y, text, color) {
  return { type: 'text', x, y, text, color: color || '#fff', t: 0, dur: 0.9 };
}
function bannerMsg(text) {
  effects.push({ type: 'banner', text, t: 0, dur: 1.8 });
}

/* ===== Projectile ===== */
class Projectile {
  constructor(x, y, target, dmg, team, opts) {
    opts = opts || {};
    this.x = x; this.y = y;
    this.target = target;                 // entity or point {x,y}
    this.dmg = dmg;
    this.team = team;
    this.owner = opts.owner || null;      // source unit (for green-conversion fizzling)
    this.speed = opts.speed || 9;
    this.splash = opts.splash || 0;
    this.towerFactor = opts.towerFactor === undefined ? 1 : opts.towerFactor;
    this.color = opts.color || '#ffe9a8';
    this.size = opts.size || 0.22;
    this.onHit = opts.onHit || null;       // custom impact behaviour (goblin barrel)
    this.additive = opts.additive || false;  // additive blending (hellfire)
    this.trailColor = opts.trailColor || null; // override trail gradient color
    this.dead = false;
    this.lx = target.x; this.ly = target.y;
    // Arc trajectory (spell projectiles) — scale by distance so short
    // range drops fast and long range arcs high
    this.startX = x; this.startY = y;
    this.totalDist = Math.hypot(this.lx - x, this.ly - y) || 1;
    this.arcHeight = (opts.arcHeight || 0) * Math.min(1, this.totalDist / 8);
    this.arcProgress = 0;
    // Line-flying projectile (shotgun pellets)
    this.flyInLine = opts.flyInLine || false;
    this.dirX = opts.dirX || 0;
    this.dirY = opts.dirY || 0;
    this.distTraveled = 0;
    this.maxDist = (opts.maxDist || 8) * TILE;
  }
  update(dt) {
    // Fizzle if the owner was converted to a different team mid-flight
    if (this.owner && this.owner.team !== this.team) { this.dead = true; return; }
    // Line-flying mode (shotgun pellets)
    if (this.flyInLine) {
      const step = this.speed * dt;
      this.x += this.dirX * step;
      this.y += this.dirY * step;
      this.distTraveled += step;
      // Check collision with enemies
      for (const e of [...units, ...towers]) {
        if (e.dead || e.team === this.team || e.carriedBy) continue;
        if (e.def && e.def.springFack) continue;
        if (dist(this, e) <= (e.radius || 0.3) + this.size) {
          e.takeDamage(this.dmg, this.team);
          effects.push(ringEffect(this.x, this.y, 0.3, this.color));
          this.dead = true;
          return;
        }
      }
      if (this.distTraveled > this.maxDist) this.dead = true;
      return;
    }
    if (this.target && !this.target.dead) { this.lx = this.target.x; this.ly = this.target.y; }
    const dx = this.lx - this.x, dy = this.ly - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (d <= step + 0.05) { this.hit(); return; }
    this.x += dx / d * step;
    this.y += dy / d * step;
    // Update arc progress (0 → 1)
    if (this.arcHeight > 0) {
      this.arcProgress = clamp(1 - d / this.totalDist, 0, 1);
    }
  }
  hit() {
    this.dead = true;
    if (this.onHit) { this.onHit(this.lx, this.ly); return; }
    if (this.splash > 0) {
      damageArea(this.team, this.lx, this.ly, this.splash, this.dmg, this.towerFactor);
      effects.push(ringEffect(this.lx, this.ly, this.splash, '#ffb74d'));
    } else if (this.target && !this.target.dead) {
      this.target.takeDamage(this.dmg, this.team);
    }
  }
}

/* ===== Unit ===== */
class Unit {
  constructor(def, team, x, y) {
    this.def = def;
    this.team = team;
    this.x = x; this.y = y;
    this.greenHp = team === TEAM_GREEN ? GREEN_MODS.hp : 1;
    this.greenDmg = team === TEAM_GREEN ? GREEN_MODS.dmg : 1;
    this.greenSpd = team === TEAM_GREEN ? GREEN_MODS.speed : 1;
    this.greenHs = team === TEAM_GREEN ? GREEN_MODS.hitSpeed : 1;
    this.maxHp = def.hp * this.greenHp; this.hp = this.maxHp;
    this.radius = def.radius;
    this.cd = def.hitSpeed * (0.25 + Math.random() * 0.35); // desync attacks
    this.target = null;
    this.flash = 0;
    this.dead = false;
    this.facing = 1;
    // Blessing / insanity / slop-grab state
    this.blessedUntil = 0;
    this.blessedHp = false;     // goblin HP already tripled by a blessing?
    this.insane = false;
    this.pinnedBy = null;      // held in place by a Slop Master channel
    this.carriedBy = null;     // being hauled to the river
    this.dashCd = 0;
    // Bandit dash state machine (windup freeze → animated dash)
    this.dashState = 'none';   // none | windup | dash
    this.dashT = 0;
    this.dashDur = 0;
    this.dashFromX = 0; this.dashFromY = 0;
    this.dashToX = 0; this.dashToY = 0;
    this.dashTargetRef = null;
    // Slop Master state machine
    this.slopState = 'seek';   // seek | channel | carry
    this.slopTarget = null;
    this.slopProgress = 0;
    this.channelTotal = 0;
    this.dropX = 0; this.dropY = 0;
    this.slopSay = 0;
    this.wanderTarget = null;
    // Spring Fack state
    this.sfState = 'idle';       // idle | riding | attacking
    this.sfMount = null;         // unit currently riding
    this.sfHops = 0;
    this.sfHopCd = 0;
    this.sfTarget = null;        // enemy being bounced on
    this.hopT = 0;               // remaining hop-animation time
    this.hopDur = 0.6;
    this.hopFromX = 0; this.hopFromY = 0;
    this.hopEnt = null;          // hop destination entity (tracks movement)
    // Snowman state
    this.smCripple = false;
    // Stone (harden spell) state
    this.stone = false;
    // Cripple (snowman puddle) state
    this.crippledUntil = 0;
    // Flying unit
    this.flying = !!def.flying;
    // Witch spawn timer
    this.witchSpawnTimer = def.witch ? def.spawnInterval : 0;
    // Spy disguise state
    this.spyDisguised = !!def.spy;
    this.spyRevealTimer = 0;
    // Bomb tray state
    this.trayState = def.bombTray ? 'ground' : null;  // ground | stunned | carried
    this.trayTimer = def.bombTray ? def.trayTimer : 0;
    this.trayCarrier = null;
    this.trayStunTimer = 0;
    // Stun (bomb tray pickup)
    this.stunnedUntil = 0;
    // Bigot state: follow one teammate, insult, then get killed
    this.bigotTarget = null;
    this.bigotInsultCount = 0;
    this.bigotInsultTimer = 3;
    // Enraged state (bigot victim gets this)
    this.enragedUntil = 0;
  }

  /* Team as perceived by other units (spy disguise) */
  apparentTeam() {
    if (this.def.spy && this.spyDisguised) {
      return this.team === TEAM_BLUE ? TEAM_RED : TEAM_BLUE;
    }
    return this.team;
  }

  isBlessed() { return this.blessedUntil > gameClock; }
  isCrippled() { return this.crippledUntil > gameClock; }
  isEnraged() { return this.enragedUntil > gameClock; }
  effSpeed() { return this.def.speed * this.greenSpd * (this.isBlessed() ? 2 : 1) * (this.isCrippled() ? 0.3 : 1) * (this.isEnraged() ? 1.5 : 1); }
  attackDmg() { return this.def.dmg * this.greenDmg; }
  attackCd() { return this.def.hitSpeed * this.greenHs * (this.isEnraged() ? 0.667 : 1); }

  /* Anything this unit wants to attack. Saints also shepherd their own
     flock: unblessed friendly goblins count as targets so they can be
     blessed with the same holy blast that converts enemy goblins. */
  isValidTarget(e) {
    if (e.dead || e.carriedBy) return false;
    // Bomb Tray on ground is not a valid attack target
    if (e.def && e.def.bombTray && e.trayState === 'ground') return false;
    // Spring Fack is untargetable
    if (e.def && e.def.springFack) return false;
    // Flying units can only be hit by ranged (projectile/shotgun) units and towers
    if (e.flying && !e.isTower && !this.def.projectile && !this.def.shotgun && !this.flying && this.def.range < 2.0) return false;
    // Building-only targets: ignore non-building units entirely
    if (this.def.targets === 'buildings' && !e.isTower && !e.halfTower) return false;
    // Non-combat units: don't attack anything
    if (this.def.targets === 'none') return false;
    // Spy disguise: own team sees it as enemy, enemy team sees it as ally
    if (e.def && e.def.spy) {
      const eApparent = e.apparentTeam();
      if (eApparent === this.team) return false;   // appears friendly → don't attack
      // enemy team is fine
    }
    // Stone statues are attacked by everyone
    if (e.stone) return true;
    if (e.team !== this.team) return true;
    return !!(this.def.saint && this.team !== TEAM_GREEN && !e.isTower && e.def.isGoblin && !e.isBlessed());
  }

  /* Scan for the closest valid enemy already inside attack range. Used
     during movement to catch threats the unit is about to walk past. */
  inRangeTarget() {
    let best = null, bestD = Infinity;
    for (const e of [...units, ...towers]) {
      if (!this.isValidTarget(e)) continue;
      if (e.isTower) continue;   // don't chase towers when a unit is closer
      // Building-only or non-combat targets: don't fight back against units
      if (this.def.targets === 'buildings' || this.def.targets === 'none') continue;
      if (edgeDist(this, e) <= this.def.range) {
        const d = edgeDist(this, e);
        if (d < bestD) { bestD = d; best = e; }
      }
    }
    return best;
  }

  acquireTarget() {
    // Lock-on: keep the current target until it dies, leaves detection
    // range, or stops being a valid target (+ small hysteresis band so
    // edge-sitters don't flicker).
    if (this.target) {
      const t = this.target;
      const lost = !this.isValidTarget(t) ||
        (!t.isTower && !t.halfTower && edgeDist(this, t) > this.def.sight + 0.5);
      if (lost) this.target = null;
      else return;
    }
    // No valid target: pick the nearest one inside detection range
    let best = null, bestD = Infinity;
    for (const e of [...units, ...towers]) {
      if (!this.isValidTarget(e)) continue;
      if (!e.isTower && !e.halfTower) {
        if (this.def.targets === 'buildings' || this.def.targets === 'none') continue;
        if (edgeDist(this, e) > this.def.sight) continue;
      }
      const d = edgeDist(this, e);
      if (d < bestD) { bestD = d; best = e; }
    }
    this.target = best;
  }

  moveToward(tx, ty, dt) {
    // Flying units ignore terrain (river/bridges)
    if (this.flying) {
      const dx = tx - this.x, dy = ty - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 1e-4) return;
      const step = Math.min(this.effSpeed() * dt, d);
      this.x = clamp(this.x + dx / d * step, this.radius, ARENA_W - this.radius);
      this.y = clamp(this.y + dy / d * step, this.radius, ARENA_H - this.radius);
      this.facing = dx >= 0 ? 1 : -1;
      return;
    }
    const wp = nextWaypoint(this, tx, ty);
    const dx = wp.x - this.x, dy = wp.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-4) return;
    const step = Math.min(this.effSpeed() * dt, d);
    let nx = this.x + dx / d * step;
    let ny = this.y + dy / d * step;
    // Never walk into water off-bridge
    if (inRiverBand(ny) && !onBridge(nx)) {
      nx = this.x;
      if (inRiverBand(ny) && !onBridge(nx)) ny = this.y;
    }
    this.x = clamp(nx, this.radius, ARENA_W - this.radius);
    this.y = clamp(ny, this.radius, ARENA_H - this.radius);
    this.facing = dx >= 0 ? 1 : -1;
  }

  /* No enemies/towers in sight: roam the arena to hunt for targets */
  wander(dt) {
    if (!this.wanderTarget || dist(this, this.wanderTarget) < 0.6) {
      // Keep picking until the target is at least 8 tiles away
      for (let i = 0; i < 20; i++) {
        const tx = clamp(this.x + (Math.random() * 2 - 1) * 15, 1, ARENA_W - 1);
        const ty = clamp(this.y + (Math.random() * 2 - 1) * 15, 1, ARENA_H - 1);
        if (Math.hypot(tx - this.x, ty - this.y) >= 8) {
          this.wanderTarget = { x: tx, y: ty };
          break;
        }
      }
    }
    this.moveToward(this.wanderTarget.x, this.wanderTarget.y, dt);
  }

  /* If stranded in the river off-bridge, shove to the nearest bank so
     units never get stuck treading water. */
  evacuateRiver() {
    if (!inRiverBand(this.y) || onBridge(this.x)) return;
    const mid = (RIVER_TOP + RIVER_BOT) / 2;
    this.y = this.y < mid ? RIVER_TOP : RIVER_BOT;
  }

  attack(t) {
    const dmg = this.attackDmg();
    // Blessed goblins convert enemy goblins with a killing blow instead
    // of destroying them — weaker hits just chip away normally. The
    // Saint itself converts via its holy projectile blast (see onHit
    // below). Snapped (insane) goblins are past saving and always take
    // damage like anyone else.
    if (!t.isTower && t.def.isGoblin && !t.insane &&
        t.team !== TEAM_GREEN &&
        t.team !== this.team && this.isBlessed() && dmg >= t.hp) {
      convertGoblin(t, this.team);
      return;
    }
    // Hunter shotgun: fire multiple pellets in a spread
    // Spy: reveal when attacking
    if (this.def.spy && this.spyDisguised) {
      this.spyDisguised = false;
      this.spyRevealTimer = 3.0;
      effects.push(ringEffect(this.x, this.y, 0.6, '#ff5722'));
      effects.push(popText(this.x, this.y - 1, 'REVEALED!', '#ff5722'));
    }
    if (this.def.shotgun) {
      const pellets = this.def.pellets || 5;
      const dx = t.x - this.x, dy = t.y - this.y;
      const baseAngle = Math.atan2(dy, dx);
      const spread = 0.5; // radians
      for (let i = 0; i < pellets; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * spread;
        const pdx = Math.cos(angle), pdy = Math.sin(angle);
        projectiles.push(new Projectile(this.x, this.y, t, dmg / pellets, this.team, {
          owner: this, speed: 10, color: '#ff5722', size: 0.15,
          dirX: pdx, dirY: pdy, flyInLine: true, maxDist: 6,
        }));
      }
      effects.push(ringEffect(this.x, this.y, 0.5, '#ff5722'));
      return;
    }
    if (this.def.projectile) {
      const opts = {
        splash: this.def.splash || 0,
        towerFactor: this.def.towerFactor,
        color: '#ffd54f',
      };
      if (this.def.saint) {
        // Holy bolt: a big, glowing shot whose blast converts enemy
        // goblins caught in it and blesses unblessed friendly ones —
        // holy hands never harm a goblin.
        opts.color = '#ffe066';
        opts.size = 0.34;
        opts.speed = 7.5;
        opts.onHit = (lx, ly) => {
          effects.push(ringEffect(lx, ly, this.def.splash, '#ffc94d'));
          effects.push(ringEffect(lx, ly, this.def.splash * 0.55, '#fff3c4'));
          for (const e of [...units, ...towers]) {
            if (e.dead || e.carriedBy) continue;
            if (Math.hypot(e.x - lx, e.y - ly) > this.def.splash + (e.radius || 0.3)) continue;
            if (!e.isTower && e.def.isGoblin && !e.insane && e.team !== TEAM_GREEN) {
              if (e.team === this.team) {
                if (!e.isBlessed()) blessGoblin(e, this.team, false);
              } else {
                convertGoblin(e, this.team);
              }
              continue;
            }
            if (e.team === this.team) continue;   // never harm allies
            e.takeDamage(e.isTower ? dmg * (this.def.towerFactor || 1) : dmg, this.team);
          }
        };
      }
      projectiles.push(new Projectile(this.x, this.y - 0.3, t, dmg, this.team, { owner: this, ...opts }));
      // Muzzle flash so every shot reads clearly on the field
      effects.push(ringEffect(this.x, this.y - 0.3, 0.4, opts.color));
    } else if (this.def.splash) {
      // Area hit: enemy goblins caught in the blast are converted, not hurt
      effects.push(ringEffect(t.x, t.y, this.def.splash, '#ffc94d'));
      for (const e of [...units, ...towers]) {
        if (e.dead || e.team === this.team || e.carriedBy) continue;
        if (Math.hypot(e.x - t.x, e.y - t.y) > this.def.splash + (e.radius || 0.3)) continue;
        if (!e.isTower && e.def.isGoblin && !e.insane && e.team !== TEAM_GREEN) { convertGoblin(e, this.team); continue; }
        e.takeDamage(e.isTower ? dmg * (this.def.towerFactor || 1) : dmg, this.team);
      }
    } else {
      t.takeDamage(dmg, this.team);
    }
  }

  update(dt) {
    if (this.dead) return;
    // Bomb tray state machine
    if (this.def.bombTray) { this.bombTrayUpdate(dt); return; }
    // Green units steadily decay — the infection is containable
    if (this.team === TEAM_GREEN) {
      this.hp -= this.maxHp * GREEN_HP_DRAIN * dt;
      if (this.hp <= 0) { this.forceDeath(); return; }
    }
    if (this.carriedBy) {
      // Fully incapacitated while being carried to the river
      if (this.carriedBy.dead) this.carriedBy = null;
      else return;
    }
    // Stunned by bomb tray pickup
    if (this.stunnedUntil > gameClock) return;
    this.flash = Math.max(0, this.flash - dt);
    this.cd = Math.max(0, this.cd - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);

    // Pinned by a Slop Master channel: may fight back, may not move
    if (this.pinnedBy) {
      if (this.pinnedBy.dead) { this.pinnedBy = null; }
      else {
        this.acquireTarget();
        const pt = this.target;
        if (pt && !pt.dead && dist(this, pt) - this.radius - pt.radius <= this.range_()) {
          if (this.cd <= 0) { this.attack(pt); this.cd = this.attackCd(); }
        }
        return;
      }
    }

    if (this.def.slop) { this.slopUpdate(dt); return; }

    // Stone statues (Harden spell): can't move or attack, no team
    if (this.stone) { return; }

    // Spring Fack: ride friendly units, hop on enemies
    if (this.def.springFack) { this.springFackUpdate(dt); return; }

    // Snowman: melt over time, create crippling puddle
    if (this.def.snowman) { this.snowmanUpdate(dt); return; }

    // Bigot: runs around insulting everyone, avoids opponents
    if (this.def.bigot) { this.bigotUpdate(dt); return; }

    // Witch: periodically spawn skeletons
    if (this.def.witch) {
      this.witchSpawnTimer -= dt;
      if (this.witchSpawnTimer <= 0) {
        this.witchSpawnTimer = this.def.spawnInterval;
        const spawnDef = CARDS[this.def.spawnKey];
        if (spawnDef) {
          const offs = spawnOffsets(4);
          for (const [ox, oy] of offs) {
            const sk = new Unit(spawnDef, this.team,
              clamp(this.x + ox, 0.4, ARENA_W - 0.4),
              clamp(this.y + oy, 0.4, ARENA_H - 0.4));
            sk.maxHp = 45; sk.hp = 45; // weaker than regular skarmy
            units.push(sk);
          }
        }
        effects.push(ringEffect(this.x, this.y, 0.6, '#ce93d8'));
        effects.push(popText(this.x, this.y - 1, 'SUMMON!', '#ce93d8'));
      }
    }

    // Spy: re-disguise after not attacking for 3 seconds
    if (this.def.spy) {
      if (!this.spyDisguised) {
        this.spyRevealTimer -= dt;
        if (this.spyRevealTimer <= 0) {
          this.spyDisguised = true;
          effects.push(ringEffect(this.x, this.y, 0.5, '#455a64'));
          effects.push(popText(this.x, this.y - 0.8, 'HIDDEN', '#455a64'));
        }
      }
    }

    // Bandit dash state machine: frozen during windup, gliding during dash
    if (this.def.dash && this.dashState !== 'none') {
      if (this.dashState === 'windup') {
        this.dashT -= dt;
        if (this.dashT <= 0) {
          const dt2 = this.dashTargetRef;
          if (!dt2 || dt2.dead) { this.dashState = 'none'; this.dashTargetRef = null; }
          else this.startDash(dt2);
        }
        return; // locked in place while winding up
      }
      if (this.dashState === 'dash') { this.updateDashMove(dt); return; }
    }

    // Flying: skip river evacuation
    if (!this.flying) this.evacuateRiver();

    this.acquireTarget();
    const t = this.target;
    if (!t || t.dead) {
      // While wandering, still stop to fight anything in range
      const rng = this.inRangeTarget();
      if (rng) { this.target = rng; if (this.cd <= 0) { this.attack(rng); this.cd = this.attackCd(); } return; }
      this.wander(dt); return;
    }
    const d = dist(this, t) - this.radius - t.radius;
    if (d <= this.range_()) {
      if (this.cd <= 0) { this.attack(t); this.cd = this.attackCd(); }
    } else {
      // When ready to attack but the current target is too far, check
      // if a different enemy is already inside attack range — stop and
      // fight it instead of walking past (e.g. a defending unit while
      // heading for a tower).  Gated on cd <= 0 so a unit that just
      // attacked keeps moving instead of flickering targets every frame.
      if (this.cd <= 0 && this.target) {
        const closer = this.inRangeTarget();
        if (closer && closer !== this.target) {
          this.target = closer;
          if (dist(this, closer) - this.radius - closer.radius <= this.range_()) {
            this.attack(closer);
            this.cd = this.attackCd();
            return;
          }
        }
      }
      // Bandit dash: when the nearest enemy closes inside dash range,
      // freeze for a wind-up beat, then blur across the gap
      if (this.def.dash && this.dashState === 'none' && this.dashCd <= 0 &&
          d > 1.2 && d <= this.def.dashRange) {
        this.dashState = 'windup';
        this.dashT = this.def.dashWindup || 0.6;
        this.dashTargetRef = t;
        effects.push(ringEffect(this.x, this.y, 0.55, '#ce93d8'));
        effects.push(popText(this.x, this.y - 1, '...', '#ce93d8'));
        return; // freeze immediately
      }
      this.moveToward(t.x, t.y, dt);
    }
  }

  startDash(t) {
    const d = dist(this, t);
    if (d < 1e-4) { this.dashState = 'none'; return; }
    const len = Math.max(0, d - this.radius - t.radius - 0.3);
    const nx = this.x + (t.x - this.x) / d * len;
    const ny = this.y + (t.y - this.y) / d * len;
    if (inRiverBand(ny) && !onBridge(nx)) { this.dashState = 'none'; this.dashCd = 1; return; }
    this.dashFromX = this.x; this.dashFromY = this.y;
    this.dashToX = clamp(nx, this.radius, ARENA_W - this.radius);
    this.dashToY = clamp(ny, this.radius, ARENA_H - this.radius);
    this.dashDur = 0.18;
    this.dashT = this.dashDur;
    this.dashState = 'dash';
  }

  updateDashMove(dt) {
    this.dashT -= dt;
    const f = clamp(1 - this.dashT / this.dashDur, 0, 1);
    const prevX = this.x, prevY = this.y;
    this.x = this.dashFromX + (this.dashToX - this.dashFromX) * f;
    this.y = this.dashFromY + (this.dashToY - this.dashFromY) * f;
    // Motion trail puffs along the path
    effects.push({ type: 'ring', x: prevX, y: prevY, r: 0.16, t: 0, dur: 0.25, color: '#ce93d8' });
    if (this.dashT <= 0) {
      this.x = this.dashToX; this.y = this.dashToY;
      this.dashState = 'none';
      this.dashCd = 2;
      effects.push(ringEffect(this.x, this.y, 0.6, '#ce93d8'));
      const t = this.dashTargetRef;
      this.dashTargetRef = null;
      if (t && !t.dead && dist(this, t) - this.radius - t.radius <= this.range_() && this.cd <= 0) {
        this.attack(t);
        this.cd = this.attackCd();
      }
    }
  }

  /* Slop Master: no attack — grabs an enemy on contact, channels while it
     squirms, then sprints to the river and dumps the victim in for an
     instant kill. Towers get hauled overhead too (longer channel). */
  slopUpdate(dt) {
    if (this.slopState === 'channel') {
      const t = this.slopTarget;
      if (!t || t.dead || t.carriedBy) { this.releaseGrab(); return; }
      this.slopProgress += dt;
      if (this.slopProgress >= this.channelTotal) {
        this.slopSay = gameClock + 1.0;
        effects.push(popText(this.x, this.y - 1.3, 'SLOP!', '#ffffff'));
        if (t.isTower) t.carriedBy = this;
        else { t.pinnedBy = null; t.carriedBy = this; }
        this.slopState = 'carry';
        this.dropX = clamp(this.x, 1, ARENA_W - 1);
        this.dropY = this.y < (RIVER_TOP + RIVER_BOT) / 2 ? RIVER_TOP + 0.3 : RIVER_BOT - 0.3;
      }
      return;
    }

    if (this.slopState === 'carry') {
      const t = this.slopTarget;
      if (!t || t.dead) { this.releaseGrab(); return; }
      const dx = this.dropX - this.x, dy = this.dropY - this.y;
      const d = Math.hypot(dx, dy);
      const step = this.def.carrySpeed * dt;
      if (d <= step) {
        effects.push(ringEffect(this.dropX, this.dropY, 1.6, '#7fd4ff'));
        effects.push(ringEffect(this.dropX, this.dropY, 2.4, '#3f74d8'));
        effects.push(popText(this.dropX, this.dropY - 1, 'SPLASH!', '#bff0ff'));
        t.forceDeath(this.team);
        this.releaseGrab();
        return;
      }
      this.x += dx / d * step;
      this.y += dy / d * step;
      if (t.isTower) { t.x = this.x; t.y = this.y - 1.4; }  // haul it overhead
      return;
    }

    // seek
    this.acquireSlopTarget();
    const t = this.slopTarget;
    if (!t) return;
    const d = dist(this, t) - this.radius - t.radius;
    if (d <= 0.25) {
      if (t.isTower) {
        this.channelTotal = this.def.towerChannel;
      } else {
        if (t.def.slop && t.carrying()) t.releaseGrab();   // free its victim first
        t.pinnedBy = this;
        this.channelTotal = this.def.grabChannel;
      }
      this.slopState = 'channel';
      this.slopProgress = 0;
      return;
    }
    this.moveToward(t.x, t.y, dt);
  }

  carrying() { return !!this.slopTarget; }

  acquireSlopTarget() {
    if (this.slopTarget && !this.slopTarget.dead && !this.slopTarget.carriedBy && !this.slopTarget.pinnedBy) return;
    let best = null, bd = Infinity;
    for (const e of [...units, ...towers]) {
      if (e.dead || e.team === this.team || e.carriedBy || e.pinnedBy) continue;
      if (!e.isTower && e.def.slop) continue;   // can't grab fellow Slop Masters
      const d = dist(this, e);
      if (d < bd) { bd = d; best = e; }
    }
    this.slopTarget = best;
  }

  releaseGrab() {
    const t = this.slopTarget;
    if (t && !t.dead) {
      if (t.isTower) t.carriedBy = null;
      else { t.pinnedBy = null; t.carriedBy = null; }
    }
    this.slopTarget = null;
    this.slopState = 'seek';
    this.slopProgress = 0;
  }

  /* === SPRING FACK ===
     Rides on friendly units' heads. When an enemy is within hopRadius,
     hops onto it dealing damage per bounce. Switches targets if a
     closer-to-tower enemy or tower appears. Dies after maxHops.
     Hops are animated (parabolic arc) and gated by a 1s hop cooldown. */
  springFackUpdate(dt) {
    this.sfHopCd = Math.max(0, this.sfHopCd - dt);

    // Animate an in-progress hop toward its destination (tracks moving perch)
    if (this.hopT > 0) {
      this.hopT = Math.max(0, this.hopT - dt);
      const f = 1 - this.hopT / this.hopDur;
      let dx = this.x, dy = this.y;
      if (this.hopEnt && !this.hopEnt.dead) {
        dx = this.hopEnt.x;
        dy = this.hopEnt.y - this.hopEnt.radius - this.radius;
      }
      this.x = this.hopFromX + (dx - this.hopFromX) * f;
      this.y = this.hopFromY + (dy - this.hopFromY) * f;
    } else if (this.hopEnt) {
      this.hopEnt = null; // landed
    }

    if (this.sfHops >= this.def.maxHops) {
      effects.push(ringEffect(this.x, this.y, 0.6, '#8bc34a'));
      this.forceDeath(this.team);
      return;
    }

    // STATE: ATTACKING — bouncing on an enemy
    if (this.sfState === 'attacking') {
      const e = this.sfTarget;
      if (!e || e.dead) { this.sfTarget = null; this.sfState = 'idle'; return; }

      // Stay on the target's head (unless mid-hop toward it)
      if (this.hopT <= 0) {
        this.x = e.x;
        this.y = e.y - e.radius - this.radius;
      }

      // Hop damage on cooldown
      if (this.sfHopCd <= 0 && this.hopT <= 0) {
        e.takeDamage(this.def.dmg, this.team);
        this.sfHops++;
        this.sfHopCd = this.def.hopCooldown || 1;
        effects.push(ringEffect(this.x, this.y, 0.45, '#ffeb3b'));
        effects.push(popText(this.x, this.y - 0.6, 'BOING!', '#8bc34a'));
      }

      // Check for a better target (only when landed and cooldown elapsed)
      if (this.hopT <= 0 && this.sfHopCd <= 0) {
        const bestEnemy = this._sfBestEnemy(e);
        if (bestEnemy && bestEnemy !== e) {
          this._sfBeginHop(bestEnemy);
          this.sfTarget = bestEnemy;
        }
      }
      return;
    }

    // STATE: RIDING — mounted on a friendly unit, look for enemies
    if (this.sfState === 'riding') {
      const mount = this.sfMount;
      if (!mount || mount.dead) { this.sfMount = null; this.sfState = 'idle'; return; }

      // Follow the mount (unless mid-hop)
      if (this.hopT <= 0) {
        this.x = mount.x;
        this.y = mount.y - mount.radius - this.radius;
      }

      // Look for enemies in hopRadius — only launch when hop is off cooldown
      const enemy = this._sfBestEnemy(null);
      if (enemy && this.sfHopCd <= 0) {
        this._sfBeginHop(enemy);
        this.sfTarget = enemy;
        this.sfState = 'attacking';
      }
      return;
    }

    // STATE: IDLE — on the ground, find a friendly to ride
    let bestMount = null, bestD = Infinity;
    for (const u of units) {
      if (u.dead || u === this || u.team !== this.team || u.def.springFack) continue;
      const d = dist(this, u);
      if (d < bestD) { bestD = d; bestMount = u; }
    }
    if (bestMount) {
      this._sfBeginHop(bestMount);
      this.sfMount = bestMount;
      this.sfState = 'riding';
    }
  }

  /* Launch an animated hop from the current perch to `ent`'s head. */
  _sfBeginHop(ent) {
    this.hopFromX = this.x; this.hopFromY = this.y;
    this.hopT = this.hopDur || 0.6;
    this.hopEnt = ent;
  }

  /* Find the best enemy for the Spring Fack to hop on: prefers towers
     in range, then enemy units closer to a tower. `current` excludes
     the enemy we're already bouncing on (unless a better one exists). */
  _sfBestEnemy(current) {
    const hr = this.def.hopRadius;
    const myX = this.x, myY = this.y;

    // Check enemy towers in hop radius first
    for (const t of towers) {
      if (t.dead || t.team === this.team) continue;
      if (dist({ x: myX, y: myY }, t) <= hr + t.radius) return t;
    }

    // Check enemy units — prefer the one closest to their own tower
    let best = null, bestScore = Infinity;
    for (const u of units) {
      if (u.dead || u.team === this.team) continue;
      if (dist({ x: myX, y: myY }, u) > hr + u.radius) continue;
      // Score: distance to nearest enemy tower (lower = closer to tower = better)
      let minTowerDist = Infinity;
      for (const t of towers) {
        if (t.dead || t.team === u.team) continue;
        minTowerDist = Math.min(minTowerDist, dist(u, t));
      }
      if (minTowerDist < bestScore) { bestScore = minTowerDist; best = u; }
    }
    return best;
  }

  /* === SNOWMAN ===
     Stands still and gradually loses HP. When HP reaches 0,
     drops a puddle that cripples enemies that step in it. */
  snowmanUpdate(dt) {
    if (this.smCripple) return; // already melted — just sit as puddle target
    // Drain HP over meltTime seconds
    this.hp -= (this.maxHp / this.def.meltTime) * dt;
    if (this.hp <= 0) {
      this.hp = 0;
      // Drop puddle and die
      puddles.push({
        x: this.x, y: this.y,
        r: this.def.puddleRadius,
        slow: this.def.crippleSlow,
        dur: 12, t: 0, team: this.team,
      });
      effects.push(ringEffect(this.x, this.y, this.def.puddleRadius, '#b3e5fc'));
      effects.push(popText(this.x, this.y - 0.6, 'MELTED!', '#b3e5fc'));
      this.forceDeath(this.team);
    }
  }

  /* === BIGOT ===
     Selects one friendly teammate to follow. Insults them every 3
     seconds. After 3 insults, the teammate kills the bigot and
     becomes enraged (+50% move speed and attack speed) for 7 s. */
  bigotUpdate(dt) {
    // Pick a teammate to follow if we don't have one
    if (!this.bigotTarget || this.bigotTarget.dead) {
      const allies = units.filter(u =>
        !u.dead && u.team === this.team && u !== this && !u.def.bigot);
      if (allies.length === 0) { this.wander(dt); return; }
      this.bigotTarget = allies[Math.floor(Math.random() * allies.length)];
      this.bigotInsultCount = 0;
      this.bigotInsultTimer = 3;
    }
    const t = this.bigotTarget;

    // Follow the teammate
    const d = dist(this, t);
    if (d > 1.5) {
      this.moveToward(t.x, t.y, dt);
    }

    // Insult every 3 seconds
    this.bigotInsultTimer -= dt;
    if (this.bigotInsultTimer <= 0) {
      this.bigotInsultTimer = 3;
      this.bigotInsultCount++;
      const insults = ['IDIOT!', 'FOOL!', 'MORON!', 'CLUELESS!', 'PATHETIC!', 'WEAK!', 'SAD!'];
      const msg = insults[Math.floor(Math.random() * insults.length)];
      effects.push(popText(t.x, t.y - 1, msg, '#ff9800'));
      effects.push(popText(this.x, this.y - 0.8, '🗣️', '#ff9800'));

      if (this.bigotInsultCount >= 3) {
        // Teammate has had enough — kills the bigot
        effects.push(popText(this.x, this.y - 1, 'ENOUGH!', '#ff5722'));
        effects.push(ringEffect(this.x, this.y, 1.0, '#ff5722'));
        this.forceDeath(this.team);
        // Enrage the teammate
        t.enragedUntil = gameClock + 7;
        effects.push(ringEffect(t.x, t.y, 1.5, '#ff1744'));
        effects.push(popText(t.x, t.y - 1, 'ENRAGED!', '#ff1744'));
      }
    }
  }

  /* === WITCH ===
     Periodically spawns skeleton units nearby (handled in update()). */

  /* === SPY ===
     When not attacking, the spy is disguised as the enemy team:
     own team sees it as enemy and attacks it; the other team ignores it.
     When it attacks, it reveals itself for 3 seconds, then re-disguises. */

  /* === BOMB TRAY ===
     Placed on the ground with a 7-second fuse. If an enemy walks into
     range they pick it up (1s stun → "YUM!" → carry it). The carrier
     tries to hand it to nearby enemies. When the timer runs out, a
     fireball explodes at the carrier's position (chain reaction).
     States: ground | stunned | carried */
  bombTrayUpdate(dt) {
    if (this.trayState === 'ground') {
      this.trayTimer -= dt;
      // Check for nearby enemy units that can pick it up
      for (const u of units) {
        if (u.dead || u.team === this.team || u.flying || u.def.bombTray) continue;
        if (u.halfTower) continue;  // buildings can't pick up the burger
        if (u.carriedBy || u.pinnedBy) continue;
        if (dist(this, u) <= this.def.sight + u.radius) {
          // Enemy picked it up!
          this.trayState = 'stunned';
          this.trayCarrier = u;
          u.bombTrayRef = this;
          u.stunnedUntil = gameClock + 1.0;
          this.trayStunTimer = 1.0;
          this.trayTimer = this.def.trayTimer; // restart 7s timer
          effects.push(ringEffect(u.x, u.y, 0.6, '#ff9800'));
          effects.push(popText(u.x, u.y - 1, 'PICKED UP!', '#ff9800'));
          break;
        }
      }
      // Timer expired on the ground — explode here
      if (this.trayTimer <= 0) {
        this._trayExplode();
      }
    } else if (this.trayState === 'stunned') {
      // Carrier is stunned for 1 second
      this.trayStunTimer -= dt;
      const c = this.trayCarrier;
      if (!c || c.dead) { this.trayState = 'ground'; this.trayCarrier = null; return; }
      if (this.trayStunTimer <= 0) {
        // "YUM!" — start carrying
        this.trayState = 'carried';
        effects.push(popText(c.x, c.y - 1, 'YUM!', '#ffeb3b'));
      }
    } else if (this.trayState === 'carried') {
      const c = this.trayCarrier;
      if (!c || c.dead) { this.trayState = 'ground'; this.trayCarrier = null; return; }
      // Follow the carrier
      this.x = c.x;
      this.y = c.y;
      this.trayTimer -= dt;
      // Try to hand off to a nearby teammate of the carrier
      let handoff = null;
      for (const u of units) {
        if (u.dead || u === c || u.team !== c.team || u.flying || u.def.bombTray) continue;
        if (u.carriedBy || u.pinnedBy) continue;
        if (dist(c, u) <= 2.0 + u.radius) { handoff = u; break; }
      }
      if (handoff) {
        // Hand off the tray
        c.bombTrayRef = null;
        this.trayCarrier = handoff;
        handoff.bombTrayRef = this;
        effects.push(ringEffect(handoff.x, handoff.y, 0.5, '#ff9800'));
        effects.push(popText(handoff.x, handoff.y - 1, 'HERE!', '#ff9800'));
      }
      // Timer expired — fireball explosion at carrier position
      if (this.trayTimer <= 0) {
        this._trayExplode();
      }
    }
  }

  _trayExplode() {
    const ex = this.x, ey = this.y;
    const dmg = this.def.fireballDmg;
    const r = this.def.fireballRadius;
    // Fireball damage
    damageArea(this.team, ex, ey, r, dmg, 0.4);
    // Chain reaction: detonate nearby bomb trays
    for (const u of units) {
      if (u.dead || u === this || !u.def.bombTray) continue;
      if (dist(this, u) <= r + u.radius) {
        u.trayTimer = 0; // force immediate detonation
      }
    }
    effects.push(ringEffect(ex, ey, r, '#ff5722'));
    effects.push(ringEffect(ex, ey, r * 1.5, '#ff9800'));
    effects.push(popText(ex, ey - 1, 'BOOM!', '#ff5722'));
    this.dead = true;
    if (this.trayCarrier) {
      this.trayCarrier.bombTrayRef = null;
      this.trayCarrier = null;
    }
  }

  range_() { return this.def.range; }

  takeDamage(dmg, srcTeam) {
    if (this.dead) return;
    // Bandit is untouchable mid-dash (the blur can't be hit)
    if (this.def.dash && this.dashState === 'dash') {
      effects.push(popText(this.x, this.y - 1, 'DODGE', '#ce93d8'));
      return;
    }
    this.hp -= dmg;
    this.flash = 0.14;
    if (this.hp <= 0) {
      // Green-team kills convert the victim instead of destroying it
      if (!this.stone && tryGreenConvert(this, srcTeam)) return;
      this.hp = 0;
      this.dead = true;
      if (this.def.slop) this.releaseGrab();
      if (this.pinnedBy && this.pinnedBy.slopTarget === this) this.pinnedBy.slopTarget = null;
      // Snowman drops puddle when killed by damage
      if (this.def.snowman && !this.smCripple) {
        puddles.push({
          x: this.x, y: this.y,
          r: this.def.puddleRadius,
          slow: this.def.crippleSlow,
          dur: 12, t: 0, team: this.team,
        });
        effects.push(ringEffect(this.x, this.y, this.def.puddleRadius, '#b3e5fc'));
        effects.push(popText(this.x, this.y - 0.6, 'MELTED!', '#b3e5fc'));
      } else if (this.stone) {
        // Stone crumble effect
        effects.push(ringEffect(this.x, this.y, 1.2, '#78909c'));
        effects.push(popText(this.x, this.y - 0.8, 'CRUMBLE!', '#90a4ae'));
      } else {
        effects.push(ringEffect(this.x, this.y, 0.7, teamColor(this.team)));
      }
    }
  }

  forceDeath() {
    if (this.dead) return;
    this.dead = true;
    this.hp = 0;
    if (this.def.slop) this.releaseGrab();
    if (this.pinnedBy && this.pinnedBy.slopTarget === this) this.pinnedBy.slopTarget = null;
    effects.push(ringEffect(this.x, this.y, 0.7, teamColor(this.team)));
  }
}

/* ===== Tower ===== */
class Tower {
  constructor(team, kind, x, y) {
    this.isTower = true;
    this.team = team;
    this.kind = kind;
    this.x = x; this.y = y;
    const s = TOWER_STATS[kind];
    this.maxHp = s.hp; this.hp = s.hp;
    this.range = s.range; this.dmg = s.dmg;
    this.hitSpeed = s.hitSpeed; this.radius = s.radius;
    this.cd = 1;
    this.target = null;              // locked unit — kept until dead/out of range
    this.flash = 0;
    this.dead = false;
    this.active = kind !== 'king';   // king wakes when damaged or a princess falls
  }

  update(dt) {
    if (this.dead) return;
    if (this.carriedBy) {
      // Hauled off its pad by a Slop Master — can't shoot
      if (this.carriedBy.dead) this.carriedBy = null;
      else return;
    }
    this.flash = Math.max(0, this.flash - dt);
    this.cd = Math.max(0, this.cd - dt);

    // Lock-on: hold the current target until it dies or leaves range
    // (+ hysteresis so targets hovering at max range don't flicker)
    if (this.target &&
        (this.target.dead ||
         dist(this, this.target) - this.radius - this.target.radius > this.range + 0.5)) {
      this.target = null;
    }
    if (!this.target) {
      let best = null, bd = Infinity;
      for (const u of units) {
        if (u.dead) continue;
        if (u.def && u.def.springFack) continue; // untargetable
        // Bomb Tray on ground is not a valid target for towers
        if (u.def && u.def.bombTray && u.trayState === 'ground') continue;
        // Towers attack enemies and stone statues (attacked by everyone)
        if (u.team === this.team && !u.stone) continue;
        // Spy disguise: towers don't attack a disguised spy that appears friendly
        if (u.def && u.def.spy && u.apparentTeam() === this.team) continue;
        const d = dist(this, u) - this.radius - u.radius;
        if (d <= this.range && d < bd) { bd = d; best = u; }
      }
      this.target = best;
    }

    if (!this.active || this.cd > 0 || !this.target) return;
    projectiles.push(new Projectile(this.x, this.y - 0.5, this.target, this.dmg, this.team, { owner: this }));
    this.cd = this.hitSpeed;
  }

  takeDamage(dmg, srcTeam) {
    if (this.dead) return;
    this.hp -= dmg;
    this.flash = 0.15;
    if (this.kind === 'king') this.active = true;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      handleTowerDestroyed(this, { team: srcTeam });
    }
  }

  forceDeath(srcTeam) {
    if (this.dead) return;
    this.dead = true;
    this.hp = 0;
    handleTowerDestroyed(this, { team: srcTeam });
  }
}
