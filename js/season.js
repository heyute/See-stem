// 시 스템 :: 딥 다이브 — 시즌 · 심연 순위
// ── 시즌 (GM이 직접 시작·종료일 설정. 심연 순위와 심연 진행이 시즌마다 초기화)
function season(){let s=store.get('stem-season',null);if(!s){s={id:'s1',no:1,name:'시즌 1',startedAt:Date.now(),endsAt:null};store.set('stem-season',s);const old=store.get('stem-abyss',null);if(old){store.set('stem-abyss:s1',old);store.del('stem-abyss')}}return s}
const seasonLive=s=>!s.endsAt||Date.now()<s.endsAt;
function seasonBoard(id){return store.get('stem-abyss:'+id,{})}
function seasonSync(pr){const s=season();if(pr.seasonId===s.id)return false;const had=pr.seasonId!=null;pr.seasonId=s.id;
 if(had){pr.abyssBest=0;if(pr.cleared>5)pr.cleared=5;return true}return false}
function drainAch(pr){if(!pr.achQ||!pr.achQ.length)return;const recs=store.get('stem-records',{});pr.achQ.forEach(a=>{if(a.key==='abyssBest'){const s=season();if(!seasonLive(s))return;const k='stem-abyss:'+s.id,lb=store.get(k,{});if(!lb[USER]||lb[USER].n<a.n){lb[USER]={char:myChar(),n:a.n,at:a.t};store.set(k,lb)}return}const L=recs[a.key]=recs[a.key]||[];if(!L.some(h=>h.user===USER))L.push({user:USER,char:myChar(),at:a.t})});store.set('stem-records',recs);pr.achQ=[]}
function afterAdvance(d,pr){drainAch(pr);saveProg(pr);{const lt=store.get(KEY('luckyT'),0),nw=(d&&d.bag?d.bag.items:[]).filter(i=>i.lucky&&i.got>lt);if(nw.length){store.set(KEY('luckyT'),Math.max(...nw.map(i=>i.got)));setTimeout(()=>toast('★ 행운의 별 습득권을 얻었어요! 귀환하면 창고에서 사용할 수 있어요.'),600)}}if(d&&d.status==='home'){const rep=deliverDive(d,d.homeReason);toast(`자동 귀환 (${d.homeReason}) · 골드 ${rep.gold}${rep.share?` (동료 몫 ${rep.share})`:''}, 아이템 ${rep.items}개`);return true}saveDive(d);return false}
function envBook(now,cur){const day=EXP.kstDay(now),days=[day,day+1];
 const at=(dd,f)=>EXP.envOf(dd*86400000-9*3600000+3600000,f);
 return `<div class="card envbook"><details ${cur!=null?'':'open'}><summary><h2 style="display:inline">심도 환경</h2> <span class="sub">오늘·내일 배치와 모든 환경 효과 · 한국 시간 자정에 바뀌어요</span></summary>
  <div class="envtbl"><div class="eh"></div>${[0,1,2,3,4,5].map(f=>`<div class="eh ${cur===f?'cur':''}">심도 ${f}</div>`).join('')}
   ${days.map((dd,i)=>`<div class="eh">${i?'내일':'오늘'}<small>${EXP.dayStr(dd).slice(5)}</small></div>${[0,1,2,3,4,5].map(f=>{const e=at(dd,f);return `<div class="ec ${cur===f&&!i?'cur':''}"><span class="envc env-${e.k}">${esc(e.n)}</span></div>`}).join('')}`).join('')}</div>
  <ul class="envlist">${EXP.ENVS.map(e=>{const today=[1,2,3,4,5].filter(f=>at(day,f).k===e.k),tom=[1,2,3,4,5].filter(f=>at(day+1,f).k===e.k);
   return `<li><span class="envc env-${e.k}">${esc(e.n)}</span><span>${esc(e.d)}</span><small class="sub">${e.k==='calm'?'심도 0은 늘 고요 · ':''}오늘 ${today.length?today.map(f=>'심도 '+f).join(', '):'없음'} · 내일 ${tom.length?tom.map(f=>'심도 '+f).join(', '):'없음'}</small></li>`}).join('')}</ul></details></div>`}
