// 시 스템 :: 딥 다이브 — 캐릭터 만들기: 능력치 계산 · 화면 그리기 · 얼굴 사진 · 기술 고르기
// ── 계산
function baseStats(){const s={atk:0,def:0,eva:0,com:0};C.jobs.forEach(j=>JOB[j].st.forEach((v,i)=>s[STATK[i]]+=v));return s}
function topStats(s){const m=Math.max(...STATK.map(k=>s[k]));return STATK.filter(k=>s[k]===m)}
function finalStats(){const s=baseStats();
 if(C.race==='로게움'&&C.blood==='유'&&C.bloodStat)s[C.bloodStat]+=2;
 if(C.race==='로게움'&&C.blood==='조'){const tops=topStats(s);const m=tops.length===1?tops[0]:C.minusStat;if(m&&tops.includes(m))s[m]-=1}
 return s}
function maxPick(){return 3}
function needForb(){return C.jobs.length===1}
function chosenSkills(){
 const out=[];
 common.forEach(s=>out.push({s,why:'일반'}));
 if(C.race==='로게움'){out.push({s:BYID['LOG-01'],why:'종족 특성'});if(C.blood)out.push({s:BYID[C.blood==='유'?'LOG-02':'LOG-03'],why:'혈통'});if(C.root)out.push({s:BYID[C.root],why:'근원의 축복'});if(C.blood==='조'&&C.bloodSkill)out.push({s:BYID[C.bloodSkill],why:'혈통: 조'})}
 if(C.race==='에테르'){if(C.etherTrait)out.push({s:BYID[C.etherTrait],why:'종족 특성'});out.push({s:BYID['AET-03'],why:'종족 특성'});out.push({s:BYID['AET-04'],why:'종족 기술'});if(C.etherSk)out.push({s:BYID[C.etherSk],why:'종족 기술'})}
 C.jobs.forEach(j=>(C.picks[j]||[]).forEach(id=>out.push({s:BYID[id],why:j})));
 if(needForb()&&C.forb)out.push({s:BYID[C.forb],why:'포비든'});
 return out}
function issues(){const e=[];
 if(!C.race)e.push('종족을 고르세요.');
 if(C.race==='로게움'){if(!C.blood)e.push('이어진 혈통(유 / 조)을 고르세요.');
  if(C.blood==='유'&&!C.bloodStat)e.push('혈통: 유 — +2 할 스탯을 고르세요.');
  if(C.blood==='조'){if(!C.bloodSkill)e.push('혈통: 조 — 다른 별자리 기술을 1개 고르세요.');if(topStats(baseStats()).length>1&&!C.minusStat&&C.jobs.length)e.push('혈통: 조 — 1 깎을 스탯(가장 높은 스탯 중)을 고르세요.')}
  if(!C.root)e.push('근원의 축복 — 종족 기술을 1개 고르세요.')}
 if(C.race==='에테르'){if(!C.etherTrait)e.push('에테르 특성(뿌리 없는 존재 / 이계와 이어진 자)을 고르세요.');if(!C.etherSk)e.push('새롭게 피어나는 줄기 / 근원으로의 회귀 중 하나를 고르세요.');if(!C.symbol.trim())e.push('상징을 정하세요.')}
 if(!C.jobs.length)e.push('별자리를 1~2개 고르세요.');
 C.jobs.forEach(j=>{const n=(C.picks[j]||[]).length;if(n!==3)e.push(`${j} 기술을 3개 고르세요. (지금 ${n}개)`)});
 if(needForb()&&!C.forb)e.push('포비든 기술을 1개 고르세요.');
 if(!C.name.trim())e.push(C.race==='에테르'?'별명을 정하세요.':'이름을 정하세요.');
 return e}
