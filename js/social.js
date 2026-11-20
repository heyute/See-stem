// 시 스템 :: 딥 다이브 — 전체 채팅 · 친구 · 1대1 대화 (아직 이 브라우저 저장)
// ── 소통: 전체 채팅 · 친구 · 1대1 (서버가 생기면 SOC의 함수들을 WebSocket/REST로 바꿔요)
//   지금은 이 브라우저 안의 공용 저장소를 서버처럼 써요. 같은 브라우저에서 다른 계정으로 로그인한 탭끼리는 실제로 대화가 오가요.
const DEMO_USERS=[{user:'demo_alpha',char:'카인'},{user:'demo_beta',char:'서리의 에테르'},{user:'demo_gamma',char:'아벨'}];
const DEMO_G=[{from:'demo_alpha',char:'카인',text:'오늘 레이드 같이 가실 분?',at:Date.now()-36e5*3},{from:'demo_beta',char:'서리의 에테르',text:'수호자 자리 비어 있으면 저요!',at:Date.now()-36e5*2.8},{from:'demo_gamma',char:'아벨',text:'역수검 짝수 라운드인 거 잊지 마세요',at:Date.now()-36e5*1.2}];
const dmKey=(a,b)=>'stem-dm:'+[a,b].sort().join('|');
const SOC={
 global(){return store.get('stem-gchat',[])},
 postGlobal(m){const a=SOC.global();a.push(m);store.set('stem-gchat',a.slice(-300))},
 dm(peer){return store.get(dmKey(USER,peer),[])},
 sendDM(peer,m){const a=SOC.dm(peer);a.push(m);store.set(dmKey(USER,peer),a)},
 peers(){const out=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k.startsWith('stem-dm:'))continue;const [a,b]=k.slice(8).split('|');if(a!==USER&&b!==USER)continue;const p=a===USER?b:a;const ms=store.get(k,[]);if(ms.length)out.push({user:p,char:ms.findLast(m=>m.from===p)?.char||(DEMO_USERS.find(d=>d.user===p)||{}).char||p,last:ms[ms.length-1]})}}catch(e){}return out.sort((x,y)=>y.last.at-x.last.at)},
 friends(u=USER){return store.get('stem-friends:'+u,[])},
 setFriends(u,f){store.set('stem-friends:'+u,f)},
 reqs(){return store.get('stem-freq',[])},
 setReqs(r){store.set('stem-freq',r)},
 // 서버의 "스템 이름 검색" 대신: 이 브라우저에 있는 모든 계정의 스템 + 예시 유저
 directory(){const out=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k.startsWith('stem-saved:'))continue;const u=k.slice(11),c=(store.get(k,[])[0]||{}).name;if(c&&u!==USER)out.push({user:u,char:c})}}catch(e){}
  if(store.get('stem-chatdemo',false))DEMO_USERS.forEach(d=>out.push(d));return out},
 met(){const m=store.get(KEY('met'),[]);return m.length||!store.get('stem-chatdemo',false)?m:[{raid:'추락한 별의 악의',at:Date.now()-36e5*20,members:DEMO_USERS}]},
 // 레이드가 끝나면 서버가 호출: 같은 파티였던 스템들을 기록
 recordRaid(raid,members,who=USER){const k='stem-met:'+who,m=store.get(k,[]);m.unshift({raid,at:Date.now(),members:members.filter(x=>x.user!==who).map(x=>({user:x.user,char:x.char}))});store.set(k,m.slice(0,20))}
};
const FR={
 status(u){if(SOC.friends().some(f=>f.user===u))return 'friend';const r=SOC.reqs();if(r.some(x=>x.from===USER&&x.to===u))return 'sent';if(r.some(x=>x.from===u&&x.to===USER))return 'got';return 'none'},
 send(u,c){const s=FR.status(u);if(s==='friend')return;if(s==='got')return FR.accept(u);if(s==='sent')return;
  const r=SOC.reqs();r.push({from:USER,fromChar:myChar(),to:u,toChar:c,at:Date.now()});SOC.setReqs(r);toast(`${c} 님에게 친구 요청을 보냈어요.`);
  if(DEMO_USERS.some(d=>d.user===u))setTimeout(()=>{const me=USER,r2=SOC.reqs(),q=r2.find(x=>x.from===me&&x.to===u);if(!q)return;SOC.setReqs(r2.filter(x=>x!==q&&!(x.from===me&&x.to===u)));link(me,q.fromChar,u,c);if(USER===me){toast(`${c} 님이 친구 요청을 수락했어요. (예시)`);refreshSoc()}},1200)},
 accept(u){const r=SOC.reqs(),q=r.find(x=>x.from===u&&x.to===USER);if(!q)return;SOC.setReqs(r.filter(x=>!((x.from===u&&x.to===USER)||(x.from===USER&&x.to===u))));link(USER,myChar(),u,q.fromChar);toast(`${q.fromChar} 님과 친구가 됐어요.`)},
 decline(u){const r=SOC.reqs(),q=r.find(x=>x.from===u&&x.to===USER);SOC.setReqs(r.filter(x=>x!==q));if(q)toast(`${q.fromChar} 님의 요청을 거절했어요.`)},
 cancel(u){SOC.setReqs(SOC.reqs().filter(x=>!(x.from===USER&&x.to===u)));toast('친구 요청을 취소했어요.')},
 remove(u){const f=SOC.friends().find(x=>x.user===u);SOC.setFriends(USER,SOC.friends().filter(x=>x.user!==u));SOC.setFriends(u,SOC.friends(u).filter(x=>x.user!==USER));toast(`${f?f.char:''} 님을 친구에서 뺐어요.`)}
};
function link(a,ac,b,bc){const fa=SOC.friends(a).filter(x=>x.user!==b),fb=SOC.friends(b).filter(x=>x.user!==a);fa.push({user:b,char:bc,at:Date.now()});fb.push({user:a,char:ac,at:Date.now()});SOC.setFriends(a,fa);SOC.setFriends(b,fb)}
function frBtn(u,c){const s=FR.status(u),a=`data-fu="${esc(u)}" data-fc="${esc(c)}"`;
 return s==='friend'?'<span class="sub">친구</span>':s==='sent'?`<button class="ghost mini" data-fa="cancel" ${a}>요청 취소</button>`:s==='got'?`<button class="go mini" data-fa="accept" ${a}>수락</button>`:`<button class="go mini" data-fa="send" ${a}>친구 요청</button>`}
