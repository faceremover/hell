'use strict';
/*
 * generate_sprites.js — placeholder pixel-art PNG sprites for Slop Royale units.
 *
 * Zero dependencies: encodes PNGs manually (zlib + CRC32 via Node built-ins).
 * Each sprite is defined as a character map; 'B'/'b' are recolored per team.
 * Output: assets/sprites/<unit>_<team>.png (4x nearest-neighbor upscale).
 *
 * Run:  node scripts/generate_sprites.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ===== PNG encoding ===== */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: none
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ===== Palette ===== */
function hexRGBA(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255, 255];
}

const BASE_PALETTE = {
  K: '#141428', // outline / dark
  S: '#f2c79b', // skin
  s: '#cf9e6e', // skin shade
  M: '#c8d0dc', // steel
  m: '#8a94a6', // steel shade
  W: '#a0764f', // wood
  w: '#5f4636', // wood dark
  G: '#ffc94d', // gold accent
  E: '#ffffff', // eye white
  R: '#e0533f', // feather / plume accent
  g: '#66bb44', // goblin skin
  d: '#3f7a2c', // goblin shade
  F: '#e8e8ee', // hair / beard
  C: '#7ff3ff', // P.E.K.K.A eye glow
  L: '#6d4c41', // leather
  o: '#8d6e63', // brown / brick
  n: '#5d4037', // dark brown
  T: '#eceff1', // snow white
  t: '#b0bec5', // snow shade
  I: '#4fc3f7', // ice blue
  i: '#0288d1', // ice dark
  Y: '#ffeb3b', // yellow bright
  y: '#fdd835', // yellow
  P: '#ff9800', // orange
};

const TEAM_COLORS = {
  blue: { B: '#3f6fd8', b: '#2a4da3' },
  red:  { B: '#d84f3f', b: '#a03428' },
};

// Green team sprites are the blue sprite with every pixel multiplied by this
const GREEN_TINT = [120, 255, 120];

function tintMultiply(buf, tint) {
  const t = tint.map(v => v / 255);
  for (let i = 0; i < buf.length; i += 4) {
    buf[i]     = Math.round(buf[i]     * t[0]);
    buf[i + 1] = Math.round(buf[i + 1] * t[1]);
    buf[i + 2] = Math.round(buf[i + 2] * t[2]);
  }
}

