// 시 스템 :: 딥 다이브 — 업적 · 타이틀
// ── 업적 (서버가 생기면 GET /api/achievements 결과로 ACHV를 채워요: {id,name,desc,cat,holders:[{user,char,at}]})
const DEMO_ACHV=[
 {id:'d1',name:'예시 업적 — 첫 걸음',desc:'화면 미리보기용 예시예요.',cat:'탐사',holders:Array.from({length:42},(_,i)=>({user:'user'+i,char:'스템'+i,at:Date.UTC(2026,10,1)+i*36e5*7}))},
 {id:'d2',name:'예시 업적 — 별을 떨어뜨린 자',desc:'화면 미리보기용 예시예요.',cat:'레이드',holders:[{user:'alpha',char:'카인',at:Date.UTC(2026,10,12,9)},{user:'beta',char:'서리의 에테르',at:Date.UTC(2026,10,12,9)},{user:'gamma',char:'아벨',at:Date.UTC(2026,10,15,20)}]},
 {id:'d3',name:'예시 업적 — 아직 아무도',desc:'화면 미리보기용 예시예요.',cat:'레이드',holders:[]}];
const GUARD_T=['첫 잠수부','얕은 물을 건넌 자','덩쿨을 끊은 자','숲의 그늘을 지난 자','깊은 물의 사냥꾼','별의 잔향을 넘은 자'],ABYSS_T={10:'심연을 걷는 자',20:'심연의 순례자',30:'어둠을 헤엄치는 자',50:'심연의 주민',100:'바닥 없는 자'};
const ACH_DEFS=[...[0,1,2,3,4,5].map(d=>({id:'guard'+d,cat:'탐사',name:`심도 ${d}의 수호자`,title:GUARD_T[d],desc:`심도 ${d}의 수호자 「${EXP.GUARD_NAMES[d]}」를 처음 쓰러뜨려요.`})),
 ...[10,20,30,50,100].map(n=>({id:'abyss'+n,cat:'심연',name:`심연 ${n}층`,title:ABYSS_T[n],desc:`심연 ${n}층을 처음 클리어해요.`})),{id:'legend',cat:'제작',name:'전설의 손',title:'전설의 장인',desc:'전설 등급 장비를 처음 만들어요.'},{id:'raid',cat:'레이드',name:'첫 레이드',title:'첫 출격',desc:'레이드를 처음 시작해요.'},{id:'lucky',cat:'행운',name:'행운의 별',title:'행운의 별',desc:'탐사 중 아주 드물게 나오는 「행운의 별 습득권」을 사용해요.'}];
