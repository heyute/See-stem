// 시 스템 :: 딥 다이브 — 탐사 화면 (계산은 explore.js 엔진)
// ── 탐사 (계산은 EXP 엔진. 서버로 옮기면 advance를 서버가 접속 시점에 돌려요)
let exTarget=null,exStart=0,rateCache={};
function prog(){const p=Object.assign(EXP.newProg(),store.get(KEY('prog'),{}));if(!p.uh){let h=7;for(const c of USER||'')h=(h*31+c.charCodeAt(0))>>>0;p.uh=h}return p}
function saveProg(p){store.set(KEY('prog'),p)}
const myCh=()=>chars()[0];
const gearOn=()=>store.get(KEY('inv'),[]).filter(x=>x.gearEq&&x.gear);
const exCh=()=>{const c=myCh();return c?{...c,gearBonus:EXP.gearBonus(gearOn())}:c};
function dive(){return store.get(KEY('dive'),null)}
function saveDive(d){store.set(KEY('dive'),d)}
function catchUp(){const d=dive(),ch=exCh();if(!d||!ch)return;
 const before={f:d.stats.fights,w:d.stats.wins,dn:d.stats.downs,m:d.bag.money,i:d.bag.items.length};
 const pr=prog(),lv0=pr.lv;const n=EXP.advance(d,ch,BYID,Date.now(),false,pr);if(afterAdvance(d,pr))return;
 if(n>0)setTimeout(()=>toast(`자리를 비운 동안 전투 ${n}회 · 승리 ${d.stats.wins-before.w} · 쓰러짐 ${d.stats.downs-before.dn} · 골드 +${d.bag.money-before.m}${pr.lv>lv0?` · 레벨 ${lv0} → ${pr.lv}`:''}`),300)}
setInterval(()=>{if(!USER)return;const d=dive(),ch=exCh();if(!d||!ch||d.status!=='run'){if(!$('#explore').hidden)tickClock();return}
 const pr=prog();const n=EXP.advance(d,ch,BYID,Date.now(),true,pr);if(n||d.status==='home'){if(afterAdvance(d,pr)){if(!$('#explore').hidden)renderExplore();return}}
 if(!$('#explore').hidden){n?renderExplore():tickClock()}else if(n&&!$('#lobby').hidden){const sy=scrollY;renderLobby();scrollTo(0,sy)}},1000);
function tickClock(){const d=dive(),el=$('#exNext');if(!d||!el)return;const ev=$('#evLeft');if(ev&&d.pending)ev.textContent=Math.max(0,Math.ceil((d.pending.at+EXP.FIGHT_MS-Date.now())/1000))+'초';
 if(d.pending&&Date.now()>=d.pending.at+EXP.FIGHT_MS){const p=prog();EXP.advance(d,exCh(),BYID,Date.now(),true,p);if(!afterAdvance(d,p))renderExplore();else renderExplore();return}
 el.textContent=d.status==='run'?Math.max(0,Math.ceil((d.lastAt+EXP.FIGHT_MS-Date.now())/1000))+'초':'-'}
const tacOf=()=>({stance:((prog().tac||{}).stance)||'balanced'}); // 작전은 성향만 (기술 우선순위·자동 귀환은 삭제)
function compCandidates(){const out=[];SOC.friends().forEach(f=>{const c=(store.get('stem-saved:'+f.user,[])[0]);
  if(c)out.push({user:f.user,name:c.name,stats:c.stats,skills:c.skills,sp_max:c.sp_max,hp:c.hp,jobs:c.jobs,portrait:c.portrait||null});
  else{const dm=DEMO_ROOMS().flatMap(r=>r.members).find(m=>m.user===f.user);if(dm)out.push({user:dm.user,name:dm.char,stats:dm.stats,skills:dm.skills,sp_max:dm.sp_max,hp:dm.hp,jobs:dm.jobs,demo:true})}});return out}
let exComp=null;
// 귀환: 가방을 창고·지갑으로 옮기고, 동료에게 골드 10%를 우편으로 나눠요
function deliverDive(d,reason){const inv=store.get(KEY('inv'),[]);d.bag.items.forEach(i=>inv.push({uid:'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),name:i.name,kind:i.kind,desc:i.desc,gear:i.gear,got:i.got||Date.now()}));
 let share=0;if(d.comp&&d.comp.user&&!d.comp.demo&&d.bag.money>0){share=Math.floor(d.bag.money*0.1);if(share)MAIL.send(d.comp.user,{from:USER,fromChar:myChar(),title:`${myChar()}의 탐사 동료 보상`,body:`함께 탐사해 줘서 고마워요. 이번 다이브 골드의 10%예요.`,gold:share,items:[]})}
 store.set(KEY('inv'),inv);store.set(KEY('money'),store.get(KEY('money'),0)+d.bag.money-share);store.del(KEY('dive'));
 const rep={at:Date.now(),reason,gold:d.bag.money-share,share,comp:d.comp&&d.comp.name,items:d.bag.items.length,stats:d.stats,deepest:d.stats.deepest};store.set(KEY('lastReport'),rep);return rep}
