// 시 스템 :: 딥 다이브 — 우편 · GM 도구
// ── 우편 (서버가 생기면 MAIL 함수들을 서버 API로 바꿔요. 보낼 때 아이템·골드는 보내는 쪽에서 바로 빠지고 우편에 맡겨져요)
const MAIL={
 box(u=USER){return store.get('stem-mail:'+u,[])},
 setBox(u,a){store.set('stem-mail:'+u,a)},
 send(to,m){const a=MAIL.box(to);a.unshift({id:'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),at:Date.now(),read:false,claimed:false,...m});MAIL.setBox(to,a.slice(0,200))},
 users(){const out=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k.startsWith('stem-saved:'))continue;const u=k.slice(11),c=(store.get(k,[])[0]||{}).name;if(c)out.push({user:u,char:c})}}catch(e){}return out},
 isGM(u=USER){return store.get('stem-gms',[]).includes(u)}
};
const mailUnread=()=>USER?MAIL.box().filter(m=>!m.read).length:0;
let mailSel=null,mailTab='inbox',mailPick={},mailMsg='',gDraft={to:'*',title:'',body:'',gold:0,iname:'',ikind:'',icount:1},sDraft={to:'',title:'',body:'',gold:0};
function itemsSummary(items){return Object.values(items.reduce((g,i)=>{const k=i.name+'|'+i.kind;(g[k]=g[k]||{name:i.name,kind:i.kind,desc:i.desc,gear:i.gear,count:0}).count+=i.count||1;return g},{}))}
function claimMail(m){if(m.claimed)return false;const inv=store.get(KEY('inv'),[]);
 (m.items||[]).forEach(it=>{for(let i=0;i<(it.count||1);i++)inv.push({uid:'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),name:it.name,kind:it.kind,desc:it.desc||'',gear:it.gear,got:Date.now()})});
 store.set(KEY('inv'),inv);if(m.gold)store.set(KEY('money'),store.get(KEY('money'),0)+m.gold);m.claimed=true;m.read=true;return true}
function renderMail(){
 const el=$('#mailBody'),box=MAIL.box(),gm=MAIL.isGM();
 const openRep=store.get('stem-reports',[]).filter(r=>r.status==='open').length;
 const tabs=[['inbox',`받은 우편 ${box.length}`],['send','보내기'],...(gm?[['gm','GM 발송'],['reports',`신고 ${openRep}`],['season','시즌']]:[])];
 if(!tabs.some(x=>x[0]===mailTab))mailTab='inbox';
 let body='';
 if(mailTab==='inbox'){
  if(!box.some(m=>m.id===mailSel))mailSel=box[0]?.id||null;
  const m=box.find(x=>x.id===mailSel);
  if(m&&!m.read){m.read=true;MAIL.setBox(USER,box)}
  const unclaimed=box.filter(x=>!x.claimed&&((x.items||[]).length||x.gold));
  body=`<div class="mgrid"><div class="card"><div class="row" style="justify-content:space-between"><h2>받은 우편</h2>${unclaimed.length?`<button class="go mini" id="mAll">모두 받기 (${unclaimed.length})</button>`:''}</div>
   ${box.length?`<ul class="mlist">${box.map(x=>`<li data-mid="${x.id}" aria-current="${x.id===mailSel}" class="${x.read?'':'unread'}">${x.gm?'<span class="gmtag">GM</span>':x.sys?'<span class="gmtag sys">의뢰소</span>':''}<b>${esc(x.title||'(제목 없음)')}</b><small>${esc(x.fromChar)} · ${new Date(x.at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · ${x.claimed?'받음':((x.items||[]).length||x.gold)?'받을 것 있음':'메시지'}</small></li>`).join('')}</ul>`:'<div class="empty">받은 우편이 없어요.</div>'}
   ${box.some(x=>x.claimed||!((x.items||[]).length||x.gold))?'<button class="ghost mini" id="mClean" style="margin-top:8px">받은 우편 정리</button>':''}</div>
   <div class="card">${m?`<div class="row" style="justify-content:space-between;align-items:start"><div>${m.gm?'<span class="gmtag">GM</span>':''}<h2 style="display:inline">${esc(m.title||'(제목 없음)')}</h2><div class="sub">보낸 이 ${esc(m.fromChar)} (${esc(m.from)}) · ${new Date(m.at).toLocaleString('ko-KR')}</div></div>${!m.gm&&!m.sys&&m.from!==USER?`<button class="ghost mini" data-dm="${esc(m.from)}" data-c="${esc(m.fromChar)}">1대1</button>`:''}</div>
    ${m.body?`<p style="white-space:pre-wrap">${esc(m.body)}</p>`:''}
    ${(m.items||[]).length||m.gold?`<h3>첨부</h3><div class="attach">${m.gold?`<span><b>${m.gold.toLocaleString()}</b> 골드</span>`:''}${(m.items||[]).map(i=>`<span>${esc(i.name)} <b>×${i.count||1}</b> <small class="sub">${esc(i.kind)}</small></span>`).join('')}</div>
     ${m.claimed?'<span class="statusb run">받았어요</span>':`<button class="go" id="mClaim">받기</button>`}`:''}`
    :'<div class="empty" style="margin:0">우편을 고르세요.</div>'}</div></div>`;
 }else if(mailTab==='send'){
  const inv=store.get(KEY('inv'),[]),free=itemsSummary(inv.filter(i=>!i.eq&&!i.gearEq)),money=store.get(KEY('money'),0),fr=SOC.friends();
  body=`<div class="card mform"><h2>아이템·골드 보내기</h2><div class="sub">보내는 순간 내 창고와 지갑에서 빠지고, 상대 우편함에 들어가요. 들고 가는 아이템은 보낼 수 없어요.</div>
   <label for="mTo">받는 스템 이름</label><input type="text" id="mTo" list="mToList" placeholder="스템 이름 (친구는 목록에서 고를 수 있어요)" value="${esc(sDraft.to)}">
   <datalist id="mToList">${fr.map(f=>`<option value="${esc(f.char)}">`).join('')}</datalist>
   <label for="mTitle">제목</label><input type="text" id="mTitle" maxlength="40" placeholder="예: 레이드 고마웠어요" value="${esc(sDraft.title)}">
   <label for="mBody">메시지</label><textarea id="mBody" maxlength="300">${esc(sDraft.body)}</textarea>
   <label>보낼 아이템 <span class="sub">(창고에 있는 것)</span></label>
   ${free.length?`<ul class="pickl">${free.map((g,i)=>`<li><span>${esc(g.name)} <small class="sub">${esc(g.kind)} · 보유 ${g.count}</small></span><input class="qtyin" type="number" min="0" max="${g.count}" value="${mailPick[g.name+'|'+g.kind]||0}" data-pk="${esc(g.name+'|'+g.kind)}" aria-label="${esc(g.name)} 보낼 개수"></li>`).join('')}</ul>`:'<div class="sub">창고에 보낼 아이템이 없어요.</div>'}
   <label for="mGold">보낼 골드 <span class="sub">(보유 ${money.toLocaleString()})</span></label><input type="number" id="mGold" min="0" max="${money}" value="${sDraft.gold||0}">
   <div class="row" style="margin-top:12px"><button class="go" id="mSend">보내기</button></div></div>`;
 }else if(mailTab==='season'){
  const S=season(),hist=store.get('stem-seasons',[]),lb=Object.entries(seasonBoard(S.id)).sort((a,b)=>b[1].n-a[1].n);const fmtD=t=>new Date(t).toLocaleDateString('ko-KR');
  body=`<div class="card mform"><h2>시즌 관리</h2><div class="sub">시즌을 새로 시작하면 <b>심연 순위와 모든 유저의 심연 진행(최고 기록·시작 층)</b>이 초기화돼요. 지난 순위는 기록으로 남아요. 장비·레벨·재료·심도 0~5 진행·업적은 그대로예요.</div>
   <div class="kv" style="margin-top:12px"><span class="sub">현재</span><span><b>${esc(S.name)}</b> · ${fmtD(S.startedAt)} 시작 · ${S.endsAt?`${fmtD(S.endsAt)} 종료${seasonLive(S)?'':' (종료됨 — 순위 기록 멈춤)'}`:'종료일 미정'} · 순위 ${lb.length}명${lb[0]?` · 1위 ${esc(lb[0][1].char)} 심연 ${lb[0][1].n}층`:''}</span></div>
   <h3 class="sm">현재 시즌 종료일</h3><div class="row" style="justify-content:flex-start;gap:8px"><input type="date" id="sEnd" value="${S.endsAt?new Date(S.endsAt+9*3600e3).toISOString().slice(0,10):''}" style="width:auto"><button class="ghost mini" id="sEndSave">종료일 저장</button>${S.endsAt?'<button class="ghost mini" id="sEndClear">종료일 지우기</button>':''}</div>
   <div class="sub">종료일(한국 시간 그날 끝)이 지나면 순위 기록이 멈추고, 다음 시즌을 시작할 때까지 기다려요.</div>
   <h3 class="sm">새 시즌 시작</h3>
   <label for="sName">시즌 이름</label><input type="text" id="sName" maxlength="30" value="시즌 ${S.no+1}">
   <label for="sNewEnd">종료일 <span class="sub">(선택)</span></label><input type="date" id="sNewEnd" style="width:auto">
   <div class="row" style="margin-top:12px"><button class="go danger" id="sStart">새 시즌 시작</button></div>
   ${hist.length?`<h3 class="sm">지난 시즌</h3><ul class="pickl">${hist.slice().reverse().map(h=>{const b=Object.values(seasonBoard(h.id)).sort((a,b)=>b.n-a.n)[0];return `<li><span><b>${esc(h.name)}</b> <small class="sub">${fmtD(h.startedAt)} ~ ${fmtD(h.endedAt)}</small></span><span class="sub">${b?`1위 ${esc(b.char)} 심연 ${b.n}층`:'기록 없음'}</span></li>`}).join('')}</ul>`:''}</div>`;
 }else if(mailTab==='reports'){
  const reps=store.get('stem-reports',[]);
  body=`<div class="card"><h2>유저 신고</h2><div class="sub">채팅·레이드에서 들어온 신고예요. 대화 신고는 신고 시점의 최근 메시지, 사진 신고는 그때의 사진이 함께 저장돼요.</div>
   ${reps.length?reps.map(r=>`<div class="rep ${r.status!=='open'?'done':''}"><div class="row" style="justify-content:space-between"><span><span class="tag ${r.reason==='photo'?'':'t-act'}">${REPORT_REASONS[r.reason][0]}</span> <b>${esc(r.targetChar)}</b> <span class="sub">${esc(r.target)}</span></span><span class="sub">${new Date(r.at).toLocaleString('ko-KR')}</span></div>
    <div class="sub">신고한 사람 ${esc(r.fromChar)} (${esc(r.from)})${r.status!=='open'?` · <b>${r.status==='done'?'조치함':'기각'}</b>`:''}</div>
    ${r.memo?`<div style="margin-top:4px">${esc(r.memo)}</div>`:''}
    ${r.ctx&&r.ctx.length?`<div class="ctx">${r.ctx.map(esc).join('\n')}</div>`:''}${r.photo?`<div style="margin-top:6px">${avatar(r.photo,r.targetChar,72)}</div>`:''}
    ${r.status==='open'?`<div class="row" style="margin-top:8px;justify-content:flex-start;gap:6px"><button class="go mini" data-rs="done" data-rid="${r.id}">조치함</button><button class="ghost mini" data-rs="dismiss" data-rid="${r.id}">기각</button>${r.reason==='photo'?`<button class="ghost mini flagbtn" data-rph="${esc(r.target)}">사진 지우기</button>`:''}</div>`:''}</div>`).join(''):'<div class="empty">들어온 신고가 없어요.</div>'}</div>`;
 }else{
  const users=MAIL.users();
  body=`<div class="card mform"><h2>GM 발송</h2><div class="sub">GM은 창고에 없는 아이템과 골드도 만들어서 보낼 수 있어요. 받는 사람 우편에는 <span class="gmtag">GM</span> 표시가 붙어요.</div>
   <label for="gTo">받는 사람</label><select id="gTo" style="width:100%"><option value="*">전체 유저 (${users.length}명)</option>${users.map(u=>`<option value="${esc(u.user)}" ${gDraft.to===u.user?'selected':''}>${esc(u.char)} (${esc(u.user)})</option>`).join('')}</select>
   <label for="gTitle">제목</label><input type="text" id="gTitle" maxlength="40" placeholder="예: 점검 보상" value="${esc(gDraft.title)}">
   <label for="gBody">메시지</label><textarea id="gBody" maxlength="300">${esc(gDraft.body)}</textarea>
   <label>아이템 <span class="sub">(이름 · 종류 · 개수)</span></label>
   <div class="row" style="gap:6px"><input type="text" id="gIName" placeholder="아이템 이름" style="flex:2" value="${esc(gDraft.iname)}"><input type="text" id="gIKind" placeholder="종류 (예: 소모품)" style="flex:1" value="${esc(gDraft.ikind)}"><input type="number" id="gICount" min="1" value="${gDraft.icount||1}" style="width:80px"><button class="ghost mini" id="gIAdd">추가</button></div>
   <div class="row" style="gap:6px;margin-top:6px"><span class="sub">빠른 추가:</span><button class="ghost mini" data-gq="보스 소환 주문서|주문서">주문서</button><button class="ghost mini" data-gq="응급 키트|소모품">응급 키트</button>${['파편','덩쿨','나무'].map(m=>`<select class="qtyin" data-gm="${m}" aria-label="${m} 심도" style="width:auto">${[0,1,2,3,4,5].map(d=>`<option value="${d}">심도 ${d} ${m}</option>`).join('')}</select><button class="ghost mini" data-gma="${m}">+${m}</button>`).join('')}</div>
   <div class="attach" id="gList">${(window._gItems||[]).map((i,k)=>`<span>${esc(i.name)} ×${i.count} <small class="sub">${esc(i.kind)}</small> <button class="ghost mini" data-grm="${k}" aria-label="빼기">×</button></span>`).join('')||'<span class="sub" style="border:0;padding:0">아직 아이템이 없어요.</span>'}</div>
   <label for="gGold">골드</label><input type="number" id="gGold" min="0" value="${gDraft.gold||0}">
   <div class="row" style="margin-top:12px"><button class="go" id="gSend">GM으로 보내기</button></div></div>`;
 }
 el.innerHTML=`<div class="cats" style="margin-bottom:12px">${tabs.map(([k,n])=>`<button data-mt="${k}" aria-selected="${mailTab===k}">${n}</button>`).join('')}</div>${body}
  <label class="demo2" style="margin-top:10px"><input type="checkbox" id="gmToggle" ${gm?'checked':''}> 이 계정을 GM으로 (프로토타입 전용 · 서버에서는 관리자가 지정)</label>`;
 el.querySelectorAll('[data-mt]').forEach(b=>b.onclick=()=>{mailTab=b.dataset.mt;renderMail()});
 const endOf=v=>v?new Date(v+'T23:59:59+09:00').getTime():null;
 const se=$('#sEndSave');if(se)se.onclick=()=>{const v=$('#sEnd').value;if(!v)return toast('날짜를 고르세요.');const s=season();s.endsAt=endOf(v);store.set('stem-season',s);toast('종료일을 저장했어요.');renderMail()};
 const sc=$('#sEndClear');if(sc)sc.onclick=()=>{const s=season();s.endsAt=null;store.set('stem-season',s);toast('종료일을 지웠어요.');renderMail()};
 const ss=$('#sStart');if(ss)ss.onclick=async()=>{const name=$('#sName').value.trim();if(!name)return toast('시즌 이름을 적어 주세요.');const ne=endOf($('#sNewEnd').value);
  const old=season();const ok=await modal(`<h2 id="mTitleH">${esc(name)}을(를) 시작할까요?</h2><p>「${esc(old.name)}」을 마치고 심연 순위와 모든 유저의 심연 진행을 초기화해요. 되돌릴 수 없어요.</p><div class="acts"><button class="ghost" data-res="cancel">취소</button><button class="go danger" data-res="ok">시작</button></div>`,{warn:true});if(!ok)return;
  const hist=store.get('stem-seasons',[]);hist.push({...old,endedAt:Date.now()});store.set('stem-seasons',hist);
  store.set('stem-season',{id:'s'+Date.now().toString(36),no:(old.no||1)+1,name,startedAt:Date.now(),endsAt:ne});
  const p=prog();if(seasonSync(p))saveProg(p);toast(`${name}을(를) 시작했어요.`);renderMail()};
 el.querySelectorAll('[data-rs]').forEach(b=>b.onclick=()=>{const a=store.get('stem-reports',[]),r=a.find(x=>x.id===b.dataset.rid);if(r){r.status=b.dataset.rs;r.by=USER;store.set('stem-reports',a)}renderMail()});
 el.querySelectorAll('[data-rph]').forEach(b=>b.onclick=()=>{const k='stem-saved:'+b.dataset.rph,a=store.get(k,[]);if(a[0]){a[0].portrait=null;store.set(k,a)}const rs=RAID.all();rs.forEach(r=>r.members.forEach(m=>{if(m.user===b.dataset.rph)m.portrait=null}));RAID.save(rs);
  MAIL.send(b.dataset.rph,{from:'GM',fromChar:'GM',gm:true,title:'프로필 사진이 삭제되었어요',body:'신고 검토 결과 부적절한 프로필 사진으로 판단되어 삭제했어요.',gold:0,items:[]});toast('사진을 지우고 안내 우편을 보냈어요.');renderMail()});
 const bindD=(id,obj,key)=>{const e=$('#'+id);if(e)e.addEventListener(e.tagName==='SELECT'?'change':'input',()=>{obj[key]=e.value})};
 bindD('mTo',sDraft,'to');bindD('mTitle',sDraft,'title');bindD('mBody',sDraft,'body');bindD('mGold',sDraft,'gold');
 bindD('gTo',gDraft,'to');bindD('gTitle',gDraft,'title');bindD('gBody',gDraft,'body');bindD('gGold',gDraft,'gold');bindD('gIName',gDraft,'iname');bindD('gIKind',gDraft,'ikind');bindD('gICount',gDraft,'icount');
 $('#gmToggle').onchange=e=>{const g=store.get('stem-gms',[]).filter(x=>x!==USER);if(e.target.checked)g.push(USER);store.set('stem-gms',g);renderMail()};
 el.querySelectorAll('[data-mid]').forEach(b=>b.onclick=()=>{mailSel=b.dataset.mid;renderMail()});
 el.querySelectorAll('[data-dm]').forEach(b=>b.onclick=()=>openDM(b.dataset.dm,b.dataset.c));
 const c1=$('#mClaim');if(c1)c1.onclick=()=>{const bx=MAIL.box(),m=bx.find(x=>x.id===mailSel);if(claimMail(m)){MAIL.setBox(USER,bx);toast('받았어요. 창고와 지갑을 확인하세요.')}renderMail()};
 const ca=$('#mAll');if(ca)ca.onclick=()=>{const bx=MAIL.box();let n=0;bx.forEach(m=>{if(claimMail(m))n++});MAIL.setBox(USER,bx);toast(`우편 ${n}개를 받았어요.`);renderMail()};
 const cl=$('#mClean');if(cl)cl.onclick=()=>{MAIL.setBox(USER,MAIL.box().filter(m=>!m.claimed&&((m.items||[]).length||m.gold)));mailSel=null;toast('받은 우편을 정리했어요.');renderMail()};
 el.querySelectorAll('[data-pk]').forEach(i=>i.oninput=()=>{mailPick[i.dataset.pk]=Math.max(0,Math.min(+i.max,+i.value||0))});
 const ms=$('#mSend');if(ms)ms.onclick=()=>{
  const name=$('#mTo').value.trim(),target=MAIL.users().find(u=>u.char===name);
  if(!target)return toast('그 이름의 스템을 찾지 못했어요.');if(target.user===USER)return toast('자신에게는 보낼 수 없어요.');
  const gold=Math.max(0,Math.floor(+$('#mGold').value||0)),money=store.get(KEY('money'),0);if(gold>money)return toast('골드가 모자라요.');
  const inv=store.get(KEY('inv'),[]),items=[];
  for(const [k,n] of Object.entries(mailPick)){let left=n;if(!left)continue;const [nm,kd]=k.split('|');for(let i=inv.length-1;i>=0&&left>0;i--){if(inv[i].name===nm&&inv[i].kind===kd&&!inv[i].eq&&!inv[i].gearEq){items.push(inv[i]);inv.splice(i,1);left--}}}
  if(!items.length&&!gold&&!$('#mBody').value.trim())return toast('보낼 아이템·골드·메시지 중 하나는 있어야 해요.');
  store.set(KEY('inv'),inv);if(gold)store.set(KEY('money'),money-gold);
  MAIL.send(target.user,{from:USER,fromChar:myChar(),title:$('#mTitle').value.trim()||`${myChar()} 님의 우편`,body:$('#mBody').value.trim(),gold,items:itemsSummary(items)});
  mailPick={};sDraft={to:'',title:'',body:'',gold:0};toast(`${target.char} 님에게 보냈어요.`);mailTab='inbox';renderMail()};
 const gl=window._gItems=window._gItems||[];
 const ga=$('#gIAdd');if(ga)ga.onclick=()=>{const n=$('#gIName').value.trim();if(!n)return toast('아이템 이름을 적어 주세요.');const kd=$('#gIKind').value.trim()||'기타',cn=Math.max(1,+$('#gICount').value||1),ex=gl.find(x=>x.name===n&&x.kind===kd);if(ex)ex.count+=cn;else gl.push({name:n,kind:kd,desc:'GM이 보낸 아이템',count:cn});gDraft.iname='';gDraft.ikind='';gDraft.icount=1;renderMail()};
 el.querySelectorAll('[data-gq]').forEach(b=>b.onclick=()=>{const [n,k]=b.dataset.gq.split('|');const ex=gl.find(x=>x.name===n&&x.kind===k);if(ex)ex.count++;else gl.push({name:n,kind:k,desc:k==='주문서'?'어떤 보스든 레이드 방을 열 수 있어요.':n==='응급 키트'?EXP.KIT.desc:'GM이 보낸 아이템',count:1});renderMail()});
 el.querySelectorAll('[data-gma]').forEach(b=>b.onclick=()=>{const m=b.dataset.gma,d=+el.querySelector(`[data-gm="${m}"]`).value,n=EXP.matName(m,d),ex=gl.find(x=>x.name===n);if(ex)ex.count+=5;else gl.push({name:n,kind:'재료',desc:EXP.MATS[m],count:5});renderMail()});
 el.querySelectorAll('[data-grm]').forEach(b=>b.onclick=()=>{gl.splice(+b.dataset.grm,1);renderMail()});
 const gs=$('#gSend');if(gs)gs.onclick=()=>{const to=$('#gTo').value,gold=Math.max(0,Math.floor(+$('#gGold').value||0));
  if(!gl.length&&!gold&&!$('#gBody').value.trim())return toast('보낼 내용이 없어요.');
  const list=to==='*'?MAIL.users().map(u=>u.user):[to];const m={from:'GM',fromChar:'GM',gm:true,title:$('#gTitle').value.trim()||'GM 우편',body:$('#gBody').value.trim(),gold,items:gl.map(x=>({...x}))};
  list.forEach(u=>MAIL.send(u,m));window._gItems=[];gDraft={to:'*',title:'',body:'',gold:0,iname:'',ikind:'',icount:1};toast(`${list.length}명에게 GM 우편을 보냈어요.`);renderMail()};
}
window.addEventListener('storage',e=>{if(USER&&e.key==='stem-mail:'+USER){const m=MAIL.box()[0];if(m&&!m.read)toast(`새 우편: ${m.title} (${m.fromChar})`);if(!$('#mail').hidden)renderMail();else if(!$('#lobby').hidden){const sy=scrollY;renderLobby();scrollTo(0,sy)}}});
