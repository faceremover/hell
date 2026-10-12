/* Fast verifier for SNIBA SNIB.
   - level solvability (analytic, no simulation)
   - script integrity (every CH target exists, every cast id maps to a real node)
   - altar flow (talk -> choice -> each of 4 endings reaches the stat screen)
   Runs in well under a second. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

let fails = 0;
let performanceNow = 0;
/* advance N frames, acknowledging dialogue and blackouts the way a player would */
function advance(T, sandbox, n, onDialog) {
  for (let i = 0; i < n; i++) {
    performanceNow += 16.7;
    T.frame(performanceNow);
    /* exactly ONE press per frame, so a freshly-opened choice menu is not
       immediately answered by a second press from the same tick */
    sandbox.__fire('keydown', { key: 'e' });
    if (T.dlg()) {
      if (T.waiting()) { if (onDialog) onDialog(); else T.pick(0); }
      else T.skip();
    }
    if (T.dollar('#blackout').classList.contains('on'))
      sandbox.__fire('keydown', { key: 'Enter' });
  }
}
const fail = m => { console.log('  FAIL ' + m); fails++; };
const ok = m => console.log('  ok   ' + m);

/* ---------- pull the world + script out of the page ---------- */
const src = html.slice(html.indexOf('const VH=540'),
                       html.indexOf('/* ---------------------------------------------------------------- state -- */'));
const noop = () => {};
const { ACTS } = new Function('addEventListener','matchMedia','document','window',
  src + '\nreturn {ACTS};')(noop, () => ({matches:false}), {querySelector:()=>null}, {});

/* ---------- 1. levels ---------- */
console.log('\n[levels]');
const GY=412, PH=36, GRAV=1750, JUMP=640, SPEED=252;
const RISE=(JUMP*JUMP)/(2*GRAV)*0.8, REACH=SPEED*(2*JUMP/GRAV)*0.85*0.85;
ACTS.forEach(A => {
  const surf=[];
  A.solids.forEach(s => { if(!s.wall) surf.push({x1:s.x,x2:s.x+s.w,y:s.y}); });
  A.plats.forEach(p => surf.push({x1:p.x,x2:p.x+p.w,y:p.y,gain:p.dx?Math.abs(p.dx)*(2*JUMP/GRAV):0}));
  surf.sort((a,b)=>a.x1-b.x1||a.y-b.y);
  const S=[];
  surf.forEach(s=>{const p=S[S.length-1];
    if(p&&Math.abs(p.y-s.y)<1&&s.x1<=p.x2+1){p.x2=Math.max(p.x2,s.x2);return;} S.push(Object.assign({},s));});
  let hops=0;
  for(let i=1;i<S.length;i++){
    const a=S[i-1],b=S[i];
    if(b.x1<=a.x2+1) continue;
    hops++;
    const reach=REACH+(a.gain||0)+(b.gain||0);
    if(b.x1-a.x2>reach||a.y-b.y>RISE)
      fail(`${A.name}: hop ${a.x2.toFixed(0)}->${b.x1.toFixed(0)} unreachable`);
  }
  const spawn=S.find(s=>s.x1<=120&&s.x2>=145);
  if(!spawn) fail(`${A.name}: no spawn floor`);
  (A.beats||[]).forEach(b=>{ if(!S.some(s=>b.x>=s.x1-6&&b.x<=s.x2+6)) fail(`${A.name}: beat ${b.node} over a gap`); });
  (A.npcs||[]).forEach(n=>{ if(!S.some(s=>n.x>=s.x1-6&&n.x<=s.x2+6)) fail(`${A.name}: npc ${n.node} over a gap`); });
  if(!hops && A.haz.some(z=>z.kind==='lava')) fail(`${A.name}: lava with no stepping stones`);
  ok(`${A.name}  (${S.length} surfaces, ${hops} hops, w=${A.w})`);
});

/* ---------- 2. script integrity ---------- */
console.log('\n[script]');
const scriptSrc = html.slice(html.indexOf('const CAST=['),
                             html.indexOf('/* --------------------------------------------------------------- world ---- */'));
