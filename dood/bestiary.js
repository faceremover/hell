/* DOOD BESTIARY — kill-to-reveal demon catalogue.
   Standalone classic script (no modules): the game file only calls
   window.Bestiary.record(baseA, variantTag) on kills and window.Bestiary.render(el)
   to draw the panel. Unlocks persist in localStorage across runs and seeds. */
(function(){
'use strict';
var STORE='dood_bestiary_v1';
// variant tiers mirror VARIANTS in the game file: tag, first level, swatch, blurb.
var TIERS=[
 {tag:'BLOODIED',at:30,tint:'#ff5040',blurb:'Still angry about dying. +HP, +damage, slightly quicker feet.'},
 {tag:'VENOM',at:45,tint:'#51ff7a',blurb:'Marinated in nukage. Tougher hide, snappier attacks.'},
 {tag:'VOID',at:60,tint:'#c07bff',blurb:'Half-phased out of reality. Hits hard, barely flinches.'},
 {tag:'STORM',at:75,tint:'#5ecfff',blurb:'Crackling fast. Stuns slide right off.'},
 {tag:'INFERNO',at:90,tint:'#ffc93b',blurb:'Walks like the floor is lava because it is. Bring railguns.'},
 {tag:'OBLIVION',at:110,tint:'#f2f2f2',blurb:'The last thing the deep game shows you. Immune to stuns.'}];
// id = enemy def sprite key ('it' = the level-25 stalker, recorded separately).
// stats are BASE values: variants multiply HP/damage/speed from here.
var ENTRIES=[
 {id:'d1',file:'demon1.png',name:'IMP',ep:'the welcome party',
  desc:'The warehouse\u2019s welcome party. Weak, quick, and never alone \u2014 dies to a stern look, but ten stern looks take a while.',
  hp:'2',dmg:'9',spd:'4.6',size:'2.2m',first:'LEVEL 1+',boss:null,variants:true},
 {id:'d3',file:'demon3.png',name:'FLOATER',ep:'the rumor',
  desc:'Drifts like a rumor and slams like a truck door. When it crouches it is winding up a dash \u2014 sidestep it and punish the landing, it breaks easily mid-flight.',
  hp:'3',dmg:'9 (dash 18)',spd:'6.6',size:'1.8m',first:'LEVEL 1+',boss:null,variants:true},
 {id:'d2',file:'demon2.png',name:'BRUTE',ep:'the debt collector',
  desc:'A wall of gristle that treats buckshot as seasoning. Slow feet, heavy hands \u2014 give it room or give it grenades.',
  hp:'8',dmg:'18',spd:'3.0',size:'3.0m',first:'LEVEL 2+',boss:null,variants:true},
 {id:'wr',file:'wraith.png',name:'WRAITH',ep:'the pale hurry',
  desc:'Fast, pale, and easy to bully: hard hits stagger a wraith longer than anything else in Hell. Don\u2019t let three of them corner you anyway.',
  hp:'2',dmg:'6',spd:'6.2',size:'1.6m',first:'LEVEL 3+',boss:null,variants:true},
 {id:'ma',file:'mauler.png',name:'MAULER',ep:'the siege engine',
  desc:'A siege engine with legs. Slow until it isn\u2019t \u2014 the shoulder-drop dash crosses the whole room, so keep a wall at your back, never at your side.',
  hp:'10',dmg:'22 (dash 28)',spd:'2.4',size:'3.6m',first:'LEVEL 4+',boss:null,variants:true},
 {id:'sp',file:'spitter.png',name:'SPITTER',ep:'hell\u2019s artillery',
  desc:'Keeps its distance and gobs dodgeable plasma downrange. The globs are slow \u2014 sidestep, don\u2019t hide, and close in while it reloads.',
  hp:'4',dmg:'10 (glob 9)',spd:'5.2',size:'2.0m',first:'LEVEL 5+',boss:null,variants:true},
 {id:'rf',file:'rotfiend.png',name:'ROTFIEND',ep:'the circler',
  desc:'Strafes in slow circles while it sizes you up, then commits all at once. Stuns bite deeper here than on most things its size \u2014 use that.',
  hp:'8',dmg:'14',spd:'4.6',size:'2.8m',first:'LEVEL 6+',boss:null,variants:true},
 {id:'go',file:'gouger.png',name:'GOUGER',ep:'almost a warlord',
  desc:'The biggest thing that isn\u2019t a warlord. Gouger packs are where grenade stocks go to die \u2014 spend them, that\u2019s what the blue caches are for.',
  hp:'14',dmg:'20',spd:'3.4',size:'4.2m',first:'LEVEL 8+',boss:null,variants:true},
 {id:'gg',file:'gorgut.png',name:'GORGUT',ep:'first warlord',
   desc:'The first warlord, and the lesson that bosses don\u2019t flinch. It telegraphs a 70-damage charge with a warning flash and shriek \u2014 you get 1.5s to sidestep, so move. Below half health it enrages and quickens \u2014 save your burst for the second half of the fight, not the first.',
   hp:'60',dmg:'25 (charge 70)',spd:'3.2',size:'5.5m',first:'LEVEL 5',boss:{at:5,mech:'Telegraphed 70-damage charge (1.5s warning, sidestep it). Enrage under half HP: faster feet, faster hands.'},variants:true},
 {id:'mo',file:'morgla.png',name:'MORGLA',ep:'the broodmother',
  desc:'Doesn\u2019t chase so much as hold court, spitting violet plasma while her children do the running. At two-thirds and one-third health she calls for imps \u2014 clear the court before the queen.',
  hp:'90',dmg:'30 (glob 12)',spd:'5.0',size:'4.5m',first:'LEVEL 12',boss:{at:12,mech:'Summons imps at 66% / 33% HP. Keeps range, spits purple.'},variants:true},
 {id:'bz',file:'baalzevur.png',name:'BAALZEVUR',ep:'the deep king',
  desc:'The biggest throne in the warehouse. Enrages like Gorgut and summons like Morgla, except larger, faster, and personally offended by you. Endless warlords wandering past 25 can wear variant tints too.',
  hp:'140',dmg:'35',spd:'3.8',size:'6.0m',first:'LEVEL 20',boss:{at:20,mech:'Enrage + summons. The full warlord kit, oversized.'},variants:true},
 {id:'it',file:'spider.png',name:'IT',ep:'that which hungers',
  desc:'No portal, no minimap, no bargaining: level 25 is just IT, vulnerable from the first second, and the exit doesn\u2019t exist until it dies. Empty every gun you own into it.',
  hp:'120',dmg:'12 (glob)',spd:'chases',size:'6.0m',first:'LEVEL 25',boss:{at:25,mech:'Vulnerable from the start. Kill it and Hell goes quiet.'},variants:false}
];
function load(){try{var s=localStorage.getItem(STORE);return s?JSON.parse(s):{};}catch(e){return{};}}
function save(st){try{localStorage.setItem(STORE,JSON.stringify(st));}catch(e){}}
function byId(id){for(var i=0;i<ENTRIES.length;i++)if(ENTRIES[i].id===id)return ENTRIES[i];return null;}
function total(){var n=0,i;for(i=0;i<ENTRIES.length;i++)n+=ENTRIES[i].variants?1+TIERS.length:1;return n;}
function entryCount(st,id){var e=byId(id);if(!e)return 0;var r=st[id];if(!r)return 0;
 var n=1,i;if(e.variants)for(i=0;i<TIERS.length;i++)if(r.v&&r.v[TIERS[i].tag])n++;return n;}
function entryTotal(e){return e.variants?1+TIERS.length:1;}
var api={
 record:function(baseA,variant){var e=byId(baseA);if(!e)return;
  var st=load(),r=st[baseA]||{k:0,v:{}};r.k++;
  if(variant&&e.variants)r.v[variant]=true;
  st[baseA]=r;save(st);},
 count:function(){var st=load(),got=0,i;for(i=0;i<ENTRIES.length;i++)got+=entryCount(st,ENTRIES[i].id);
  return{got:got,total:total()};},
 label:function(){var c=api.count();return c.got+'/'+c.total;},
 render:function(box){var st=load(),c=api.count(),i,j;
  var h='<div class="bestHead"><div><div class="bestTitle">📖 BESTIARY</div>'+
   '<div class="bestSub">Kill to reveal · '+c.got+'/'+c.total+' unlocked (variants count)</div></div></div>';
  h+='<div class="bestVarBox"><div class="bestSec">☠ VARIANT TIERS <span class="bestDim">(deep levels tint &amp; toughen demons; warlords keep base damage but take the HP)</span></div><div class="bestVars">';
  for(i=0;i<TIERS.length;i++){var t=TIERS[i];
   h+='<div class="bestVar"><span class="bestDot" style="background:'+t.tint+'"></span><b>'+t.tag+'</b> <span class="bestDim">LV'+t.at+'+</span><br><span class="bestDim">'+t.blurb+'</span></div>';}
  h+='</div></div><div class="bestGrid">';
  for(i=0;i<ENTRIES.length;i++){var e=ENTRIES[i],r=st[e.id],rev=!!r;
   h+='<div class="bestCard'+(e.boss?' isBoss':'')+(rev?'':' locked')+'">';
   if(!rev){
    h+='<div class="bestSpr"><img src="assets/sprites/'+e.file+'" alt="???"></div>'+
     '<div class="bestName">???</div><div class="bestEp">unrecorded</div>'+
     '<div class="bestLock">Kill one to reveal this entry.</div>';
    }else{
     h+='<div class="bestSpr"><img src="assets/sprites/'+e.file+'" alt="'+e.name+'"></div>';
    h+='<div class="bestName">'+e.name+' <span class="bestDim">'+entryCount(st,e.id)+'/'+entryTotal(e)+'</span></div>'+
     '<div class="bestEp">'+e.ep+' · '+e.first+'</div>'+
     '<div class="bestStats">HP '+e.hp+' · DMG '+e.dmg+' · SPD '+e.spd+' · '+e.size+'</div>'+
     '<div class="bestDesc">'+e.desc+'</div>';
    if(e.boss)h+='<div class="bestBoss">⚠ '+e.boss.mech+'</div>';
    if(e.variants){
     h+='<div class="bestPips">';
     for(j=0;j<TIERS.length;j++){var tg=TIERS[j].tag,has=r.v&&r.v[tg];
      h+='<span class="bestPip'+(has?' on':'')+'" title="'+tg+' (LV'+TIERS[j].at+'+)" style="'+(has?'background:'+TIERS[j].tint:'')+'">'+(has?'●':'○')+'</span>';}
     h+='</div>';
    }
    h+='<div class="bestKills">killed ×'+r.k+'</div>';
   }
   h+='</div>';
  }
  box.innerHTML=h+'</div>';}
};
window.Bestiary=api;
})();