function refreshSoc(){renderSocialSoft();if(dmPeer)renderDM()}
let frQ='';
let socTab='all',dmPeer=null;
const myChar=()=>(chars()[0]||{}).name||USER;
const hm=t=>new Date(t).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
const unread=p=>SOC.dm(p.user).filter(m=>m.from!==USER&&m.at>store.get(KEY('read:'+p.user),0)).length;
const isFriend=u=>FR.status(u)==='friend';
function renderSocial(){
 const el=$('#social');if(!el)return;
 const demo=store.get('stem-chatdemo',false);
 const g=[...(demo?DEMO_G:[]),...SOC.global()].sort((a,b)=>a.at-b.at);
 const peers=SOC.peers(),un=peers.reduce((n,p)=>n+unread(p),0),fr=SOC.friends(),rq=SOC.reqs(),got=rq.filter(x=>x.to===USER),sent=rq.filter(x=>x.from===USER);
 let body='';
 if(socTab==='all')body=`<div class="chatlog" id="glog">${g.length?g.map(m=>`<div class="msg"><button class="who ${m.from===USER?'me':''}" ${m.from===USER?'disabled':`data-u="${esc(m.from)}" data-c="${esc(m.char)}"`}>${TT(m.from)}${esc(m.char)}</button> ${esc(m.text)}<time>${hm(m.at)}</time></div>`).join(''):'<div class="sub" style="margin:auto;text-align:center">아직 메시지가 없어요. 첫 인사를 남겨 보세요.<br>이름을 누르면 1대1 대화나 친구 추가를 할 수 있어요.</div>'}</div>
  <form class="chatin" id="gform"><input type="text" id="gin" maxlength="200" placeholder="전체 채팅에 메시지 보내기" aria-label="전체 채팅 메시지"><button class="go mini">보내기</button></form>`;
 else if(socTab==='friends'){
  const q=frQ.trim(),res=q?SOC.directory().filter(d=>d.char.includes(q)||d.user.includes(q.toLowerCase())):[];
  const met=SOC.met();
  body=`<div class="fscroll">
   <form class="chatin" id="fform"><input type="search" id="fsearch" maxlength="20" placeholder="스템 이름으로 친구 찾기" value="${esc(frQ)}" aria-label="스템 이름 검색"><button class="go mini">찾기</button></form>
   ${q?`<div class="fsec"><h4>검색 결과</h4>${res.length?`<ul class="flist">${res.map(d=>`<li><div>${TT(d.user)}<b>${esc(d.char)}</b><small>${esc(d.user)}</small></div>${frBtn(d.user,d.char)}</li>`).join('')}</ul>`:'<div class="sub">그 이름의 스템을 찾지 못했어요.</div>'}</div>`:''}
   ${got.length?`<div class="fsec"><h4>받은 요청 <span class="badge">${got.length}</span></h4><ul class="flist">${got.map(x=>`<li><div><b>${esc(x.fromChar)}</b><small>${esc(x.from)} · ${hm(x.at)}</small></div><div class="row"><button class="go mini" data-fa="accept" data-fu="${esc(x.from)}" data-fc="${esc(x.fromChar)}">수락</button><button class="ghost mini" data-fa="decline" data-fu="${esc(x.from)}">거절</button></div></li>`).join('')}</ul></div>`:''}
   <div class="fsec"><h4>친구 ${fr.length}</h4>${fr.length?`<ul class="flist">${fr.map(f=>`<li><div>${TT(f.user)}<b>${esc(f.char)}</b><small>${esc(f.user)} · 접속 상태는 서버 연결 후 표시돼요</small></div><div class="row"><button class="go mini" data-dm="${esc(f.user)}" data-c="${esc(f.char)}">대화</button><button class="ghost mini" data-fa="remove" data-fu="${esc(f.user)}">삭제</button></div></li>`).join('')}</ul>`:'<div class="sub">아직 친구가 없어요. 이름으로 찾거나, 전체 채팅·레이드에서 만난 스템에게 요청을 보내 보세요.</div>'}</div>
   ${sent.length?`<div class="fsec"><h4>보낸 요청</h4><ul class="flist">${sent.map(x=>`<li><div><b>${esc(x.toChar)}</b><small>${esc(x.to)} · 수락을 기다리는 중</small></div><button class="ghost mini" data-fa="cancel" data-fu="${esc(x.to)}">취소</button></li>`).join('')}</ul></div>`:''}
   <div class="fsec"><h4>최근 레이드에서 만난 스템</h4>${met.length?met.map(r=>`<div class="sub" style="margin:6px 0 4px">${esc(r.raid)} · ${new Date(r.at).toLocaleDateString('ko-KR')}</div><ul class="flist">${r.members.map(d=>`<li><div>${TT(d.user)}<b>${esc(d.char)}</b><small>${esc(d.user)}</small></div>${frBtn(d.user,d.char)}</li>`).join('')}</ul>`).join(''):'<div class="sub">레이드를 마치면 같은 파티였던 스템들이 여기에 남아요.</div>'}</div>
  </div>`}
 else body=peers.length?`<ul class="flist">${peers.map(p=>{const n=unread(p);return `<li style="cursor:pointer" data-dm="${esc(p.user)}" data-c="${esc(p.char)}"><div style="min-width:0">${TT(p.user)}<b>${esc(p.char)}</b>${n?`<span class="badge">${n}</span>`:''}<small class="last">${p.last.from===USER?'나: ':''}${esc(p.last.text)}</small></div><small>${hm(p.last.at)}</small></li>`}).join('')}</ul>`
  :'<div class="empty" style="margin:0">아직 1대1 대화가 없어요.</div>';
 el.innerHTML=`<div class="stabs" role="tablist">${[['all','전체 채팅'],['friends',`친구 ${fr.length}`,got.length],['dm','1대1']].map(([k,n,b])=>`<button role="tab" aria-selected="${socTab===k}" data-st="${k}">${n}${k==='dm'&&un?`<span class="badge">${un}</span>`:''}${b?`<span class="badge">${b}</span>`:''}</button>`).join('')}</div>
  ${body}
  <label class="demo2"><input type="checkbox" id="chatDemo" ${demo?'checked':''}> 예시 유저로 미리보기 · 지금은 서버 없이 이 브라우저 안에서만 오가요</label>`;
 el.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{socTab=b.dataset.st;renderSocial()});
 el.querySelectorAll('.who[data-u]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();userMenu(b,b.dataset.u,b.dataset.c)});
 el.querySelectorAll('[data-dm]').forEach(b=>b.onclick=()=>openDM(b.dataset.dm,b.dataset.c));
 el.querySelectorAll('[data-fa]').forEach(b=>b.onclick=()=>{const u=b.dataset.fu,c=b.dataset.fc;({send:()=>FR.send(u,c),accept:()=>FR.accept(u),decline:()=>FR.decline(u),cancel:()=>FR.cancel(u),remove:()=>FR.remove(u)})[b.dataset.fa]();refreshSoc()});
 const ff=$('#fform');if(ff){ff.onsubmit=ev=>{ev.preventDefault();frQ=$('#fsearch').value;renderSocial();$('#fsearch').focus()};$('#fsearch').oninput=e=>{frQ=e.target.value;if(!frQ){renderSocial();$('#fsearch').focus()}}}
 $('#chatDemo').onchange=e=>{store.set('stem-chatdemo',e.target.checked);renderSocial()};
 const gl=$('#glog');if(gl)gl.scrollTop=gl.scrollHeight;
 const gf=$('#gform');if(gf)gf.onsubmit=ev=>{ev.preventDefault();const v=$('#gin').value.trim();if(!v)return;SOC.postGlobal({from:USER,char:myChar(),text:v,at:Date.now()});renderSocial();$('#gin').focus()};
}
function userMenu(anchor,user,char){
 const m=$('#umenu'),r=anchor.getBoundingClientRect();
 m.innerHTML=`<div class="uh">${TT(user)}<b>${esc(char)}</b> · ${esc(user)}</div><button role="menuitem" data-a="dm">1대1 대화</button>${({friend:'<button role="menuitem" data-a="remove">친구 삭제</button>',sent:'<button role="menuitem" data-a="cancel">친구 요청 취소</button>',got:'<button role="menuitem" data-a="accept">친구 요청 수락</button>',none:'<button role="menuitem" data-a="send">친구 요청 보내기</button>'})[FR.status(user)]}<button role="menuitem" data-a="report" class="flagbtn">신고하기</button>`;
 m.hidden=false;m.style.left=Math.min(r.left,innerWidth-190)+'px';m.style.top=Math.min(r.bottom+4,innerHeight-130)+'px';
 m.querySelector('[data-a=dm]').onclick=()=>{m.hidden=true;openDM(user,char)};
 m.querySelector('[data-a=report]').onclick=()=>{m.hidden=true;reportUser(user,char)};
 m.querySelectorAll('[data-a]:not([data-a=dm]):not([data-a=report])').forEach(b=>b.onclick=()=>{m.hidden=true;FR[b.dataset.a](user,char);refreshSoc()});
 m.querySelector('button').focus();
}
document.addEventListener('click',e=>{if(!e.target.closest('#umenu'))$('#umenu').hidden=true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#umenu').hidden=true}});

function openDM(user,char){dmPeer={user,char};$('#dmwin').hidden=false;renderDM();$('#dmIn').focus()}
function closeDM(){dmPeer=null;$('#dmwin').hidden=true}
function renderDM(){if(!dmPeer)return;const ms=SOC.dm(dmPeer.user);
 $('#dmName').innerHTML=TT(dmPeer.user)+esc(dmPeer.char);$('#dmSub').textContent=dmPeer.user;
 $('#dmFriend').textContent={friend:'★ 친구',sent:'요청 보냄',got:'요청 수락',none:'☆ 친구 요청'}[FR.status(dmPeer.user)];
 $('#dmLog').innerHTML=ms.length?ms.map(m=>`<div class="bub ${m.from===USER?'me':''}">${esc(m.text)}<time>${hm(m.at)}</time></div>`).join(''):'<div class="sub" style="margin:auto;text-align:center">첫 메시지를 보내 보세요.<br>1대1 대화는 게임을 꺼도 남아 있어요.</div>';
 $('#dmLog').scrollTop=$('#dmLog').scrollHeight;
 store.set(KEY('read:'+dmPeer.user),Date.now());renderSocialSoft()}
function renderSocialSoft(){if(!$('#lobby').hidden){const a=document.activeElement&&document.activeElement.id;renderSocial();if(a==='gin'||a==='fsearch'){const e=$('#'+a);if(e){e.focus();e.setSelectionRange(e.value.length,e.value.length)}}}}
$('#dmClose').onclick=closeDM;
$('#dmReport').onclick=()=>dmPeer&&reportUser(dmPeer.user,dmPeer.char);
$('#dmFriend').onclick=()=>{const s=FR.status(dmPeer.user);if(s==='none')FR.send(dmPeer.user,dmPeer.char);else if(s==='got')FR.accept(dmPeer.user);else if(s==='sent')FR.cancel(dmPeer.user);else return;refreshSoc()};
$('#dmForm').onsubmit=ev=>{ev.preventDefault();const v=$('#dmIn').value.trim();if(!v||!dmPeer)return;
 SOC.sendDM(dmPeer.user,{from:USER,char:myChar(),text:v,at:Date.now()});$('#dmIn').value='';renderDM();
 const d=DEMO_USERS.find(x=>x.user===dmPeer.user);if(d){const peer=dmPeer.user;setTimeout(()=>{const k=dmKey(USER,peer),a=store.get(k,[]);a.push({from:peer,char:d.char,text:'(예시 답장) 확인했어요!',at:Date.now()});store.set(k,a);if(dmPeer&&dmPeer.user===peer)renderDM();else renderSocialSoft()},900)}};
window.addEventListener('storage',e=>{if(!USER||!e.key)return;if(e.key==='stem-freq'||e.key.startsWith('stem-friends:')){refreshSoc();return}
 if(e.key==='stem-gchat'||e.key.startsWith('stem-dm:')){if(dmPeer&&e.key===dmKey(USER,dmPeer.user))renderDM();else renderSocialSoft()}});