/* ===== Sprite maps ('.' = transparent, padded to uniform width) ===== */
const SPRITES = {

  knight: [
    "......KKKK.......",
    ".....KBBBBK...KK.",
    "....KBBBBBBK.KMMK",
    "....KBMMMMBK.KMMK",
    "....KBMEEMBK.KMMK",
    "....KBMMMMBK.KMMK",
    ".....KBBBBK...KK.",
    "...KKBBBBBBKK.KG.",
    "..KBBKKKKKKBBKKG.",
    "..KBKBBBBBBKBBK..",
    "..KBKBbbbbKBBK...",
    "..KBKBbbbbKBBK...",
    "...KKBbbbbBKK....",
    "....KBBBBBBK.....",
    "....KBKBBKBK.....",
    "....KKK..KKK.....",
  ],

  archers: [
    ".....KKKKK.......",
    "....KBBBBBK......",
    "...KBBBBBBK..KK..",
    "...KBSFFSBK.KW.K.",
    "...KBSEESBK.KW.K.",
    "...KBSSSSBK.KWKK.",
    "...KBSSSSBK.KW.K.",
    "....KBSSBK..KW.K.",
    "..KKKBBBBKKKKW.K.",
    ".KBBBBBBBBK.KW.K.",
    ".KBBKGGKBBK.KW.K.",
    ".KBBKGGKBBK.KW.K.",
    ".KBBBBBBBBK..KW..",
    "..KBBBBBBK...KW..",
    "..KBK..KBK...KW..",
    "..KK....KK...KK..",
  ],

  goblins: [
    "..KK.......KK....",
    ".KggK.....KggK...",
    ".KgdgKKKKKgdgK...",
    "..KgggggggggK....",
    "..KgSSgSSSSgK....",
    "..KgSEGSESGgK....",
    "..KgSSgSSSSgK....",
    "...KgggggggK..K..",
    "..KKKgggggKKKKK..",
    ".KggKKKKKKKggKM..",
    ".KgK.ggggg.KgKM..",
    "..K..KgggK..KM...",
    ".....KgggK...K...",
    ".....KddK........",
    "....KKdKdKK......",
    "....KdK.KdK......",
  ],

  giant: [
    "......KKKKKK........",
    ".....KSSSSSSK.......",
    "....KSSSSSSSSK......",
    "....KSSEESSEEK......",
    "....KSSSSSSSSK......",
    "....KSsSSSSsSK......",
    ".....KSSWWSSK.......",
    "...KKKKWWWWKKKK.....",
    "..KWWWWWWWWWWWWK....",
    ".KWWKWWWWWWWKWWWK...",
    ".KSWKWWWWWWWKWSWK...",
    ".KSWWWWWWWWWWWWSK...",
    ".KSWWWWWWWWWWWWSK...",
    "..KSWWWWWWWWWWSK....",
    "..KSWWKKKKKKWWSK....",
    "...KSSK....KSSK.....",
    "...KSSK....KSSK.....",
    "..KKSSKK..KKSSKK....",
    "..KSSSSK..KSSSSK....",
    "..KKKKKK..KKKKKK....",
  ],

  musketeer: [
    ".....KKKKK...R...",
    "....KBBBBBKRR....",
    "...KKKKKKKKK.....",
    "..KBBBBBBBBK.....",
    "..KBSSSSSSBK.....",
    "..KBSESSESBK.....",
    "..KBSSssSSBK.....",
    "...KBSSSSBK......",
    "....KBSSBK.......",
    "..KKKBBBBKKK.....",
    ".KBBBBBBBBK.KKKK.",
    ".KBBBBBBBBKKMMLL.",
    ".KBBKGGKBBK.KKKK.",
    ".KBBKGGKBBK......",
    "..KBBBBBBK.......",
    "..KBK..KBK.......",
    "..KK....KK.......",
  ],

  minipekka: [
    "...KK......KK....",
    "..KmmK....KmmK...",
    "..KmMMKKKKMMmK...",
    "...KMMMMMMMMK....",
    "..KMMCCCCCCMMK...",
    "...KMMMMMMMMK....",
    "....KMMMMMMK.....",
    "...KKKMMMMKKK....",
    "..KMMKKKKKKMMK...",
    ".KMMKMMMMMMKMMK..",
    ".KMK.MMMM..KMK.GG",
    ".KMK.MMMM..KMKGG.",
    ".KmK.MMMM..KmKGG.",
    "..KK.KMMM..KKK.G.",
    ".....KMMM........",
    ".....KKKK........",
  ],

  wizard: [
    ".......KK........",
    "......KBBK.......",
    ".....KBBBBK......",
    "....KBBBBBBK.....",
    "...KBBBBBBBBK....",
    "..KKKKKKKKKKKK...",
    "....KFSSSSFK.....",
    "....KFSESEFK.....",
    "....KFSSSSFK.....",
    ".....KssssK......",
    "....KKFFFFKK.....",
    "...KBBKFFKBBK.K..",
    "..KBBBKKKKBBBKK..",
    "..KBKBBBBBBKBK.W.",
    "...KK.BBBB.KK..W.",
    "......KBBK.....W.",
    "......KBBK....W..",
    ".....KKBBKK..W...",
  ],

  bandit: [
    "......KKKKK......",
    ".....KBBBBBK.....",
    ".....KBBBBBK.....",
    "....KBBBBBBBK....",
    "....KBEKEKEKB....",
    "....KBKBKBKKB....",
    ".....KSSSSSK.....",
    "..KK.KKKKKK.KK...",
    ".KBBKBBBBBBKBBK..",
    ".KBBKBBBBBBKBBK..",
    "..KKBBBBBBBBKK...",
    "..KBBBBBBBBBBK...",
    "..KBBKBBKBBK.....",
    "..KBBK..KBK......",
    "..KKK....KKK.....",
  ],

  skeletonarmy: [
    "...KKKKKK...",
    "..KEEEEEEK..",
    "..KEKEEKEK..",
    "..KEEEEEEK..",
    "...KEEEEK...",
    ".....KK.....",
    "..KKKEEKKK..",
    ".KEKEEEEKEK.",
    ".KEKEEEEKEK.",
    "..KKEEEEKK..",
    "....KEEK....",
    "...KEEEEK...",
    "..KEK.K.EK..",
    "..KmK.K.mK..",
    "..KK...KK...",
  ],

  saintgoblinator: [
    ".....GGGGGG......",
    ".....G....G......",
    "....KKKKKKKK.....",
    "...KBBBBBBBBK....",
    "..KBBBBBBBBBBK...",
    "..KBggggggggBK...",
    "..KBgEggggEgBK...",
    "..KBgggSSgggBK...",
    "...KBggggggBK....",
    "..KKKBBBBBBKKK...",
    ".KBBBBBBBBBBBBK..",
    ".KBBKGGGGGGKBBK..",
    ".KBBKGGGGGGKBBK..",
    ".KBBKKKKKKKKBBK..",
    "..KBBBBBBBBBBK...",
    "..KBK........KBK.",
    "..KKK........KKK.",
  ],

  slopmaster: [
    ".....KKKKKK.....",
    "....KSSSSSSK....",
    "...KSSEEESSSK...",
    "...KSSSSSSSSK...",
    "....KSssssSK....",
    "..KKKKBBBBKKKK..",
    ".KBBBBBBBBBBBBK.",
    ".KBBBBBBBBBBBBK.",
    "KSBKBBBBBBBBKBSK",
    "KSBKBBBBBBBBKBSK",
    "KKKKBBBBBBBBKKKK",
    "...KBBBBBBBBK...",
    "...KBBBKKBBBK...",
    "...KBBK..KBBK...",
    "...KBK....KBK...",
    "...KKK....KKK...",
  ],

  /* ===== INSANE CARDS ===== */

  colossus: [
    "......KKKKKKKK......",
    "....KKKMMMMMMKKK....",
    "...KMMMMMMMMMMMK....",
    "..KMMMMMMMMMMMMMK...",
    "..KMMMEEMMMEEMMK....",
    "..KMMMMMMMMMMMMMK...",
    "..KMMMMmmmmmMMMMK...",
    "...KMMMMMMMMMMK.....",
    "....KMMMMMMMMK......",
    "..KKKMMMMMMMMKKK....",
    ".KMMMMMMMMMMMMMMK...",
    "KMMMMKMMMMMMMKMMMK..",
    "KMMMKKMMMMMMKKMMMK..",
    "KMMMKKMMMMMMKKMMMK..",
    "KMMMK.MMMMMM.MMMK..",
    ".KMK..KMMMMK..KMK...",
    ".KKK..KMMMMK..KKK...",
    "..KK..KMMMMK..KK....",
    "..KKKKKKKKKKKKKK....",
    "..KMMMMMMMMMMMMK....",
    "KKKKKKKKKKKKKKKKKK..",
  ],

  springfack: [
    "...KKKKKKK..",
    "..KgEgggEgK.",
    "..KggEgEggK.",
    "..KgEgggEgK.",
    "..KgggggggK.",
    "..KgKgggKgK.",
    "KKKggggggKKK",
    "KggKggggKggK",
    "KggKggggKggK",
    ".KKgKgggKgK.",
    "..K.ggggg.K.",
    "..K.ggggg.K.",
    "..KKgKKKgKK.",
    "...KKK.KKK..",
  ],

  halftower: [
    "KKKKKKKKKKKKKK",
    "KBBBBBBBBBBBBK",
    "KBBBBBBBBBBBBK",
    "KBoooooooooBnK",
    "KBoooooooooBnK",
    "KBoKooooKooBnK",
    "KBoKooooKooBnK",
    "KBoKooooKooBnK",
    "KBoKooooKooBnK",
    "KBBBBBBBBBBBBK",
    "KBBBBBBBBBBBBK",
    "KBBBBBBBBBBBBK",
    "KKKKKKKKKKKKKK",
  ],

  bigot: [
    "...KKKKK..",
    "..KBBBBK..",
    "..KSEEBK..",
    "..KBBBBK..",
    "...KSSK...",
    "..KKBBKK..",
    ".KBBBBBK..",
    "KBBBBBBBK.",
    "KBBBBBBBK.",
    ".KBBBBBK..",
    "..KBBBK...",
    "..KBBBBK..",
    "..KBB.BK..",
    "..KK..KK..",
  ],

  snowman: [
    "...KKKKK...",
    "..KTTTTTK..",
    "..KTEETTK..",
    "..KTTTTTK..",
    "..KTPTTTK..",
    "...KTTTK...",
    "..KKTTTKK..",
    ".KTTTTTTTK.",
    ".KTTTTTTTK.",
    ".KTTTTTTTK.",
    ".KTTTTTTTK.",
    "..KTTTTTK..",
    "..KTTTTTK..",
    "...KKKKK...",
  ],

  /* ===== NEW CLASH ROYALE CARDS ===== */

  witch: [
    "......KKKKK......",
    ".....KBBBBBK.....",
    "....KBBBBBBK.....",
    "...KBBBBBBBBK....",
    "...KBSFFSSBK.....",
    "...KBSEESSBK.....",
    "...KBSSSSSBK.....",
    "....KBSFFBK......",
    "....KKBFFKK......",
    "...KKKBBBBKKK....",
    "..KBBBBBBBBBBK...",
    ".KBBBKGGGKBBBK...",
    ".KBBBKGGGKBBBK...",
    ".KBBKKKKKKKBBK...",
    "..KBBBBBBBBBBK...",
    "..KBK......KBK...",
    "..KKK......KKK...",
  ],

  babydragon: [
    "....KKKKK........",
    "...KBBBBBK.......",
    "..KBBBBBBBK......",
    "..KBSEESSBK......",
    "..KBBBBBBBK......",
    "...KBBBBBK.......",
    "KKKKBBBBBKKKK....",
    "KBBBKBBBBKBBBK...",
    ".KBBKBBBBKBBK....",
    "..KBBBBBBBBK.....",
    "..KBBBBBBBBK.....",
    "...KBBBBBBK......",
    "...KBB..BBK......",
    "...KKK..KKK......",
    "....K....K.......",
  ],

  minions: [
    "..KK..KK..KK....",
    ".KggKKggKKggK...",
    ".KggggggggggK...",
    "..KgSSSSSSSgK...",
    "..KgSESESESgK...",
    "..KgSSSSSSSgK...",
    "...KgggggggK....",
    "..KKKgggggKKK...",
    ".KggKBBBBKggK...",
    ".KgKBBBBBBKgK...",
    ".KK.KBBBBK.KK...",
    "....KBBBBK......",
    "....KBB.BK......",
    "....KK...KK.....",
  ],

  hunter: [
    ".....KKKKK.......",
    "....KBBBBBK......",
    "...KBBBBBBK......",
    "...KBSFFSBK......",
    "...KBSEESBK......",
    "...KBSSSSBK......",
    "....KBSSBK.......",
    "..KKKBBBBKKK.....",
    ".KBBBBBBBBBBK....",
    ".KBBBBBBBBBBK.GG.",
    ".KBBKGGGKBBK.GG..",
    ".KBBKGGGKBBK.G...",
    "..KBBBBBBBBK.....",
    "..KBK....KBK.....",
    "..KKK....KKK.....",
  ],

  /* ===== INSANE CARDS (NEW) ===== */

  spy: [
    ".....KKKKK.......",
    "....KBBBBBK......",
    "...KBBBBBBK......",
    "...KBBEEBBK......",
    "...KBBBBBBK......",
    "....KBBBBK.......",
    "..KKKBBBBKKK.....",
    ".KBBBBBBBBBBK....",
    ".KBBBBBBBBBBK....",
    "..KBBBBBBBBK.....",
    "..KBBBBBBBBK.....",
    "...KBBBBBBK......",
    "...KBB..BBK......",
    "...KKK..KKK......",
  ],

  bigbombburger: [
    "...KKKKKKK...",
    "..KPPPPPPPK..",
    ".KPPPPPPPPPK.",
    ".KPPPPPPPPPK.",
    "KGGGGGGGGGGGK",
    "KooooooooooK.",
    "KooooooooooK.",
    ".KPPPPPPPPPK.",
    "..KPPPPPPPK..",
    "...KKKKKKK...",
  ],
};