const { SCRIPT: _unusedS } = {};
const scriptObj = new Function(scriptSrc + '\nreturn {SCRIPT,NODE_CAST,CAST};')();
const S = scriptObj.SCRIPT, NC = scriptObj.NODE_CAST, CAST = scriptObj.CAST;
const ids = new Set(CAST.map(c=>c[0]));
let lines=0, chars=0;
for(const [name,arr] of Object.entries(S)){
  if(!Array.isArray(arr)) { fail(`node ${name} is not an array`); continue; }
  for(const it of arr){
    if(Array.isArray(it)){
      lines++; chars += String(it[1]||'').length;
      /* PRÖT is injectName()'s REPLACEMENT TOKEN, not a hardcoded name: it is
         legal in a spoken line and gets swapped for the player's chosen name at
         startGame(). It is NOT legal in a choice label, because injectName only
         maps [who,text] tuples and never touches {CH:[...]} entries. */
      const avg = String(it[1]||'').split('. ').length;
      if(String(it[1]||'').length && avg > 4)
        fail(`${name}: fragment-y line (${avg} short sentences): "${String(it[1]).slice(0,60)}"`);
    } else if(it && it.CH){
      it.CH.forEach(c=>{
        const t=c[1];
        if(typeof t==='string' && t[0]==='@'){ if(t.slice(1)==='leave')return; }
        else if(!S[t]) fail(`${name}: choice -> missing node "${t}"`);
        if(String(c[0]).indexOf('PRÖT')>=0)
          fail(`${name}: choice label hardcodes PRÖT — injectName cannot reach it`);
      });
    } else if(it && it.SET){ /* fine */ }
    else fail(`${name}: unknown entry ${JSON.stringify(it)}`);
  }
  if(!NC[name]) fail(`node ${name} has no NODE_CAST entry (cast never marked met)`);
}
ok(`${Object.keys(S).length} nodes, ${lines} lines, ${chars} chars of dialogue`);
ok(`average line length: ${Math.round(chars/lines)} chars`);
NC && Object.entries(NC).forEach(([node,c])=>c.forEach(id=>{
  if(!ids.has(id)) fail(`NODE_CAST ${node} -> unknown cast id "${id}"`);
  if(!S[node]) fail(`NODE_CAST references missing node "${node}"`);
}));

