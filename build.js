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
    @import url('https://fonts.googleapis.com/css2?family=Nosifer&family=Metal+Mania&family=Pirata+One&family=Inter:wght@400;600;800&display=swap');
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
    /* ── blood moon: mottled maria + craters, irregular limb ── */
    .blood-moon {
      position: fixed; top: 42px; right: 6vw; width: 112px; height: 108px; z-index: 0; pointer-events: none;
      border-radius: 48% 52% 51% 49% / 52% 48% 52% 48%;
      background:
        radial-gradient(circle at 66% 60%, rgba(70,4,0,0.6) 0 9%, transparent 10%),
        radial-gradient(circle at 40% 56%, rgba(110,8,0,0.55) 0 12%, transparent 13%),
        radial-gradient(circle at 56% 32%, rgba(130,12,0,0.5) 0 8%, transparent 9%),
        radial-gradient(circle at 30% 36%, rgba(255,150,110,0.3) 0 8%, transparent 9%),
        radial-gradient(circle at 58% 72%, rgba(50,2,0,0.55) 0 15%, transparent 16%),
        radial-gradient(circle at 76% 44%, rgba(80,5,0,0.5) 0 6%, transparent 7%),
        radial-gradient(circle at 24% 58%, rgba(150,20,5,0.4) 0 7%, transparent 8%),
        radial-gradient(circle at 35% 35%, #ff9a7a 0%, #e0261a 24%, #8a0d00 56%, #2e0300 80%, #100000 100%);
      box-shadow: 0 0 30px rgba(255,30,0,0.35), 0 0 100px rgba(255,30,0,0.16), -6px 4px 22px rgba(0,0,0,0.5) inset;
    }
    .blood-moon::before {
      content: ''; position: absolute; inset: 0; border-radius: inherit;
      background:
        radial-gradient(circle at 22% 28%, rgba(255,205,175,0.55) 0 3.5%, rgba(120,10,0,0.4) 4%, transparent 5%),
        radial-gradient(circle at 50% 42%, rgba(255,180,150,0.3) 0 2.5%, rgba(90,5,0,0.35) 3%, transparent 4%),
        radial-gradient(circle at 72% 28%, rgba(0,0,0,0.4) 0 5%, transparent 6%),
        radial-gradient(circle at 34% 66%, rgba(0,0,0,0.45) 0 7%, transparent 8%),
        radial-gradient(circle at 60% 54%, rgba(0,0,0,0.35) 0 4%, transparent 5%),
        radial-gradient(circle at 46% 76%, rgba(0,0,0,0.3) 0 5%, transparent 6%),
        radial-gradient(circle at 80% 62%, rgba(255,120,80,0.2) 0 3%, transparent 4%);
    }
    .blood-moon::after {
      content: ''; position: absolute; inset: 0; border-radius: inherit;
      background: radial-gradient(circle at 74% 70%, transparent 48%, rgba(10,0,0,0.6) 76%, rgba(0,0,0,0.85) 100%);
    }
    /* ── volcano range (behind everything) ── */
    .mountains {
      position: fixed; left: 0; right: 0; bottom: 105px; height: 460px; z-index: 1; pointer-events: none; opacity: 1;
    }
    .mountains svg { width: 100%; height: 100%; display: block; }
    /* ── stacking: volcanoes < lava lake < fire tongues < ash/embers ── */
    .lava-floor { position: fixed; left: 0; right: 0; bottom: 0; height: 150px; z-index: 2; pointer-events: none; background: #1a0300; }
    #fire {
      position: fixed; left: 0; right: 0; bottom: 95px; width: 100%; height: 360px; z-index: 3; pointer-events: none;
    }
    #ash {
      position: fixed; inset: 0; z-index: 4; pointer-events: none; opacity: 0.9;
    }
    #lava { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    .lava-rim {
      position: absolute; top: -2px; left: 0; right: 0; height: 5px;
      background: linear-gradient(90deg, #ffdd66, #fff3b0, #ff9500);
      box-shadow: 0 0 14px 2px rgba(255,160,30,0.8), 0 0 44px 8px rgba(255,90,0,0.4);
    }
    .lava-floor::before {
      content: ''; position: absolute; top: -60px; left: 0; right: 0; height: 62px;
      background: linear-gradient(180deg, transparent, rgba(255,110,0,0.28) 60%, rgba(255,160,30,0.4));
    }
    /* ── firelight + atmosphere ── */
    .fire-light {
      position: fixed; inset: 0; z-index: 5; pointer-events: none; opacity: 0.45;
      background: radial-gradient(ellipse 90% 45% at 50% 105%, rgba(255,110,0,0.32) 0%, rgba(255,50,0,0.1) 45%, transparent 70%);
    }
    .vignette {
      position: fixed; inset: 0; z-index: 6; pointer-events: none;
      background: radial-gradient(ellipse 75% 70% at 50% 40%, transparent 55%, rgba(0,0,0,0.55) 85%, rgba(0,0,0,0.85) 100%);
    }
    .grain {
      position: fixed; inset: 0; z-index: 6; pointer-events: none; opacity: 0.05;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    .content { position: relative; z-index: 10; }
    .gate { position: relative; text-align: center; margin-bottom: 2.5rem; }
    @keyframes pentSpin { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(360deg); } }
    .pentagram {
      position: absolute; left: 50%; top: 46%; transform: translate(-50%,-50%);
      width: min(460px, 88vw); height: min(460px, 88vw); opacity: 0.13; pointer-events: none;
      animation: pentSpin 120s linear infinite;
    }
    @keyframes hellGlow {
      0%, 100% { filter: drop-shadow(0 2px 0 #1a0000) drop-shadow(0 0 22px rgba(255,60,0,0.55)) drop-shadow(0 0 50px rgba(255,30,0,0.3)); }
      50%      { filter: drop-shadow(0 2px 0 #1a0000) drop-shadow(0 0 38px rgba(255,80,0,0.8)) drop-shadow(0 0 80px rgba(255,20,0,0.5)) drop-shadow(0 0 120px rgba(200,0,0,0.25)); }
    }
    h1 {
      position: relative;
      text-align: center;
      font-family: 'Nosifer', 'Creepster', cursive;
      font-size: clamp(3.5rem, 12vw, 7rem);
      line-height: 1;
      letter-spacing: 0.04em;
      background: linear-gradient(180deg, #fff8d0 0%, #ffdd44 18%, #ff8800 42%, #ff2a00 65%, #8b0000 85%, #3d0000 100%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      animation: hellGlow 3s ease-in-out infinite;
      margin-bottom: 0.6rem;
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
    }
    .grid {
      max-width: 920px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.4rem;
      perspective: 1200px;
    }
    .card {
      position: relative;
      display: block;
      background:
        radial-gradient(ellipse 120% 60% at 50% -10%, rgba(255,90,0,0.14) 0%, transparent 55%),
        linear-gradient(165deg, #241009 0%, #160702 40%, #0b0301 100%);
      border: 1px solid rgba(255,122,26,0.28);
      border-radius: 6px 18px 6px 18px;
      padding: 0;
      text-decoration: none;
      color: inherit;
      transition: transform 0.3s cubic-bezier(0.2,0.8,0.3,1.2), border-color 0.3s, box-shadow 0.3s;
      overflow: hidden;
      isolation: isolate;
      box-shadow: 0 10px 40px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,180,80,0.15);
    }
    .card::before {
      content: ''; position: absolute; inset: 7px; z-index: 0; pointer-events: none;
      border: 1px dashed rgba(255,140,40,0.22);
      border-radius: 3px 13px 3px 13px;
      transition: border-color 0.3s;
    }
    .card::after {
      content: '⛧'; position: absolute; right: 14px; bottom: 10px; font-size: 1.6rem; line-height: 1;
      color: rgba(255,90,0,0.16); transition: all 0.3s; z-index: 1;
    }
    .card:hover {
      border-color: #ff7a1a;
      transform: translateY(-6px) rotateX(3deg);
      box-shadow: 0 18px 60px rgba(255,60,0,0.4), 0 0 0 1px rgba(255,140,0,0.5), 0 0 40px rgba(255,100,0,0.25), inset 0 1px 0 rgba(255,200,100,0.35);
    }
    .card:hover::before { border-color: rgba(255,170,60,0.55); }
    .card:hover::after { color: rgba(255,140,0,0.7); text-shadow: 0 0 14px rgba(255,100,0,0.9); transform: rotate(-12deg) scale(1.15); }
    .card-inner { position: relative; z-index: 2; padding: 1.3rem 1.4rem 1.25rem; }
    .card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.9rem; }
    .soul-no {
      display: inline-flex; align-items: center; justify-content: center;
      width: 44px; height: 44px; border-radius: 50%;
      font-family: 'Pirata One', serif; font-size: 1.25rem; color: #ffcf7a;
      background: radial-gradient(circle at 35% 30%, #4a1a08 0%, #1a0802 65%);
      border: 1px solid rgba(255,160,60,0.5);
      box-shadow: 0 0 14px rgba(255,100,0,0.35), inset 0 0 10px rgba(255,80,0,0.3);
      text-shadow: 0 0 10px rgba(255,150,0,0.8);
    }
    .soul-runes { font-size: 0.7rem; letter-spacing: 0.35em; color: rgba(255,130,50,0.45); }
    .card h2 {
      font-family: 'Pirata One', 'Metal Mania', serif;
      font-weight: 400;
      font-size: 2rem;
      line-height: 1;
      margin-bottom: 0.45rem;
      background: linear-gradient(180deg, #fff3c4 0%, #ffbe4a 30%, #ff6a00 60%, #c41e00 85%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.9)) drop-shadow(0 0 14px rgba(255,80,0,0.35));
      letter-spacing: 0.02em;
    }
    .card:hover h2 { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.9)) drop-shadow(0 0 22px rgba(255,100,0,0.7)); }
    .card p {
      font-size: 0.88rem;
      color: #b98a68;
      line-height: 1.55;
      font-style: italic;
      font-family: Georgia, serif;
      min-height: 2.6em;
    }
    .card .go {
      display: flex; align-items: center; gap: 10px;
      margin-top: 1.1rem; padding-top: 0.95rem;
      border-top: 1px solid rgba(255,120,30,0.15);
      font-size: 0.72rem; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase;
      color: #ff9a4a;
    }
    .card .go .seal {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 50%;
      background: radial-gradient(circle at 35% 30%, #ff5a00, #8b0d00 70%);
      color: #ffe9c4; font-size: 0.7rem;
      box-shadow: 0 0 12px rgba(255,60,0,0.6);
      transition: transform 0.3s;
    }
    .card:hover .go { color: #ffd88a; }
    .card:hover .go .seal { transform: translateY(2px) scale(1.1); box-shadow: 0 0 20px rgba(255,100,0,0.9); }
    .ember-glow {
      position: absolute; left: -20%; right: -20%; bottom: -60px; height: 120px; z-index: 1;
      background: radial-gradient(ellipse 50% 100% at 50% 100%, rgba(255,100,0,0.35) 0%, transparent 70%);
      opacity: 0; transition: opacity 0.35s; pointer-events: none;
    }
    .card:hover .ember-glow { opacity: 1; }
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
      .mountains { bottom: 110px; height: 260px; }
      .lava-floor { height: 120px; }
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
    <svg viewBox="0 0 1440 380" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="rockL" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#0a0200"/><stop offset="0.42" stop-color="#221006"/><stop offset="0.6" stop-color="#31170b"/><stop offset="1" stop-color="#0b0301"/>
        </linearGradient>
        <linearGradient id="rockR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#0a0200"/><stop offset="0.45" stop-color="#261109"/><stop offset="0.62" stop-color="#33180c"/><stop offset="1" stop-color="#0c0301"/>
        </linearGradient>
        <linearGradient id="rockM" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#160a05"/><stop offset="1" stop-color="#070100"/>
        </linearGradient>
        <linearGradient id="lavaChan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff3a0"/><stop offset="0.35" stop-color="#ffb300"/><stop offset="1" stop-color="#ff3d00"/>
        </linearGradient>
        <radialGradient id="craterGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#ffca55" stop-opacity="0.8"/><stop offset="0.45" stop-color="#ff7a00" stop-opacity="0.35"/><stop offset="1" stop-color="#ff3d00" stop-opacity="0"/>
        </radialGradient>
        <filter id="soft8" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8"/></filter>
        <filter id="soft4" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.5"/></filter>
      </defs>
      <!-- far silhouettes: two depth layers -->
      <path d="M0 380 L0 305 L60 275 L120 300 L190 255 L250 295 L320 260 L390 300 L460 270 L530 305 L600 265 L680 305 L750 275 L830 310 L900 270 L980 308 L1050 272 L1130 308 L1200 278 L1280 310 L1360 285 L1440 305 L1440 380 Z" fill="#0a0200" opacity="0.85"/>
      <path d="M0 380 L0 335 L110 310 L220 340 L330 312 L440 345 L560 318 L680 348 L800 320 L920 348 L1040 322 L1160 348 L1280 324 L1440 345 L1440 380 Z" fill="#120402" opacity="0.9"/>
      <!-- LEFT VOLCANO — tallest of the range -->
      <g>
        <path d="M50 380 L170 275 L220 220 L260 165 L290 118 L315 126 L345 128 L370 124 L395 116 L430 170 L470 225 L520 285 L610 380 Z" fill="url(#rockL)" stroke="rgba(0,0,0,0.6)" stroke-width="1.5"/>
        <path d="M345 128 L370 124 L395 116 L430 170 L470 225 L520 285 L610 380 L345 380 Z" fill="#000" opacity="0.3"/>
        <path d="M290 118 L240 200 L190 280" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="2"/>
        <path d="M395 116 L445 200 L500 285" fill="none" stroke="rgba(0,0,0,0.45)" stroke-width="2"/>
        <path d="M290 118 L240 200 L190 280" fill="none" stroke="rgba(255,120,20,0.18)" stroke-width="1" transform="translate(6,0)"/>
        <path d="M315 175 L295 245 L280 320" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1.5"/>
        <path d="M365 175 L385 245 L400 320" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1.5"/>
        <path d="M290 118 L315 126 L345 128 L370 124 L395 116 L380 138 L340 146 L300 144 L285 132 Z" fill="#050000"/>
        <ellipse cx="338" cy="138" rx="34" ry="7" fill="url(#lavaChan)"/>
        <ellipse cx="338" cy="137" rx="17" ry="3.5" fill="#ffe9a0"/>
        <path d="M318 144 C312 190 320 240 310 290 L304 348 L314 348 C322 295 320 200 326 144 Z" fill="url(#lavaChan)" opacity="0.9"/>
        <path d="M356 144 C362 195 354 250 362 310 L366 348 L358 348 C352 295 354 200 348 144 Z" fill="url(#lavaChan)" opacity="0.85"/>
        <ellipse cx="309" cy="350" rx="9" ry="4" fill="#ff6a00" opacity="0.8"/>
        <ellipse cx="362" cy="350" rx="8" ry="4" fill="#ff6a00" opacity="0.8"/>
        <!-- glow IN FRONT of the cone so the crater reads as emitting light -->
        <ellipse cx="338" cy="136" rx="72" ry="24" fill="url(#craterGlow)" opacity="0.55" filter="url(#soft8)"/>
        <ellipse cx="314" cy="88" rx="40" ry="15" fill="#160a06" opacity="0.5" filter="url(#soft4)"/>
        <ellipse cx="328" cy="66" rx="52" ry="18" fill="#160a06" opacity="0.3" filter="url(#soft4)"/>
      </g>
      <!-- RIGHT VOLCANO — shorter, broader than the left -->
      <g>
        <path d="M840 380 L950 280 L990 235 L1020 185 L1048 142 L1075 150 L1100 153 L1125 150 L1152 140 L1185 190 L1225 240 L1270 290 L1390 380 Z" fill="url(#rockR)" stroke="rgba(0,0,0,0.6)" stroke-width="1.5"/>
        <path d="M1100 153 L1125 150 L1152 140 L1185 190 L1225 240 L1270 290 L1390 380 L1100 380 Z" fill="#000" opacity="0.3"/>
        <path d="M1048 142 L1005 215 L965 290" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="2"/>
        <path d="M1152 140 L1205 215 L1260 290" fill="none" stroke="rgba(0,0,0,0.45)" stroke-width="2"/>
        <path d="M1078 195 L1060 260 L1048 320" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1.5"/>
        <path d="M1128 195 L1145 260 L1158 322" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1.5"/>
        <path d="M1048 142 L1075 150 L1100 153 L1125 150 L1152 140 L1140 162 L1100 169 L1060 162 Z" fill="#050000"/>
        <ellipse cx="1100" cy="160" rx="36" ry="7.5" fill="url(#lavaChan)"/>
        <ellipse cx="1100" cy="159" rx="18" ry="3.5" fill="#ffe9a0"/>
        <path d="M1080 166 C1074 210 1082 260 1074 305 L1070 345 L1078 345 C1086 298 1084 210 1088 166 Z" fill="url(#lavaChan)" opacity="0.9"/>
        <path d="M1118 166 C1124 212 1116 265 1124 312 L1128 345 L1120 345 C1114 296 1116 210 1110 166 Z" fill="url(#lavaChan)" opacity="0.85"/>
        <ellipse cx="1074" cy="347" rx="8" ry="4" fill="#ff6a00" opacity="0.8"/>
        <ellipse cx="1124" cy="347" rx="8" ry="4" fill="#ff6a00" opacity="0.8"/>
        <!-- glow IN FRONT of the cone so the crater reads as emitting light -->
        <ellipse cx="1100" cy="158" rx="74" ry="25" fill="url(#craterGlow)" opacity="0.55" filter="url(#soft8)"/>
        <ellipse cx="1094" cy="112" rx="42" ry="16" fill="#160a06" opacity="0.5" filter="url(#soft4)"/>
        <ellipse cx="1108" cy="86" rx="54" ry="19" fill="#160a06" opacity="0.3" filter="url(#soft4)"/>
      </g>
      <!-- distant middle cone (depth filler, pushed right off-center) -->
      <g opacity="0.9" transform="translate(60,18)">
        <path d="M560 380 L700 240 L740 195 L760 202 L780 205 L800 202 L820 195 L860 240 L1000 380 Z" fill="#0d0301" stroke="rgba(0,0,0,0.6)" stroke-width="1"/>
        <path d="M740 195 L760 202 L780 205 L800 202 L820 195 L812 208 L780 212 L748 208 Z" fill="#050000"/>
        <ellipse cx="780" cy="206" rx="18" ry="4" fill="url(#lavaChan)" opacity="0.9"/>
        <ellipse cx="780" cy="206" rx="30" ry="8" fill="url(#craterGlow)" opacity="0.35"/>
      </g>
      <!-- small front cone, pushed left to break the symmetry -->
      <g opacity="0.95" transform="translate(-110,8)">
        <path d="M540 380 L585 310 L600 275 L610 245 L620 249 L630 250 L640 249 L650 245 L662 272 L678 310 L710 380 Z" fill="url(#rockM)" stroke="rgba(0,0,0,0.6)" stroke-width="1"/>
        <path d="M610 245 L620 249 L630 250 L640 249 L650 245 L644 255 L630 257 L616 255 Z" fill="#050000"/>
        <ellipse cx="630" cy="253" rx="10" ry="2.5" fill="url(#lavaChan)"/>
        <path d="M626 256 C625 290 626 330 L624 366 L628 366 C630 330 629 290 630 256 Z" fill="#ff7a00" opacity="0.7"/>
        <ellipse cx="630" cy="253" rx="16" ry="5" fill="url(#craterGlow)" opacity="0.35"/>
      </g>
    </svg>
  </div>
  <div class="lava-floor" aria-hidden="true"><canvas id="lava"></canvas><div class="lava-rim"></div></div>
  <canvas id="fire"></canvas>
  <canvas id="ash"></canvas>
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
      <p class="subtitle" id="sub"></p>
      <p class="disclaimer"><span>⚠ ${entries.length} project${entries.length !== 1 ? "s" : ""} of pure AI slop ⚠</span></p>
    </div>
    ${
      entries.length
        ? `<div class="grid">${entries
            .map(
              (e, i) =>
                `<a class="card" href="/${e.slug}/">
          <div class="card-inner">
            <div class="card-top"><span class="soul-no">${String(i + 1).padStart(2, "0")}</span><span class="soul-runes">᛭ ᚺ ᛖ ᛚ ᛚ</span></div>
            <h2>${e.title}</h2>${e.description ? `<p>${e.description}</p>` : ""}
        
          </div>
          <div class="ember-glow"></div>
        </a>`
            )
            .join("\n      ")}</div>`
        : `<p class="empty">your mother is taking a shit</p>`
    }
    <footer>est. MMXXVI &nbsp;·&nbsp; <b>no refunds</b> &nbsp;·&nbsp; souls processed daily</footer>
  </div>
<script>
(function () {
  // Random subtitle on load
  var subs = [
    'today is slop day. prepare','who wants slop juice','is this hell (yes)','this is lit','ts pmo',
    'the stuff on the floor is actually not lava. its slop','slop','sloppy slophole','a vault site of faulty shite',
    'look at those bouncy flames','it is 3 am','who polished the moon','is that like a malformed bowling ball on the right',
    'oh no the lava is on fire','actually, gigel prats works flawlessly','now with chicken','illegal in finland!',
    'what do we have here','did you get hit by another meteor','adedo','haaki','adedo haaki',
    'sun mutsisi on kakalla (täällä)','i feel green','do you feel green','soulless slop','slopless soul',
    'poopy','do NOT visit the restaurant','the restaurant is actually fine','this is fine','welcome home',
    'or heaven depending on what you like','hell','rated 1 star (the one behind this text)', 'wow', 'real',
    'this is a real site', 'oh no', 'im helling it', 'okay then', 'please stop', 'please slop',
    'i wonder how long i can make these. i mean i bet a very long one would make you notice these subtitles for once. but lets not make it extreme'
  ];
  var el = document.getElementById('sub');
  if (el) el.textContent = subs[Math.floor(Math.random() * subs.length)];

  var lavaC0 = document.getElementById('lava');
  function paintStaticLava() {
    if (!lavaC0) return;
    lavaC0.width = window.innerWidth;
    lavaC0.height = window.innerWidth < 600 ? 120 : 150;
    var c = lavaC0.getContext('2d');
    var g = c.createLinearGradient(0, 0, 0, lavaC0.height);
    g.addColorStop(0, '#ffe27a'); g.addColorStop(0.3, '#ff6a00');
    g.addColorStop(0.65, '#c41e00'); g.addColorStop(1, '#2a0300');
    c.fillStyle = g; c.fillRect(0, 0, lavaC0.width, lavaC0.height);
  }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { paintStaticLava(); return; }
  var fire = document.getElementById('fire');
  var ashC = document.getElementById('ash');
  var lavaC = document.getElementById('lava');
  var fx = fire.getContext('2d');
  var ax = ashC.getContext('2d');
  var lx = lavaC.getContext('2d');
  // PERF: canvases run at CSS-pixel resolution (DPR 1). Fire/lava are blurry
  // by nature so supersampling buys nothing and doubles fill cost.
  var fireBase = null, lavaBase = null, lavaShade = null;
  var glowSprite = null, darkBlob = null;
  function makeGlowSprite() {
    var s = document.createElement('canvas'); s.width = s.height = 128;
    var c = s.getContext('2d');
    var g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,244,200,1)');
    g.addColorStop(0.35, 'rgba(255,190,60,0.55)');
    g.addColorStop(1, 'rgba(255,100,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    return s;
  }
  function makeDarkBlob() {
    var s = document.createElement('canvas'); s.width = s.height = 128;
    var c = s.getContext('2d');
    var g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(30,8,2,0.20)');
    g.addColorStop(0.7, 'rgba(30,8,2,0.08)');
    g.addColorStop(1, 'rgba(20,5,1,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    return s;
  }
  glowSprite = makeGlowSprite(); darkBlob = makeDarkBlob();
  function fit() {
    fire.width = window.innerWidth;
    fire.height = window.innerWidth < 600 ? 240 : 300;
    ashC.width = window.innerWidth;
    ashC.height = window.innerHeight;
    lavaC.width = window.innerWidth;
    lavaC.height = window.innerWidth < 600 ? 120 : 150;
    // cache static gradients once per resize — never per frame
    var g = fx.createLinearGradient(0, fire.height, 0, fire.height * 0.2);
    g.addColorStop(0, 'rgba(255,120,0,0.5)');
    g.addColorStop(0.4, 'rgba(200,30,0,0.28)');
    g.addColorStop(1, 'rgba(80,0,0,0)');
    fireBase = g;
    var b = lx.createLinearGradient(0, 0, 0, lavaC.height);
    b.addColorStop(0, '#ffe27a');
    b.addColorStop(0.12, '#ffb300');
    b.addColorStop(0.32, '#ff6a00');
    b.addColorStop(0.6, '#d42a00');
    b.addColorStop(0.85, '#6e0d00');
    b.addColorStop(1, '#2a0300');
    lavaBase = b;
    var sh = lx.createLinearGradient(0, lavaC.height * 0.7, 0, lavaC.height);
    sh.addColorStop(0, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(10,0,0,0.55)');
    lavaShade = sh;
  }
  fit();
  var fitT = null;
  window.addEventListener('resize', function () {
    if (fitT) return;
    fitT = setTimeout(function () { fitT = null; fit(); }, 150);
  });
  var T = 0;
  // PERF: 35 tongues (was 86). Solid fills, no per-frame gradients.
  var layers = [
    { n: 14, hMin: 90, hMax: 200, wMin: 60, wMax: 130, col: 'rgba(200,30,0,0.55)' },
    { n: 12, hMin: 60, hMax: 150, wMin: 36, wMax: 80,  col: 'rgba(255,90,0,0.60)' },
    { n: 9,  hMin: 30, hMax: 95,  wMin: 16, wMax: 42,  col: 'rgba(255,170,40,0.75)' }
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
  for (var s = 0; s < 42; s++) sparks.push({ x: Math.random(), y: Math.random(), v: 0.0008 + Math.random() * 0.0018, sz: 0.6 + Math.random() * 2.2, sw: Math.random() * 6.28, ember: Math.random() < 0.55, tw: 1 + Math.random() * 3 });
  var cinders = [];
  for (var c = 0; c < 14; c++) cinders.push({ x: Math.random(), y: 0.6 + Math.random() * 0.4, v: 0.002 + Math.random() * 0.004, sz: 1 + Math.random() * 2.5, life: Math.random() });
  function drawFire(dt) {
    var W = fire.width, H = fire.height;
    fx.globalCompositeOperation = 'source-over';
    fx.clearRect(0, 0, W, H);
    fx.fillStyle = fireBase;
    fx.fillRect(0, 0, W, H);
    // PERF: solid fills only — zero per-frame gradients. 'lighter' blend
    // on flat shapes is far cheaper than 100+ gradient fills.
    fx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < tongues.length; i++) {
      var t = tongues[i], L = layers[t.li];
      var sway = Math.sin(T * t.sp + t.ph) * (4 + t.li * 2);
      var flick = 0.9 + 0.1 * Math.sin(T * (2 + t.sp) + t.ph * 2);
      var bx = t.x * W + sway;
      var bh = H + 10;
      var th = t.h * flick;
      var tw = t.w * (1.1 - flick * 0.15);
      fx.fillStyle = L.col;
      fx.beginPath();
      fx.moveTo(bx - tw / 2, bh);
      fx.quadraticCurveTo(bx - tw * 0.2, bh - th * 0.7, bx + sway * 0.3, bh - th);
      fx.quadraticCurveTo(bx + tw * 0.2, bh - th * 0.7, bx + tw / 2, bh);
      fx.closePath();
      fx.fill();
    }
    fx.globalCompositeOperation = 'source-over';
  }
  function drawAsh(dt) {
    var W = ashC.width, H = ashC.height;
    ax.globalCompositeOperation = 'source-over';
    ax.clearRect(0, 0, W, H);
    // PERF: no shadowBlur anywhere (it forces a full offscreen blur pass
    // per particle). Embers use the pre-rendered glow sprite instead.
    var i, p, px, py;
    for (i = 0; i < sparks.length; i++) {
      p = sparks[i];
      p.y -= p.v * dt; p.sw += 0.01 * dt;
      if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
      px = p.x * W + Math.sin(p.sw * 3 + T) * 6;
      py = p.y * H;
      if (p.ember) {
        var gs = p.sz * 7;
        ax.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(T * p.tw + p.sw));
        ax.drawImage(glowSprite, px - gs / 2, py - gs / 2, gs, gs);
      } else {
        ax.globalAlpha = 0.28;
        ax.fillStyle = '#a08c82';
        ax.fillRect(px, py, p.sz, p.sz);
      }
    }
    ax.globalAlpha = 1;
    ax.globalCompositeOperation = 'lighter';
    for (i = 0; i < cinders.length; i++) {
      p = cinders[i];
      p.life += 0.008 * dt;
      p.y -= p.v * 0.6 * dt;
      if (p.y < 0.35 || p.life > 1) { p.y = 0.95 + Math.random() * 0.05; p.x = Math.random(); p.life = 0; }
      var fade = 1 - p.life;
      var cs = (p.sz * fade + 0.4) * 6;
      ax.globalAlpha = fade * 0.8;
      ax.drawImage(glowSprite, p.x * W - cs / 2, p.y * H - cs / 2, cs, cs);
    }
    ax.globalAlpha = 1;
    ax.globalCompositeOperation = 'source-over';
  }
  /* ── LAVA LAKE: cached base + sprite hotspots/cracks/bubbles, no shadowBlur ── */
  var cracksH = [];
  for (var chi = 0; chi < 5; chi++) {
    cracksH.push({
      yBase: 0.1 + (chi / 5) * 0.8 + (Math.random() - 0.5) * 0.05,
      seed: Math.random() * 100,
      drift: 6 + Math.random() * 14,
      ph: Math.random() * 6.28,
      w: 1.2 + Math.random() * 1.2,
      amp: 4 + Math.random() * 6
    });
  }
  var hotspots = [];
  for (var hi = 0; hi < 8; hi++) hotspots.push({ x: Math.random(), y: 0.15 + Math.random() * 0.7, r: 60 + Math.random() * 110, ph: Math.random() * 6.28, sp: 0.8 + Math.random() * 1.6 });
  var bubbles = [];
  for (var bi = 0; bi < 8; bi++) bubbles.push({ x: Math.random(), y: Math.random(), r: 2 + Math.random() * 5, life: Math.random(), sp: 0.008 + Math.random() * 0.02 });
  function drawLava(dt) {
    if (!dt) dt = 1;
    var W = lavaC.width, H = lavaC.height;
    if (!W || !H) return;
    // PERF: base + shade gradients cached on resize; hotspots are sprite blits
    lx.globalCompositeOperation = 'source-over';
    lx.fillStyle = lavaBase;
    lx.fillRect(0, 0, W, H);
    lx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < hotspots.length; i++) {
      var hs = hotspots[i];
      var pulse = 0.55 + 0.45 * Math.sin(T * hs.sp + hs.ph);
      var hx = ((hs.x + T * 0.004 * hs.sp) % 1) * W;
      var hy = hs.y * H;
      lx.globalAlpha = 0.5 * pulse;
      lx.drawImage(glowSprite, hx - hs.r, hy - hs.r, hs.r * 2, hs.r * 2);
      if (hx < hs.r) lx.drawImage(glowSprite, hx + W - hs.r, hy - hs.r, hs.r * 2, hs.r * 2);
      if (hx > W - hs.r) lx.drawImage(glowSprite, hx - W - hs.r, hy - hs.r, hs.r * 2, hs.r * 2);
    }
    lx.globalAlpha = 1;
    // PERF: 2 streaks, no shadowBlur, plain strokes
    lx.globalCompositeOperation = 'source-over';
    lx.lineWidth = 2;
    for (var st = 0; st < 2; st++) {
      var sy = H * (0.3 + st * 0.3) + Math.sin(T * 0.7 + st * 2) * 2;
      lx.strokeStyle = st ? 'rgba(255,240,180,0.16)' : 'rgba(255,240,180,0.22)';
      lx.beginPath();
      for (var x = -40; x <= W + 40; x += 60) {
        var yy = sy + Math.sin((x + T * 30) * 0.013 + st * 3) * 3 + Math.sin((x + T * 18) * 0.031 + st * 7) * 2;
        if (x === -40) lx.moveTo(x, yy); else lx.lineTo(x, yy);
      }
      lx.stroke();
    }
    // PERF: crust haze via sprite blits, not per-frame radial gradients
    for (var mi = 0; mi < 4; mi++) {
      var mx = ((mi * 0.27 + 0.05 + T * 0.002) % 1 + 1) % 1 * W;
      var my = H * (0.2 + (mi % 3) * 0.25);
      var mr = 320 + (mi % 3) * 140;
      lx.drawImage(darkBlob, mx - mr / 2, my - mr / 2, mr, mr);
      if (mx < mr / 2) lx.drawImage(darkBlob, mx + W - mr / 2, my - mr / 2, mr, mr);
      if (mx > W - mr / 2) lx.drawImage(darkBlob, mx - W - mr / 2, my - mr / 2, mr, mr);
    }
    // PERF: single-pass cracks, no shadowBlur, coarser polyline
    for (var k = 0; k < cracksH.length; k++) {
      var cr = cracksH[k];
      var flick = 0.55 + 0.35 * Math.sin(T * 1.4 + cr.ph);
      lx.strokeStyle = flick > 0.62 ? 'rgba(255,196,90,0.85)' : 'rgba(255,170,60,0.6)';
      lx.lineWidth = cr.w;
      lx.beginPath();
      var started = false;
      for (var gx = -40; gx <= W + 40; gx += 44) {
        var gy = cr.yBase * H + Math.sin((gx + T * cr.drift * 2 + cr.seed * 40) * 0.018 + cr.ph) * cr.amp;
        if (!started) { lx.moveTo(gx, gy); started = true; }
        else lx.lineTo(gx, gy);
      }
      lx.stroke();
    }
    // PERF: bubbles via glow sprite
    lx.globalCompositeOperation = 'lighter';
    for (var b = 0; b < bubbles.length; b++) {
      var bb = bubbles[b];
      bb.life += bb.sp * dt;
      if (bb.life > 1) { bb.life = 0; bb.x = Math.random(); bb.y = 0.2 + Math.random() * 0.7; }
      var br = bb.r * (0.5 + bb.life * 1.6) * 2.4;
      var ba = bb.life < 0.7 ? 0.7 : 0.7 * (1 - (bb.life - 0.7) / 0.3);
      lx.globalAlpha = ba;
      lx.drawImage(glowSprite, bb.x * W - br, bb.y * H - br, br * 2, br * 2);
    }
    lx.globalAlpha = 1;
    lx.globalCompositeOperation = 'source-over';
    lx.fillStyle = lavaShade;
    lx.fillRect(0, 0, W, H);
  }
  // PERF: pause offscreen + lava at half rate (every 2nd frame)
  var frame = 0, running = true, lastT = 0;
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) { lastT = 0; requestAnimationFrame(loop); }
  });
  function loop(ts) {
    if (!running) return;
    // PERF: frame-rate-independent dt. Target = 60 fps baseline.
    // On 240 Hz monitors rAF fires 4× more often; dt scales T down
    // so every animation speed stays identical to a 60 Hz display.
    if (!lastT) lastT = ts;
    var dt = (ts - lastT) / 16.667;
    lastT = ts;
    if (dt > 3) dt = 3; // cap large jumps (tab was backgrounded)
    T += 0.03 * dt;
    frame++;
    drawFire(dt);
    if (frame % 2 === 0) drawLava(dt);
    drawAsh(dt);
    requestAnimationFrame(loop);
  }
  drawLava();
  requestAnimationFrame(loop);
})();
</script>
</body>
</html>
`;

  fs.writeFileSync(path.join(ROOT, "index.html"), html, "utf8");
  console.log(`✓ Built index.html with ${entries.length} project(s).`);
}

buildIndex();
