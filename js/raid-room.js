// 시 스템 :: 딥 다이브 — 레이드 대기실 · 보스 기술 보기 · 전투 창 연결
// ── 레이드 대기실 (서버가 생기면 RAID 함수들을 방 서버 API/WebSocket으로 바꿔요)
const BOSSES={fsm:{name:'추락한 별의 악의',hp:80,def:2,atk:1,map:'11×11',tags:'기술 변경 · 조건부 불사 · 밀어내기 · 조건부 광역 피해',quote:'별이 사라진 뒤에야 진짜 하늘이 보이지.'}};
const SCROLL=EXP.SCROLL_NAME;const isScroll=n=>(n||'').startsWith('보스 소환 주문서');
const scrollCount=()=>store.get(KEY('inv'),[]).filter(x=>isScroll(x.name)).length;
const RAID={
 all(){const now=Date.now();return store.get('stem-rooms',[]).filter(r=>r.members.length&&now-r.createdAt<6*36e5)},
 save(a){store.set('stem-rooms',a)},
 me(){const c=myCh();return{user:USER,portrait:c.portrait||null,char:c.name,jobs:c.jobs,race:c.race,lv:prog().lv,stats:c.stats,sp_max:c.sp_max,hp:c.hp,skills:c.skills,ready:false}},
 create(title){if(banLeft())throw new Error('레이드 이탈 제재 중이에요.');const a=RAID.all();const r={id:'r'+Date.now().toString(36),title:title||`${myChar()}의 레이드`,boss:'fsm',host:USER,members:[{...RAID.me(),ready:true}],status:'wait',createdAt:Date.now()};a.push(r);RAID.save(a);return r},
 join(id){if(banLeft())throw new Error('레이드 이탈 제재 중이에요. 남은 시간 '+fmtLeft(banLeft()));if(id.startsWith('demo')&&!id.includes('-')){const tpl=DEMO_ROOMS().find(x=>x.id===id);const a=RAID.all();a.push({...tpl,id:id+'-'+USER+'-'+Date.now().toString(36),members:[...tpl.members,RAID.me()],createdAt:Date.now()});RAID.save(a);return}
  const a=RAID.all(),r=a.find(x=>x.id===id);if(!r)throw new Error('방이 사라졌어요.');if(r.status!=='wait')throw new Error('이미 시작한 방이에요.');if(r.members.length>=4)throw new Error('방이 가득 찼어요.');if(!r.members.some(m=>m.user===USER))r.members.push(RAID.me());RAID.save(a)},
 leave(){const a=RAID.all();a.forEach(r=>{const i=r.members.findIndex(m=>m.user===USER);if(i<0)return;r.members.splice(i,1);if(r.host===USER&&r.members.length){r.host=r.members[0].user;r.members[0].ready=true}});RAID.save(a.filter(r=>r.members.length&&!(r.demo&&!r.members.some(m=>!m.user.startsWith('demo_')))))},
 ready(on){const a=RAID.all(),r=a.find(x=>x.members.some(m=>m.user===USER));if(!r)return;r.members.find(m=>m.user===USER).ready=on;RAID.save(a)},
 kick(u){const a=RAID.all(),r=a.find(x=>x.host===USER);if(!r)return;r.members=r.members.filter(m=>m.user!==u);RAID.save(a)},
 start(){const a=RAID.all(),r=a.find(x=>x.host===USER&&x.status==='wait');if(!r)return;
  const inv=store.get(KEY('inv'),[]);const i=inv.findIndex(x=>isScroll(x.name)&&!x.eq),j=i>=0?i:inv.findIndex(x=>isScroll(x.name));if(j<0)throw new Error('보스 소환 주문서가 없어요. 탐사 심도 1 이상에서 나와요.');
  inv.splice(j,1);store.set(KEY('inv'),inv);r.status='start';r.startedAt=Date.now();RAID.save(a);
  r.members.forEach(m=>{SOC.recordRaid(BOSSES[r.boss].name,r.members,m.user);if(!m.user.startsWith('demo_'))recordAch('raid',m.user,m.char)});return r}
};
let raidSel=null,raidSk=null;
function memberFull(m){const c=(store.get('stem-saved:'+m.user,[])[0])||{};if(m.skills)return{...m,portrait:m.portrait||c.portrait||null};return{...m,portrait:m.portrait||c.portrait||null,skills:c.skills||[],stats:c.stats,sp_max:c.sp_max,hp:c.hp}}
function enterBattle(r){
 const party=r.members.map(m=>{const f=memberFull(m);return{char:m.char,jobs:m.jobs||[],stats:f.stats||{atk:0,def:0,eva:0,com:0},me:m.user===USER}});
 const enc=encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(party)))));
 view('battle');closeDM();$('#bTitle').textContent=BOSSES[r.boss].name;$('#bInfo').textContent=`${r.title} · ${party.map(p=>p.char).join(', ')}`;
 $('#eSub').textContent=r.title;$('#eBoss').textContent='【'+BOSSES[r.boss].name+'】';$('#eParty').innerHTML=r.members.map(m=>`<span class="ep">${avatar(memberFull(m).portrait,m.char,44,(JOB[(m.jobs||[])[0]]||{}).c)}${esc(m.char)} · ${esc((m.jobs||[]).join('+'))}</span>`).join('');
 const en=$('#bEnter');en.hidden=false;en.style.animation='none';en.offsetHeight;en.style.animation='';setTimeout(()=>{en.hidden=true},2500);
 const pics=r.members.map(m=>memberFull(m).portrait||null);const fr=$('#bFrame');fr.onload=()=>{try{fr.contentWindow.postMessage({type:'portraits',list:pics},'*')}catch(e){}};
 fr.src='raid.html#party='+enc;battleRoom=r.id;mountBattleChat()}