function displayName(){return C.race==='에테르'?(C.symbol.trim()?`${C.symbol.trim()}의 에테르`:''):C.name.trim()}
function toJSON(){const s=finalStats();return{
 version:1,createdAt:new Date().toISOString(),name:displayName(),nickname:C.race==='에테르'?C.name.trim():null,race:C.race,
 race_detail:C.race==='로게움'?{bloodline:C.blood,bloodline_stat:C.blood==='유'?C.bloodStat:null,bloodline_skill:C.blood==='조'?C.bloodSkill:null,bloodline_minus:C.blood==='조'?(topStats(baseStats()).length===1?topStats(baseStats())[0]:C.minusStat):null,root_skill:C.root}
  :{trait:C.etherTrait,race_skill:C.etherSk,symbol:C.symbol.trim(),start_item:null},
 jobs:C.jobs,stats:s,hp:20,sp_max:10+s.com,stock:5,
 skills:chosenSkills().map(x=>x.s.id),portrait:C.portrait||null}}

// ── 그리기
function skillOpt(s,on,dis,attr,extra=''){
 return `<button class="opt ${on?'on':''}" ${attr} ${dis?'disabled':''} aria-pressed="${on}">
  ${on?'<span class="check">✓</span>':''}
  <b>${esc(s.name)}</b>
  <span class="tags"><span class="tag ${turnCls(s.turn)}">${esc(s.turn||'-')}</span>${s.kind==='포비든'?'<span class="tag forb">포비든</span>':''}${s.sp?`<span class="tag">SP ${s.sp}</span>`:''}${s.range&&s.range!=='-'?`<span class="tag">${esc(s.range)}</span>`:''}${s.dice&&s.dice!=='0'?`<span class="tag">다이스 ${esc(s.dice)}</span>`:''}${/^[1-5]$/.test(s.speed)?`<span class="tag">속도 ${s.speed}</span>`:''}</span>
  <small>${esc(s.effect)}</small>${extra}</button>`}
function fixedOpt(s){return skillOpt(s,true,false,'').replace('<button class="opt on"','<div class="opt on fixed"').replace('<span class="check">✓</span>','<span class="check">기본</span>').replace(/<\/button>$/,'</div>')}
function stepHead(n,title,ok,hint){return `<div class="step-h"><span class="num ${ok?'ok':''}">${ok?'✓':n}</span><h2>${title}</h2></div>${hint?`<div class="hint">${hint}</div>`:''}`}

// ── 얼굴 사진: 정사각형으로 잘라 240px JPEG로 줄여 저장 (서버에서는 이미지 저장소 URL로 바꿔요)
function loadPortrait(file){return new Promise((res,rej)=>{if(!file||!/^image\//.test(file.type))return rej(new Error('이미지 파일만 넣을 수 있어요.'));
 const fr=new FileReader();fr.onerror=()=>rej(new Error('파일을 읽지 못했어요.'));fr.onload=()=>{const img=new Image();img.onerror=()=>rej(new Error('이미지를 열지 못했어요.'));img.onload=()=>{
  const S=240,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d'),m=Math.min(img.width,img.height);
  g.drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,S,S);res(c.toDataURL('image/jpeg',0.85))};img.src=fr.result};fr.readAsDataURL(file)})}
