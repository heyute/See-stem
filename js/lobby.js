// 시 스템 :: 딥 다이브 — 로비 화면: 캐릭터 카드 · 창고 · 제작대 · 장비 강화
// ── 로비
function chars(){return store.get(KEY('saved'),[]).map((c,i)=>c.id?c:{...c,id:'old'+i})}
let invSort='new',invKind='전체',invQ='',skSel=null,craftDepth=0;
function showLobby(){view('lobby');renderLobby()}
function questCard(){const p=prog(),D=EXP.ensureDaily(p,Date.now());saveProg(p);const nextReset=(EXP.kstDay(Date.now())+1)*86400000-9*3600000-Date.now();
 return `<div class="card" id="quests"><div class="row" style="justify-content:space-between;align-items:end"><div><h2>일일 의뢰</h2><div class="sub">매일 자정(한국 시간)에 새 의뢰 3개가 와요. 완료하면 보상은 우편으로, 제작 경험치는 바로 받아요. 다음 의뢰까지 ${Math.floor(nextReset/3600000)}시간 ${Math.floor(nextReset%3600000/60000)}분</div></div></div>
  <div class="quests">${D.quests.map(q=>`<div class="quest ${q.claimed?'claimed':q.done?'done':''}"><b>${esc(EXP.questText(q))}</b><div class="bar"><i style="width:${q.prog/q.need*100}%"></i></div><div class="row" style="justify-content:space-between"><small class="sub">${q.prog} / ${q.need} · 보상 ${q.gold}G · 제작 경험치 +${q.cxp}</small>${q.claimed?'<span class="sub">받음</span>':q.done?`<button class="go mini" data-qc="${q.id}">보상 받기</button>`:''}</div></div>`).join('')}</div></div>`}