let battleRoom=null;
document.addEventListener('click',e=>{const b=e.target.closest('[data-btab]');if(!b)return;bossTab=b.dataset.btab;const sy=scrollY;renderRaid();scrollTo(0,sy)});
window.addEventListener('message',e=>{if(e.data&&e.data.type==='raid-end'&&!$('#battle').hidden){const rs=RAID.all(),rr=rs.find(x=>x.id===battleRoom);if(rr){rr.ended=e.data.result;RAID.save(rs)}toast(e.data.result==='win'?`레이드 성공! (${e.data.round}라운드)`:`전멸했어요. (${e.data.round}라운드)`)}});
function myRoom(){return USER?RAID.all().find(r=>r.members.some(m=>m.user===USER)):null}
const SKN=n=>(DATA.find(s=>s.name===n)||{}).id;
const COMMON_IDS=['COM-01','COM-02','COM-03','COM-04','COM-05','COM-06'];
const DM=(user,char,race,jobs,lv,stats,extra)=>({user,char,race,jobs,lv,stats,hp:20,sp_max:10+stats.com,skills:[...COMMON_IDS,...extra.map(x=>x.includes('-')?x:SKN(x))].filter(Boolean),ready:true});
const DEMO_ROOMS=()=>[{id:'demo1',title:'역수검 연습 파티',boss:'fsm',host:'demo_alpha',members:[
  DM('demo_alpha','카인','로게움',['전사'],12,{atk:4,def:0,eva:1,com:0},['LOG-01','LOG-02','LOG-04','흐름잡기','연격','진혼검','결(決)']),
  DM('demo_beta','서리의 에테르','에테르',['수호자','성직자'],8,{atk:0,def:3,eva:1,com:1},['AET-01','AET-03','AET-04','AET-05','적의집중','보호 방진','변칙 검술','구원의 손길','홀리 피스트','성광'])],status:'wait',createdAt:Date.now()-6e5,demo:true},
 {id:'demo2',title:'초보 환영 · 천천히',boss:'fsm',host:'demo_gamma',members:[
  DM('demo_gamma','아벨','로게움',['음유시인'],3,{atk:0,def:0,eva:0,com:2},['LOG-01','LOG-03','LOG-05','불협화음','악기 손질','스포트라이트'])],status:'wait',createdAt:Date.now()-12e5,demo:true}];
