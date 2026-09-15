const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const IGNORED = new Set(["node_modules", ".git", ".github", "build.js", "package.json", "package-lock.json"]);

function slugToTitle(slug) {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildIndex() {
  const entries = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !IGNORED.has(d.name) && fs.existsSync(path.join(ROOT, d.name, "index.html")))
    .map((d) => {
      const dirPath = path.join(ROOT, d.name);
      // Check for optional meta.json
      const metaPath = path.join(dirPath, "meta.json");
      let meta = {};
      if (fs.existsSync(metaPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        } catch {}
      }
      return {
        slug: d.name,
        title: meta.title || slugToTitle(d.name),
        description: meta.description || "",
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>hell</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Nosifer&family=Creepster&family=Inter:wght@400;600;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --blood: #ff1a00;
      --lava: #ff6a00;
      --gold: #ffcc33;
      --ash: #c9a68a;
    }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background:
        radial-gradient(ellipse 120% 60% at 50% 115%, #3d0a00 0%, #1a0300 35%, #070000 65%, #030000 100%),
        #030000;
      color: #e8c9b0;
      min-height: 100vh;
      padding: 3.5rem 1.5rem 24rem;
      overflow-x: hidden;
      position: relative;
    }
    /* ── abyss glow ── */
    .abyss {
      content: ''; position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background:
        radial-gradient(ellipse 60% 35% at 50% 108%, rgba(255,70,0,0.35) 0%, rgba(255,30,0,0.12) 40%, transparent 70%),
        radial-gradient(ellipse 30% 25% at 15% 95%, rgba(255,40,0,0.18) 0%, transparent 60%),
        radial-gradient(ellipse 30% 25% at 85% 95%, rgba(255,40,0,0.18) 0%, transparent 60%),
        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(120,0,0,0.15) 0%, transparent 60%);
    }
    /* ── blood moon ── */
    .blood-moon {
      position: fixed; top: 42px; right: 6vw; width: 110px; height: 110px; z-index: 0; pointer-events: none;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #ff8a6a 0%, #e0261a 30%, #7a0a00 62%, #2a0200 100%);
      box-shadow: 0 0 40px rgba(255,30,0,0.55), 0 0 120px rgba(255,30,0,0.25), 0 0 220px rgba(180,0,0,0.15);
      animation: moonPulse 5s ease-in-out infinite;
    }
    .blood-moon::after {
      content: ''; position: absolute; inset: -30px; border-radius: 50%;
      background: radial-gradient(circle, transparent 55%, rgba(0,0,0,0.35) 58%, transparent 62%);
      filter: blur(2px);
    }
    @keyframes moonPulse {
      0%, 100% { box-shadow: 0 0 40px rgba(255,30,0,0.55), 0 0 120px rgba(255,30,0,0.25), 0 0 220px rgba(180,0,0,0.15); }
      50%      { box-shadow: 0 0 55px rgba(255,40,0,0.75), 0 0 150px rgba(255,30,0,0.35), 0 0 260px rgba(180,0,0,0.2); }
    }
    /* ── distant hell mountains ── */
    .mountains {
      position: fixed; left: 0; right: 0; bottom: 150px; height: 220px; z-index: 1; pointer-events: none; opacity: 0.9;
    }
    .mountains svg { width: 100%; height: 100%; display: block; }
    /* ── canvases ── */
    #ash {
      position: fixed; inset: 0; z-index: 2; pointer-events: none; opacity: 0.9;
    }
    #fire {
      position: fixed; left: 0; right: 0; bottom: 0; width: 100%; height: 300px; z-index: 3; pointer-events: none;
    }
    /* ── lava lake floor ── */
    .lava-floor { position: fixed; left: 0; right: 0; bottom: 0; height: 92px; z-index: 4; pointer-events: none; }
    .lava-floor .lava {
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse 200px 40px at 10% 60%, #fff3a0 0%, transparent 70%),
        radial-gradient(ellipse 260px 50px at 35% 40%, #ffdd33 0%, transparent 70%),
        radial-gradient(ellipse 220px 45px at 60% 55%, #ffaa00 0%, transparent 70%),
        radial-gradient(ellipse 280px 55px at 85% 35%, #ffcc22 0%, transparent 70%),
        linear-gradient(180deg, #ffdd44 0%, #ff8800 25%, #e03000 55%, #7a0d00 85%, #2a0200 100%);
      filter: saturate(1.2);
      animation: lavaFlow 6s ease-in-out infinite alternate;
    }
    @keyframes lavaFlow {
      0%   { filter: brightness(1) saturate(1.2) hue-rotate(0deg); }
      50%  { filter: brightness(1.25) saturate(1.4) hue-rotate(-8deg); }
      100% { filter: brightness(0.95) saturate(1.3) hue-rotate(6deg); }
    }
    .lava-floor .crust {
      position: absolute; inset: 0; opacity: 0.85;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='92' viewBox='0 0 600 92'%3E%3Cg fill='none' stroke='%230a0000' stroke-width='5' stroke-linecap='round' opacity='0.9'%3E%3Cpath d='M0 18 L70 22 L120 12 L190 26 L260 16 L330 28 L400 14 L470 24 L540 15 L600 22'/%3E%3Cpath d='M40 55 L110 50 L170 62 L240 52 L310 64 L380 54 L450 63 L520 53 L590 60' stroke-width='4'/%3E%3Cpath d='M90 80 L180 76 L270 84 L360 78 L450 83 L540 78' stroke-width='3'/%3E%3C/g%3E%3C/svg%3E");
      background-size: 600px 92px;
      animation: crustDrift 18s linear infinite;
    }
    @keyframes crustDrift { from { background-position-x: 0; } to { background-position-x: 600px; } }
    .lava-floor::before {
      content: ''; position: absolute; top: -22px; left: 0; right: 0; height: 24px;
      background: linear-gradient(180deg, transparent, rgba(255,120,0,0.35));
      filter: blur(6px);
    }
    /* ── firelight + atmosphere ── */
    .fire-light {
      position: fixed; inset: 0; z-index: 5; pointer-events: none; mix-blend-mode: screen; opacity: 0.5;
      background: radial-gradient(ellipse 90% 45% at 50% 105%, rgba(255,110,0,0.35) 0%, rgba(255,50,0,0.12) 45%, transparent 70%);
      animation: lightFlicker 0.35s ease-in-out infinite alternate;
    }
    @keyframes lightFlicker {
      0% { opacity: 0.42; } 30% { opacity: 0.55; } 60% { opacity: 0.47; } 100% { opacity: 0.58; }
    }
    .vignette {
      position: fixed; inset: 0; z-index: 6; pointer-events: none;
      background: radial-gradient(ellipse 75% 70% at 50% 40%, transparent 55%, rgba(0,0,0,0.55) 85%, rgba(0,0,0,0.85) 100%);
    }
    .grain {
      position: fixed; inset: 0; z-index: 6; pointer-events: none; opacity: 0.07; mix-blend-mode: overlay;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    .content { position: relative; z-index: 10; }
    .gate { position: relative; text-align: center; margin-bottom: 2.5rem; }
    .pentagram {
      position: absolute; left: 50%; top: 46%; transform: translate(-50%,-50%);
      width: min(460px, 88vw); height: min(460px, 88vw); opacity: 0.14; pointer-events: none;
      animation: spinSlow 60s linear infinite;
      filter: drop-shadow(0 0 18px rgba(255,40,0,0.6));
    }
    @keyframes spinSlow { to { transform: translate(-50%,-50%) rotate(360deg); } }
    h1 {
      position: relative;
      text-align: center;
      font-family: 'Nosifer', 'Creepster', cursive;
      font-size: clamp(3.5rem, 12vw, 7rem);
      line-height: 1;
      letter-spacing: 0.04em;
      background: linear-gradient(180deg, #fff8d0 0%, #ffdd44 18%, #ff8800 42%, #ff2a00 65%, #8b0000 85%, #3d0000 100%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 2px 0 #1a0000) drop-shadow(0 0 22px rgba(255,60,0,0.65)) drop-shadow(0 0 70px rgba(255,20,0,0.35)) drop-shadow(0 12px 30px rgba(0,0,0,0.8));
      animation: titleFlicker 2.8s ease-in-out infinite;
      margin-bottom: 0.6rem;
    }
    @keyframes titleFlicker {
      0%, 100% { filter: drop-shadow(0 2px 0 #1a0000) drop-shadow(0 0 22px rgba(255,60,0,0.65)) drop-shadow(0 0 70px rgba(255,20,0,0.35)) drop-shadow(0 12px 30px rgba(0,0,0,0.8)); transform: scale(1); }
      8%  { filter: drop-shadow(0 2px 0 #1a0000) drop-shadow(0 0 30px rgba(255,80,0,0.9)) drop-shadow(0 0 90px rgba(255,20,0,0.5)) drop-shadow(0 12px 30px rgba(0,0,0,0.8)); }
      10% { filter: drop-shadow(0 2px 0 #1a0000) drop-shadow(0 0 14px rgba(255,60,0,0.4)) drop-shadow(0 0 50px rgba(255,20,0,0.2)) drop-shadow(0 12px 30px rgba(0,0,0,0.8)); }
      12% { filter: drop-shadow(0 2px 0 #1a0000) drop-shadow(0 0 26px rgba(255,60,0,0.75)) drop-shadow(0 0 80px rgba(255,20,0,0.4)) drop-shadow(0 12px 30px rgba(0,0,0,0.8)); }
      50% { filter: drop-shadow(0 2px 0 #1a0000) drop-shadow(0 0 34px rgba(255,70,0,0.95)) drop-shadow(0 0 100px rgba(255,30,0,0.5)) drop-shadow(0 12px 30px rgba(0,0,0,0.8)); transform: scale(1.008); }
    }
    .subtitle {
      text-align: center;
      color: #d98a6a;
      margin-bottom: 0.9rem;
      font-size: 1.05rem;
      font-style: italic;
      font-family: Georgia, serif;
      text-shadow: 0 2px 12px rgba(0,0,0,0.9), 0 0 20px rgba(255,60,0,0.25);
    }
    .disclaimer {
      text-align: center; margin-bottom: 2.8rem;
    }
    .disclaimer span {
      display: inline-block;
      color: #ff7a5a;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      border: 1px solid rgba(255,60,0,0.4);
      background: rgba(30,5,0,0.7);
      padding: 0.5rem 1.1rem;
      border-radius: 999px;
      box-shadow: 0 0 18px rgba(255,40,0,0.25), inset 0 0 18px rgba(255,40,0,0.12);
      animation: pillPulse 2.2s ease-in-out infinite;
      backdrop-filter: blur(6px);
    }
    @keyframes pillPulse {
      0%, 100% { box-shadow: 0 0 14px rgba(255,40,0,0.2), inset 0 0 14px rgba(255,40,0,0.1); }
      50%      { box-shadow: 0 0 26px rgba(255,40,0,0.45), inset 0 0 22px rgba(255,40,0,0.2); }
    }
    .grid {
      max-width: 860px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.1rem;
    }
    .card {
      position: relative;
      display: block;
      background: linear-gradient(180deg, rgba(32,10,4,0.95) 0%, rgba(16,4,2,0.96) 100%);
      border: 1px solid #4a1c08;
      border-radius: 12px;
      padding: 1.35rem 1.35rem 1.2rem;
      text-decoration: none;
      color: inherit;
      transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
      backdrop-filter: blur(8px);
      overflow: hidden;
      isolation: isolate;
    }
    .card::before {
      content: ''; position: absolute; top: 0; left: 10%; right: 10%; height: 2px; z-index: 1;
      background: linear-gradient(90deg, transparent, #ff6a00, #ffdd44, #ff6a00, transparent);
      opacity: 0.35; transition: opacity 0.25s;
    }
    .card::after {
      content: '᛭'; position: absolute; right: 12px; top: 8px; font-size: 0.9rem; color: #5a2410; transition: color 0.25s;
    }
    .card:hover {
      border-color: #ff5a00;
      transform: translateY(-4px);
      box-shadow: 0 8px 30px rgba(255,60,0,0.35), 0 0 0 1px rgba(255,100,0,0.3), inset 0 0 40px rgba(255,40,0,0.08);
    }
    .card:hover::before { opacity: 1; box-shadow: 0 0 12px rgba(255,120,0,0.9); }
    .card:hover::after { color: #ff8a00; text-shadow: 0 0 10px rgba(255,100,0,0.8); }
    .card h2 {
      font-size: 1.15rem;
      font-weight: 800;
      margin-bottom: 0.4rem;
      color: #ffd9b0;
      letter-spacing: -0.01em;
    }
    .card:hover h2 { color: #fff0d0; text-shadow: 0 0 16px rgba(255,100,0,0.5); }
    .card p {
      font-size: 0.88rem;
      color: #a97a5e;
      line-height: 1.5;
    }
    .card .go {
      display: inline-flex; align-items: center; gap: 6px;
      margin-top: 0.8rem; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
      color: #ff8a3a;
    }
    .card:hover .go { color: #ffcc66; }
    .empty {
      text-align: center;
      color: #6b3a26;
      margin-top: 4rem;
      font-size: 1rem;
      font-style: italic;
    }
    footer {
      text-align: center; margin-top: 4rem; color: #5a2a1a; font-size: 0.72rem; letter-spacing: 0.28em; text-transform: uppercase;
    }
    footer b { color: #8a3a20; }
    @media (max-width: 600px) {
      body { padding: 2.5rem 1rem 22rem; }
      .blood-moon { width: 72px; height: 72px; top: 22px; right: 5vw; }
      .mountains { bottom: 130px; height: 160px; }
      #fire { height: 240px; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; }
      #fire, #ash { display: none; }
    }
  </style>
</head>
<body>
  <div class="abyss"></div>
  <div class="blood-moon"></div>
  <div class="mountains" aria-hidden="true">
    <svg viewBox="0 0 1440 220" preserveAspectRatio="none">
      <path d="M0 220 L0 150 L80 110 L140 140 L210 70 L280 130 L350 95 L420 150 L480 60 L560 135 L630 100 L700 160 L770 85 L840 140 L910 105 L980 155 L1050 75 L1120 135 L1190 100 L1260 150 L1330 110 L1440 145 L1440 220 Z" fill="#0d0200" stroke="rgba(255,60,0,0.28)" stroke-width="2"/>
      <path d="M0 220 L0 185 L120 160 L240 175 L360 150 L480 178 L600 155 L720 180 L840 152 L960 178 L1080 155 L1200 180 L1320 160 L1440 175 L1440 220 Z" fill="#050000" opacity="0.95"/>
      <g fill="#ff5a00" opacity="0.8">
        <circle cx="480" cy="62" r="3"><animate attributeName="opacity" values="0.8;0.1;0.8" dur="2.1s" repeatCount="indefinite"/></circle>
        <circle cx="770" cy="87" r="2.5"><animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.7s" repeatCount="indefinite"/></circle>
        <circle cx="1050" cy="77" r="3"><animate attributeName="opacity" values="0.9;0.2;0.9" dur="2.6s" repeatCount="indefinite"/></circle>
      </g>
    </svg>
  </div>
  <canvas id="ash"></canvas>
  <canvas id="fire"></canvas>
  <div class="lava-floor" aria-hidden="true"><div class="lava"></div><div class="crust"></div></div>
  <div class="fire-light"></div>
  <div class="vignette"></div>
  <div class="grain"></div>

  <div class="content">
    <div class="gate">
      <svg class="pentagram" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r="92" fill="none" stroke="#ff4400" stroke-width="2"/>
        <circle cx="100" cy="100" r="70" fill="none" stroke="#ff4400" stroke-width="1" opacity="0.7"/>
        <path d="M100 22 L147 163 L27 77 L173 77 L53 163 Z" fill="none" stroke="#ff5500" stroke-width="2" opacity="0.9"/>
        <circle cx="100" cy="100" r="6" fill="none" stroke="#ff6600" stroke-width="1.5"/>
      </svg>
      <h1>HELL</h1>
      <p class="subtitle">Abandon all code, ye who enter here</p>
      <p class="disclaimer"><span>⚠ ${entries.length} project${entries.length !== 1 ? "s" : ""} of pure AI slop ⚠</span></p>
    </div>
    ${
      entries.length
        ? `<div class="grid">${entries
            .map(
              (e) =>
                `<a class="card" href="/${e.slug}/">
          <h2>🔥 ${e.title}</h2>${e.description ? `<p>${e.description}</p>` : ""}
          <span class="go">Descend →</span>
        </a>`
            )
            .join("\n      ")}</div>`
        : `<p class="empty">your mother is taking a shit</p>`
    }
    <footer>est. MMXXVI &nbsp;·&nbsp; <b>no refunds</b> &nbsp;·&nbsp; souls processed daily</footer>
  </div>
<script>
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var fire = document.getElementById('fire');
  var ashC = document.getElementById('ash');
  var fx = fire.getContext('2d');
  var ax = ashC.getContext('2d');
  function fit() {
    fire.width = window.innerWidth;
    fire.height = window.innerWidth < 600 ? 240 : 300;
    ashC.width = window.innerWidth;
    ashC.height = window.innerHeight;
  }
  fit();
  window.addEventListener('resize', fit);
  var T = 0;
  // layered flame tongues: back (red, wide) / mid (orange) / front (yellow-white, narrow)
  var layers = [
    { n: 34, hMin: 90, hMax: 200, wMin: 60, wMax: 130, c1: 'rgba(200,10,0,', c2: 'rgba(255,60,0,', glow: 0.5 },
    { n: 30, hMin: 60, hMax: 150, wMin: 36, wMax: 80,  c1: 'rgba(255,60,0,',  c2: 'rgba(255,150,0,', glow: 0.7 },
    { n: 22, hMin: 30, hMax: 95,  wMin: 16, wMax: 42,  c1: 'rgba(255,150,0,', c2: 'rgba(255,230,150,', glow: 0.95 }
  ];
  var tongues = [];
  layers.forEach(function (L, li) {
    for (var i = 0; i < L.n; i++) {
      tongues.push({
        li: li, seed: Math.random() * 1000,
        x: Math.random(), w: L.wMin + Math.random() * (L.wMax - L.wMin),
        h: L.hMin + Math.random() * (L.hMax - L.hMin),
        sp: 0.6 + Math.random() * 1.4, ph: Math.random() * 6.28
      });
    }
  });
  var sparks = [];
  for (var s = 0; s < 70; s++) sparks.push({ x: Math.random(), y: Math.random(), v: 0.0008 + Math.random() * 0.0028, sz: 0.6 + Math.random() * 2.2, sw: Math.random() * 6.28, ember: Math.random() < 0.55, tw: 1 + Math.random() * 3 });
  var cinders = [];
  for (var c = 0; c < 26; c++) cinders.push({ x: Math.random(), y: 0.6 + Math.random() * 0.4, v: 0.002 + Math.random() * 0.005, sz: 1 + Math.random() * 2.5, life: Math.random() });
  function drawFire() {
    var W = fire.width, H = fire.height;
    fx.clearRect(0, 0, W, H);
    fx.globalCompositeOperation = 'lighter';
    // deep base glow
    var g = fx.createLinearGradient(0, H, 0, H * 0.2);
    g.addColorStop(0, 'rgba(255,120,0,0.5)');
    g.addColorStop(0.4, 'rgba(200,30,0,0.28)');
    g.addColorStop(1, 'rgba(80,0,0,0)');
    fx.fillStyle = g;
    fx.fillRect(0, 0, W, H);
    for (var i = 0; i < tongues.length; i++) {
      var t = tongues[i], L = layers[t.li];
      var sway = Math.sin(T * t.sp + t.ph) * (10 + t.li * 6) + Math.sin(T * 2.3 + t.seed) * 5;
      var flick = 0.82 + 0.18 * Math.sin(T * (2 + t.sp) + t.ph * 2) * Math.cos(T * 1.3 + t.seed);
      var bx = t.x * W + sway;
      var bh = H + 10;
      var th = t.h * flick;
      var tw = t.w * (1.1 - flick * 0.15);
      var grad = fx.createLinearGradient(0, bh, 0, bh - th);
      grad.addColorStop(0, L.c1 + '0.85)');
      grad.addColorStop(0.55, L.c2 + (0.55 * L.glow) + ')');
      grad.addColorStop(1, 'rgba(255,220,100,0)');
      fx.fillStyle = grad;
      fx.beginPath();
      fx.moveTo(bx - tw / 2, bh);
      // left edge curving in to a licking tip
      fx.bezierCurveTo(bx - tw / 2, bh - th * 0.4, bx - tw * 0.18 + sway * 0.2, bh - th * 0.75, bx + sway * 0.35, bh - th);
      // right edge back down
      fx.bezierCurveTo(bx + tw * 0.18 + sway * 0.2, bh - th * 0.75, bx + tw / 2, bh - th * 0.4, bx + tw / 2, bh);
      fx.closePath();
      fx.fill();
      // white-hot core for front layer
      if (t.li === 2) {
        var cg = fx.createLinearGradient(0, bh, 0, bh - th * 0.45);
        cg.addColorStop(0, 'rgba(255,240,200,0.7)');
        cg.addColorStop(1, 'rgba(255,200,80,0)');
        fx.fillStyle = cg;
        fx.beginPath();
        fx.moveTo(bx - tw * 0.22, bh);
        fx.quadraticCurveTo(bx, bh - th * 0.5, bx + tw * 0.22, bh);
        fx.closePath();
        fx.fill();
      }
    }
  }
  function drawAsh() {
    var W = ashC.width, H = ashC.height;
    ax.clearRect(0, 0, W, H);
    var i, p, px, py;
    for (i = 0; i < sparks.length; i++) {
      p = sparks[i];
      p.y -= p.v; p.sw += 0.01;
      if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
      px = p.x * W + Math.sin(p.sw * 3 + T) * 22;
      py = p.y * H;
      var a = 0.25 + 0.55 * Math.abs(Math.sin(T * p.tw + p.sw));
      if (p.ember) {
        ax.fillStyle = 'rgba(255,' + (90 + Math.floor(80 * Math.abs(Math.sin(p.sw)))) + ',20,' + a.toFixed(2) + ')';
        ax.shadowColor = 'rgba(255,80,0,0.9)';
        ax.shadowBlur = 6;
      } else {
        ax.shadowBlur = 0;
        ax.fillStyle = 'rgba(160,140,130,' + (a * 0.5).toFixed(2) + ')';
      }
      ax.beginPath();
      ax.arc(px, py, p.sz, 0, 6.283);
      ax.fill();
    }
    ax.shadowBlur = 0;
    ax.globalCompositeOperation = 'lighter';
    for (i = 0; i < cinders.length; i++) {
      p = cinders[i];
      p.life += 0.008; p.x += Math.sin(T * 2 + i) * 0.0006;
      p.y -= p.v * 0.6;
      if (p.y < 0.35 || p.life > 1) { p.y = 0.95 + Math.random() * 0.05; p.x = Math.random(); p.life = 0; }
      var fade = 1 - p.life;
      ax.fillStyle = 'rgba(255,140,30,' + (fade * 0.8).toFixed(2) + ')';
      ax.beginPath();
      ax.arc(p.x * W, p.y * H, p.sz * fade + 0.4, 0, 6.283);
      ax.fill();
    }
    ax.globalCompositeOperation = 'source-over';
  }
  function loop() {
    T += 0.03;
    drawFire();
    drawAsh();
    requestAnimationFrame(loop);
  }
  loop();
})();
</script>
</body>
</html>
`;

  fs.writeFileSync(path.join(ROOT, "index.html"), html, "utf8");
  console.log(`✓ Built index.html with ${entries.length} project(s).`);
}

buildIndex();
