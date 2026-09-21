/* HELL ADS — the one shared ad system for all of hell.
   Cross-promotes every slop on the site with fake-mobile-game energy.
   Usage:
     <script src="../hell-ads.js"></script>
     HellAds.mount(el, {exclude:'dood'});                 // rotating banner
     HellAds.mount(el, {exclude:'dood', style:'card'});   // sidebar card
     el.innerHTML = HellAds.interstitialHTML(HellAds.pick('the dangler 4d'));
     HellAds.play(el, {secs:5, exclude:'dood', onDone:fn}); // unskippable fake video ad
*/
(function () {
  if (typeof window === 'undefined') return;
  var ADS = [
    { slug: 'anti-glorp', icon: '🔫👽', title: 'ANTI-GLORP', tag: 'Mars Needs Gibs', copy: 'Blast glorps. Paint the red planet redder. 9/10 glorps prefer being shot.', cta: 'BLAST FREE', hue: 8 },
    { slug: 'dood', icon: '🔫😈', title: 'DOOD', tag: 'Seeded Demon Warehouse', copy: 'Shotgun. Portals. One unkillable spider. Dave died on level 1.', cta: 'RIP & TEAR', hue: 0 },
    { slug: 'gigel prats', icon: '❓✨', title: 'GIGEL PRATS', tag: 'Nobody Knows What It Is', copy: 'Not even Dave. Play it anyway. It might be the next big thing. (It is not. That is a different slop.)', cta: 'FIND OUT??', hue: 265 },
    { slug: 'highway to ts', icon: '🚗💥', title: 'HIGHWAY TO TS', tag: 'Certified Emotionally Damaging', copy: 'The first car can NOT kill you. Your feelings? No such warranty.', cta: 'DRIVE', hue: 210 },
    { slug: 'legend-of-pludski', icon: '🗡️🐀', title: 'LEGEND OF PLUDSKI', tag: 'A Legend. Of Pludski.', copy: 'That is the entire pitch. The pludski speaks for itself. (It does not speak.)', cta: 'BEHOLD', hue: 150 },
    { slug: 'next big thing', icon: '📦🔥', title: 'NEXT BIG THING', tag: "It's Next. It's Big.", copy: "It's a thing. What thing? THE NEXT ONE. Stop asking questions and click.", cta: 'SEE THING', hue: 45 },
    { slug: 'poopy butthole', icon: '🍽️💩', title: 'POOPY BUTTHOLE', tag: "Mauppi1's Restaurant", copy: '102 flavours. Kathunk condemned 11. Chef\u2019s Number Two is BACK.', cta: 'TASTE', hue: 25 },
    { slug: 'potslop', icon: '🍲🧔', title: 'POTSLOP', tag: '54 Soups. 1 Beard.', copy: 'Brew every soup. Kathunk Harris judges ALL. The beard knows.', cta: 'BREW NOW', hue: 95 },
    { slug: 'slop royal', icon: '👑🌊', title: 'SLOP ROYAL', tag: 'River-Dump Radius +10%', copy: 'Goblins furious. Slop Master unbothered. Dump like royalty.', cta: 'DUMP', hue: 275 },
    { slug: 'the dangler 4d', icon: '🛹👹', title: 'SUBWAY DANGLER SURF', tag: 'Dangle \u2022 Surf \u2022 Subway', copy: 'ALL THREE!! 500M+ downloads*. +3 energy FREE if you watch Dave eat a sandwich.', cta: 'INSTALL FREE', hue: 130 },
    { slug: 'the mangler', icon: '😱🌀', title: 'THE MANGLER', tag: 'Now With Jumpscares', copy: 'Spoiler-tag them. Dave didn\u2019t. Dave is gone now.', cta: 'GET MANGLED', hue: 320 },
    { slug: 'the mangler 3d', icon: '👁️🏃', title: 'THE MANGLER 3D', tag: 'IT Is Behind You', copy: '4% faster. 100% more behind you. Do not turn around. (Turn around.)', cta: 'RUN', hue: 190 }
  ];
  function href(slug) { return '/' + slug + '/'; }
  function pick(exclude) {
    var pool = ADS.filter(function (a) { return a.slug !== exclude; });
    if (!pool.length) pool = ADS;
    return pool[(Math.random() * pool.length) | 0];
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function bannerHTML(ad) {
    return '<a class="hellad hellad-banner" href="' + href(ad.slug) + '" style="--h:' + ad.hue + '">' +
      '<span class="hellad-tag">AD</span>' +
      '<span class="hellad-icon">' + ad.icon + '</span>' +
      '<span class="hellad-body"><b>' + esc(ad.title) + ' — ' + esc(ad.tag) + '</b><i>' + esc(ad.copy) + '</i></span>' +
      '<span class="hellad-cta">' + esc(ad.cta) + '</span></a>';
  }
  function cardHTML(ad) {
    return '<a class="hellad hellad-card" href="' + href(ad.slug) + '" style="--h:' + ad.hue + '">' +
      '<span class="hellad-tag">AD</span>' +
      '<span class="hellad-icon big">' + ad.icon + '</span>' +
      '<b class="hellad-title">' + esc(ad.title) + '</b>' +
      '<span class="hellad-sub">' + esc(ad.tag) + '</span>' +
      '<p>' + esc(ad.copy) + '</p>' +
      '<span class="hellad-cta">' + esc(ad.cta) + ' ⛧</span>' +
      '<span class="hellad-fine">*downloads counted by Dave</span></a>';
  }
  function interstitialHTML(ad) {
    return '<div class="hellad-icon huge">' + ad.icon + '</div>' +
      '<h2>' + esc(ad.title) + '</h2>' +
      '<p class="hellad-tagline">' + esc(ad.tag) + ' — ' + esc(ad.copy) + '</p>' +
      '<button class="install">' + esc(ad.cta) + '!!</button>' +
      '<div class="hellad-fake">gameplay footage (not really) · rated 4.9★ by Dave</div>';
  }
  function mount(el, opts) {
    if (!el) return null;
    opts = opts || {};
    var ad = pick(opts.exclude);
    el.innerHTML = opts.style === 'card' ? cardHTML(ad) : bannerHTML(ad);
    return ad;
  }
  // Fake unskippable video ad. Renders into el, counts down, then offers CONTINUE.
  // onDone fires only for a fully-watched ad. There is no skip. Obviously.
  function play(el, opts) {
    if (!el) return;
    opts = opts || {};
    var secs = opts.secs || 5;
    var ad = pick(opts.exclude);
    el.innerHTML =
      '<div class="hellad-player">' +
      '<div class="hellad-top"><span class="hellad-tag">AD · HELL ADS</span><span class="hellad-timer">0:0' + secs + '</span></div>' +
      '<div class="hellad-creative">' + interstitialHTML(ad) + '</div>' +
      '<div class="hellad-bar"><div class="hellad-fill"></div></div>' +
      '<button class="hellad-go" style="display:none">✔ CONTINUE</button>' +
      '<div class="hellad-skipnote">no skip. obviously.</div></div>';
    el.style.display = 'flex';
    if (opts.onStart) opts.onStart(ad); // e.g. pause game music while the ad plays
    var t0 = Date.now();
    var timer = el.querySelector('.hellad-timer');
    var fill = el.querySelector('.hellad-fill');
    var go = el.querySelector('.hellad-go');
    var cta = el.querySelector('.hellad-creative .install');
    if (cta) cta.onclick = function () { cta.textContent = 'INSTALLING... (not really)'; };
    var iv = setInterval(function () {
      var left = Math.max(0, secs - (Date.now() - t0) / 1000);
      var s = Math.ceil(left);
      timer.textContent = '0:0' + s;
      fill.style.width = (100 * (1 - left / secs)).toFixed(1) + '%';
      if (left <= 0) {
        clearInterval(iv);
        timer.textContent = '0:00';
        fill.style.width = '100%';
        go.style.display = 'inline-block';
        go.onclick = function () {
          el.style.display = 'none'; el.innerHTML = '';
          if (opts.onDone) opts.onDone(ad);
        };
      }
    }, 100);
  }
  function injectCSS() {
    if (document.getElementById('hellad-css')) return;
    var st = document.createElement('style');
    st.id = 'hellad-css';
    st.textContent =
      '.hellad{--h:10;display:flex;align-items:center;gap:.7rem;text-decoration:none;color:#ffe9c4;' +
      'background:linear-gradient(165deg,hsl(var(--h),60%,16%) 0%,hsl(var(--h),70%,7%) 60%,#0b0301 100%);' +
      'border:1px solid hsl(var(--h),90%,55%);border-radius:10px;padding:.6rem .8rem;position:relative;' +
      'box-shadow:0 0 18px hsla(var(--h),90%,50%,.35);font-family:inherit;box-sizing:border-box}' +
      '.hellad:hover{border-color:#fff;box-shadow:0 0 26px hsla(var(--h),90%,55%,.6)}' +
      '.hellad-banner{width:100%}' +
      '.hellad-tag{position:absolute;top:-9px;left:10px;background:#ffd23f;color:#000;font-size:.6rem;font-weight:900;' +
      'letter-spacing:.12em;padding:1px 7px;border-radius:4px}' +
      '.hellad-icon{font-size:1.7rem;line-height:1;flex:none;filter:drop-shadow(0 0 8px rgba(255,255,255,.25))}' +
      '.hellad-icon.big{font-size:2.6rem}' +
      '.hellad-icon.huge{font-size:84px;animation:hellad-bob 1.2s ease-in-out infinite}' +
      '@keyframes hellad-bob{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-10px) rotate(3deg)}}' +
      '.hellad-body{display:flex;flex-direction:column;gap:2px;min-width:0}' +
      '.hellad-body b{font-size:.82rem;letter-spacing:.02em;color:#fff}' +
      '.hellad-body i{font-size:.7rem;color:#d8a97f;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}' +
      '.hellad-cta{margin-left:auto;flex:none;font-size:.68rem;font-weight:900;letter-spacing:.08em;color:#06130a;' +
      'background:linear-gradient(180deg,#7dff8a,#2ecc5a);border-radius:999px;padding:.5rem .9rem;' +
      'box-shadow:0 0 12px rgba(80,255,120,.55);white-space:nowrap}' +
      '.hellad-card{flex-direction:column;text-align:center;padding:1rem .9rem .8rem}' +
      '.hellad-card .hellad-tag{left:50%;transform:translateX(-50%)}' +
      '.hellad-title{font-size:1rem;color:#fff;letter-spacing:.03em}' +
      '.hellad-sub{font-size:.7rem;color:#ffcf7a;font-weight:800;letter-spacing:.14em;text-transform:uppercase}' +
      '.hellad-card p{font-size:.75rem;color:#c98a5f;font-style:italic;line-height:1.5;margin:.2rem 0 .6rem}' +
      '.hellad-card .hellad-cta{margin:0}' +
      '.hellad-fine{display:block;font-size:.58rem;color:#8a6a3a;margin-top:.5rem}' +
      '.hellad-tagline{color:#c9a68a;font-size:15px;max-width:420px;line-height:1.5}' +
      '.hellad-fake{font-size:11px;color:#8a6a3a;margin-top:10px}' +
      '.hellad-player{display:flex;flex-direction:column;align-items:center;gap:12px;width:min(480px,92%);' +
      'background:rgba(5,0,0,.96);border:2px solid #ffd23f;border-radius:14px;padding:16px;position:relative}' +
      '.hellad-top{display:flex;justify-content:space-between;width:100%;align-items:center}' +
      '.hellad-top .hellad-tag{position:static}' +
      '.hellad-timer{color:#ffd23f;font-weight:900;font-variant-numeric:tabular-nums}' +
      '.hellad-creative{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}' +
      '.hellad-creative h2{margin:6px 0 0;font-size:26px}' +
      '.hellad-creative .install{background:#37e08b;color:#063;font-weight:900;border:none;border-radius:12px;' +
      'padding:12px 30px;font-size:17px;cursor:pointer;box-shadow:0 0 16px rgba(55,224,139,.6)}' +
      '.hellad-bar{width:100%;height:8px;background:#2a1408;border-radius:99px;overflow:hidden}' +
      '.hellad-fill{height:100%;width:0;background:linear-gradient(90deg,#ff3b00,#ffd23f)}' +
      '.hellad-go{background:#37e08b;color:#063;font-weight:900;border:none;border-radius:12px;padding:12px 30px;' +
      'font-size:17px;cursor:pointer;box-shadow:0 0 18px rgba(55,224,139,.8);animation:hellad-bob 1s ease-in-out infinite}' +
      '.hellad-skipnote{font-size:10px;color:#8a6a3a}';
    document.head.appendChild(st);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectCSS);
  else injectCSS();
  window.HellAds = { ADS: ADS, pick: pick, bannerHTML: bannerHTML, cardHTML: cardHTML, interstitialHTML: interstitialHTML, mount: mount, play: play };
})();