// ── 보스 기술 (「보스 설계 - 추락한 별의 악의」 v2 기준)
const R1=()=>{const o=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)if(x||y)o.push([x,y]);return o};
const BOSS_SK={
 passive:[['나눠진 영혼','패시브','검이 파괴될 때마다 최대 체력 −5, 현재 체력 −2, 공격 +1.'],
  ['넘치는 재능','패시브','검이 하나라도 있으면 해제할 수 없는 [불사]. 현재 체력이 최대 체력보다 높아지면 그 차이만큼 맵의 모든 대상(플레이어와 검)에게 피해를 주고 현재 체력을 최대 체력으로 맞춘다.'],
  ['검의 무덤','필드','체력 10짜리 검 8개가 보스에서 거리 2인 8방향에 꽂혀 있다. 검이 남아 있는 한 보스는 쓰러지지 않는다.']],
 start:[['지각파쇄','매 라운드 시작','보스 1칸 안의 모든 적에게 피해 1. 맞은 적이 1명 이하면 그 적은 1라운드 [체공].'],
  ['낙성검','매 라운드 시작','각 검이 1칸 안의 모든 적에게 고정 피해 1.'],
  ['양손잡기','홀수 라운드 시작','이번 라운드 공격 +1. 피해를 입힌 대상을 (입힌 피해 ÷ 2)칸 밀어낸다.'],
  ['역수검','짝수 라운드 시작','이번 라운드 공격 2개 중 1개(무작위)의 범위가 반전된다(안전지대 ↔ 피격지대). 역수검 상태의 공격에 맞으면 [체공].']],
 trigger:[['승기 포착','[체공]인 적이 있을 때','[체공] 상태의 모든 적에게 피해 14를 나눠서 준다(나머지 버림).'],
  ['대상 선언','라운드 종료 시 보스 1칸 안에 적이 없을 때','가장 가까운 적에게 1라운드 [속박]을 걸고, 그 적 근처의 가장 가까운 칸으로 이동한다.'],
  ['별의 무덤','5번째 라운드 종료','남은 검을 모두 회수한다(나눠진 영혼 적용). 이후 [체공]은 액션 턴도 막는다. 검이 없으면 발동하지 않는다.']],
 status:[['[체공]','주는 피해 −1, 세팅 턴 실행 불가. (별의 무덤 이후: 액션 턴 실행 불가)'],['[속박]','칸을 이동할 수 없다.']],
 attacks:[
  {n:'기억 재현: 포격',c:'tgt',dmg:'1D6+2',dg:6,d:'★ + 상하좌우',f:()=>[[0,0],[0,-1],[0,1],[-1,0],[1,0]]},
  {n:'유성우',c:'tgt',dmg:'1D6+2',dg:6,d:'★ + 대각선 1·2칸 + 네 모서리 2×2',f:()=>{const o=[[0,0]];for(const sx of[-1,1])for(const sy of[-1,1]){o.push([sx,sy],[2*sx,2*sy]);for(const a of[3,4])for(const b of[3,4])o.push([sx*a,sy*b])}return o}},
  {n:'한손 전력 배기',c:'boss',dmg:'1D6+2',dg:5,d:'대상 방향 직선 5칸',f:()=>[1,2,3,4,5].map(i=>[0,i])},
  {n:'기억 재현: 진각',c:'tgt',dmg:'1D6+1',dg:4,d:'★ + 보스 반대쪽 3×2',f:()=>[[0,0],[-1,1],[0,1],[1,1],[-1,2],[0,2],[1,2]]},
  {n:'한손 하단 배기',c:'boss',dmg:'1D6+1',dg:3,d:'대상 방향 축으로 양쪽 직선 5칸씩',f:()=>[1,2,3,4,5].flatMap(i=>[[0,i],[0,-i]])},
  {n:'섬멸자',c:'boss',dmg:'1D6+1',dg:3,d:'대각선 네 방향의 2×2 블록',f:()=>{const o=[];for(const sx of[-1,1])for(const sy of[-1,1])for(const a of[1,2])for(const b of[1,2])o.push([sx*a,sy*b]);return o}},
  {n:'절대적 악의',c:'boss',dmg:'1D6+1',dg:3,d:'보스 주변 8칸',f:R1},
  {n:'기억 재현: 투창',c:'tgt',dmg:'1D6',dg:2,d:'★ + 자루 3칸 + 3×2 머리',f:()=>[[0,0],[0,1],[0,2],[0,3],[-1,4],[0,4],[1,4],[-1,5],[0,5],[1,5]]},
  {n:'융해',c:'tgt',dmg:'1D6',dg:2,d:'★ + 5×5 꽃 모양 고리',f:()=>[[0,0],[-1,-2],[0,-2],[1,-2],[-2,-1],[0,-1],[2,-1],[-2,0],[-1,0],[1,0],[2,0],[-2,1],[0,1],[2,1],[-1,2],[0,2],[1,2]]},
  {n:'천지개벽',c:'boss',dmg:'1D6',dg:1,d:'보스 주변 7×7 (거리 3 이내)',f:()=>{const o=[];for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++)if(x||y)o.push([x,y]);return o}}]};