// ── 타이틀: 달성한 업적의 타이틀 하나를 닉네임 앞에 단다. 모두에게 보여야 하므로 공용 키(stem-titles: {user: achId})
const titleOf=u=>{const id=(store.get('stem-titles',{})||{})[u];if(!id)return '';const a=ACH_DEFS.find(x=>x.id===id);if(!a||!a.title)return '';const L=(store.get('stem-records',{})[id]||[]);return L.some(h=>h.user===u)?a.title:''};
const TT=u=>{const s=titleOf(u);return s?`<span class="ttl">${esc(s)}</span> `:''};
const myTitles=()=>{const recs=store.get('stem-records',{});return ACH_DEFS.filter(a=>a.title&&(recs[a.id]||[]).some(h=>h.user===USER))};
function setTitle(id){const m=store.get('stem-titles',{});if(id)m[USER]=id;else delete m[USER];store.set('stem-titles',m);const a=ACH_DEFS.find(x=>x.id===id);toast(a?`타이틀 「${a.title}」을 달았어요.`:'타이틀을 뗐어요.')}
function achList(){const recs=store.get('stem-records',{});return ACH_DEFS.map(a=>({...a,holders:recs[a.id]||[]}))}
function recordAch(key,user=USER,char=myChar()){const recs=store.get('stem-records',{});const L=recs[key]=recs[key]||[];if(L.some(h=>h.user===user))return false;L.push({user,char,at:Date.now()});store.set('stem-records',recs);return true}
let lbSeason=null;
function renderAchv(){
 const list=[...achList(),...($('#achvDemo').checked?DEMO_ACHV:[])];
 const cats=['전체',...new Set(list.map(x=>x.cat))];if(!cats.includes(achvCat))achvCat='전체';
 $('#achvCats').innerHTML=cats.map(c=>`<button role="tab" aria-selected="${c===achvCat}" data-acat="${esc(c)}">${esc(c)}</button>`).join('');
 const mine=a=>a.holders.some(h=>h.user===USER);
 $('#achvSum').innerHTML=`내 달성 <b>${list.filter(mine).length}</b> / ${list.length}`;
 const mt=myTitles(),curT=(store.get('stem-titles',{})||{})[USER]||'';
 const tHtml=`<div class="ach ttlcard"><div><b>내 타이틀</b> <small class="sub">달성한 업적의 타이틀 하나를 닉네임 앞에 달 수 있어요. 로비·채팅·친구·레이드에서 모두에게 보여요.</small>
  <div class="tprev">${titleOf(USER)?`<span class="ttl">${esc(titleOf(USER))}</span> `:''}<b>${esc(myChar())}</b></div></div>
  <div class="tpick">${mt.length?`<select id="ttlSel" aria-label="타이틀 고르기"><option value="">타이틀 없음</option>${mt.map(a=>`<option value="${a.id}" ${a.id===curT?'selected':''}>${esc(a.title)} · ${esc(a.name)}</option>`).join('')}</select>`:'<small class="sub">아직 받은 타이틀이 없어요. 업적을 달성하면 열려요.</small>'}</div></div>`;
 const last=a=>a.holders.length?Math.max(...a.holders.map(h=>h.at)):0;
 const cmp={base:()=>0,rare:(a,b)=>a.holders.length-b.holders.length,many:(a,b)=>b.holders.length-a.holders.length,recent:(a,b)=>last(b)-last(a)}[$('#achvSort').value];
 const fmt=t=>new Date(t).toLocaleString('ko-KR',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
 const shown=list.filter(a=>achvCat==='전체'||a.cat===achvCat).sort(cmp);
 const S=season(),hist=store.get('stem-seasons',[]),opts=[S,...hist.slice().reverse()];if(!opts.some(x=>x.id===lbSeason))lbSeason=S.id;const cur=opts.find(x=>x.id===lbSeason);
 const lb=Object.entries(seasonBoard(lbSeason)).map(([u,v])=>({user:u,...v})).sort((a,b)=>b.n-a.n||a.at-b.at);
 const fmtD=t=>new Date(t).toLocaleDateString('ko-KR');
 const sInfo=cur.id===S.id?`${fmtD(S.startedAt)} 시작${S.endsAt?` · ${fmtD(S.endsAt)} 종료${seasonLive(S)?` (${Math.max(0,Math.ceil((S.endsAt-Date.now())/864e5))}일 남음)`:' · <b>시즌 종료, 다음 시즌 대기 중</b>'}`:' · 종료일 미정'}`:`${fmtD(cur.startedAt)} ~ ${fmtD(cur.endedAt)} · 지난 시즌`;
 const lbHtml=`<div class="ach lbcard"><div><b>심연 최고 기록 · ${esc(cur.name)}</b> ${opts.length>1?`<select id=\"lbSel\" aria-label=\"시즌\">${opts.map(o=>`<option value=\"${o.id}\" ${o.id===lbSeason?'selected':''}>${esc(o.name)}${o.id===S.id?' (현재)':''}</option>`).join('')}</select>`:''}<br><small>${sInfo} · 같은 층이면 먼저 도달한 순</small></div><div class="cnt"><b>${lb.length}</b>명</div><ol class="holders" style="grid-column:1/-1">${lb.length?lb.slice(0,20).map((h,i)=>`<li class="${h.user===USER?'me':''}"><span>${i+1}. ${TT(h.user)}${esc(h.char)} <span class="sub">${esc(h.user)}</span></span><span>심연 <b>${h.n}</b>층</span></li>`).join(''):'<li><span class="sub">아직 심연에 내려간 스템이 없어요.</span></li>'}</ol></div>`;
 $('#achvList').innerHTML=tHtml+(achvCat==='전체'||achvCat==='심연'?lbHtml:'')+(!list.length?'<div class="empty">업적 목록이 아직 없어요. 업적이 정해지면 달성한 스템들과 함께 여기에 기록돼요.</div>'
  :`<div class="alist">${shown.map(a=>{const hs=[...a.holders].sort((x,y)=>x.at-y.at);return `<div class="ach ${mine(a)?'mine':''}">
   <div><span class="tag">${esc(a.cat)}</span> <b>${esc(a.name)}</b>${mine(a)?' <span class="tag t-icp">달성</span>':''}<br><small>${esc(a.desc)}</small>${a.title?`<div class="treward">타이틀 <span class="ttl">${esc(a.title)}</span>${mine(a)?(curT===a.id?' <small class="sub">달고 있음</small>':` <button class="linkbtn" data-ttl="${a.id}">달기</button>`):''}</div>`:''}</div>
   <div class="cnt"><b>${hs.length}</b>명 달성</div>
   <div class="first">${hs.length?`최초 달성 · ${TT(hs[0].user)}<b>${esc(hs[0].char)}</b> <span class="sub">(${esc(hs[0].user)} · ${fmt(hs[0].at)})</span>`:'<span class="sub">아직 달성한 스템이 없어요.</span>'}</div>
   ${hs.length>1?`<details><summary>달성한 스템 모두 보기</summary><ol class="holders">${hs.map((h,i)=>`<li class="${h.user===USER?'me':''}"><span>${i+1}. ${TT(h.user)}${esc(h.char)} <span class="sub">${esc(h.user)}</span></span><span>${fmt(h.at)}</span></li>`).join('')}</ol></details>`:''}
  </div>`}).join('')}</div>`);
 {const ls=$('#lbSel');if(ls)ls.onchange=e=>{lbSeason=e.target.value;renderAchv()}}
 {const ts=$('#ttlSel');if(ts)ts.onchange=e=>{setTitle(e.target.value);renderAchv()}}
 $('#achvList').querySelectorAll('[data-ttl]').forEach(b=>b.onclick=()=>{setTitle(b.dataset.ttl);renderAchv()});
 $('#achvCats').querySelectorAll('[data-acat]').forEach(b=>b.onclick=()=>{achvCat=b.dataset.acat;renderAchv()});
}
$('#achvSort').onchange=renderAchv;$('#achvDemo').onchange=renderAchv;
function go(v){view(v);({mail:renderMail,raid:renderRaid,explore:renderExplore,shop:renderShop,achv:()=>{lbSeason=null;renderAchv()},db:renderDB})[v]()}