/* ---------- 3. runtime: altar flow + endings ---------- */
console.log('\n[runtime]');
const sandbox = makeSandbox(html);
try {
  const T = sandbox.__T;
  const $ = T.dollar;
  $('canvas').getContext = () => new Proxy({}, { get:()=>()=>({addColorStop(){}}), set:()=>true });

  ['end_divorce','end_snipe','end_fight','end_yes'].forEach(node=>{
    try{
      T.toTitle(); $('#nm').value='PRÖT'; $('#play').doClick();
      T.S.started = true;
      T.finishEndingFrom(node);
      advance(T, sandbox, 20000);
      const shown=$('#endov').classList.contains('on');
      const stats=($('#endstats').innerHTML.match(/class="stat"/g)||[]).length;
      const cast=($('#endcast').innerHTML.match(/class="met"/g)||[]).length;
      if(!shown) fail(`${node}: never reached stat screen`);
      else if(!stats) fail(`${node}: stat screen empty`);
      else ok(`${node} -> ${$('#endtitle').textContent} (${stats} stats, ${cast} cast met)`);
    }catch(e){ fail(`${node}: threw ${e.message}`); }
  });

  // ACT IV trucks must actually drive. They used to be gated behind
  // `e.x<A.w-200` while being declared at x<=5100, so none ever moved.
  try{
    T.toTitle(); $('#nm').value='PRÖT'; $('#play').doClick();
    T.S.started = true; T.S.maxhp = 99; T.S.hp = 99;
    T.closeDlg();                                   // dismiss the intro, or frame() early-returns
    T.clearTimers();
    T.loadAct(3);
    T.S.beats.forEach(b => { b.done = true; });      // suppress scenery dialogue
    const A = T.ACTS[3];
    const seen = A.enemies.filter(e => e.kind === 'truck').length;
    if (seen < 1) fail('act IV: no trucks declared');
    const trucks = () => T.S.enemies.filter(e => e.kind === 'truck');
    let moved = 0, armed = 0, qteFired = 0;
    T.keys.right = true;
    for (let i = 0; i < 3000; i++) {                  // ~50s of holding right
      const before = trucks().map(e => e.x);
      performanceNow += 16.7; T.frame(performanceNow);
      if (trucks().some(e => e.go)) armed++;
      trucks().forEach((e, k) => { if (e.x < before[k] - 0.5) moved++; });
      if (T.S.qtes.some(q => q.fired)) qteFired++;
      if (qteFired > 60) break;
      T.S.hp = 99;
    }
    if (moved === 0) fail('act IV: no truck ever moved — the hazard is inert');
    else if (armed === 0) fail('act IV: no truck ever left its parking spot');
    else if (qteFired === 0) fail('act IV: no truck QTE ever fired');
    else ok(`act IV: ${seen} trucks armed and drove (${moved} leftward steps), dodge prompt fired`);
  }catch(e){ fail('act IV truck test threw: ' + e.message); }

  // going left must cost something — every act warned about it from line one
  try{
    T.toTitle(); $('#nm').value='PRÖT'; $('#play').doClick();
    T.S.started = true; T.closeDlg(); T.clearTimers();
    T.S.beats.forEach(b => { b.done = true; });
    T.keys.right = false; T.keys.left = true;
    const hp0 = T.S.hp;
    let minX = Infinity, bites = 0;
    for (let i = 0; i < 400; i++) {
      performanceNow += 16.7; T.frame(performanceNow);
      if (T.dlgOpen) break;                        // a stray beat stopped us
      minX = Math.min(minX, T.S.x);
      if (T.S.hp < hp0) bites = hp0 - T.S.hp;
      if (T.S.x < 60) break;                       // escaped the line entirely
    }
    T.keys.left = false;
    if (T.S.x < 60) fail(`left edge: player walked to x=${T.S.x | 0} — nothing stopped them`);
    else if (bites === 0) fail(`left edge: reached x=${minX | 0} and took no damage — the line does not bite`);
    else ok(`left edge: stops at x=${T.S.x | 0} and cost ${bites} heart(s) backing up`);
  }catch(e){ fail('left-edge test threw: ' + e.message); }

  // the boot must not recite the same six lines in every room, and it must
  // still be drawn as a boot rather than falling through to the generic blob
  try{
    const nodes = T.ACTS.map(A => (A.npcs.find(n => /boot/.test(n.node)) || {}).node);
    if (nodes.some(n => !n)) fail('boot: missing from ' + (nodes.filter(n => !n).length) + ' act(s)');
    else if (new Set(nodes).size !== nodes.length)
      fail('boot: repeats the same node in more than one act -> ' + nodes.join(', '));
    else if (!/if\(\s*\/\^boot\/\.test\(c\)\s*\)/.test(
             html.slice(html.indexOf('function drawNpcs'), html.indexOf('function drawEnemies'))))
      fail('boot: drawNpcs does not match every boot_aN node — boots render as generic silhouettes');
    else ok(`boot: distinct line per act -> ${nodes.join(', ')}`);
  }catch(e){ fail('boot test threw: ' + e.message); }

  // npcs must survive being talked to: visible, and re-readable
  try{
    T.toTitle(); $('#nm').value='PRÖT'; $('#play').doClick();
    T.S.started = true; T.closeDlg(); T.clearTimers();
    T.S.beats.forEach(b => { b.done = true; });
    const target = T.S.npcs.find(n => n.node === 'slop1');
    if (!target) fail('npc: slop not in act I');
    else {
      T.S.x = target.x; T.S.y = target.y - 40;
      const open = () => { T.pressed.talk = true; performanceNow += 16.7; T.frame(performanceNow); return T.dlg(); };
      if (!open()) fail('npc: pressing E on SLOP opened nothing');
      else if (!open()) fail('npc: SLOP cannot be talked to twice — NPCs disappear after use');
      else ok(`npc: ${target.label} stays present and re-readable`);
      T.closeDlg();
    }
    const faded = /globalAlpha\s*=\s*n\.talked/.test(
      html.slice(html.indexOf('function drawNpcs'), html.indexOf('function drawEnemies')));
    if (faded) fail('npc: drawNpcs still fades talked-to NPCs out');
  }catch(e){ fail('npc test threw: ' + e.message); }

  // the name field must actually do something.
  // `S` is the script parsed straight out of the source (pristine, pre-injection);
  // `T.SCRIPT` is the live one after startGame() ran injectName().
  try{
    T.toTitle(); $('#nm').value='ZÜBE'; $('#play').doClick();
    const token = Object.values(S).flat().filter(Array.isArray)
      .map(it=>String(it[1]||'')).filter(t=>t.indexOf('PRÖT')>=0).length;
    const got = Object.values(T.SCRIPT).flat().filter(Array.isArray)
      .map(it=>String(it[1]||'')).filter(t=>t.indexOf('ZÜBE')>=0).length;
    const stray = Object.values(T.SCRIPT).flat().filter(Array.isArray)
      .map(it=>String(it[1]||'')).filter(t=>t.indexOf('PRÖT')>=0).length;
    if(token<1) fail('injectName: nothing in the script uses the PRÖT token — the name field is dead UI');
    else if(got!==token) fail(`injectName: ${token} token(s) in source, ${got} substituted with the player's name`);
    else if(stray) fail(`injectName: ${stray} unsubstituted PRÖT left in live dialogue`);
    else ok(`injectName: all ${got} name token(s) substituted with the player's name`);
  }catch(e){ fail('injectName threw '+e.message); }

  // altar re-triggerability
  try{
    T.toTitle(); $('#nm').value='PRÖT'; $('#play').doClick();
    T.S.started = true;
    T.loadAct(5); T.S.x=2270; T.S.y=376;
    T.pressed.talk=true; performanceNow += 16.7; T.frame(performanceNow);
    let guard = 0;
    while (guard++ < 200 && !T.dlg()) { performanceNow += 16.7; T.frame(performanceNow); }
    const inTalk=T.dlg();
    T.keys.right=false;
    guard = 0;
    let sawChoice = false;
    let menuLabels = null;
    let idle = 0;
    while (guard++ < 4000) {
      if (T.dlg() && T.waiting()) {
        /* stop here: observe the menu WITHOUT answering it */
        sawChoice = true;
        menuLabels = T.choices().slice();
        break;
      }
      idle = T.dlg() ? 0 : idle + 1;
      if (idle > 30) break;                 /* genuinely dead, not just transitioning */
      performanceNow += 16.7;
      T.frame(performanceNow);
      sandbox.__fire('keydown', { key: 'e' });
      if (T.dlg() && !T.waiting()) T.skip();
    }
    if(!inTalk) fail('altar: pressing E on the altar opened nothing');
    else if(!sawChoice)
      fail('altar: dialogue ended without offering a choice (dlg=' + T.dlg() +
           ' atAltar=' + T.S.atAltar + ' sawChoice=' + sawChoice + ')');
    else {
      const labels=menuLabels;
      if(labels.length!==4) fail(`altar: expected 4 choices, got ${labels.length}`);
      else ok(`altar: choice menu with ${labels.length} options -> ${labels.map(s=>s.slice(0,18)).join(' | ')}`);
      // walk away without choosing, then come back
      T.closeDlg();
      const reopened = (function(){
        T.pressed.talk=true; performanceNow += 16.7; T.frame(performanceNow);
        let g2 = 0;
        while (g2++ < 200 && !T.dlg()) { performanceNow += 16.7; T.frame(performanceNow); }
        g2 = 0;
        while (g2++ < 4000 && T.dlg() && !T.waiting()) advance(T, sandbox, 1);
        return T.waiting();
      })();
      reopened ? ok('altar: can walk away and return without losing the ending')
              : fail('altar: cannot re-trigger after walking away');
    }
  }catch(e){ fail('altar flow threw '+e.message); }
} catch(e){ fail('runtime harness failed: '+e.message); }