let bossTab='attacks';
function miniGrid(a){const N=11,c=5,cy=a.c==='tgt'?(a.n.includes('투창')||a.n.includes('진각')?3:5):5,set=new Set(a.f().map(([x,y])=>(c+x)+','+(cy+y)));let h='';
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const k=x+','+y,org=x===c&&y===cy;h+=`<i class="${set.has(k)?'hit':''} ${org?(a.c==='tgt'?'star':'bossc'):''}">${org?(a.c==='tgt'?'★':'✦'):''}</i>`}
 return `<div class="mg">${h}</div>`}
function bossSkillsHtml(){const S=BOSS_SK,tabs=[['attacks','공격 10종'],['gimmick','기믹 한눈에']];if(!tabs.some(x=>x[0]===bossTab))bossTab='attacks';
 const row=([n,w,d])=>`<li><div><b>${esc(n)}</b> <span class="tag">${esc(w)}</span></div><p>${esc(d)}</p></li>`;
 let body='';
 const card=a=>`<div class="ba ${a.c}">${miniGrid(a)}<div><b>${esc(a.n)}</b><div>피해 <b>${a.dmg}</b> + 공격 · 위험도 <b>${a.dg}</b></div><small class="sub">${esc(a.d)}</small></div></div>`;
 if(bossTab==='attacks')body=`<p class="sub" style="margin:8px 0">라운드마다 10종 중 2개를 무작위로 공개해요. 공격 값 = 피해 다이스 + 보스 공격. 위험도가 높은 공격부터 처리해요.</p>
  <div class="agroup"><h4><span class="sw boss"></span>근거리 · 보스 기준 <span class="sub">✦ = 보스 · 아래쪽이 대상 방향 · 보스 칸은 안 맞음</span></h4><div class="batk">${S.attacks.filter(a=>a.c==='boss').map(card).join('')}</div></div>
  <div class="agroup"><h4><span class="sw tgt"></span>원거리 · 대상 기준 <span class="sub">★ = 대상 · ★ 칸도 맞음 · 투창·진각은 아래쪽이 보스 반대 방향</span></h4><div class="batk">${S.attacks.filter(a=>a.c==='tgt').map(card).join('')}</div></div>`;
 else{const sec=(title,list,fmt)=>`<div class="gsec"><h4>${title}</h4><ul class="glist">${list.map(fmt).join('')}</ul></div>`;
  const li=([n,w,d])=>`<li><div class="gh"><b>${esc(n)}</b><span class="when">${esc(w)}</span></div><p>${esc(d)}</p></li>`;
  body=`<div class="gimmick">
   ${sec('라운드 시작',S.start,li)}
   ${sec('트리거',S.trigger,li)}
   ${sec('패시브 · 필드',S.passive,li)}
   ${sec('보스 전용 상태이상',S.status,([n,d])=>`<li><div class="gh"><b>${esc(n)}</b></div><p>${esc(d)}</p></li>`)}
  </div>`}
 return `<div class="bskill"><h3 style="margin-top:14px">보스 기술</h3><div class="cats" style="margin-top:6px">${tabs.map(([k,n])=>`<button data-btab="${k}" aria-selected="${bossTab===k}">${n}</button>`).join('')}</div>${body}</div>`}