function renderLobby(){
 const list=chars();if(!list.length){showCreator();return}
 const inv=store.get(KEY('inv'),[]);const eq=inv.filter(x=>x.eq).sort((a,b)=>a.eq-b.eq);
 const kinds=['전체',...new Set(inv.map(x=>x.kind))];if(!kinds.includes(invKind))invKind='전체';
 const cmp={new:(a,b)=>b.got-a.got,old:(a,b)=>a.got-b.got,name:(a,b)=>a.name.localeCompare(b.name,'ko')||b.got-a.got,kind:(a,b)=>a.kind.localeCompare(b.kind,'ko')||a.name.localeCompare(b.name,'ko')}[invSort];
 const gmap={};inv.forEach(x=>{const k=x.name+'\u0001'+x.kind;const g=gmap[k]||(gmap[k]={name:x.name,kind:x.kind,desc:x.desc,got:0,first:Infinity,all:[]});g.all.push(x);g.got=Math.max(g.got,x.got);g.first=Math.min(g.first,x.got)});
 const igroups=Object.values(gmap).map(g=>({...g,n:g.all.length,eqs:g.all.filter(x=>x.eq),free:g.all.filter(x=>!x.eq)}));
 const gcmp={new:(a,b)=>b.got-a.got,old:(a,b)=>a.first-b.first,name:(a,b)=>a.name.localeCompare(b.name,'ko'),kind:(a,b)=>a.kind.localeCompare(b.kind,'ko')||a.name.localeCompare(b.name,'ko')}[invSort];
 const shown=igroups.filter(x=>invKind==='전체'||x.kind===invKind).sort(gcmp);
 const dv=store.get(KEY('dive'),null);
 const c=list[0],col=j=>(JOB[j]||{}).c||'var(--line)';
 const groups={};c.skills.forEach(id=>{const s=BYID[id];if(!s)return;const g=s.group==='공통'?'일반':(s.group==='로게움'||s.group==='에테르')?'종족':s.group;(groups[g]=groups[g]||[]).push(s)});
 const order=['일반','종족',...c.jobs].filter(g=>groups[g]);
 const det=c.race==='로게움'?`혈통 ${c.race_detail.bloodline==='유'?'유(類)':'조(造)'}`:(c.nickname?`별명 · ${esc(c.nickname)}`:'');
 $('#lmain').innerHTML=`
  <div class="lhead">
   <div class="card hero2"><div class="row" style="justify-content:flex-start;align-items:center;gap:14px;flex-wrap:nowrap"><button class="avbtn" id="heroPhoto" title="얼굴 사진 바꾸기" aria-label="얼굴 사진 바꾸기">${avatar(c.portrait,c.name,84,col(c.jobs[0]))}<span>${c.portrait?'바꾸기':'사진 넣기'}</span></button><div style="min-width:0">
    <div>${c.jobs.map(j=>`<span class="pill" style="--c:${col(j)}">${esc((JOB[j]||{}).star||'')} · ${esc(j)}</span>`).join('')}</div>
    ${titleOf(USER)?`<button class="ttl ttlbtn" id="heroTitle" title="타이틀 바꾸기">${esc(titleOf(USER))}</button>`:(myTitles().length?`<button class="linkbtn" id="heroTitle">타이틀 달기</button>`:'')}<div class="disp">${esc(c.name)} <span class="lvtag">Lv. ${prog().lv}</span></div><div class="sub">${esc(c.race)}${det?' · '+det:''}</div>${c.portrait?'<button class="linkbtn" id="heroPhotoDel">사진 지우기</button>':''}</div></div></div>
   <div class="tiles">
    <button class="tile" data-go="shop"><span class="disp">상점</span><small>골드로 아이템 구매</small></button>
    <button class="tile" data-go="achv"><span class="disp">업적</span><small>서버 전체 달성 기록</small></button>
    <button class="tile" data-go="db"><span class="disp">스킬 리스트</span><small>모든 기술 · 유물 데이터베이스</small></button>
    <button class="tile" data-go="mail"><span class="disp">우편${mailUnread()?` <span class="badge">${mailUnread()}</span>`:''}</span><small>받은 아이템·골드 · 보내기</small></button>
   </div>
  </div>
  <div class="card"><h2>어디로 갈까요?</h2><div class="modes">
    <div class="mode"><div class="disp">탐사</div><div class="sub">${dv?(dv.status==='down'?`${EXP.dname(dv.floor)}에서 쓰러져 멈춰 있어요.`:`탐사 중 · ${EXP.dname(dv.floor)} (${dv.fight}/${EXP.FIGHTS_PER_FLOOR}) · 모은 골드 ${dv.bag.money}, 아이템 ${dv.bag.items.length}개`):'일반 스테이지. 자리를 비워도 스템이 혼자 심도 0~5를 내려가며 아이템과 골드를 모아 와요.'}</div><button class="go" data-go="explore">${dv?'탐사 보기':'탐사 시작'}</button></div>
    <div class="mode"><div class="disp">레이드</div><div class="sub">${banLeft()?`<b style="color:var(--bad)">레이드 참여 불가 · ${fmtLeft(banLeft())} 남음</b> (진행 중 이탈)`:myRoom()?`대기실에 있어요 · ${esc(myRoom().title)} (${myRoom().members.length}/4)`:`보스 스테이지 · 추락한 별의 악의. 최대 4명이 함께 턴제로 싸워요. 보유 주문서 ${scrollCount()}장`}</div><button class="go" data-go="raid">${myRoom()?'대기실로':'레이드 방 찾기'}</button></div>
  </div><div class="hint" style="margin-top:10px">서버가 생기면 탐사와 레이드 파티 모집이 여기서 열려요.</div></div>
  <div class="cols2">
   <div class="card"><h2>능력치</h2>
    <div class="statgrid">${STATK.map(k=>`<div class="stat"><div class="v">${c.stats[k]}</div><div class="l">${STATN[k]}</div></div>`).join('')}</div>
    <div class="res"><span>HP <b>${c.hp}</b></span><span>SP 최대 <b>${c.sp_max}</b></span><span>스톡 <b>${c.stock}</b></span></div>
    <h3 style="margin-top:16px">아이템 <span class="sub">(최대 3)</span></h3>
    <div class="slots">${[0,1,2].map(i=>{const it=eq[i];return it?`<div class="slot full"><b>${esc(it.name)}</b><small>${esc(it.kind)}</small><button class="ghost mini" data-uneq="${it.uid}">창고로</button></div>`:`<div class="slot">비어 있음</div>`}).join('')}</div>
    <div class="hint" style="margin-top:6px">들고 간 소모품은 레이드에서 쓸 수 있어요. 창고에서 골라 담아요.</div>
    <h3 style="margin-top:16px">탐사 장비</h3>
    <div class="slots">${Object.values(EXP.GEAR).map(G=>{const it=inv.find(x=>x.gearEq&&x.gear&&x.gear.slot===G.slot);return it?`<div class="slot full"><small>${G.slot}</small><b>${esc(it.name)}</b><small>${esc(it.desc)}</small><button class="ghost mini" data-gun="${it.uid}">해제</button></div>`:`<div class="slot">${G.slot}<br>비어 있음</div>`}).join('')}</div>
    <h3 style="margin-top:16px">기술 <span class="sub">(${c.skills.length}) · 누르면 효과가 보여요</span></h3>
    ${order.map(g=>`<div class="chiprow"><span class="cg" style="color:${g==='일반'||g==='종족'?'var(--mute)':col(g)}">${g==='종족'?esc(c.race):esc(g)}</span>${groups[g].map(s=>`<button class="schip ${turnCls(s.turn||'')} ${skSel===s.id?'on':''}" data-skd="${s.id}" aria-pressed="${skSel===s.id}">${esc(s.name)}${s.kind==='포비든'?' ★':''}</button>`).join('')}</div>`).join('')}
    ${skSel&&BYID[skSel]?(s=>`<div class="skdet"><b>${esc(s.name)}</b> <span class="tag ${turnCls(s.turn||'')}">${esc(s.turn||'-')}</span>${s.sp?` <span class="tag">SP ${s.sp}</span>`:''}${s.range&&s.range!=='-'?` <span class="tag">${esc(s.range)}</span>`:''}${/^[1-5]$/.test(s.speed)?` <span class="tag">속도 ${s.speed}</span>`:''}<p>${esc(s.effect)}</p></div>`)(BYID[skSel]):''}
    <div class="row" style="margin-top:8px"><span class="sub">세팅</span><span class="schip t-set lg"></span><span class="sub">액션</span><span class="schip t-act lg"></span><span class="sub">인터셉트</span><span class="schip t-icp lg"></span><span class="sub">상시</span><span class="schip t-pas lg"></span></div></div>
   <div class="card chatp" id="social"></div>
  </div>
  ${questCard()}
  <div class="card" id="storage"><div class="row" style="justify-content:space-between;align-items:end"><div><h2>창고</h2><div class="sub">탐사에서 얻은 아이템이 모여요. 같은 아이템은 묶어서 보여줘요. ${igroups.length}종 · ${inv.length}개 보관 중 · 들고 가기 ${eq.length} / 3</div></div>
    <div class="row"><input type="search" id="invQ" class="invq" placeholder="이름으로 찾기" aria-label="창고에서 이름으로 찾기" value="${esc(invQ)}" autocomplete="off"><label class="sub">종류 <select id="invKind">${kinds.map(k=>`<option ${k===invKind?'selected':''}>${esc(k)}</option>`).join('')}</select></label>
    <label class="sub">정렬 <select id="invSort">${[['new','최근 얻은 순'],['old','오래된 순'],['name','이름순'],['kind','종류순']].map(([v,n])=>`<option value="${v}" ${v===invSort?'selected':''}>${n}</option>`).join('')}</select></label></div></div>
   ${shown.length?`<div class="inv">${shown.map(g=>`<div data-n="${esc(g.name.replace(/\s+/g,'').toLowerCase())}" class="item ${g.name===EXP.LUCKY.name?'lucky ':''}${g.eqs.length||g.all.some(x=>x.gearEq)?'on':''}"><div><b>${esc(g.name)}</b>${g.n>1?` <span class="qty">×${g.n}</span>`:''} <span class="tag">${esc(g.kind)}</span></div><small>${esc(g.desc||'')}</small><div class="row" style="justify-content:space-between;margin-top:auto"><span class="sub">${g.all.some(x=>x.gearEq)?'장착 중':g.eqs.length?`들고 가는 중 ${g.eqs.length}`:new Date(g.got).toLocaleDateString('ko-KR')}</span><span class="row" style="gap:6px">${g.kind==='사용'?`<button class="go mini" data-use="${g.all[0].uid}">사용</button>`:g.kind==='장비'?(g.all.some(x=>x.gearEq)?`<button class="ghost mini" data-gun="${g.all.find(x=>x.gearEq).uid}">해제</button>`:`<button class="go mini" data-geq="${g.all[0].uid}">장착</button>`):g.kind==='소모품'?`${g.eqs.length?`<button class="ghost mini" data-uneq="${g.eqs[0].uid}">내려놓기</button>`:''}${g.free.length?`<button class="go mini" data-eq="${g.free[0].uid}" ${eq.length>=3?'disabled':''}>들고 가기</button>`:''}`:''}</span></div></div>`).join('')}</div>`
    :`<div class="empty">${inv.length?'이 종류의 아이템이 없어요.':'아직 창고가 비어 있어요. 탐사에서 아이템을 얻으면 여기에 쌓여요.'}</div>`}
  </div>
  <div class="card" id="craft"><div class="row" style="justify-content:space-between;align-items:end"><div><h2>제작대</h2><div class="sub"><b>같은 심도</b>의 파편·덩쿨·나무만 섞어 <b>탐사 장비</b>를 만들어요. 어떤 등급이든 나올 수 있고, 많이 만들수록 제작 숙련도가 올라 높은 등급 확률이 커져요. 장비는 탐사 전투에만 효과가 있어요.</div></div>
    <div class="cats">${[0,1,2,3,4,5].map(d=>`<button data-cd="${d}" aria-selected="${craftDepth===d}">심도 ${d}</button>`).join('')}</div></div>
   ${(()=>{const cp=Object.assign({lv:1,xp:0,count:0},store.get(KEY('craft'),{})),odds=EXP.craftOdds(cp.lv);
    return `<div class="cprof"><div class="lvbox" style="margin:10px 0 6px"><b>제작 Lv. ${cp.lv}</b><div style="flex:1"><div class="bar"><i style="width:${cp.xp/EXP.craftNeed(cp.lv)*100}%"></i></div><small class="sub">제작 경험치 ${cp.xp} / ${EXP.craftNeed(cp.lv)} · 지금까지 ${cp.count}번 제작 · 1번 만들 때마다 (1 + 심도)만큼 올라요 · 숙련도가 오를수록 높은 등급 확률이 커져요 (Lv. 30에서 최대)</small></div></div>
     <div class="grades">${EXP.GRADES.map((g,i)=>{const p=odds[i]*100;return `<span class="gr g${i}"><b>${g.k}</b> ${p>=10?p.toFixed(0):p>=1?p.toFixed(1):p>=0.1?p.toFixed(2):p.toFixed(3)}% <small>효과 ×${g.m}</small></span>`}).join('')}</div></div>`})()}
   <div class="matrow">${['파편','덩쿨','나무'].map(m=>`<span><b>${m}</b> ${inv.filter(x=>x.name===EXP.matName(m,craftDepth)).length}개</span>`).join('')}<span class="sub">심도 ${craftDepth} 재료 보유</span></div>
   ${(()=>{const cry=inv.filter(x=>x.name===EXP.CRYSTAL.name&&!x.eq).length,gs=inv.filter(x=>x.gear).sort((a,b)=>(b.gearEq?1:0)-(a.gearEq?1:0));
    return `<div class="enh"><div class="row" style="justify-content:space-between"><h3 style="margin:0">장비 강화 <span class="sub">· 심연 결정 ${cry}개</span></h3><span class="sub">강화마다 효과 +10% (등급 효과 기준) · 심연에서 결정을 모아요</span></div>
     ${gs.length?`<ul class="enhl">${(()=>{const G=[];gs.forEach(it=>{const k=it.gearEq?'eq:'+it.uid:it.name;let g=G.find(x=>x.k===k);if(!g){g={k,it,n:0};G.push(g)}g.n++});return G})().map(({it,n})=>{const c=EXP.enhanceCost(it.gear.plus||0);return `<li><span>${it.gearEq?'<span class="tag t-icp">장착</span> ':''}<b>${esc(it.name)}</b>${n>1?` <span class="qty">×${n}</span>`:''} <small class="sub">${esc(it.desc)}</small></span><button class="go mini" data-enh="${it.uid}" ${cry>=c?'':'disabled'}>+${(it.gear.plus||0)+1} 강화 · 결정 ${c}</button></li>`}).join('')}</ul>`:'<div class="sub">강화할 장비가 없어요.</div>'}</div>`})()}
   <div class="recipes">${Object.entries(EXP.GEAR).map(([type,G])=>{const g=EXP.gearItem(type,craftDepth);const rows=Object.entries(G.need).map(([m,n])=>{const have=inv.filter(x=>x.name===EXP.matName(m,craftDepth)&&!x.eq).length;return{m,n,have,ok:have>=n}});const ok=rows.every(x=>x.ok);
    return `<div class="recipe"><div><span class="tag">${G.slot}</span> <b>${esc(g.name)}</b></div><small>일반 등급 기준: ${esc(g.desc)}</small>
     <ul>${rows.map(x=>`<li class="${x.ok?'':'lack'}"><span>심도 ${craftDepth} ${x.m}</span><span>${x.have} / ${x.n}</span></li>`).join('')}</ul>
     <button class="go mini" data-craft="${type}:${craftDepth}" ${ok?'':'disabled'}>${ok?'만들기':'재료 부족'}</button></div>`}).join('')}</div></div>`;
 const setP=u=>{const a=store.get(KEY('saved'),[]);if(!a[0])return;a[0].portrait=u;store.set(KEY('saved'),a);
  const rs=RAID.all();rs.forEach(r=>r.members.forEach(m=>{if(m.user===USER)m.portrait=u}));RAID.save(rs);renderLobby();toast(u?'얼굴 사진을 바꿨어요.':'얼굴 사진을 지웠어요.')};
 $('#heroPhoto').onclick=()=>pickPortrait(setP);{const ht=$('#heroTitle');if(ht)ht.onclick=()=>go('achv')}const hd=$('#heroPhotoDel');if(hd)hd.onclick=()=>setP(null);
 document.querySelectorAll('#lmain [data-skd]').forEach(b=>b.onclick=()=>{skSel=skSel===b.dataset.skd?null:b.dataset.skd;renderLobby()});
 renderSocial();
 document.querySelectorAll('#lmain [data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
 const save=()=>{store.set(KEY('inv'),inv);renderLobby()};
 document.querySelectorAll('#lmain [data-eq]').forEach(b=>b.onclick=()=>{const it=inv.find(x=>x.uid===b.dataset.eq);if(it&&inv.filter(x=>x.eq).length<3){it.eq=Date.now();save();toast(`${it.name}을(를) 들고 가요.`)}});
 document.querySelectorAll('#lmain [data-qc]').forEach(b=>b.onclick=()=>{const p=prog(),q=EXP.ensureDaily(p,Date.now()).quests.find(x=>x.id===b.dataset.qc);if(!q||!q.done||q.claimed)return;q.claimed=true;saveProg(p);
  MAIL.send(USER,{from:'의뢰소',fromChar:'의뢰소',sys:true,title:'의뢰 완료 보상',body:EXP.questText(q),gold:q.gold,items:[]});
  const cp=Object.assign({lv:1,xp:0,count:0},store.get(KEY('craft'),{}));cp.xp+=q.cxp;while(cp.xp>=EXP.craftNeed(cp.lv)){cp.xp-=EXP.craftNeed(cp.lv);cp.lv++}store.set(KEY('craft'),cp);
  toast(`의뢰 완료! ${q.gold}G는 우편으로 보냈어요.`);const sy=scrollY;renderLobby();scrollTo(0,sy)});
 document.querySelectorAll('#lmain [data-use]').forEach(b=>b.onclick=()=>{const it=inv.find(x=>x.uid===b.dataset.use);if(it&&it.name===RECAST.name)startRecast();else if(it&&it.name===EXP.LUCKY.name)useLucky(it)});
 document.querySelectorAll('#lmain [data-geq]').forEach(b=>b.onclick=()=>{const it=inv.find(x=>x.uid===b.dataset.geq);if(!it||!it.gear)return;inv.forEach(x=>{if(x.gearEq&&x.gear&&x.gear.type===it.gear.type)delete x.gearEq});it.gearEq=true;save();toast(`${it.name}을(를) 장착했어요.`)});
 document.querySelectorAll('#lmain [data-gun]').forEach(b=>b.onclick=()=>{const it=inv.find(x=>x.uid===b.dataset.gun);if(it){delete it.gearEq;save();toast(`${it.name}을(를) 해제했어요.`)}});
 document.querySelectorAll('#lmain [data-craft]').forEach(b=>b.onclick=()=>{const [type,dd]=b.dataset.craft.split(':'),d=+dd,G=EXP.GEAR[type];
  for(const [m,n] of Object.entries(G.need)){if(inv.filter(x=>x.name===EXP.matName(m,d)&&!x.eq).length<n)return toast('재료가 모자라요.')}
  for(const [m,n] of Object.entries(G.need)){let left=n;for(let i=inv.length-1;i>=0&&left>0;i--)if(inv[i].name===EXP.matName(m,d)&&!inv[i].eq){inv.splice(i,1);left--}}
  const cp=Object.assign({lv:1,xp:0,count:0},store.get(KEY('craft'),{}));const gr=EXP.rollGrade(cp.lv,Math.random);const up=EXP.addCraftXp(cp,EXP.craftXp(d));store.set(KEY('craft'),cp);
  {const p=prog();EXP.track(p,Date.now(),{type:'craft'});saveProg(p)}if(gr===4&&recordAch('legend'))setTimeout(()=>toast('업적 달성: 전설의 손'),1500);
  const g=EXP.gearItem(type,d,gr);inv.push({uid:'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),...g,got:Date.now()});save();
  toast(`${g.name}을(를) 만들었어요.${gr?' '+EXP.GRADES[gr].k+' 등급!':''}${up?` 제작 숙련도 Lv. ${cp.lv}!`:''}`)});
 document.querySelectorAll('#lmain [data-enh]').forEach(b=>b.onclick=()=>{const it=inv.find(x=>x.uid===b.dataset.enh);if(!it||!it.gear)return;const c=EXP.enhanceCost(it.gear.plus||0);
  const cr=inv.filter(x=>x.name===EXP.CRYSTAL.name&&!x.eq);if(cr.length<c)return toast('심연 결정이 모자라요.');let left=c;for(let i=inv.length-1;i>=0&&left>0;i--)if(inv[i].name===EXP.CRYSTAL.name&&!inv[i].eq){inv.splice(i,1);left--}
  EXP.enhance(it);save();toast(`${it.name}(으)로 강화했어요.`)});
 document.querySelectorAll('#lmain [data-cd]').forEach(b=>b.onclick=()=>{craftDepth=+b.dataset.cd;const sy=scrollY;renderLobby();scrollTo(0,sy)});
 document.querySelectorAll('#lmain [data-uneq]').forEach(b=>b.onclick=()=>{const it=inv.find(x=>x.uid===b.dataset.uneq);if(it){delete it.eq;save();toast(`${it.name}을(를) 창고에 넣었어요.`)}});
 $('#invSort').onchange=e=>{invSort=e.target.value;renderLobby()};
 $('#invKind').onchange=e=>{invKind=e.target.value;renderLobby()};
 {const q=$('#invQ'),box=$('#storage .inv');const apply=()=>{invQ=q.value;const k=invQ.replace(/\s+/g,'').toLowerCase();let n=0;if(box){box.querySelectorAll('.item').forEach(el=>{const ok=!k||el.dataset.n.includes(k);el.hidden=!ok;if(ok)n++});}let m=$('#invNone');if(!m&&box){m=document.createElement('div');m.id='invNone';m.className='empty';box.after(m)}if(m){m.hidden=!(box&&k&&!n);m.textContent=`「${invQ.trim()}」이(가) 들어간 아이템이 없어요.`}};q.oninput=apply;q.onkeydown=e=>{if(e.key==='Escape'){q.value='';apply()}};apply()}

}