console.log('\n' + (fails ? `\u2717 ${fails} FAILURE(S)` : '\u2713 ALL CHECKS PASS'));
process.exit(fails?1:0);

/* ================= harness ================= */
function makeSandbox(html){
  const js = html.slice(html.indexOf('<script>')+8, html.lastIndexOf('</script>'))
                .replace('<script src="../hell-ads.js"></script>','')
              + `\n;globalThis.__T={S,ACTS,SCRIPT,NODE_CAST,CAST,say,pick,frame,advance,loadAct,
      closeDlg,openAltarChoice,finishEnding,toTitle,startGame,chooseIngredient,clearTimers,
      finishEndingFrom(n){S.pending=n;finishEnding();},
      nodeCount:id=>(SCRIPT[id]||[]).length,dlg:()=>dlgOpen,waiting:()=>waitChoice,soup:()=>soupMode,soupSel:()=>soupSel.slice(),
      choices:()=>(curChoices||[]).map(c=>c[0]),keys,pressed,dollar:$,skip:skipOrNext};`;
  function mkEl(tag,id){
    const el={tagName:(tag||'div').toUpperCase(),id:id||'',dataset:{},width:1280,height:720,
      children:[],_html:'',textContent:'',value:'',onclick:null,disabled:false,
      appendChild(c){el.children.push(c);return c;},remove(){},addEventListener(){},
      removeEventListener(){},querySelector(){return mkEl('div');},querySelectorAll(){return [];},
      closest(){return null;},focus(){},click(){},getBoundingClientRect(){return{left:0,top:0,width:1,height:1};}};
    const store={};
    el.style=new Proxy(store,{get:(t,k)=>k in t?t[k]:'',set:(t,k,v)=>{t[k]=v;return true;}});
    const set=new Set();
    el.classList={add(...c){c.forEach(x=>set.add(x));},remove(...c){c.forEach(x=>set.delete(x));},
      toggle(c,f){f===undefined?(set.has(c)?set.delete(c):set.add(c)):(f?set.add(c):set.delete(c));},
      contains(c){return set.has(c);}};
    Object.defineProperty(el,'innerHTML',{get(){return el._html;},set(v){el._html=v;el.children=[];}});
    /* buttons are wired with el.onclick = fn, and the harness calls it directly */
    el.doClick = () => { if (typeof el.onclick === 'function') { el.onclick(); return true; } return false; };
    return el;
  }
  const nodes=new Map();
  const $=s=>{ if(!nodes.has(s)) nodes.set(s,mkEl('div',s.replace(/\W/g,''))); return nodes.get(s); };
  const grad={addColorStop(){}};
  const ctxStub=new Proxy({},{get(t,k){
    if(k==='canvas')return{width:1280,height:720};
    if(k==='createLinearGradient'||k==='createRadialGradient')return()=>grad;
    if(k==='measureText')return()=>({width:10});
    return()=>{};},set(t,k,v){t[k]=v;return true;}});
  $('#cv').getContext=()=>ctxStub;
  const L={};
  const fire=(ty,ev)=>(L[ty]||[]).forEach(f=>f(Object.assign({preventDefault(){},target:null},ev)));
  const T0=Date.now();
  function AudioContextStub(){const g=()=>({gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}});
    return{get currentTime(){return(Date.now()-T0)/1000;},get sampleRate(){return 8000;},
      destination:{},state:'running',resume(){},createGain:g,
      createOscillator:()=>({type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}}),
      createBiquadFilter:()=>({type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}),
      createBufferSource:()=>({buffer:null,connect(){},start(){}}),
      createBuffer:(c,n)=>({getChannelData:()=>new Float32Array(Math.min(n,2000))})};}

const sb={console,setTimeout,clearTimeout,setInterval,clearInterval,Math,JSON,Date,String,Number,
    Array,Object,Boolean,RegExp,Error,isNaN,parseInt,parseFloat,Uint8Array,Float32Array,Proxy,
    requestAnimationFrame:()=>0,innerWidth:1280,innerHeight:720,devicePixelRatio:1,
    addEventListener:(t,f)=>{(L[t]=L[t]||[]).push(f);},
    removeEventListener(){},fire,
    localStorage:{_d:{},getItem(k){return k in this._d?this._d[k]:null;},
      setItem(k,v){this._d[k]=String(v);},removeItem(k){delete this._d[k];}},
    document:{querySelector:$,getElementById:$,createElement:t=>mkEl(t),
      addEventListener(t,f){(L['doc:'+t]=L['doc:'+t]||[]).push(f);},removeEventListener(){}},
    matchMedia:()=>({matches:false}),location:{href:''},performance:{now:()=>Date.now()},
    AudioContext:AudioContextStub,webkitAudioContext:AudioContextStub};
  sb.window=sb; sb.globalThis=sb; sb.__fire=fire;
  vm.createContext(sb);
  vm.runInContext(js,sb,{filename:'sniba-snib.js'});
  return sb;
}