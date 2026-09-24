/* DOOD ACHIEVEMENTS — persistent cross-run trophy cabinet.
   Standalone classic script (no modules), mirroring bestiary.js: the game file calls
   window.Achievements.unlock(id) for one-shot deeds, .checkKills(n)/.checkGibs(n)/
   .checkDepth(n)/.checkFoe(a) for tiered progress (each returns {t,isNew,...} and the
   game toasts tier-ups), plus .render(el) for the panel. Progress persists in
   localStorage across runs and seeds. Unknown ids are ignored (safe no-ops).
   Hidden deeds show as ??? until earned. Tiered deeds share one slot with pips
   plus progress toward the next tier. */
(function(){
'use strict';
var STORE='dood_ach_v1';
var KILL_TIERS=[100,1000,3000],GIB_TIERS=[1000,10000],DEPTH_TIERS=[26,32,50,66,100,150,200],
    FOE_TIERS=[1,10,25,50,66,100,200,666];
// every killable foe type gets its own tiered hunter slot (a = enemy def sprite key).
var FOES=[
 {a:'d1',name:'IMP',plural:'imps'},
 {a:'d3',name:'FLOATER',plural:'floaters'},
 {a:'d2',name:'BRUTE',plural:'brutes'},
 {a:'wr',name:'WRAITH',plural:'wraiths'},
 {a:'ma',name:'MAULER',plural:'maulers'},
 {a:'sp',name:'SPITTER',plural:'spitters'},
 {a:'rf',name:'ROTFIEND',plural:'rotfiends'},
 {a:'go',name:'GOUGER',plural:'gougers'},
 {a:'gg',name:'GORGUT',plural:'gorguts'},
 {a:'mo',name:'MORGLA',plural:'morglas'},
 {a:'bz',name:'BAALZEVUR',plural:'baalzevurs'}];
var DEFS=[
 {id:'firstblood',name:'FIRST BLOOD',desc:'Kill your first demon. Many more where that came from.',hint:'Kill a demon.'},
 {id:'arsenal',kind:'arsenal',tiers:[1,2,3],name:'ARSENAL',desc:'Unlock every gun: Burst Rifle (LV5) / Sniper (LV10) / Railgun (LV25).',hint:'Unlock the Burst Rifle (LV5).'},
 {id:'gorgut',name:'WARLORD DOWN',desc:'Defeat GORGUT, first warlord of the warehouse (LV5).',hint:'Defeat GORGUT (LV5).'},
 {id:'morgla',name:'BROODMOTHER DOWN',desc:'Defeat MORGLA and clear her court (LV12).',hint:'Defeat MORGLA (LV12).'},
 {id:'baal',name:'DEEP KING DOWN',desc:'Defeat BAALZEVUR, the deep king (LV20).',hint:'Defeat BAALZEVUR, the deep king (LV20).'},
 {id:'it',name:'HELL GOES QUIET',desc:'Kill IT (LV25) and conquer Hell. For now.',hint:'Kill IT (LV25).'},
 {id:'daily',name:'REGULAR',desc:'Beat the daily challenge. Same seed as everyone — you were simply better.',hint:'Beat the daily (all 3 stages).'},
 {id:'kills',kind:'kills',tiers:KILL_TIERS,name:'EXTERMINATOR',desc:'Lifetime kill milestones: 100 / 1,000 / 3,000.',hint:'Kill 100 demons (lifetime).'},
 {id:'gibs',kind:'gibs',tiers:GIB_TIERS,name:'GIB GARDEN',desc:'Lifetime gib milestones: 1,000 / 10,000. It grows where it lands.',hint:'Scatter 1,000 gibs (lifetime).'},
 {id:'depth',kind:'depth',tiers:DEPTH_TIERS,name:'DELVER',desc:'Depth milestones: LV26 / 32 / 50 / 66 / 100 / 150 / 200. Keep descending.',hint:'Reach level 26.'},
 {id:'var_BLOODIED',name:'STILL ANGRY',desc:'Slay a BLOODIED demon (LV30+). It stayed angry about dying.',hint:'Slay a BLOODIED demon (LV30+).'},
 {id:'var_VENOM',name:'ANTIVENOM',desc:'Slay a VENOM demon (LV45+). Marinated, but mortal.',hint:'Slay a VENOM demon (LV45+).'},
 {id:'var_VOID',name:'VOID WHERE PROHIBITED',desc:'Slay a VOID demon (LV60+). Back into reality with it.',hint:'Slay a VOID demon (LV60+).'},
 {id:'var_STORM',name:'STORMCHASER',desc:'Slay a STORM demon (LV75+). Grounded.',hint:'Slay a STORM demon (LV75+).'},
 {id:'var_INFERNO',name:'FIREPROOF',desc:'Slay an INFERNO demon (LV90+). Walk it off.',hint:'Slay an INFERNO demon (LV90+).'},
 {id:'var_OBLIVION',name:'OBLIVIONED',desc:'Slay an OBLIVION demon (LV110+). The last thing the deep game shows you — shown the door.',hint:'Slay an OBLIVION demon (LV110+).'},
 {id:'bestiary',name:'LIBRARIAN OF HELL',desc:'Complete the bestiary — every demon, every variant. Shhh.',hint:'Complete the bestiary.'},
 {id:'gorgut_nades',hidden:1,name:'CHEMICAL WARFARE',desc:'Defeat GORGUT without firing a single bullet at him. Grenades only.'},
 {id:'flawless',hidden:1,name:'UNTOUCHABLE',desc:'Clear a level without taking a single scratch.'},
 {id:'nade3',hidden:1,name:'CROWD CONTROL',desc:'End three (or more) demons with a single grenade.'},
 {id:'pacifist',hidden:1,name:'QUIET PROFESSIONAL',desc:'Finish a level without firing a single shot. Grenades are not shots.'},
 {id:'impdeath',hidden:1,name:'EMBARRASSING',desc:'Die to an imp. The weakest thing down here. Tell no one.'},
 {id:'it_sg',hidden:1,name:'PURIST',desc:'Kill IT with the humble shotgun and nothing else.'},
 {id:'sg_pb',hidden:1,name:'POINT BLANK',desc:'Finish a level with nothing but close-range shotgun blasts.'},
 {id:'rg7',hidden:1,name:'SEVEN FOR ONE',desc:'Kill 7 demons with a single railgun slug.'}
];
for(var fi=0;fi<FOES.length;fi++)(function(f){
 DEFS.push({id:'foe_'+f.a,kind:'foe',foe:f.a,tiers:FOE_TIERS,name:f.name+' HUNTER',
  desc:'Slay '+f.plural+': '+FOE_TIERS.join(' / ')+'.',hint:'Slay '+f.plural+'.'});
})(FOES[fi]);
function tierIdx(tiers,v){var i=-1,k;for(k=0;k<tiers.length;k++)if(v>=tiers[k])i=k;return i;}
var ARSENAL_ORDER=['ar','sn','rg'];
var ARSENAL_NAMES={ar:'BURST RIFLE',sn:'SNIPER',rg:'RAILGUN'};
function blank(){return{v:{},kills:0,gibs:0,maxLevel:0,foes:{},arsenal:{}};}
function load(){var o=blank(),dirty=false;
 try{var s=localStorage.getItem(STORE);if(s){var p=JSON.parse(s);
  if(p.v)o.v=p.v;o.kills=p.kills|0;o.gibs=p.gibs|0;o.maxLevel=p.maxLevel|0;if(p.foes)o.foes=p.foes;if(p.arsenal)o.arsenal=p.arsenal;}}catch(e){o=blank();}
 // migrate pre-tier stores: old single-tier ids fold into the shared slots
 if(o.v.kills100||o.v.kills1000||o.v.kills3000){var t=0;
  if(o.v.kills100)t=1;if(o.v.kills1000)t=2;if(o.v.kills3000)t=3;
  o.v.kills=Math.max(o.v.kills|0,t);
  delete o.v.kills100;delete o.v.kills1000;delete o.v.kills3000;dirty=true;}
 if(o.v.gibs1000||o.v.gibs10000){var g=0;
  if(o.v.gibs1000)g=1;if(o.v.gibs10000)g=2;
  o.v.gibs=Math.max(o.v.gibs|0,g);
  delete o.v.gibs1000;delete o.v.gibs10000;dirty=true;}
 // merged: the old standalone ENDLESS HUNGER slot folds into DELVER tier 1 (LV26)
 if(o.v.endless){o.v.depth=Math.max(o.v.depth|0,1);delete o.v.endless;dirty=true;}
 // merged: BURST ACQUIRED / LONG REACH / RAILSPIKE fold into the ARSENAL stages.
 // unlocks are sequential (rg implies sn+ar), so keep everything up to the best one.
 if(o.v.gun_ar||o.v.gun_sn||o.v.gun_rg){
  if(o.v.gun_ar)o.arsenal.ar=1;
  if(o.v.gun_sn){o.arsenal.ar=1;o.arsenal.sn=1;}
  if(o.v.gun_rg){o.arsenal.ar=1;o.arsenal.sn=1;o.arsenal.rg=1;}
  var ac=0,k;for(k=0;k<ARSENAL_ORDER.length;k++)if(o.arsenal[ARSENAL_ORDER[k]])ac++;
  o.v.arsenal=Math.max(o.v.arsenal|0,ac);
  delete o.v.gun_ar;delete o.v.gun_sn;delete o.v.gun_rg;dirty=true;}
 if(dirty)save(o);
 return o;}
function save(st){try{localStorage.setItem(STORE,JSON.stringify(st));}catch(e){}}
function byId(id){for(var i=0;i<DEFS.length;i++)if(DEFS[i].id===id)return DEFS[i];return null;}
function foeMeta(a){for(var i=0;i<FOES.length;i++)if(FOES[i].a===a)return FOES[i];return null;}
function num(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
var api={
 defs:DEFS,
 byId:byId,
 foePlural:function(a){var f=foeMeta(a);return f?f.plural:a;},
 has:function(id){return!!load().v[id];},
 unlock:function(id){if(!byId(id))return false;var st=load();if(st.v[id])return false;st.v[id]=1;save(st);return true;},
 // tiered check-ins: bump the lifetime counter, record newly crossed tiers.
 // returns {total/count, t (0-based tier or -1), isNew}
 checkKills:function(n){var st=load();st.kills+=n;
  var t=tierIdx(KILL_TIERS,st.kills),isNew=t>=0&&t>((st.v.kills|0)-1);
  if(t>=0)st.v.kills=Math.max(st.v.kills|0,t+1);save(st);return{total:st.kills,t:t,isNew:isNew};},
 checkGibs:function(n){var st=load();st.gibs+=n;
  var t=tierIdx(GIB_TIERS,st.gibs),isNew=t>=0&&t>((st.v.gibs|0)-1);
  if(t>=0)st.v.gibs=Math.max(st.v.gibs|0,t+1);save(st);return{total:st.gibs,t:t,isNew:isNew};},
 checkDepth:function(n){var st=load();if(n>(st.maxLevel|0))st.maxLevel=n;
  var t=tierIdx(DEPTH_TIERS,st.maxLevel|0),isNew=t>=0&&t>((st.v.depth|0)-1);
  if(t>=0)st.v.depth=Math.max(st.v.depth|0,t+1);save(st);return{t:t,isNew:isNew,max:st.maxLevel|0};},
 checkFoe:function(a){if(!foeMeta(a))return{t:-1,isNew:false,count:0};var st=load();
  st.foes[a]=(st.foes[a]|0)+1;var c=st.foes[a];
  var t=tierIdx(FOE_TIERS,c),isNew=t>=0&&t>((st.v['foe_'+a]|0)-1);
  if(t>=0)st.v['foe_'+a]=Math.max(st.v['foe_'+a]|0,t+1);save(st);return{t:t,isNew:isNew,count:c};},
 // arsenal stages: one tier per gun (ar -> sn -> rg). returns {t,isNew,count,id}
 checkArsenal:function(id){if(ARSENAL_ORDER.indexOf(id)<0)return{t:-1,isNew:false,count:0,id:id};var st=load();
  st.arsenal[id]=1;var c=0,k;for(k=0;k<ARSENAL_ORDER.length;k++)if(st.arsenal[ARSENAL_ORDER[k]])c++;
  var t=c-1,isNew=t>=0&&t>((st.v.arsenal|0)-1);
  if(t>=0)st.v.arsenal=Math.max(st.v.arsenal|0,t+1);save(st);return{t:t,isNew:isNew,count:c,id:id};},
 stats:function(){var st=load();return{kills:st.kills,gibs:st.gibs};},
 count:function(){var st=load(),got=0,i;for(i=0;i<DEFS.length;i++)if(st.v[DEFS[i].id])got++;return{got:got,total:DEFS.length};},
 label:function(){var c=api.count();return c.got+'/'+c.total;},
 // progress line for a tiered slot: current value + next threshold (or MAXED)
 progLine:function(d,st){
  var lvl=st.v[d.id]|0,cur=0,unit='';
  if(d.kind==='kills'){cur=st.kills;unit=' kills';}
  else if(d.kind==='gibs'){cur=st.gibs;unit=' gibs';}
  else if(d.kind==='depth'){cur=st.maxLevel;return'best LV'+cur+(lvl<d.tiers.length?(' · next LV'+d.tiers[lvl]):(' · MAX'));}
  else if(d.kind==='arsenal'){var aw=st.arsenal||{},ac=0,k;
   for(k=0;k<ARSENAL_ORDER.length;k++)if(aw[ARSENAL_ORDER[k]])ac++;
   return ac+'/3 guns'+(lvl<d.tiers.length?(' · next '+ARSENAL_NAMES[ARSENAL_ORDER[lvl]]):(' · MAX'));}
  else if(d.kind==='foe'){var f=foeMeta(d.foe);cur=(st.foes&&st.foes[d.foe])|0;
   return num(cur)+' '+f.plural+(lvl<d.tiers.length?(' · next '+num(d.tiers[lvl])):(' · MAX'));}
  return num(cur)+unit+(lvl<d.tiers.length?(' · next '+num(d.tiers[lvl])):(' · MAX'));},
 render:function(box){var st=load(),c=api.count(),i,j;
  var h='<div class="bestHead"><div><div class="bestTitle">🏆 ACHIEVEMENTS</div>'+
   '<div class="bestSub">'+c.got+'/'+c.total+' unlocked · progress persists across runs · '+num(st.kills)+' kills · '+num(st.gibs)+' gibs</div></div></div>';
  h+='<div class="bestGrid">';
  for(i=0;i<DEFS.length;i++){var d=DEFS[i],has=!!st.v[d.id];
   h+='<div class="bestCard'+(has?'':' locked')+'">';
   if(!has&&d.hidden){
    h+='<div class="bestName">???</div><div class="bestLock">a hidden deed…</div>';
   }else if(!has){
    h+='<div class="bestName">'+d.name+'</div>';
    if(d.tiers){h+='<div class="bestPips">';
     for(j=0;j<d.tiers.length;j++)h+='<span class="bestPip">○</span>';
     h+='</div><div class="bestKills">'+api.progLine(d,st)+'</div>';}
    h+='<div class="bestLock">'+d.hint+'</div>';
   }else{
    h+='<div class="bestName">🏆 '+d.name+'</div>';
    if(d.tiers){h+='<div class="bestPips">';
     var on=st.v[d.id]|0;
     for(j=0;j<d.tiers.length;j++)h+='<span class="bestPip'+(j<on?' on':'')+'">'+(j<on?'●':'○')+'</span>';
     h+='</div><div class="bestKills">'+api.progLine(d,st)+'</div>';}
    h+='<div class="bestDesc">'+d.desc+'</div>';
   }
   h+='</div>';
  }
  box.innerHTML=h+'</div>';}
};
window.Achievements=api;
})();