function shaftFloors(cur){const b=[0,1,2,3,4,5];if(cur>=EXP.ABYSS){const s=Math.max(EXP.ABYSS,cur-2);for(let f=s;f<=cur+2;f++)b.push(f)}return b}
function targetOpts(start,pr){const o=[];for(let f=start;f<=5;f++)o.push([f,EXP.dname(f)]);if(pr.guards&&pr.guards[5]){const top=Math.max(EXP.ABYSS,pr.cleared+1);for(let f=Math.max(EXP.ABYSS,start);f<=top;f++)o.push([f,EXP.dname(f)]);o.push([EXP.ABYSS_END,'심연 끝까지'])}return o}
function renderExplore(){
 const d=dive(),ch=exCh(),el=$('#exBody');if(!ch){el.innerHTML='';return}
 const GB=ch.gearBonus,gearLine=gearOn().length?gearOn().map(x=>esc(x.name)).join(' · ')+` (주는 피해 +${GB.dmg} · 받는 피해 −${GB.red} · 승리 회복 +${GB.regen})`:'없음 · 로비 제작대에서 만들 수 있어요';
 const penOf=f=>EXP.depthPenalty(ch,f),now=Date.now();
 const pr=prog(),M=EXP.mastery(pr.lv);
 const envChip=f=>{const e=EXP.envOf(now,f);return `<small class="envc env-${e.k}" title="${esc(e.d)}">${esc(e.n)}</small>`};
 const lvBox=`<div class="lvbox"><b>Lv. ${pr.lv}</b><div style="flex:1"><div class="bar"><i style="width:${pr.exp/EXP.expNeed(pr.lv)*100}%"></i></div><small class="sub">경험치 ${pr.exp.toLocaleString()} / ${EXP.expNeed(pr.lv).toLocaleString()} · 숙련 ${M} — 탐사 전투에서 받는 피해가 평균 ${M} 줄어요</small></div></div>`;
 if(!d){
  const tac=tacOf(),cands=compCandidates();if(exComp&&!cands.some(c=>c.user===exComp))exComp=null;const comp=cands.find(c=>c.user===exComp)||null;
  const abyssOpen=!!(pr.guards&&pr.guards[5]);if(!(exStart===0||exStart<=pr.cleared||(exStart===EXP.ABYSS&&abyssOpen)))exStart=0;if(exTarget==null||exTarget<exStart)exTarget=exStart>=EXP.ABYSS?EXP.ABYSS_END:Math.max(exStart,Math.min(5,pr.cleared+1));
  const rk=[pr.lv,ch.id,JSON.stringify(GB),tac.stance,exComp,EXP.kstDay(now),pr.cleared].join(':');if(rateCache.k!==rk){rateCache={k:rk,v:[0,1,2,3,4,5].map(f=>EXP.clearRate(ch,BYID,f,pr.lv,150,{tac,comp,t:now}))};if(pr.guards&&pr.guards[5])rateCache.v.next=EXP.clearRate(ch,BYID,Math.max(EXP.ABYSS,pr.cleared+1),pr.lv,150,{tac,comp,t:now})}const rates=rateCache.v;
  const rp=store.get(KEY('lastReport'),null);
  el.innerHTML=`${rp?`<div class="card report"><div class="row" style="justify-content:space-between"><h3>지난 다이브 결과</h3><span class="sub">${new Date(rp.at).toLocaleString('ko-KR')}</span></div><div class="sub">${rp.reason?`귀환 사유: ${esc(rp.reason)} · `:''}골드 +${rp.gold}${rp.share?` (동료 ${esc(rp.comp)}에게 ${rp.share}G)`:''} · 아이템 ${rp.items}개 · 전투 ${rp.stats.fights} · 승리 ${rp.stats.wins} · 쓰러짐 ${rp.stats.downs} · 이벤트 ${rp.stats.events||0} · 수호자 ${rp.stats.guards||0} · 최고 심도 ${rp.deepest}</div></div>`:''}
  <div class="card">${lvBox}
   <h2 style="margin-top:14px">시작 심도</h2><div class="sub">처음엔 심도 0부터 시작해요. 한 번 클리어한 심도부터는 바로 시작할 수 있어요.${pr.cleared>=0?` (클리어: 심도 ${pr.cleared}까지)`:''}</div>
   <div class="depths six">${[0,1,2,3,4,5].map(f=>{const ok=f===0||f<=pr.cleared;return `<button data-sf="${f}" aria-pressed="${exStart===f}" ${ok?'':'disabled'}><b>${f}</b><small>${ok?`받는 피해 +${penOf(f)}`:'🔒 미클리어'}</small></button>`}).join('')}</div>
   ${abyssOpen?`<div class="abyssrow"><span class="abtag">심연</span>${[EXP.ABYSS,...(pr.cleared>=EXP.ABYSS?[pr.cleared]:[])].filter((v,i,a)=>a.indexOf(v)===i).map(f=>`<button class="abb" data-sf="${f}" aria-pressed="${exStart===f}" ${f<=pr.cleared+1&&(f===EXP.ABYSS||f<=pr.cleared)?'':'disabled'}><b>${EXP.dname(f)}</b><small>${f===EXP.ABYSS?'심연 입구':'최고 기록 층'} · 받는 피해 +${penOf(f)}</small></button>`).join('')}</div>`:''}
   <h2 style="margin-top:14px">목표 심도 <span class="sub" style="font-family:inherit;font-size:14px">· 오늘의 환경 (${EXP.dayStr(EXP.kstDay(now))})</span></h2><div class="sub">층마다 ${EXP.FIGHTS_PER_FLOOR}번 싸우고, <b>5번째는 그 심도의 수호자</b>예요. 수호자를 쓰러뜨리면 재료 묶음을 받고 다음 층으로 내려가요.</div>
   <div class="depths six">${[0,1,2,3,4,5].map(f=>`<button data-tg="${f}" aria-pressed="${exTarget===f}" ${f<exStart?'disabled':''}><b>${f}</b>${envChip(f)}<small>${f>pr.cleared+1?'처음 가는 곳':f===pr.cleared+1?'다음 도전':'클리어함'}${pr.guards&&pr.guards[f]?' · 수호자 ✓':''}</small><small class="rate">${f>=exStart?'통과 '+Math.round((rates[f]??0)*100)+'%':''}</small></button>`).join('')}</div>
   ${abyssOpen?`<div class="abyssrow"><span class="abtag">심연</span><button class="abb" data-tg="${EXP.ABYSS_END}" aria-pressed="${exTarget>=EXP.ABYSS_END}"><b>심연 끝까지</b><small>쓰러질 때까지 계속 내려가요 · 최고 기록 ${pr.abyssBest||0}층</small><small class="rate">${pr.cleared>=5?`다음 층(${EXP.dname(Math.max(EXP.ABYSS,pr.cleared+1))}) 통과 ${Math.round((rates.next??0)*100)}%`:''}</small></button></div>`:`<div class="sub abyhint">심도 5의 수호자 「${EXP.guardName(5)}」를 쓰러뜨리면 끝없는 <b>심연</b>이 열려요.</div>`}
   <div class="sub">통과 = 수호자까지 ${EXP.FIGHTS_PER_FLOOR}전투를 쓰러지지 않고 넘길 확률 (지금 빌드·레벨·장비·성향·동료·오늘 환경으로 150번 돌려 본 추정치) · 환경 효과: ${(()=>{const e=EXP.envOf(now,Math.min(exTarget,5));return `${esc(e.n)} — ${esc(e.d)}`})()}</div>
   ${(()=>{const sd=exTarget>=EXP.ABYSS_END?Math.max(EXP.ABYSS,pr.cleared+1):exTarget;return `<div class="kv"><span class="sub">적 (${EXP.dname(sd)})</span><span>HP ${EXP.enemy(sd).hp} · 공격 ${EXP.enemy(sd).atk} · 방어 ${EXP.enemy(sd).def} · 수호자 「${EXP.guardName(sd)}」 HP ${EXP.enemy(sd,{guardian:1}).hp}</span>`})()}
    <span class="sub">탐사 장비</span><span>${gearLine}</span>
    <span class="sub">쓰러지면</span><span>접속 중: 그 층에서 멈춤 · 접속 안 함: 이전 층으로 돌아가 반복</span></div>
  </div>
  ${envBook(now,null)}
  <div class="exgrid">
   <div class="card"><h2>성향</h2>
    <div class="cats">${[['aggressive','공격적','방어용 스톡을 남기지 않고 모두 공격'],['balanced','균형','스톡 1개를 방어용으로 남김'],['careful','신중','스톡 2개를 남기고, HP 70% 이하면 회복 우선']].map(([k,n,dd])=>`<button data-stance="${k}" aria-selected="${tac.stance===k}" title="${dd}">${n}</button>`).join('')}</div>
    <div class="sub" style="margin-top:4px">${({aggressive:'방어용 스톡을 남기지 않고 모두 공격해요.',balanced:'스톡 1개를 방어용으로 남겨요.',careful:'스톡 2개를 남기고, HP 70% 이하면 회복을 먼저 써요.'})[tac.stance]}</div>
    <div class="sub" style="margin-top:8px">기술은 효율이 좋은 순서로 자동으로 써요. 스톡 추가·디버프 같은 보조 기술도 알아서 써요.</div>
   </div>
   <div class="card"><h2>동료</h2><div class="sub">친구의 스템 1명을 데려가요. 친구의 실제 능력치와 기술로 함께 싸우고, 적의 공격을 절반쯤 대신 받아요. 귀환하면 이번 다이브 골드의 <b>10%</b>가 친구에게 우편으로 가요.</div>
    <div class="comps"><button class="comp ${!exComp?'on':''}" data-comp="">혼자 가기</button>${cands.map(c=>`<button class="comp ${exComp===c.user?'on':''}" data-comp="${esc(c.user)}">${avatar(c.portrait,c.name,40,(JOB[(c.jobs||[])[0]]||{}).c)}<span><b>${esc(c.name)}</b><small>${esc((c.jobs||[]).join('+'))} · 공${c.stats.atk} 방${c.stats.def} 회${c.stats.eva}${c.demo?' · 예시':''}</small></span></button>`).join('')}</div>
    ${cands.length?'':'<div class="empty">데려갈 수 있는 친구가 없어요. 로비 채팅의 친구 탭에서 친구를 추가해 보세요.</div>'}
    <label class="switch"><input type="checkbox" id="exAR0" ${pr.autoRetry?'checked':''}><span class="knob" aria-hidden="true"></span><span><b>자동 재시도</b><small class="sub">접속 중에 쓰러지면 멈추지 않고 그 층을 처음부터 다시 해요</small></span></label>
    <button class="go" id="exStart" style="width:100%;margin-top:6px">${EXP.dname(exStart)}부터 ${exTarget>=EXP.ABYSS_END?'심연 끝까지':EXP.dname(exTarget)}${exTarget>=EXP.ABYSS_END?'':'까지'} 다이브${comp?` · 동료 ${esc(comp.name)}`:''}</button></div>
  </div>`;
  const setTac=f=>{const p=prog();p.tac=tacOf();f(p.tac);saveProg(p);renderExplore()};
  $('#exAR0').onchange=e=>{const p=prog();p.autoRetry=e.target.checked;saveProg(p)};
  el.querySelectorAll('[data-sf]').forEach(b=>b.onclick=()=>{exStart=+b.dataset.sf;if(exTarget<exStart)exTarget=exStart>=EXP.ABYSS?EXP.ABYSS_END:exStart;renderExplore()});
  el.querySelectorAll('[data-tg]').forEach(b=>b.onclick=()=>{exTarget=+b.dataset.tg;renderExplore()});
  el.querySelectorAll('[data-stance]').forEach(b=>b.onclick=()=>setTac(T=>T.stance=b.dataset.stance));
  el.querySelectorAll('[data-comp]').forEach(b=>b.onclick=()=>{exComp=b.dataset.comp||null;renderExplore()});
  $('#exStart').onclick=()=>{const nd=EXP.newDive(ch,exStart,exTarget,Date.now(),{tac:tacOf(),comp:comp?{user:comp.user,name:comp.name,stats:comp.stats,skills:comp.skills,sp_max:comp.sp_max||10+comp.stats.com,hp:20,demo:!!comp.demo}:null});nd.autoRetry=!!prog().autoRetry;saveDive(nd);store.del(KEY('lastReport'));toast(`${EXP.dname(exStart)}에서 다이브를 시작했어요.`);renderExplore()};
  return}
 const st=d.status==='down'?'<span class="statusb down">쓰러짐 · 멈춤</span>':d.pending?'<span class="statusb rep">선택 기다리는 중</span>':d.locked?'<span class="statusb rep">이전 층 반복 중</span>':'<span class="statusb run">탐사 중</span>';
 const fmt=t=>new Date(t).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
 const env=EXP.envOf(now,d.floor),nextG=d.fight===EXP.FIGHTS_PER_FLOOR-1;
 el.innerHTML=`${d.pending?`<div class="card evcard" role="alert"><div class="row" style="justify-content:space-between"><h2>${esc(d.pending.title)}</h2><span class="sub"><span id="evLeft"></span> 뒤 자동 선택</span></div><p>${esc(d.pending.text)}</p><div class="row" style="justify-content:flex-start;gap:8px">${d.pending.opts.map(([k,n],i)=>`<button class="${i?'ghost':'go'}" data-ev="${k}">${n}</button>`).join('')}</div></div>`:''}
  <div class="exgrid">
  <div class="card"><div class="row" style="justify-content:space-between"><h2>${EXP.dname(d.floor)}</h2>${st}</div>
   ${lvBox}<div class="shaft">${shaftFloors(d.floor).map(f=>`<div class="lvl ${f===d.floor?'cur':f<d.floor?'past':''} ${f===d.target||(d.target>=EXP.ABYSS_END&&f>=EXP.ABYSS&&f===d.floor+1)?'tgt':''} ${f>=EXP.ABYSS?'abyss':''}">${EXP.dname(f)}<span class="sub">받는 피해 +${penOf(f)}${f<=pr.cleared?' · 클리어':''}</span>${envChip(f)}</div>`).join('')}</div>
   <div class="kv"><span class="sub">오늘의 환경</span><span><b>${esc(env.n)}</b> — ${esc(env.d)}</span>
    <span class="sub">이번 층</span><div><div class="bar"><i style="width:${d.fight/EXP.FIGHTS_PER_FLOOR*100}%"></i></div><small class="sub">${d.fight} / ${EXP.FIGHTS_PER_FLOOR} 전투${nextG?` · <b style="color:var(--bad)">다음은 수호자 「${EXP.guardName(d.floor)}」</b>`:''}${d.risky?' · <b style="color:var(--bad)">위험한 길</b>':''}</small></div>
    <span class="sub">HP</span><div><div class="bar hp"><i style="width:${Math.max(0,d.hp)/myCh().hp*100}%"></i></div><small class="sub">${Math.max(0,d.hp)} / ${myCh().hp} · 승리마다 +3${GB.regen?` (+${GB.regen})`:''}, 층을 넘으면 모두 회복 · 숙련 ${M}</small></div>
    ${d.comp?`<span class="sub">동료</span><div><div class="bar hp"><i style="width:${Math.max(0,d.comp.hp)/d.comp.mhp*100}%;background:#8a4fd1"></i></div><small class="sub">${esc(d.comp.name)} · HP ${Math.max(0,d.comp.hp)} / ${d.comp.mhp}${d.comp.hp<=0?' · 이 층 동안 쉬는 중':''}</small></div>`:''}
    <span class="sub">성향</span><span>${({aggressive:'공격적',balanced:'균형',careful:'신중'})[(d.tac||{}).stance||'balanced']}</span>
    <span class="sub">다음 전투</span><span id="exNext"></span>
    <span class="sub">기록</span><span>전투 ${d.stats.fights} · 승리 ${d.stats.wins} · 쓰러짐 ${d.stats.downs}${d.stats.retries?` (자동 재시도 ${d.stats.retries})`:''} · 이벤트 ${d.stats.events||0} · 수호자 ${d.stats.guards||0} · 경험치 ${d.stats.exp||0}</span></div>
   <div class="row">
    ${d.status==='down'?'<button class="go" id="exResume">이 층부터 다시</button>':''}
    <button class="${d.status==='down'?'ghost':'go'}" id="exReturn">귀환하고 보상 받기</button>
   </div>
   <div style="margin-top:10px"><label class="switch"><input type="checkbox" id="exAR" ${d.autoRetry?'checked':''}><span class="knob" aria-hidden="true"></span><span><b>자동 재시도</b><small class="sub">접속 중에 쓰러지면 멈추지 않고 그 층을 처음부터 다시 해요</small></span></label></div>
   <div class="row" style="margin-top:8px">
    <label class="sub">목표 <select id="exTgt">${targetOpts(d.start||0,prog()).map(([f,n])=>`<option value="${f}" ${f===d.target?'selected':''}>${n}</option>`).join('')}</select></label>
   </div>
   ${d.lastFight?`<div class="fightd"><b>마지막 전투</b>
${esc(d.lastFight.join('\n'))}</div>`:''}
  </div>
  <div class="card"><h2>탐사 가방</h2><div class="sub">귀환하면 골드는 지갑으로, 아이템은 창고로 들어가요.${d.comp&&!d.comp.demo?` 골드의 10%는 ${esc(d.comp.name)}에게 가요.`:''}</div>
   <div class="kv"><span class="sub">골드</span><b>${d.bag.money}</b><span class="sub">아이템</span><span>${d.bag.items.length}개</span></div>
   ${d.bag.items.length?`<ul class="exlog" style="max-height:160px">${Object.entries(d.bag.items.reduce((m,i)=>(m[i.name]=(m[i.name]||0)+1,m),{})).map(([n,c])=>`<li>${esc(n)} × ${c}</li>`).join('')}</ul>`:''}
   <h3 style="margin-top:14px">탐사 일지</h3>
   <ul class="exlog">${[...d.log].reverse().map(l=>`<li class="${/^이벤트/.test(l.msg)?'ev':/수호자/.test(l.msg)?'gd':''}"><time>${fmt(l.t)}</time>${esc(l.msg)}</li>`).join('')||'<li class="sub">첫 전투까지 잠시 기다려 주세요.</li>'}</ul>
  </div></div>
  ${envBook(now,d.floor)}
  <div class="row" style="margin:12px 2px"><span class="sub">시험용:</span><button class="ghost mini" id="exFF">전투 10회 빨리 (접속 중)</button><button class="ghost mini" id="exOff">1시간 자리 비운 것처럼</button></div>`;
 tickClock();
 el.querySelectorAll('[data-ev]').forEach(b=>b.onclick=()=>{EXP.choose(d,b.dataset.ev,Date.now());saveDive(d);renderExplore()});
 const R=$('#exResume');if(R)R.onclick=()=>{d.status='run';d.fight=0;d.hp=myCh().hp;if(d.comp)d.comp.hp=d.comp.mhp;d.floorDown=false;d.lastAt=Date.now();d.log.push({t:Date.now(),msg:`${EXP.dname(d.floor)}부터 다시 시작해요. HP 회복`});saveDive(d);renderExplore()};
 $('#exAR').onchange=e=>{d.autoRetry=e.target.checked;const p=prog();p.autoRetry=d.autoRetry;saveProg(p);
  if(d.autoRetry&&d.status==='down'){d.status='run';d.fight=0;d.hp=myCh().hp;if(d.comp)d.comp.hp=d.comp.mhp;d.lastAt=Date.now();d.log.push({t:Date.now(),msg:`자동 재시도를 켜서 ${EXP.dname(d.floor)}부터 다시 시작해요.`})}
  else d.log.push({t:Date.now(),msg:`자동 재시도를 ${d.autoRetry?'켰어요':'껐어요'}.`});saveDive(d);renderExplore()};
 $('#exTgt').onchange=e=>{d.target=+e.target.value;if(d.floor>d.target){d.floor=d.target;d.fight=0}d.locked=false;d.log.push({t:Date.now(),msg:`목표를 ${d.target>=EXP.ABYSS_END?'심연 끝까지':EXP.dname(d.target)}${d.target>=EXP.ABYSS?'로':[3,6,0].includes(d.target%10)?'으로':'로'} 바꿨어요.`});saveDive(d);renderExplore()};
 $('#exReturn').onclick=()=>{const rep=deliverDive(d,null);toast(`귀환했어요. 골드 ${rep.gold}${rep.share?` (동료 몫 ${rep.share})`:''}, 아이템 ${rep.items}개를 받았어요.`);showLobby()};
 const fast=(ms,online)=>{d.lastAt-=ms;if(d.pending&&!online)d.pending.at-=ms;const p=prog();const n=EXP.advance(d,exCh(),BYID,Date.now(),online,p);if(afterAdvance(d,p)){showLobby();return}toast(`전투 ${n}회를 진행했어요.`);renderExplore()};
 $('#exFF').onclick=()=>fast(10*EXP.FIGHT_MS,true);
 $('#exOff').onclick=()=>fast(3600*1000,false);
}
