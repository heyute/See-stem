// 시 스템 :: 딥 다이브 — 레이드 파티 채팅 (대기실 · 전투 화면)
// 방마다 'stem-rchat:{방 id}'에 최근 100개를 저장해요. (지금은 이 브라우저 저장 → 4단계에서 Firebase rooms/{id}/chat 로 옮겨요)
const RCHAT={
 MAX:100,
 key:id=>'stem-rchat:'+id,
 list(id){return id?store.get(RCHAT.key(id),[]):[]},
 push(id,msg){const a=RCHAT.list(id);a.push(msg);store.set(RCHAT.key(id),a.slice(-RCHAT.MAX));RCHAT.refresh()},
 send(id,text){text=String(text||'').replace(/\s+/g,' ').trim().slice(0,200);if(!id||!text)return false;
  RCHAT.push(id,{from:USER,char:myChar(),text,at:Date.now()});RCHAT.demoReply(id);return true},
 sys(id,text){if(id)RCHAT.push(id,{sys:1,text,at:Date.now()})},
 // 예시 방: 예시 파티원이 가끔 대답해요 (혼자서도 채팅을 확인할 수 있게)
 LINES:['좋아요!','준비됐어요.','역수검 라운드엔 안전지대 반대로 가는 거 잊지 마세요.','검부터 깨고 가죠.','체공 걸리면 승기 포착 조심!','제가 앞에서 버틸게요.','회복 필요하면 말해 주세요.','ㅋㅋ 화이팅','이번엔 꼭 잡아 봐요.'],
 demoReply(id){const r=RAID.all().find(x=>x.id===id);if(!r||!r.demo)return;const bots=r.members.filter(m=>m.user.startsWith('demo_'));if(!bots.length)return;
  const b=bots[Math.floor(Math.random()*bots.length)],line=RCHAT.LINES[Math.floor(Math.random()*RCHAT.LINES.length)];
  setTimeout(()=>RCHAT.push(id,{from:b.user,char:b.char,text:line,at:Date.now()}),900+Math.random()*1500)},
 fmt:t=>{const d=new Date(t);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')},
 logHtml(id){const a=RCHAT.list(id);if(!a.length)return '<div class="sub rcempty">아직 대화가 없어요. 파티원에게 인사해 보세요.</div>';
  return a.map(m=>m.sys?`<div class="rcsys">${esc(m.text)}</div>`
   :`<div class="msg ${m.from===USER?'mine':''}">${m.from===USER?`<span class="who me">${TT(m.from)}${esc(m.char)}</span>`:`<button class="who" data-u="${esc(m.from)}" data-c="${esc(m.char)}">${TT(m.from)}${esc(m.char)}</button>`} ${esc(m.text)}<time>${RCHAT.fmt(m.at)}</time></div>`).join('')},
 drafts:{},
 // box 안에 채팅창을 만들어요. 같은 방이면 쓰던 글과 입력 포커스를 그대로 살려요.
 mount(box,id){if(!box)return;const had=document.activeElement&&box.contains(document.activeElement);
  box.innerHTML=`<div class="rchat" data-room="${esc(id)}"><div class="rclog" role="log" aria-live="polite" aria-label="파티 채팅"></div>
   <form class="rcform"><input type="text" maxlength="200" placeholder="파티원에게 말하기" aria-label="파티 채팅 입력" autocomplete="off"><button class="go mini" type="submit">보내기</button></form></div>`;
  const f=box.querySelector('form'),inp=f.querySelector('input');inp.value=RCHAT.drafts[id]||'';
  inp.oninput=()=>{RCHAT.drafts[id]=inp.value};
  f.onsubmit=ev=>{ev.preventDefault();if(RCHAT.send(id,inp.value)){inp.value='';RCHAT.drafts[id]=''}inp.focus()};
  RCHAT.refresh(true);if(had)inp.focus()},
 seen:{},
 refresh(force){document.querySelectorAll('.rchat[data-room]').forEach(el=>{const id=el.dataset.room,log=el.querySelector('.rclog');
   const near=log.scrollHeight-log.scrollTop-log.clientHeight<60;log.innerHTML=RCHAT.logHtml(id);if(near||force)log.scrollTop=log.scrollHeight;
   log.querySelectorAll('.who[data-u]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();userMenu(b,b.dataset.u,b.dataset.c)})});
  RCHAT.badge()},
 // 전투 화면에서 채팅창을 접어 두면 새 메시지 수를 버튼에 표시해요
 badge(){const t=$('#bChatT');if(!t)return;const id=battleRoom,n=RCHAT.list(id).filter(m=>!m.sys).length,open=!$('#bChat').hidden;
  if(open||!id)RCHAT.seen[id]=n;const u=Math.max(0,n-(RCHAT.seen[id]||0));t.textContent=open?'채팅 접기':u?`채팅 (${u})`:'채팅 열기';t.classList.toggle('unread',!!u&&!open)}
};
// 들어오고 나갈 때 알림 줄을 남겨요
{const _join=RAID.join,_leave=RAID.leave,_create=RAID.create;
 RAID.join=function(){const r=_join.apply(this,arguments);const m=myRoom();if(m){RCHAT.sys(m.id,`${myChar()}님이 들어왔어요.`);
   if(m.demo){const b=m.members.find(x=>x.user.startsWith('demo_'));if(b)setTimeout(()=>RCHAT.push(m.id,{from:b.user,char:b.char,text:'어서 오세요! 준비되면 [준비 완료] 눌러 주세요.',at:Date.now()}),800)}}return r};
 RAID.leave=function(){const m=myRoom();if(m)RCHAT.sys(m.id,`${myChar()}님이 나갔어요.`);return _leave.apply(this,arguments)};
 RAID.create=function(){const r=_create.apply(this,arguments);const m=myRoom();if(m)RCHAT.sys(m.id,`${myChar()}님이 방을 만들었어요.`);return r}}
// 전투 화면 채팅: 넓은 화면은 오른쪽에 열어 두고, 좁은 화면은 접어 둬요
function mountBattleChat(){const id=battleRoom,box=$('#bChat');if(!box||!id)return;box.hidden=innerWidth<900;RCHAT.seen[id]=RCHAT.list(id).filter(m=>!m.sys).length;RCHAT.mount(box,id)}
$('#bChatT').onclick=()=>{const box=$('#bChat');box.hidden=!box.hidden;RCHAT.badge();if(!box.hidden){RCHAT.refresh(true);const i=box.querySelector('input');if(i)i.focus()}};
window.addEventListener('storage',e=>{if(USER&&e.key&&e.key.startsWith('stem-rchat:'))RCHAT.refresh()});
