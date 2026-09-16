'use strict';

/* ===== Arena geometry (tile units) ===== */
const ARENA_W = 18;
const ARENA_H = 32;
const TILE = 26;                       // px per tile
const CANVAS_W = ARENA_W * TILE;       // 468
const CANVAS_H = ARENA_H * TILE;       // 832

const RIVER_TOP = 15;                  // river band y ∈ [15, 17]
const RIVER_BOT = 17;
const BRIDGES = [3.5, 14.5];           // bridge center x
const BRIDGE_HALF_W = 1.1;

/* ===== Match rules ===== */
const MATCH_TIME = 180;                // seconds
const SUDDEN_DEATH_TIME = 60;
const DOUBLE_ELIXIR_WINDOW = 60;       // last N seconds of regulation
const BASE_ELIXIR_RATE = 1 / 2.8;      // elixir per second
const MAX_ELIXIR = 15;

/* ===== Tower rows & tiebreaker ===== */
const PRINCESS_Y_RED = 6.5;            // red princess tower row
const PRINCESS_Y_BLUE = 25.5;          // blue princess tower row
const TIEBREAKER_DRAIN_RATE = 0.06;    // fraction of max HP drained per second

/* ===== Teams ===== */
const TEAM_BLUE = 'blue';              // player (bottom)
const TEAM_RED = 'red';                // AI (top)
const TEAM_GREEN = 'green';            // rogue team — attacks everyone

// Green-team units spawn with these multipliers so the infection stays
// disease
const GREEN_MODS = { hp: 1, dmg: 1, hitSpeed: 0.1, speed: 3, range: 0.8 };
// Green units steadily decay (fraction of max HP lost per second) so an
// outbreak eventually burns itself out even if left alone.
const GREEN_HP_DRAIN = 0.2;

function elixirRate() {
  return BASE_ELIXIR_RATE * (doubleElixir ? 2 : 1);
}

function teamColor(team) {
  return team === TEAM_BLUE ? '#4f8ef7'
    : team === TEAM_GREEN ? '#39d353'
    : team === 'stone' ? '#90a4ae'
    : '#f75f4f';
}
function teamFill(team) {
  return team === TEAM_BLUE ? '#3f6fd8'
    : team === TEAM_GREEN ? '#2ea043'
    : team === 'stone' ? '#78909c'
    : '#d84f3f';
}