function avatar(url,name,size=56,col='var(--line)'){return url?`<img class="avatar" src="${url}" alt="${esc(name)}의 얼굴" style="width:${size}px;height:${size}px;border-color:${col}">`:`<span class="avatar ph" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.42)}px;border-color:${col}" aria-hidden="true">${esc((name||'?')[0])}</span>`}
function pickPortrait(cb){const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=async()=>{try{cb(await loadPortrait(i.files[0]))}catch(e){toast(e.message)}};i.click()}
function render(){
 try{localStorage.setItem(KEY('draft'),JSON.stringify(C))}catch(e){}
 let h='';
 // 1 종족
 if(C.rework)h+=`<div class="card rework"><h2>별자리 재관측</h2><div class="sub">별자리(직업)와 별자리 기술을 다시 골라요. 종족·혈통·이름·사진은 그대로예요. 마치면 오른쪽 [별자리 바꾸기]를 누르세요. 재관측기는 그때 1개 쓰여요.</div><button class="ghost" id="rwCancel" style="margin-top:8px">취소하고 로비로</button></div>`;
 if(!C.rework)h+=`<div class="card">${stepHead(1,'종족',!!C.race,'종족은 1개만 고를 수 있어요.')}<div class="opts">${Object.entries(RACES).map(([n,r])=>`<button class="opt ${C.race===n?'on':''}" data-race="${n}" aria-pressed="${C.race===n}">${C.race===n?'<span class="check">✓</span>':''}<b>${n}</b><small>“${r.q}”<br>${r.d}</small></button>`).join('')}</div></div>`;
 // 2 종족 세부
 if(C.race==='로게움'&&!C.rework){
  const s=baseStats();const tops=topStats(s);
  const okBlood=C.blood&&(C.blood==='유'?!!C.bloodStat:!!C.bloodSkill);
  h+=`<div class="card">${stepHead(2,'로게움 — 혈통과 근원의 축복',okBlood&&!!C.root,'혈통 하나와 근원의 축복 기술 하나를 골라요.')}
   <div class="sec"><h3>기본으로 가지는 특성</h3><div class="opts">${fixedOpt(BYID['LOG-01'])}</div></div>
   <div class="sec"><h3>이어진 혈통 (하나만)</h3><div class="opts">
    ${skillOpt(BYID['LOG-02'],C.blood==='유',false,'data-blood="유"')}
    ${skillOpt(BYID['LOG-03'],C.blood==='조',false,'data-blood="조"')}</div></div>`;
  if(C.blood==='유')h+=`<div class="sec"><h3>+2 할 스탯</h3><div class="row">${STATK.map(k=>`<button class="chipbtn ${C.bloodStat===k?'on':''}" data-bstat="${k}">${STATN[k]}</button>`).join('')}</div></div>`;
  if(C.blood==='조'){
   const others=JOBS.filter(j=>!C.jobs.includes(j.n));
   h+=`<div class="sec"><h3>다른 별자리 기술 1개</h3><div class="hint">내가 고른 별자리가 아닌 곳의 선택형 기술만 고를 수 있어요. 별자리를 바꾸면 이 선택이 풀릴 수 있어요.</div>
    ${others.map(j=>`<details ${C.bloodSkill&&BYID[C.bloodSkill].group===j.n?'open':''}><summary style="cursor:pointer;margin:6px 0;font-weight:700;color:${j.c}">${j.n}</summary><div class="opts">${sk(j.n,'선택형').filter(live).map(s=>skillOpt(s,C.bloodSkill===s.id,false,`data-bskill="${s.id}"`)).join('')}</div></details>`).join('')}</div>`;
   if(C.jobs.length){h+=`<div class="sec"><h3>가장 높은 스탯 −1</h3>${tops.length>1?`<div class="hint">가장 높은 스탯이 여러 개예요. 깎을 스탯을 고르세요.</div><div class="row">${tops.map(k=>`<button class="chipbtn ${C.minusStat===k?'on':''}" data-mstat="${k}">${STATN[k]} (${s[k]})</button>`).join('')}</div>`:`<div class="hint">${STATN[tops[0]]} ${s[tops[0]]} → ${s[tops[0]]-1}</div>`}</div>`}
   else h+=`<div class="sec hint">가장 높은 스탯 −1은 별자리를 고른 뒤 계산돼요.</div>`;
  }
  h+=`<div class="sec"><h3>근원의 축복 — 종족 기술 1개</h3><div class="opts">${['LOG-04','LOG-05','LOG-06'].map(id=>skillOpt(BYID[id],C.root===id,false,`data-root="${id}"`)).join('')}</div></div></div>`;
 }
 if(C.race==='에테르'&&!C.rework){
  h+=`<div class="card">${stepHead(2,'에테르 — 특성과 상징',!!C.etherTrait&&!!C.etherSk&&!!C.symbol.trim(),'특성 하나, 상징, 그리고 새롭게 피어나는 줄기와 근원으로의 회귀 중 하나를 골라요.')}
   <div class="sec"><h3>기본으로 가지는 특성 · 기술</h3><div class="opts">${fixedOpt(BYID['AET-03'])}${fixedOpt(BYID['AET-04'])}</div></div>
   <div class="sec"><h3>특성 (하나만)</h3><div class="opts">${['AET-01','AET-02'].map(id=>skillOpt(BYID[id],C.etherTrait===id,false,`data-et="${id}"`)).join('')}</div>
   ${C.etherTrait==='AET-02'?'<div class="hint" style="margin-top:8px">【아담의 유산】·【이브의 유해】 아이템 목록이 아직 없어서, 시작 아이템은 나중에 고르게 돼요.</div>':''}</div>
   <div class="sec"><h3>상징</h3><div class="hint">에테르의 정식 명칭은 “○○의 에테르”예요.</div><div class="row"><input type="text" id="symbol" maxlength="12" placeholder="예: 서리" value="${esc(C.symbol)}"><span>${C.symbol.trim()?`→ <b>${esc(C.symbol.trim())}의 에테르</b>`:''}</span></div></div>
   <div class="sec"><h3>종족 기술 — 하나만</h3><div class="opts">${['AET-05','AET-06'].map(id=>skillOpt(BYID[id],C.etherSk===id,false,`data-esk="${id}"`)).join('')}</div></div></div>`;
 }
 if(C.rework&&C.race==='로게움'&&C.blood==='조'){const s=baseStats();const tops=topStats(s);h+=`<div class="card">${stepHead(2,'혈통: 조(造) — 다시 확인',!!C.bloodSkill)}`;
  if(C.blood==='조'){
   const others=JOBS.filter(j=>!C.jobs.includes(j.n));
   h+=`<div class="sec"><h3>다른 별자리 기술 1개</h3><div class="hint">내가 고른 별자리가 아닌 곳의 선택형 기술만 고를 수 있어요. 별자리를 바꾸면 이 선택이 풀릴 수 있어요.</div>
    ${others.map(j=>`<details ${C.bloodSkill&&BYID[C.bloodSkill].group===j.n?'open':''}><summary style="cursor:pointer;margin:6px 0;font-weight:700;color:${j.c}">${j.n}</summary><div class="opts">${sk(j.n,'선택형').filter(live).map(s=>skillOpt(s,C.bloodSkill===s.id,false,`data-bskill="${s.id}"`)).join('')}</div></details>`).join('')}</div>`;
   if(C.jobs.length){h+=`<div class="sec"><h3>가장 높은 스탯 −1</h3>${tops.length>1?`<div class="hint">가장 높은 스탯이 여러 개예요. 깎을 스탯을 고르세요.</div><div class="row">${tops.map(k=>`<button class="chipbtn ${C.minusStat===k?'on':''}" data-mstat="${k}">${STATN[k]} (${s[k]})</button>`).join('')}</div>`:`<div class="hint">${STATN[tops[0]]} ${s[tops[0]]} → ${s[tops[0]]-1}</div>`}</div>`}
   else h+=`<div class="sec hint">가장 높은 스탯 −1은 별자리를 고른 뒤 계산돼요.</div>`;
  }
  h+=`</div>`}
 // 3 별자리
 h+=`<div class="card">${stepHead(3,'별자리 (직업)',C.jobs.length>0,'1~2개. 1개면 선택형 3개 + 궁극기인 포비든 1개, 2개면 별자리마다 선택형 3개(포비든 없음). 스탯은 두 별자리를 합쳐요.')}
  <div class="opts">${JOBS.map(j=>{const on=C.jobs.includes(j.n);const dis=!on&&C.jobs.length>=2;return `<button class="opt job ${on?'on':''}" style="--c:${j.c}" data-job="${j.n}" ${dis?'disabled':''} aria-pressed="${on}">${on?`<span class="check">${C.jobs.indexOf(j.n)+1}</span>`:''}<span class="star">${j.star}</span><b>${j.n}</b><span class="stats4">${STATK.map((k,i)=>`<span>${STATN[k][0]} <b>${j.st[i]?'+'+j.st[i]:0}</b></span>`).join('')}</span><small>“${j.q}”</small></button>`}).join('')}</div></div>`;
 // 4 기술
 {
  const done=C.jobs.length>0&&C.jobs.every(j=>(C.picks[j]||[]).length===3)&&(!needForb()||C.forb);
  h+=`<div class="card">${stepHead(4,'기술',done)}<div class="sec"><h3>일반 기술 — 모두 기본으로 가져요</h3><div class="opts">${common.map(fixedOpt).join('')}</div></div>`;
  if(!C.jobs.length)h+=`<div class="sec hint">별자리를 고르면 여기서 별자리 기술을 골라요.</div>`;
  C.jobs.forEach(j=>{const p=C.picks[j]||[];const full=p.length>=3;
   h+=`<div class="sec"><div class="row" style="justify-content:space-between"><h3 style="color:${JOB[j].c}">${j} — 선택형</h3><span class="count ${full?'full':''}">${p.length} / 3</span></div><div class="opts">${sk(j,'선택형').filter(live).map(s=>{const on=p.includes(s.id);return skillOpt(s,on,!on&&full,`data-pick="${s.id}" data-pj="${j}"`)}).join('')}</div></div>`;
   if(needForb())h+=`<div class="sec"><div class="row" style="justify-content:space-between"><h3 style="color:${JOB[j].c}">${j} — 포비든</h3><span class="count ${C.forb?'full':''}">${C.forb?1:0} / 1</span></div><div class="opts">${sk(j,'포비든').filter(live).map(s=>skillOpt(s,C.forb===s.id,false,`data-forb="${s.id}"`)).join('')}</div></div>`;
  });
  h+=`</div>`;
 }
 // 5 이름
 if(!C.rework){
 const ptr=`<div class="sec"><h3>얼굴 사진 <span class="sub">(선택)</span></h3><div class="row" style="align-items:center;gap:12px">${avatar(C.portrait,displayName()||C.name||'?',72)}<button class="ghost" id="cPhoto">${C.portrait?'사진 바꾸기':'사진 넣기'}</button>${C.portrait?'<button class="ghost" id="cPhotoDel">지우기</button>':''}<span class="sub">정사각형으로 잘려서 로비와 레이드에 보여요.</span></div></div>`;
 if(C.race==='에테르')h+=`<div class="card">${stepHead(5,'별명',!!C.name.trim(),'정식 명칭은 “○○의 에테르”이고, 동료들이 부르는 별명을 따로 정해요.')}<input type="text" id="name" maxlength="16" placeholder="예: 서리" value="${esc(C.name)}">${ptr}</div>`;
 else h+=`<div class="card">${stepHead(5,'이름',!!C.name.trim())}<input type="text" id="name" maxlength="16" placeholder="스템의 이름" value="${esc(C.name)}">${ptr}</div>`;
 }
 $('#steps').innerHTML=h;
 renderSheet();bind();
 const rc=$('#rwCancel');if(rc)rc.onclick=()=>{fresh();store.del(KEY('draft'));showLobby()};
}
function renderSheet(){
 const s=finalStats(),b=baseStats(),list=chosenSkills(),e=issues();
 const delta=k=>s[k]-b[k];
 $('#sheet').innerHTML=`<div class="sub">${C.race||'종족 미정'} · ${C.jobs.map(j=>`<span style="color:${JOB[j].c};font-weight:700">${j}</span>`).join(' + ')||'별자리 미정'}</div>
  <div class="row" style="justify-content:flex-start;gap:10px;align-items:center">${avatar(C.portrait,displayName()||'?',48)}<div class="name disp">${esc(displayName())||'이름 없음'}</div></div>${C.race==='에테르'?`<div class="sub">별명 · ${esc(C.name.trim())||'미정'}</div>`:''}
  <div class="statgrid">${STATK.map(k=>`<div class="stat"><div class="v">${s[k]}</div><div class="l">${STATN[k]}${delta(k)?` (${delta(k)>0?'+':''}${delta(k)})`:''}</div></div>`).join('')}</div>
  <div class="res"><span>HP <b>20</b></span><span>SP 최대 <b>${10+s.com}</b></span><span>스톡 <b>5</b></span></div>
  <h3 style="margin-top:12px">기술 (${list.length})</h3>
  <ul class="slist">${list.map(x=>`<li><span>${esc(x.s.name)}${x.s.kind==='포비든'?' ★':''}</span><span>${esc(x.why)} · ${esc(x.s.turn||'-')}</span></li>`).join('')}</ul>
  ${e.length?`<ul class="issues">${e.map(x=>`<li>${x}</li>`).join('')}</ul>`:'<div class="hint" style="color:var(--ic);margin-top:10px">모든 선택을 마쳤어요.</div>'}
  <div class="row" style="margin-top:12px"><button class="go" id="save" ${e.length?'disabled':''}>${C.rework?'별자리 바꾸기':'캐릭터 생성'}</button></div>
`;
 $('#save').onclick=()=>{if(issues().length)return;
  if(C.rework){const a=store.get(KEY('saved'),[]),old=a[0];const inv=store.get(KEY('inv'),[]),i=inv.findIndex(x=>x.name===RECAST.name);if(!old||i<0){toast('별자리 재관측기가 없어요.');return}
   inv.splice(i,1);store.set(KEY('inv'),inv);const nj={...toJSON(),id:old.id,createdAt:old.createdAt,portrait:old.portrait||null,recastAt:Date.now()};a[0]=nj;store.set(KEY('saved'),a);
   store.del(KEY('draft'));fresh();toast(`별자리를 ${nj.jobs.join(' + ')}(으)로 바꿨어요.`);showLobby();return}
  const j={...toJSON(),id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)};
  if(chars().length){toast('스템은 계정마다 1명만 만들 수 있어요.');showLobby();return}
  const a=[j];if(!store.set(KEY('saved'),a)){toast('저장하지 못했어요. 잠시 후 다시 해 주세요.');return}
  store.del(KEY('draft'));fresh();toast(`${j.name} 생성했어요.`);showLobby()};

}
function bind(){
 const on=(sel,f)=>document.querySelectorAll(sel).forEach(b=>b.onclick=()=>{f(b);render()});
 on('[data-race]',b=>{if(C.race!==b.dataset.race){const keep={jobs:C.jobs,picks:C.picks,forb:C.forb,name:C.name};fresh();Object.assign(C,keep);C.race=b.dataset.race}});
 on('[data-blood]',b=>{C.blood=b.dataset.blood;C.bloodStat=null;C.bloodSkill=null;C.minusStat=null});
 on('[data-bstat]',b=>C.bloodStat=b.dataset.bstat);
 on('[data-bskill]',b=>C.bloodSkill=C.bloodSkill===b.dataset.bskill?null:b.dataset.bskill);
 on('[data-mstat]',b=>C.minusStat=b.dataset.mstat);
 on('[data-root]',b=>C.root=b.dataset.root);
 on('[data-et]',b=>C.etherTrait=b.dataset.et);on('[data-esk]',b=>C.etherSk=b.dataset.esk);
 on('[data-job]',b=>{const j=b.dataset.job;if(C.jobs.includes(j)){C.jobs=C.jobs.filter(x=>x!==j);delete C.picks[j];if(C.forb&&BYID[C.forb].group===j)C.forb=null}else if(C.jobs.length<2){C.jobs.push(j);if(C.bloodSkill&&BYID[C.bloodSkill].group===j)C.bloodSkill=null}
   if(C.jobs.length!==1)C.forb=null;C.minusStat=null});
 on('[data-pick]',b=>{const j=b.dataset.pj,id=b.dataset.pick;const p=C.picks[j]=C.picks[j]||[];const i=p.indexOf(id);if(i>=0)p.splice(i,1);else if(p.length<3)p.push(id)});
 on('[data-forb]',b=>C.forb=C.forb===b.dataset.forb?null:b.dataset.forb);
 const inp=(id,key)=>{const e=$('#'+id);if(e)e.oninput=()=>{C[key]=e.value;renderSheet();try{localStorage.setItem(KEY('draft'),JSON.stringify(C))}catch(x){}}};
 inp('symbol','symbol');inp('name','name');
 const sy=$('#symbol');if(sy)sy.onchange=render;
 const cp=$('#cPhoto');if(cp)cp.onclick=()=>pickPortrait(u=>{C.portrait=u;render()});const cd=$('#cPhotoDel');if(cd)cd.onclick=()=>{C.portrait=null;render()};
}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),1800)}
$('#reset').onclick=()=>{if(C.rework){startRecast();return}fresh();render()};
