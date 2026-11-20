// 시 스템 :: 딥 다이브 — 기술 리스트(데이터베이스) 창
// ── 스킬 리스트 (데이터베이스)
let dbGrp='전체',dbTurn='전체';
function renderDB(){
 const all=DATA.filter(live);
 const grps=['전체','공통','로게움','에테르',...JOBS.map(j=>j.n),'유물'].filter(g=>g==='전체'||all.some(s=>s.group===g));
 const turns=['전체','세팅','액션','인터셉트','상시·패시브'];
 const tOf=s=>/세팅/.test(s.turn)&&!/액션/.test(s.turn)?'세팅':/액션/.test(s.turn)?'액션':s.turn==='인터셉트'?'인터셉트':'상시·패시브';
 $('#dbGrp').innerHTML=grps.map(g=>`<button role="tab" aria-selected="${g===dbGrp}" data-dg="${esc(g)}">${esc(g==='공통'?'일반':g)}</button>`).join('');
 $('#dbTurn').innerHTML=turns.map(x=>`<option ${x===dbTurn?'selected':''}>${x}</option>`).join('');
 const q=$('#dbQ').value.trim();
 const shown=all.filter(s=>(dbGrp==='전체'||s.group===dbGrp)&&(dbTurn==='전체'||tOf(s)===dbTurn)&&(!q||s.name.includes(q)||s.effect.includes(q)));
 const byG={};shown.forEach(s=>(byG[s.group]=byG[s.group]||[]).push(s));
 $('#dbList').innerHTML=shown.length?`<div class="sub" style="margin-top:12px">${shown.length}개</div>`+grps.filter(g=>byG[g]).map(g=>`<h3 class="dbh" style="color:${(JOB[g]||{}).c||'var(--ink)'}">${esc(g==='공통'?'일반':g)}${JOB[g]?` <span class="sub">${esc(JOB[g].star)}</span>`:''}</h3><div class="opts">${byG[g].map(s=>fixedOpt(s).replace('<span class="check">기본</span>',s.kind&&s.kind!=='기술'&&s.kind!=='포비든'?`<span class="check">${esc(s.kind)}</span>`:'')).join('')}</div>`).join('')
  :'<div class="empty">조건에 맞는 기술이 없어요.</div>';
 $('#dbGrp').querySelectorAll('[data-dg]').forEach(b=>b.onclick=()=>{dbGrp=b.dataset.dg;renderDB()});
}
$('#dbQ').oninput=renderDB;$('#dbTurn').onchange=e=>{dbTurn=e.target.value;renderDB()};
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>showLobby());