function renderRaid(){
 const el=$('#raidBody'),mine=myRoom(),B=BOSSES.fsm,sc=scrollCount();
 const bossCard=`<div class="card"><div class="row" style="justify-content:space-between"><h2>${esc(B.name)}</h2><span class="sub">“${esc(B.quote)}”</span></div>
  <div class="bossc"><span class="sub">HP</span><span>${B.hp} · 방어 ${B.def} · 공격 ${B.atk} (검이 부서질 때마다 +1)</span><span class="sub">맵</span><span>${B.map}, 체력 10짜리 검 8개</span><span class="sub">특징</span><span>${esc(B.tags)}</span><span class="sub">내 주문서</span><span><b>${sc}</b>장 ${sc?'':'· 탐사 심도 1 이상에서 낮은 확률로 나와요'}</span></div>${bossSkillsHtml()}</div>`;
 if(mine){const host=mine.host===USER,me=mine.members.find(m=>m.user===USER),allReady=mine.members.every(m=>m.ready);
  el.innerHTML=`<div class="card"><div class="row" style="justify-content:space-between;align-items:start"><div><h2>${esc(mine.title)}${mine.demo?' <span class="tag">예시</span>':''}</h2><div class="sub">${mine.status==='start'?'전투가 시작됐어요':'대기 중'} · ${mine.members.length}/4명 · 방장 ${esc(mine.members.find(m=>m.user===mine.host)?.char||'')}</div></div><button class="ghost" id="rLeave">방 나가기</button></div>
   <div class="party">${[0,1,2,3].map(i=>{const m=mine.members[i];if(!m)return `<div class="seat empty">빈 자리</div>`;const mf=memberFull(m);return `<div class="seat ${m.ready?'ready':''}">${m.user===mine.host?'<span class="crown">★ 방장</span>':''}${avatar(mf.portrait,m.char,64,(JOB[(m.jobs||[])[0]]||{}).c)}${titleOf(m.user)?`<span class="ttl">${esc(titleOf(m.user))}</span>`:''}<div class="disp">${esc(m.char)}</div><small class="sub">${esc(m.race)} · Lv. ${m.lv}</small><div>${(m.jobs||[]).map(j=>`<span class="pill" style="--c:${(JOB[j]||{}).c||'var(--line)'}">${esc(j)}</span>`).join('')}</div><small class="sub">${esc(m.user)}${m.user===USER?' (나)':''}</small><div style="margin-top:auto" class="row">${m.ready?'<span class="statusb run">준비 완료</span>':'<span class="sub">준비 중</span>'}${host&&m.user!==USER&&mine.status==='wait'?`<button class="ghost mini" data-kick="${esc(m.user)}">내보내기</button>`:''}${m.user!==USER?`<button class="ghost mini" data-dm="${esc(m.user)}" data-c="${esc(m.char)}">1대1</button><button class="ghost mini flagbtn" data-rep="${esc(m.user)}" data-c="${esc(m.char)}">신고</button>`:''}</div><button class="ghost mini seatbtn" data-sel="${esc(m.user)}" aria-pressed="${raidSel===m.user}">${raidSel===m.user?'접기':'직업·기술 보기'}</button></div>`}).join('')}</div>
   ${(()=>{const m0=mine.members.find(m=>m.user===raidSel);if(!m0)return '';const m=memberFull(m0),S=m.stats||{atk:0,def:0,eva:0,com:0};
    const g={};(m.skills||[]).forEach(id=>{const s=BYID[id];if(!s)return;const k=s.group==='공통'?'일반':(s.group==='로게움'||s.group==='에테르')?m.race:s.group;(g[k]=g[k]||[]).push(s)});
    const ord=['일반',m.race,...(m.jobs||[])].filter(k=>g[k]);const sel=raidSk&&BYID[raidSk];
    return `<div class="mview"><div class="row" style="justify-content:space-between"><div class="row" style="justify-content:flex-start;align-items:center;gap:10px">${avatar(m.portrait,m.char,48,(JOB[(m.jobs||[])[0]]||{}).c)}${TT(m.user)}<b class="disp" style="font-size:22px">${esc(m.char)}</b> <span class="sub">${esc(m.race)} · Lv. ${m.lv}</span></div><div>${(m.jobs||[]).map(j=>`<span class="pill" style="--c:${(JOB[j]||{}).c||'var(--line)'}">${esc((JOB[j]||{}).star||'')} · ${esc(j)}</span>`).join('')}</div></div>
     <div class="kv"><span class="sub">능력치</span><span>공격 <b>${S.atk}</b> · 방어 <b>${S.def}</b> · 회피 <b>${S.eva}</b> · 소통 <b>${S.com}</b> · HP ${m.hp||20} · SP 최대 ${m.sp_max||10+S.com}</span></div>
     ${ord.map(k=>`<div class="chiprow"><span class="cg" style="color:${JOB[k]?JOB[k].c:'var(--mute)'}">${esc(k)}</span>${g[k].map(s=>`<button class="schip ${turnCls(s.turn||'')} ${raidSk===s.id?'on':''}" data-rsk="${s.id}">${esc(s.name)}${s.kind==='포비든'?' ★':''}</button>`).join('')}</div>`).join('')}
     ${sel?`<div class="skdet"><b>${esc(sel.name)}</b> <span class="tag ${turnCls(sel.turn||'')}">${esc(sel.turn||'-')}</span>${sel.sp?` <span class="tag">SP ${sel.sp}</span>`:''}${sel.range&&sel.range!=='-'?` <span class="tag">${esc(sel.range)}</span>`:''}${/^[1-5]$/.test(sel.speed)?` <span class="tag">속도 ${sel.speed}</span>`:''}<p>${esc(sel.effect)}</p></div>`:'<div class="sub" style="margin-top:8px">기술을 누르면 효과가 보여요.</div>'}</div>`})()}
   <div class="row" style="margin-top:14px">${mine.status==='start'?'<button class="go" id="rBattle">전투 화면으로</button><span class="sub">함께한 스템은 친구 탭 "최근 레이드에서 만난 스템"에 기록됐어요.</span>'
    :host?`<button class="go" id="rStart" ${allReady&&sc?'':'disabled'}>주문서 1장 쓰고 시작</button><span class="sub">${!sc?'보스 소환 주문서가 없어요.':allReady?'모두 준비됐어요. 1~4명이면 시작할 수 있어요.':'모든 파티원이 준비해야 시작할 수 있어요.'}</span>`
    :`<button class="${me.ready?'ghost':'go'}" id="rReady">${me.ready?'준비 취소':'준비 완료'}</button><span class="sub">방장이 주문서를 써서 시작해요.</span>`}</div></div><div class="card"><h2>파티 채팅</h2><div class="sub" style="margin-bottom:6px">이 방 파티원끼리만 보여요. 전투 화면에서도 이어져요.</div><div id="rcRoom"></div></div>${bossCard}`;
  RCHAT.mount($('#rcRoom'),mine.id);
  const rb=$('#rBattle');if(rb)rb.onclick=()=>enterBattle(mine);
  $('#rLeave').onclick=async()=>{if(mine.status==='start'&&!mine.ended){await leaveRaidMidway();return}RAID.leave();toast('방에서 나왔어요.');renderRaid()};
  const rs=$('#rStart');if(rs)rs.onclick=()=>{try{const r=RAID.start();if(r){enterBattle(r);return}}catch(e){toast(e.message)}renderRaid()};
  const rr=$('#rReady');if(rr)rr.onclick=()=>{RAID.ready(!me.ready);
   if(mine.demo&&!me.ready){toast('예시 방장이 곧 시작해요…');const rid=mine.id,who=USER;setTimeout(()=>{const a=RAID.all(),r=a.find(x=>x.id===rid);if(!r||r.status!=='wait'||!r.members.every(m=>m.ready))return;r.status='start';r.startedAt=Date.now();RAID.save(a);SOC.recordRaid(BOSSES[r.boss].name+' (예시)',r.members,who);if(USER===who&&!$('#raid').hidden){toast('예시 방장이 레이드를 시작했어요.');enterBattle(r)}},1500)}
   renderRaid()};
  el.querySelectorAll('[data-rep]').forEach(b=>b.onclick=()=>reportUser(b.dataset.rep,b.dataset.c));
  el.querySelectorAll('[data-sel]').forEach(b=>b.onclick=()=>{raidSel=raidSel===b.dataset.sel?null:b.dataset.sel;raidSk=null;renderRaid()});
  el.querySelectorAll('[data-rsk]').forEach(b=>b.onclick=()=>{raidSk=raidSk===b.dataset.rsk?null:b.dataset.rsk;renderRaid()});
  el.querySelectorAll('[data-kick]').forEach(b=>b.onclick=()=>{RAID.kick(b.dataset.kick);renderRaid()});
  el.querySelectorAll('[data-dm]').forEach(b=>b.onclick=()=>openDM(b.dataset.dm,b.dataset.c));
  return}
 const demo=store.get('stem-chatdemo',false);
 const list=[...RAID.all().filter(r=>r.status==='wait'&&!r.demo),...(demo?DEMO_ROOMS():[])].sort((a,b)=>b.createdAt-a.createdAt);
 const bl=banLeft();
 el.innerHTML=`${bl?`<div class="banbar" role="status"><b>레이드 참여 불가</b> · 진행 중인 레이드에서 나가서 <span id="banLeft">${fmtLeft(bl)}</span> 동안 방을 만들거나 들어갈 수 없어요.</div>`:''}<div class="card"><h2>방 만들기</h2><form class="rform" id="rForm"><input type="text" id="rTitle" maxlength="30" placeholder="방 제목 (예: 역수검 연습 파티)" aria-label="방 제목"><button class="go" ${bl?'disabled':''}>공개 방 만들기</button></form>
   <div class="sub" style="margin-top:6px">방장만 시작할 때 보스 소환 주문서 1장이 필요해요(지금 ${sc}장). 파티원은 주문서 없이 들어갈 수 있어요.</div></div>
  <div class="card"><div class="row" style="justify-content:space-between"><h2>공개 방 ${list.length}</h2><div class="row"><label class="demo2"><input type="checkbox" id="rDemo" ${demo?'checked':''}> 예시 방 보기</label><button class="ghost mini" id="rRefresh">새로고침</button></div></div>
   ${list.length?`<div class="rooms">${list.map(r=>{const h=r.members.find(m=>m.user===r.host)||r.members[0];const full=r.members.length>=4;return `<div class="room"><div class="row"><b>${esc(r.title)}</b><div class="pips">${[0,1,2,3].map(i=>`<i class="${i<r.members.length?'on':''}"></i>`).join('')}</div></div>
     <small class="sub">${esc(BOSSES[r.boss].name)} · 방장 ${esc(h.char)} · ${r.members.length}/4</small>
     <div class="mcol">${r.members.map(m=>`<div class="mc">${avatar(memberFull(m).portrait,m.char,44,(JOB[(m.jobs||[])[0]]||{}).c)}${titleOf(m.user)?`<span class="ttl">${esc(titleOf(m.user))}</span>`:''}<b>${esc(m.char)}</b><small>${esc((m.jobs||[]).join('+'))}</small></div>`).join('')}${Array.from({length:4-r.members.length},()=>`<div class="mc vac"><span class="avatar ph" style="width:44px;height:44px" aria-hidden="true"></span><small>빈 자리</small></div>`).join('')}</div>
     <div class="row"><span class="sub">${Math.max(1,Math.round((Date.now()-r.createdAt)/6e4))}분 전</span><button class="go mini" data-join="${r.id}" ${full||bl?'disabled':''}>${full?'가득 참':r.demo?'예시 방 입장':'입장'}</button></div></div>`}).join('')}</div>`
    :'<div class="empty">열린 방이 없어요. 첫 방을 만들어 보세요.</div>'}</div>${bossCard}`;
 $('#rForm').onsubmit=ev=>{ev.preventDefault();try{RAID.create($('#rTitle').value.trim());toast('방을 만들었어요.')}catch(e){toast(e.message)}renderRaid()};
 $('#rRefresh').onclick=renderRaid;
 $('#rDemo').onchange=e=>{store.set('stem-chatdemo',e.target.checked);renderRaid()};
 el.querySelectorAll('[data-join]').forEach(b=>b.onclick=()=>{try{RAID.join(b.dataset.join);toast('방에 들어왔어요.')}catch(e){toast(e.message)}renderRaid()});
}
window.addEventListener('storage',e=>{if(e.key==='stem-rooms'&&USER&&!$('#raid').hidden){const r=myRoom();if(r&&r.status==='start'&&r.host!==USER&&battleRoom!==r.id){toast('방장이 레이드를 시작했어요!');enterBattle(r)}else renderRaid()}});
$('#bBack').onclick=async()=>{const r=myRoom();if(r&&r.status==='start'&&!r.ended){await leaveRaidMidway();return}$('#bFrame').src='about:blank';battleRoom=null;view('raid');renderRaid()};