/* ===== Rasterize ===== */
function buildRGBA(map, team, scale) {
  const h = map.length;
  const w = Math.max(...map.map(r => r.length));
  const palette = { ...BASE_PALETTE, ...TEAM_COLORS[team] };
  const out = Buffer.alloc(w * scale * h * scale * 4);

  for (let y = 0; y < h; y++) {
    const row = map[y];
    for (let x = 0; x < w; x++) {
      const hex = palette[row[x]];
      if (!hex) continue;
      const [r, g, b, a] = hexRGBA(hex);
      for (let sy = 0; sy < scale; sy++) {
        const py = y * scale + sy;
        for (let sx = 0; sx < scale; sx++) {
          const px = x * scale + sx;
          const i = (py * w * scale + px) * 4;
          out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = a;
        }
      }
    }
  }
  return { buf: out, width: w * scale, height: h * scale };
}

/* ===== Main ===== */
const SCALE = 4;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'sprites');
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [name, map] of Object.entries(SPRITES)) {
  // Print an ASCII preview so the art can be reviewed without viewing the PNG
  console.log(`\n=== ${name} (${Math.max(...map.map(r => r.length))}x${map.length}) ===`);
  for (const row of map) console.log('  ' + row.replace(/\./g, ' '));

  for (const team of Object.keys(TEAM_COLORS).concat(['green'])) {
    const { buf, width, height } = buildRGBA(map, team === 'green' ? 'blue' : team, SCALE);
    if (team === 'green') tintMultiply(buf, GREEN_TINT);
    const file = path.join(OUT_DIR, `${name}_${team}.png`);
    fs.writeFileSync(file, encodePNG(width, height, buf));
    console.log(`  -> ${path.relative(process.cwd(), file)} (${width}x${height})`);
  }
}
console.log('\nDone.');
