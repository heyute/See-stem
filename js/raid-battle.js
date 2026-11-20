// 시 스템 :: 딥 다이브 — 레이드 전투 (SRPG 턴제, 보스 「추락한 별의 악의」)
{
const $=s=>document.querySelector(s);
const W=11,H=11;
const d6=()=>1+Math.floor(Math.random()*6);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const K=(x,y)=>x+','+y;
const inMap=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
const cheb=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
const sleep=ms=>new Promise(r=>setTimeout(r,$('#fast').checked?ms/5:ms));
let G,B;

// ── 기술 (DB 탭 기준, 이 프로토타입에 쓰는 것만)
const SK={
 mv:{n:'이동',type:'set',sp:1,range:2,tgt:'move',d:'2칸 안의 빈 칸으로 이동'},
 smash:{spd:1,n:'강타',type:'act',sp:1,dice:1,range:1,tgt:'enemy',dmg:r=>Math.max(1,r[0]-2),d:'1D6-2(최소 1) 피해'},
 w_kd:{n:'칼등치기',type:'set',sp:2,dice:1,range:1,tgt:'boss',d:'1D6÷2(올림)만큼 보스 스톡 파괴',fx(u,t,r){stockBreak(Math.ceil(r[0]/2),u,`[${r[0]}]`)}},
 w_sb:{n:'속보',type:'set',sp:2,range:3,tgt:'move',d:'스톡 +2, 3칸 이동',pre(u){addStock(u,2)}},
 w_jh:{spd:1,n:'진혼검',type:'act',sp:5,dice:2,range:1,tgt:'enemy',dmg:r=>r[0]+r[1],d:'2D6 피해. 피해 0이면 자신 체력 절반 손실',post(u,t,dealt){if(dealt<1){const l=Math.floor(u.hp/2);u.hp-=l;log(`${u.name} 진혼검 실패 — 체력 ${l} 손실`,'dm')}}},
 w_F:{spd:1,n:'결(決)',type:'act',sp:5,dice:2,fix:5,range:1,tgt:'enemy',forb:1,dmg:r=>r[0]+r[1],d:'포비든. 다이스 2개가 5로 고정'},
 g_wall:{n:'수정 방벽',type:'icp',onHit:1,sp:3,dice:1,range:3,d:'3칸 안 아군이 공격받을 때 1D6만큼 피해 감소'},
 c_def:{n:'방어',type:'icp',onHit:1,sp:0,dice:1,d:'공격받을 때 1D6+방어만큼 피해 감소'},
 c_eva:{n:'회피',type:'icp',onHit:1,sp:0,dice:1,d:'공격받을 때 1D6+회피 > 공격 값이면 무효'},
 c_clash:{n:'격돌',type:'icp',onHit:1,sp:0,d:'공격받을 때 피해 액션 기술로 맞받아침'},
 g_war:{n:'선전포고',type:'set',sp:2,range:1,tgt:'boss',d:'보스 스톡 3개 파괴',fx(u){stockBreak(3,u)}},
 g_trick:{spd:1,n:'변칙 검술',type:'act',sp:3,dice:1,range:1,tgt:'enemy',dmg:r=>r[0],d:'1D6 피해 + 보스 스톡 1개 파괴',post(u,t){if(t===B)stockBreak(1,u)}},
 g_F:{spd:1,n:'푸른 신념',type:'act',sp:3,range:1,tgt:'enemy',forb:1,blue:1,d:'포비든. 스톡을 모두 소모, (스톡×3) 고정 피해'},
 m_cover:{n:'원호사격',type:'set',sp:2,range:4,tgt:'ally',d:'아군 스톡 +1',fx(u,t){addStock(t,1)}},
 m_pre:{spd:5,n:'사전설계',type:'icp',start:1,sp:2,range:2,tgt:'none',d:'턴 시작 창. 2칸 안 아군 전원 이번 라운드 회피 +1',fx(u){const a=alliesIn(u,2);a.forEach(x=>x.st.push({k:'evaUp',v:1,r:1}));log(`사전설계 → ${a.map(x=>x.name).join(', ')} 회피 +1`,'sp')}},
 m_snipe:{spd:1,n:'장거리 저격',type:'act',sp:6,dice:2,range:7,tgt:'enemy',dmg:r=>r[0]+r[1],d:'7칸 안, 2D6 피해'},
 m_zero:{spd:3,n:'영거리 사격',type:'act',sp:2,dice:1,range:1,tgt:'enemy',dmg:r=>r[0],d:'1D6 피해, 2라운드 [방어력 감소 1]',post(u,t){if(t===B){B.st.push({k:'defDown',v:1,r:2});log('보스 [방어력 감소 1] 2라운드','sp')}}},
 m_F:{n:'예비 카트리지',type:'set',sp:1,range:3,tgt:'ally',forb:1,d:'포비든. 아군 스톡 +3',fx(u,t){addStock(t,3)}},
 c_heal:{n:'치유의 장막',type:'set',sp:6,range:3,tgt:'ally',d:'아군 1체(자신 포함) 체력 5 회복',fx(u,t){heal(t,5,u.name+' 치유의 장막')}},
 c_echo:{n:'보호의 메아리',type:'set',sp:7,range:3,tgt:'ally',d:'아군 1체 이번 라운드 보호막 5',fx(u,t){t.st.push({k:'shield',v:5,r:1});log(`${u.name} 보호의 메아리 → ${t.name} 보호막 5`,'sp')}},
 c_ray:{n:'성광',type:'act',sp:4,dice:1,range:3,tgt:'enemy',spd:3,dmg:r=>Math.max(0,r[0]-1),d:'(1D6-1) 피해, 피해를 주면 [공격력 감소 1]',post(u,t,dealt){if(dealt>0&&t===B){B.st.push({k:'atkDown',v:1,r:1});log('보스 [공격력 감소 1]','sp')}}},
 c_F:{n:'콜 오브 발키리',type:'set',sp:7,range:3,tgt:'allyAll',forb:1,d:'포비든. 3칸 안 아군 전원 2라운드 보호막 5 + 주는 피해 +1',fx(u){const a=alliesIn(u,3);a.forEach(x=>{x.st.push({k:'shield',v:5,r:2});x.st.push({k:'dealUp',r:2})});log(`${u.name} 콜 오브 발키리 → ${a.map(x=>x.name).join(', ')} 보호막 5·주는 피해 +1 (2라운드)`,'sp')}},
};
const JOBS=[
 {n:'전사',k:'W',col:'#d35d47',stats:{atk:2,def:0,eva:1,com:0},sk:['w_kd','w_sb','w_jh','w_F'],pos:[3,10]},
 {n:'수호자',k:'G',col:'#c79b2e',stats:{atk:0,def:2,eva:1,com:0},sk:['g_wall','g_war','g_trick','g_F'],pos:[5,10]},
 {n:'마도공학자',k:'M',col:'#3f9a5f',stats:{atk:1,def:0,eva:2,com:0},sk:['m_pre','m_snipe','m_zero','m_F'],pos:[7,10]},
 {n:'성직자',k:'C',col:'#b98fd6',stats:{atk:0,def:1,eva:0,com:1},sk:['c_heal','c_echo','c_ray','c_F'],pos:[5,9]},
];

// ── 보스 공격 (보스 기준 5종 / 대상 기준 5종)
const ring1=()=>{const o=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)if(x||y)o.push([x,y]);return o};
const BA=[
 {n:'한손 전력 배기',tier:3,c:'boss',f:d=>[1,2,3,4,5].map(i=>[d[0]*i,d[1]*i])},
 {n:'한손 하단 배기',tier:2,c:'boss',f:d=>[1,2,3,4,5].flatMap(i=>[[d[0]*i,d[1]*i],[-d[0]*i,-d[1]*i]])},
 {n:'섬멸자',tier:2,c:'boss',f:()=>{const o=[[0,0]];for(const sx of[-1,1])for(const sy of[-1,1])for(const a of[1,2])for(const b of[1,2])o.push([sx*a,sy*b]);return o}},
 {n:'절대적 악의',tier:2,c:'boss',f:ring1},
 {n:'천지개벽',tier:1,c:'boss',f:()=>{const o=[];for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++)if(x||y)o.push([x,y]);return o}},
 {n:'기억 재현: 투창',tier:1,c:'tgt',rot:1,f:()=>[[0,0],[0,1],[0,2],[0,3],[-1,4],[0,4],[1,4],[-1,5],[0,5],[1,5]]},
 {n:'기억 재현: 진각',tier:2,c:'tgt',rot:1,f:()=>[[0,0],[-1,1],[0,1],[1,1],[-1,2],[0,2],[1,2]]},
 {n:'기억 재현: 포격',tier:3,c:'tgt',f:()=>[[0,0],[0,-1],[0,1],[-1,0],[1,0]]},
 {n:'융해',tier:1,c:'tgt',f:()=>[[0,0],[-1,-2],[0,-2],[1,-2],[-2,-1],[0,-1],[2,-1],[-2,0],[-1,0],[1,0],[2,0],[-2,1],[0,1],[2,1],[-1,2],[0,2],[1,2]]},
 {n:'유성우',tier:3,c:'tgt',f:()=>{const o=[];for(const sx of[-1,1])for(const sy of[-1,1]){o.push([sx,sy],[2*sx,2*sy]);for(const a of[3,4])for(const b of[3,4])o.push([sx*a,sy*b])}return o}},
];
BA.forEach(a=>a.dg=a.tier*2-(a.c==='tgt'?0:1));
const bossSvg=`<svg viewBox="0 0 40 40"><polygon points="20,2 24,14 37,14 27,22 31,36 20,28 9,36 13,22 3,14 16,14" fill="#2a1830" stroke="#f0c75e" stroke-width="1.6"/><circle cx="16.5" cy="19" r="1.8" fill="#ff4d6a"/><circle cx="23.5" cy="19" r="1.8" fill="#ff4d6a"/></svg>`;
const swordSvg=`<svg viewBox="0 0 20 20"><path d="M10 1 L12 12 L10 14 L8 12Z" fill="#cfd6e0" stroke="#59606b" stroke-width=".8"/><rect x="5" y="13" width="10" height="2" rx="1" fill="#8a6a3a"/><rect x="9" y="15" width="2" height="4" fill="#5a4426"/></svg>`;

// ── 로비 대기실에서 넘어온 파티 (#party=base64 JSON). 없으면 기본 4직업.
const POS=[[3,10],[5,10],[7,10],[5,9]];
function partyFromHash(){
 try{const m=location.hash.match(/party=([^&]+)/);if(!m)return JOBS;
  const arr=JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
  return arr.slice(0,4).map((p,i)=>{const kits=(p.jobs||[]).map(n=>JOBS.find(j=>j.n===n)).filter(Boolean);
   const sk=[...new Set(kits.flatMap(k=>k.sk))];const col=(kits[0]||{}).col||'#7a7f8c';
   return{n:p.char,k:p.char[0],col,stats:p.stats||{atk:0,def:0,eva:0,com:0},sk,pos:POS[i],me:p.me,missing:(p.jobs||[]).filter(n=>!JOBS.some(j=>j.n===n))}})}
 catch(e){return JOBS}}
window.addEventListener('message',e=>{if(e.data&&e.data.type==='portraits'){window._portraits=e.data.list;if(G&&G.P){G.P.forEach((p,i)=>p.img=e.data.list[i]||null);render()}}});
// ── 상태
function init(){
 B={name:'추락한 별의 악의',x:5,y:5,hp:80,mx:80,atk:1,def:2,stock:10,broken:0,st:[]};
 G={round:0,phase:'',over:false,P:[],S:[],atks:[],diceMinus:0,inverted:false,even:false,cheAction:false,seungi:false,sel:0,pick:null,queue:[],allowed:null,extra:0,res:null};
 for(const [x,y] of [[0,-2],[0,2],[-2,0],[2,0],[-2,-2],[2,-2],[-2,2],[2,2]])G.S.push({sw:1,x:5+x,y:5+y,hp:10,mx:10,dead:false});
 const PARTY=partyFromHash();
 {const miss=PARTY.filter(p=>p.missing&&p.missing.length);if(miss.length)$('#subhint').textContent='파티 전원을 한 사람이 조작하는 미리보기 · 이 화면에 아직 없는 직업 기술: '+miss.map(p=>p.n+'('+p.missing.join(', ')+')').join(' · ')+' → 일반 기술로만 싸워요';}
 G.P=PARTY.map((j,i)=>({id:i,img:(window._portraits||[])[i]||null,name:j.n,job:j,col:j.col,x:j.pos[0],y:j.pos[1],hp:20,mx:20,sp:0,stock:0,st:[],sk:['mv','smash',...j.sk,'c_def','c_eva','c_clash'],setUsed:0,icpUsed:new Set(),gained:false}));
 $('#log').innerHTML='';
 main();
}
const alive=()=>G.P.filter(p=>p.hp>0);
const swords=()=>G.S.filter(s=>!s.dead);
const has=(u,k)=>u.st.some(s=>s.k===k);
const spMax=u=>10+stat(u,'com');
function stat(u,k){let v=u.job.stats[k];if(has(u,'epic'))v+=3;for(const s of u.st){if(s.k===k+'Down')v-=s.v;if(s.k===k+'Up')v+=s.v}return v}
const dealMod=u=>u.st.filter(s=>s.k==='dealUp').length-(has(u,'체공')?1:0);
const bossDef=()=>Math.max(0,B.def-B.st.filter(s=>s.k==='defDown').reduce((a,s)=>a+s.v,0));
const bossAtk=()=>B.atk+(G.even?1:0)-B.st.filter(s=>s.k==='atkDown').reduce((a,s)=>a+s.v,0);
const alliesIn=(u,r)=>alive().filter(a=>cheb(u,a)<=r);
function addStock(u,n){u.stock+=n;u.gained=true;log(`${u.name} 스톡 +${n}`,'sp')}
function occ(x,y){if(B.x===x&&B.y===y)return B;return swords().find(s=>s.x===x&&s.y===y)||G.P.find(p=>p.hp>0&&p.x===x&&p.y===y)||null}
function log(t,c=''){const p=document.createElement('p');p.className=c;p.innerHTML=t;$('#log').append(p);$('#log').scrollTop=1e9}
function flash(sel){const e=$(sel);if(e){e.classList.remove('hit');void e.offsetWidth;e.classList.add('hit')}}

// ── 피해 처리
function heal(t,n,src){if(t.hp<=0)return;const b=t.hp;t.hp=Math.min(t.mx,t.hp+n);log(`${t.name} 체력 +${t.hp-b} (${src})`,'sp')}
const shieldOf=u=>u.st.filter(s=>s.k==='shield').reduce((a,s)=>a+s.v,0);
function dmgPlayer(p,d,src,fixed){if(p.hp<=0||d<=0)return;
 if(!fixed){const sh=u=>u.st.filter(s=>s.k==='shield'&&s.v>0).sort((a,b)=>a.r-b.r);let ab=0;for(const s of sh(p)){const t=Math.min(s.v,d);s.v-=t;d-=t;ab+=t;if(!d)break}p.st=p.st.filter(s=>s.k!=='shield'||s.v>0);if(ab)log(`${p.name} 보호막이 ${ab} 흡수`,'sp');if(d<=0)return}
 p.hp-=d;log(`${p.name} ← <span class="dm">${d} 피해</span> (${src})${p.hp<=0?' · 쓰러짐':''}`);flash('#u'+p.id);if(!alive().length)G.over='lose'}
function damageBoss(d,src){if(d<=0){log(`${src} → 보스 피해 0`);return 0}B.hp-=d;if(swords().length&&B.hp<1)B.hp=1;log(`${src} → <span class="dm">보스 ${d} 피해</span>${swords().length&&B.hp===1?' (불사)':''}`);flash('#bossTok');if(B.hp<=0&&!swords().length)G.over='win';return d}
function breakSword(s,why){if(s.dead)return;s.dead=true;B.mx-=5;B.hp-=2;if(swords().length&&B.hp<1)B.hp=1;B.atk+=1;log(`검 파괴(${why}) — 나눠진 영혼: 보스 최대 체력 ${B.mx}, 현재 ${B.hp}, 공격 ${B.atk}`,'dm');overflow();if(B.hp<=0&&!swords().length)G.over='win'}
function overflow(){while(B.hp>B.mx){const d=B.hp-B.mx;B.hp=B.mx;log(`넘치는 재능! 맵의 모든 대상에게 ${d} 피해`,'dm');alive().forEach(p=>dmgPlayer(p,d,'넘치는 재능'));swords().forEach(s=>{s.hp-=d;if(s.hp<=0)breakSword(s,'넘치는 재능')})}}
function hitEnemy(u,t,v,fixed,label){
 if(t===B){const d=fixed?v:Math.max(0,v-bossDef());return damageBoss(d,`${u.name} ${label}`)}
 const d=Math.max(0,v);t.hp-=d;log(`${u.name} ${label} → <span class="dm">검 ${d} 피해</span>`);if(t.hp<=0)breakSword(t,u.name);return d;
}
function stockBreak(n,u,extra=''){
 const a=Math.min(n,B.stock);B.stock-=a;B.broken+=a;log(`${u.name} ${extra} → 보스 스톡 ${a}개 파괴 (${B.broken}/10)`,'sp');
 while(B.broken>=5*(G.atks.filter(x=>x.cancel).length+1)){
  const live=G.atks.filter(x=>!x.cancel);if(!live.length)break;
  const top=Math.max(...live.map(x=>x.a.dg));const c=pick(live.filter(x=>x.a.dg===top));c.cancel=true;log(`⚡ 보스 기술 취소: ${c.a.n}`,'ic');
 }
}
function roll(n,fix){return Array.from({length:n},()=>fix||d6())}

// ── 라운드 시작
function revealAttacks(){
 const idx=[...BA.keys()].sort(()=>Math.random()-.5).slice(0,2);
 const invN=G.inverted?Math.floor(Math.random()*2):-1;
 G.atks=idx.map((i,n)=>{
  const a=BA[i],t=pick(alive());let offs,cx,cy;
  if(a.c==='boss'){const dx=t.x-B.x,dy=t.y-B.y;const d=Math.abs(dx)>=Math.abs(dy)?[Math.sign(dx)||1,0]:[0,Math.sign(dy)||1];offs=a.f(d);cx=B.x;cy=B.y}
  else{offs=a.f();cx=t.x;cy=t.y;
   if(a.rot){const dx=B.x-t.x,dy=B.y-t.y;const d=Math.abs(dx)>=Math.abs(dy)?[Math.sign(dx)||1,0]:[0,Math.sign(dy)||1];
    const R=d[1]===1?([x,y])=>[x,y]:d[1]===-1?([x,y])=>[-x,-y]:d[0]===1?([x,y])=>[y,-x]:([x,y])=>[-y,x];offs=offs.map(R)}}
  let tiles=new Set(offs.map(([x,y])=>[cx+x,cy+y]).filter(([x,y])=>inMap(x,y)&&!(x===B.x&&y===B.y)).map(([x,y])=>K(x,y)));
  const isInv=n===invN;
  if(isInv){const inv=new Set();for(let x=0;x<W;x++)for(let y=0;y<H;y++){const k=K(x,y);if(!tiles.has(k)&&!(x===B.x&&y===B.y))inv.add(k)}tiles=inv}
  return{a,t,tiles,cancel:false,slot:n?'B':'A',inv:isInv};
 });
 G.atks.forEach(x=>log(`보스 예고 ${x.slot}: <b>${x.a.n}</b> (1D6+${x.a.tier-1}, 위험도 ${x.a.dg}) → ${x.t.name}${x.inv?' · 역수검: 범위 반전, 맞으면 [체공]':''}`));
}
function seungi(){
 if(G.seungi)return;const cs=alive().filter(p=>has(p,'체공'));if(!cs.length)return;
 G.seungi=true;const per=Math.floor(14/cs.length);log(`승기 포착! [체공] ${cs.length}명에게 14 피해 분배 (각 ${per})`,'dm');cs.forEach(p=>dmgPlayer(p,per,'승기 포착'));
}
async function roundStart(){
 G.round++;G.inverted=G.round%2===0;G.even=!G.inverted;G.diceMinus=0;G.seungi=false;B.stock=10;B.broken=0;
 for(const p of alive()){if(p.sp<spMax(p))p.sp=spMax(p);if(p.stock<5)p.stock=5;p.setUsed=0;p.icpUsed=new Set()}
 log(`라운드 ${G.round} — ${G.inverted?'역수검(공격 1개 범위 반전, 그 공격에 맞으면 [체공])':'양손잡기(공격 +1, 밀어내기)'}`,'rd');
 revealAttacks();
 G.phase='START';render();await sleep(500);
 const near=alive().filter(p=>cheb(p,B)<=1);
 if(near.length){log('지각파쇄 — 보스 1칸 안 피해 1');near.forEach(p=>dmgPlayer(p,1,'지각파쇄'));if(near.length===1&&near[0].hp>0){near[0].st.push({k:'체공',r:1});log(`${near[0].name} [체공]`,'dm')}}
 for(const s of swords()){const ps=alive().filter(p=>cheb(p,s)<=1);if(ps.length){ps.forEach(p=>dmgPlayer(p,1,'낙성검 고정',true))}}
 seungi();render();await sleep(400);
}

// ── 세팅·액션 공통
function reach(u,n){
 const seen=new Map([[K(u.x,u.y),0]]),q=[[u.x,u.y,0]],out=[];
 while(q.length){const[x,y,d]=q.shift();if(d>0&&!occ(x,y))out.push({x,y});if(d===n)continue;
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy,k=K(nx,ny);if(!inMap(nx,ny)||seen.has(k))continue;const o=occ(nx,ny);if(o&&(o===B||o.sw))continue;seen.set(k,d+1);q.push([nx,ny,d+1])}}
 return out;
}
function candidates(u,s){
 if(s.tgt==='enemy')return[B,...swords()].filter(t=>cheb(u,t)<=s.range);
 if(s.tgt==='boss')return cheb(u,B)<=s.range?[B]:[];
 if(s.tgt==='ally')return alliesIn(u,s.range);
 if(s.tgt==='move')return has(u,'속박')?[]:reach(u,s.range);
 return null;
}
function planned(u){const e=G.queue.filter(q=>q.u===u);return{sp:e.reduce((a,q)=>a+SK[q.k].sp,0),dice:e.reduce((a,q)=>a+(SK[q.k].dice||0),0)}}
function canSet(u){return u.hp>0&&!(has(u,'체공')&&!G.cheAction)&&u.setUsed<2}
function canAct(u){return u.hp>0&&!(has(u,'체공')&&G.cheAction)&&(!G.allowed||G.allowed.has(u.id))}

function useSetting(u,k,t){
 const s=SK[k];u.sp-=s.sp;const r=roll(s.dice||0);u.stock-=s.dice||0;u.setUsed++;
 if(s.pre)s.pre(u);
 if(s.tgt==='move'){u.x=t.x;u.y=t.y;log(`${u.name} ${s.n} → (${t.x+1},${t.y+1})`)}
 else{if(s.tgt==='ally'||s.tgt==='boss')log(`${u.name} ${s.n}${t&&t!==B?' → '+t.name:''}`);s.fx&&s.fx(u,t,r)}
}
function doAction(e){
 const u=e.u,s=SK[e.k];if(u.hp<=0)return;
 const dn=s.dice||0;
 if(u.sp<s.sp||u.stock<dn){log(`${u.name} ${s.n} — 자원 부족으로 불발`);return}
 if(e.t&&(e.t.dead||(e.t!==B&&e.t.sw&&e.t.dead)||cheb(u,e.t)>s.range)){log(`${u.name} ${s.n} — 대상 없음/사거리 밖으로 불발`);return}
 u.sp-=s.sp;u.stock-=dn;
 if(s.blue){const n=u.stock;u.stock=0;hitEnemy(u,e.t,n*3,true,`${s.n}(스톡 ${n}×3 고정)`);return}
 if(s.dmg){const r=roll(dn,s.fix);const v=Math.max(0,s.dmg(r)+stat(u,'atk')+dealMod(u));const dealt=hitEnemy(u,e.t,v,false,`${s.n}[${r.join('·')}]+${stat(u,'atk')}`);s.post&&s.post(u,e.t,dealt);return}
 log(e.icp?`⚡ ${u.name} 인터셉트: ${s.n}`:`${u.name} ${s.n}`,e.icp?"ic":"");s.fx&&s.fx(u,e.t);
}

// ── 단계
function waitBtn(){return new Promise(r=>G.res=r)}
async function actionPhase(){
 G.extra=0;G.allowed=null;
 for(;;){
  G.queue=[];G.phase='ACT';render();await waitBtn();
  G.P.forEach(u=>u.gained=false);
  const q=[...G.queue].sort((a,b)=>(!!b.icp-!!a.icp)||b.spd-a.spd);
  log(G.extra?`추가 입력 적용 (${q.length}건)`:`액션 일괄 적용 (${q.length}건)`,'ic');
  for(const e of q){doAction(e);render();await sleep(380);if(G.over)return}
  const ext=alive().filter(u=>u.gained&&canAct({...u,hp:u.hp})&&u.sk.some(k=>SK[k].type==='act'&&u.sp>=SK[k].sp&&u.stock>=(SK[k].dice||0)));
  if(!ext.length||G.extra>=3)break;
  G.extra++;G.allowed=new Set(ext.map(u=>u.id));G.sel=ext[0].id;log(`자원이 늘어난 캐릭터 추가 입력: ${ext.map(u=>u.name).join(', ')}`,'ic');
 }
 G.allowed=null;
}
function ask(html,opts){
 return new Promise(res=>{
  $('#sheet').innerHTML=html+`<div class="acts">${opts.map((o,i)=>`<button data-i="${i}" class="${o.cls||''}" ${o.dis?'disabled':''}>${o.t}</button>`).join('')}</div>`;
  $('#sheet').querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{$('#ov').classList.remove('on');res(opts[+b.dataset.i].v)});
  $('#ov').classList.add('on');
 });
}
// 공격받을 때: 방어 · 회피 · 격돌 3개만. 격돌을 누르면 쓸 수 있는 액션 기술 목록(못 쓰는 건 흐리게 + 이유)
function clashList(p){return p.sk.filter(k=>{const s=SK[k];return s.type==='act'&&s.dmg}).map(k=>{const s=SK[k],why=[];
 if(p.sp<s.sp)why.push(`SP ${s.sp} 필요`);if(p.stock<(s.dice||0))why.push(`스톡 ${s.dice} 필요`);if(cheb(p,B)>s.range)why.push(`사거리 ${s.range}칸 밖`);return{k,s,why}})}
function hitChoice(p,V,head){return new Promise(res=>{
 const sh=$('#sheet'),done=v=>{$('#ov').classList.remove('on');res(v)};
 const L=clashList(p),okClash=L.some(x=>!x.why.length),noStock=p.stock<1;
 function main(){
  sh.innerHTML=head+`<div class="hitopts">
   <button class="hitb" data-h="def" ${noStock?'aria-disabled="true"':''}><b>방어</b><small>1D6+${stat(p,'def')}만큼 피해 감소 · 스톡 1</small>${noStock?'<em>스톡 부족</em>':''}</button>
   <button class="hitb" data-h="eva" ${noStock?'aria-disabled="true"':''}><b>회피</b><small>1D6+${stat(p,'eva')} > ${V}이면 무효 · 스톡 1</small>${noStock?'<em>스톡 부족</em>':''}</button>
   <button class="hitb" data-h="clash" ${okClash?'':'aria-disabled="true"'}><b>격돌 ›</b><small>액션 기술로 맞받아쳐 이기면 차이만큼 피해</small>${okClash?'':'<em>쓸 수 있는 기술 없음</em>'}</button></div>
   ${noStock&&!okClash?'<button class="ghost takeb" data-h="none">그대로 받기</button>':''}`;
  sh.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>{const h=b.dataset.h;
   if(h==='clash')return sub();if(b.getAttribute('aria-disabled')==='true')return;done({k:h})});
 }
 function sub(){
  sh.innerHTML=head+`<div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">격돌 — 맞받아칠 기술</h3><button class="ghost" data-back>‹ 뒤로</button></div>
   <p class="hint" style="margin:4px 0 8px">기술 값(다이스 + 공격 ${stat(p,'atk')})이 공격 값 ${V}보다 높으면 피해를 받지 않고 차이만큼 보스에게 피해를 줘요.</p>
   <div class="clashl">${L.map(x=>`<button class="skb ${x.why.length?'dim':'icb'}" data-c="${x.k}" ${x.why.length?'aria-disabled="true"':''}><b>${x.s.n}${x.s.forb?' ★':''}</b><small>${x.s.d}<br>SP ${x.s.sp} · 스톡 ${x.s.dice||0} · 사거리 ${x.s.range}</small>${x.why.length?`<em>${x.why.join(' · ')}</em>`:''}</button>`).join('')||'<p class="hint">격돌에 쓸 액션 기술이 없어요.</p>'}</div>`;
  sh.querySelector('[data-back]').onclick=main;
  sh.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{if(b.getAttribute('aria-disabled')==='true')return;done({k:'clash',s:b.dataset.c})});
 }
 main();$('#ov').classList.add('on');
})}
async function resolveHit(p,V,a){
 let reduce=0;
 const g=alive().find(x=>x.sk.includes('g_wall'));
 if(g&&g.sp>=3&&g.stock>=1&&cheb(g,p)<=3&&!(has(g,'체공')&&G.cheAction)){
  const ok=await ask(`<h2>수정 방벽</h2><p><b>${p.name}</b>이(가) <b>${a.a.n}</b>(공격 값 ${V})에 맞습니다. ${g.name}이(가) 1D6만큼 피해를 줄일까요? (SP 3, 스톡 1)</p>`,[{t:'사용',v:1,cls:'icb'},{t:'사용 안 함',v:0}]);
  if(ok){g.sp-=3;g.stock-=1;const r=d6();reduce+=r;log(`${g.name} 수정 방벽 [${r}] → ${p.name} 피해 ${r} 감소`,'sp')}
 }
 const head=`<h2>인터셉트 — ${p.name}</h2><p><b>${a.a.n}</b> · 공격 값 <b>${V}</b>${reduce?` · 수정 방벽 -${reduce}`:''}<br>HP ${p.hp} · SP ${p.sp} · 스톡 ${p.stock}${a.inv?'<br>역수검: 이 공격에 맞으면 [체공]':''}${G.even?'<br>양손잡기: 피해/2칸 밀려남':''}</p>`;
 const c=await hitChoice(p,V,head);
 let dmg=V,ev=false;
 if(c.k==='def'){p.stock--;const r=d6();const tot=r+stat(p,'def');dmg=Math.max(0,V-tot);log(`${p.name} 방어 [${r}]+${stat(p,'def')} = ${tot}`,'sp')}
 else if(c.k==='eva'){p.stock--;const r=d6();const tot=r+stat(p,'eva');if(tot>V){dmg=0;ev=true}log(`${p.name} 회피 [${r}]+${stat(p,'eva')} = ${tot} ${ev?'성공':'실패'}`,'sp')}
 else if(c.k==='clash'){const s=SK[c.s];p.sp-=s.sp;p.stock-=s.dice||0;const r=roll(s.dice||0,s.fix);const val=s.dmg(r)+stat(p,'atk');log(`${p.name} 격돌 ${s.n}[${r.join('·')}]+${stat(p,'atk')} = ${val} vs ${V}`,'sp');
  if(val>V){dmg=0;ev=true;const dealt=hitEnemy(p,B,val-V,false,'격돌');s.post&&s.post(p,B,dealt)}else log('격돌 실패')}
 dmg=Math.max(0,dmg-reduce);
 if(!ev){dmgPlayer(p,dmg,a.a.n);if(p.hp>0&&a.inv&&!has(p,'체공')){p.st.push({k:'체공',r:1});log(`${p.name} [체공]`,'dm')}
  if(p.hp>0&&G.even&&dmg>=2)knock(p,Math.floor(dmg/2))}
 else log(`${p.name} 피해 없음`);
 render();
}
function knock(p,n){const dx=Math.sign(p.x-B.x),dy=Math.sign(p.y-B.y);let m=0;for(let i=0;i<n;i++){const nx=p.x+dx,ny=p.y+dy;if(!inMap(nx,ny)||occ(nx,ny))break;p.x=nx;p.y=ny;m++}if(m)log(`${p.name} ${m}칸 밀려남`)}
async function bossPhase(){
 G.phase='BOSS';render();
 const list=G.atks.filter(a=>!a.cancel).sort((a,b)=>b.a.dg-a.a.dg);
 if(!list.length)log('보스 기술이 모두 취소됨!','ic');
 for(const a of list){
  const r=d6();const V=Math.max(1,r+a.a.tier-1+bossAtk()-G.diceMinus);
  log(`보스 ${a.slot}: <b>${a.a.n}</b> [${r}]+${a.a.tier-1}+공격 ${bossAtk()}${G.diceMinus?'-1':''} = 공격 값 ${V}`,'dm');
  const hits=alive().filter(p=>a.tiles.has(K(p.x,p.y)));
  if(!hits.length){log('범위 안에 아무도 없음');await sleep(300);continue}
  for(const p of hits){if(p.hp>0)await resolveHit(p,V,a);if(G.over)return}
 }
 seungi();
}
async function roundEnd(){
 if(G.over)return;
 let pendBind=null;
 if(!alive().some(p=>cheb(p,B)<=1)){
  const ps=alive();const m=Math.min(...ps.map(p=>cheb(p,B)));const t=pick(ps.filter(p=>cheb(p,B)===m));
  const spots=[];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const x=t.x+dx,y=t.y+dy;if((dx||dy)&&inMap(x,y)&&!occ(x,y))spots.push({x,y})}
  if(spots.length){spots.sort((a,b)=>cheb(a,B)-cheb(b,B));B.x=spots[0].x;B.y=spots[0].y}
  pendBind=t;log(`대상 선언! 보스가 ${t.name} 옆으로 이동하고 [속박]`,'dm');
 }
 if(G.round===5&&swords().length){log('별의 무덤 — 모든 검 회수, [체공]이 이제 액션 턴을 막음','dm');for(const s of swords()){breakSword(s,'회수');if(G.over)break}G.cheAction=true}
 for(const u of [...G.P,B]){
  const pend=u.st.filter(s=>s.k.endsWith('Pend'));u.st=u.st.filter(s=>!s.k.endsWith('Pend'));
  u.st.forEach(s=>s.r--);u.st=u.st.filter(s=>s.r>0);
  pend.forEach(s=>u.st.push(s.k==='rhapPend'?{k:'dealUp',r:1,song:1}:{k:'epic',r:1}));
 }
 if(pendBind)pendBind.st.push({k:'속박',r:1});
 render();await sleep(400);
}
async function main(){
 log('배치 단계 — 캐릭터를 고르고 맵의 빈 칸을 눌러 시작 위치를 정하세요.','rd');
 G.phase='DEPLOY';G.sel=0;render();await waitBtn();
 log('전투 시작 — 검 8자루가 남아 있는 한 보스는 쓰러지지 않습니다.','rd');
 while(!G.over){
  await roundStart();if(G.over)break;
  G.phase='SET';G.pick=null;render();await waitBtn();if(G.over)break;
  await actionPhase();if(G.over)break;
  await bossPhase();if(G.over)break;
  await roundEnd();
 }
 G.phase='END';G.pick=null;render();
}

// ── 렌더
const tierDots=n=>'◆'.repeat(n)+'◇'.repeat(3-n);
function render(){
 if(G.phase==='DEPLOY'){const u=G.P[G.sel];const c=[];for(let x=0;x<W;x++)for(let y=0;y<H;y++)if(!occ(x,y))c.push({x,y});G.pick={c,cb:t=>{u.x=t.x;u.y=t.y;G.sel=(G.sel+1)%G.P.length;render()}}}
 const ph={DEPLOY:'배치',START:'라운드 시작',SET:'세팅 턴',ACT:G.extra?'추가 입력':'액션 턴',BOSS:'보스 공격',END:'종료'};
 $('#chips').innerHTML=`<span class="chip on">라운드 ${G.round}</span><span class="chip on">${ph[G.phase]||''}</span>${G.inverted?'<span class="chip warn">역수검</span>':''}${G.even?'<span class="chip warn">양손잡기</span>':''}${G.cheAction?'<span class="chip warn">별의 무덤 이후</span>':''}`;
 const sw=swords().length;
 $('#boss').innerHTML=`<div><h2 style="font-size:20px">【${B.name}】</h2>
  <div class="row"><span>HP ${Math.max(0,B.hp)} / 최대 ${B.mx}${sw?' · 불사':''}</span><span>공격 ${bossAtk()} · 방어 ${bossDef()}</span></div>
  <div class="bar big"><i style="width:${Math.max(0,B.hp)/80*100}%;background:var(--boss)"></i></div>
  <div class="row"><span>검 ${sw}/8</span><span>스톡 ${B.stock} (파괴 ${B.broken}, 5개마다 기술 취소)</span></div>
  <div class="pips">${Array.from({length:10},(_,i)=>`<i class="${i<B.stock?'':'x'}"></i>`).join('')}</div></div>
  <div class="atks">${G.atks.map(a=>`<div class="atk ${a.cancel?'cancel':''}" style="--c:${a.slot==='A'?'var(--boss)':'var(--a2)'}"><b>${a.slot}. ${a.a.n}</b> <span style="color:var(--mute)">위험도 ${a.a.dg}</span><br>1D6+${a.a.tier-1}+공격 · ${a.a.c==='boss'?'근거리 · 보스 기준':'원거리 · 대상 기준'} → ${a.t.name}${a.inv?' · <b>역수검 반전 · 맞으면 [체공]</b>':''}</div>`).join('')||'<div class="hint">예고 없음</div>'}</div>`;
 const pk=G.pick?new Map(G.pick.c.map(t=>[K(t.x,t.y),t])):null;
 let h='';
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const k=K(x,y);const cls=['t'];if((x+y)%2)cls.push('alt');
  G.atks.forEach(a=>{if(!a.cancel&&a.tiles.has(k))cls.push('d'+a.slot)});
  if(pk&&pk.has(k))cls.push('pick');
  let tok='';
  if(B.x===x&&B.y===y)tok=`<div class="tok bs" id="bossTok">${bossSvg}</div>`;
  const s=G.S.find(s=>!s.dead&&s.x===x&&s.y===y);if(s)tok=`<div class="tok sw">${swordSvg}<span>${s.hp}</span></div>`;
  const p=G.P.find(p=>p.x===x&&p.y===y&&(p.hp>0||!occ(x,y)));
  if(p)tok=`<div class="tok pl ${G.sel===p.id&&G.phase!=='END'?'sel':''} ${p.hp<=0?'dead':''}" id="u${p.id}" style="background:${p.img?`center/cover url('${p.img}')`:p.col};${p.img?`box-shadow:0 0 0 3px ${p.col}`:''}">${p.img?'':p.job.n[0]}<div class="mb"><i style="width:${Math.max(0,p.hp)/p.mx*100}%"></i></div>${has(p,'체공')?'<span class="stt">체공</span>':has(p,'속박')?'<span class="stt">속박</span>':''}</div>`;
  h+=`<div class="${cls.join(' ')}" data-x="${x}" data-y="${y}">${tok}</div>`;
 }
 $('#map').innerHTML=h;
 $('#party').innerHTML=G.P.map(p=>{const pl=planned(p);return`<div class="pc ${G.sel===p.id?'sel':''} ${p.hp<=0?'dead':''}" data-p="${p.id}">
  <div class="nm">${p.img?`<img class="pav" src="${p.img}" alt="" style="border-color:${p.col}">`:`<span class="dot" style="background:${p.col}"></span>`}<b>${p.name}</b><span style="color:var(--mute)">공${stat(p,'atk')} 방${stat(p,'def')} 회${stat(p,'eva')} 소${stat(p,'com')}</span></div>
  <div class="row"><span>HP ${Math.max(0,p.hp)}/${p.mx}</span><span>SP ${p.sp}/${spMax(p)}${pl.sp?` (예약 ${pl.sp})`:''}</span></div>
  <div class="bar"><i style="width:${Math.max(0,p.hp)/p.mx*100}%;background:var(--hp)"></i></div>
  <div class="row"><span>스톡 ${p.stock}${pl.dice?` (예약 ${pl.dice})`:''}</span><span>세팅 ${p.setUsed}/2</span></div>
  <div class="pips">${Array.from({length:Math.max(5,p.stock)},(_,i)=>`<i class="${i<p.stock?'':'x'}"></i>`).join('')}</div>
  <div>${[...new Set(p.st.map(s=>`<span class="tag ${['체공','속박'].includes(s.k)?'bad':''}">${({shield:'보호막 '+shieldOf(p),evaUp:'회피+1',dealUp:'주는 피해+1',epic:'스탯+3',rhapPend:'랩소디(다음 라운드)',epicPend:'서사시(다음 라운드)'})[s.k]||s.k}</span>`))].join('')}</div></div>`}).join('');
 renderCtrl();
 $('#map').onclick=e=>{const t=e.target.closest('.t');if(!t||!G.pick)return;const o=G.pick.c.find(c=>c.x===+t.dataset.x&&c.y===+t.dataset.y);if(o){const cb=G.pick.cb;G.pick=null;cb(o)}};
 $('#party').querySelectorAll('[data-p]').forEach(d=>d.onclick=()=>{G.sel=+d.dataset.p;G.pick=null;render()});
}
function skillBtn(u,k,ok){const s=SK[k];return`<button class="skb ${G.pend&&G.pend.k===k&&G.pend.u===u?'pend':''}" data-k="${k}" ${ok?'':'disabled'}><b>${s.n}${s.forb?' ★':''}</b><small>${s.d}<br>SP ${s.sp}${s.dice?` · 스톡 ${s.dice}`:''}${s.range?` · ${s.range}칸`:''}${s.type==='act'?` · 기본 속도 ${s.spd||3}`:''}</small></button>`}
function icpBlock(u,mode){
 const list=u.sk.filter(k=>SK[k].type==='icp');
 const pl=planned(u);
 const used=k=>mode==='SET'?u.icpUsed.has(k):G.queue.some(q=>q.u===u&&q.k===k);
 return `<div style="margin-top:10px;padding:8px 10px;border:1px dashed var(--ic);border-radius:10px">
  <div class="hint" style="margin:0 0 6px"><b style="color:var(--ic)">인터셉트</b> — ${mode==='SET'?'세팅 턴 시작 창 · 누르면 즉시 발동 (세팅 2개 제한에 포함 안 됨)':'액션 턴 시작 창 · 입력한 인터셉트는 액션 기술보다 먼저, 속도 5→1 순으로 발동'}</div>
  <div class="acts">${list.map(k=>{const s=SK[k];const ok=u.hp>0&&s.start&&!used(k)&&u.sp-(mode==='ACT'?pl.sp:0)>=s.sp&&(mode==='SET'||canAct(u));
   return `<button class="skb ${ok?'icb':''} ${G.pend&&G.pend.k===k&&G.pend.u===u?'pend':''}" data-icp="${k}" ${ok?'':'disabled'}><b>${s.n}${s.forb?' ★':''}${used(k)?' (사용함)':''}</b><small>${s.d}${s.sp?`<br>SP ${s.sp}`:''}${s.onHit?'<br>· 공격받을 때 창에서만 사용':''}${mode==='ACT'&&!s.onHit?` · 기본 속도 ${s.spd||5}`:''}</small></button>`}).join('')}</div></div>`;
}
function renderCtrl(){
 const c=$('#ctrl'),u=G.P[G.sel];
 if(G.phase==='END'){c.innerHTML=`<div class="end"><div class="disp" style="color:${G.over==='win'?'var(--ic)':'var(--boss)'}">${G.over==='win'?'레이드 성공':'전멸'}</div><div class="hint">${G.round}라운드</div><button class="go" id="again" style="margin-top:10px">다시 하기</button></div>`;$('#again').onclick=init;try{parent.postMessage({type:'raid-end',result:G.over,round:G.round},'*')}catch(e){}return}
 const tabs=`<div class="tabs">${G.P.map(p=>`<button data-sel="${p.id}" class="${G.sel===p.id?'sel':''}" ${p.hp<=0?'disabled':''}>${p.name}</button>`).join('')}</div>`;
 const bindTabs=()=>c.querySelectorAll('[data-sel]').forEach(b=>b.onclick=()=>{G.sel=+b.dataset.sel;G.pick=null;render()});
 if(G.phase==='DEPLOY'){
  c.innerHTML=`<h2>시작 위치 배치</h2>${tabs}<div class="hint">${u.name}을(를) 놓을 칸을 맵에서 누르세요(청록 칸). 놓으면 다음 캐릭터로 넘어가요. 보스 1칸 안이나 검 옆도 고를 수 있지만, 라운드 시작에 지각파쇄·낙성검 피해를 받아요.</div><div class="acts" style="margin-top:10px"><button class="go" id="done">배치 완료 → 전투 시작</button></div>`;
  bindTabs();$('#done').onclick=()=>{G.pick=null;G.res()};return;
 }
 if(G.phase==='SET'){
  const ok=canSet(u);
  const list=u.sk.filter(k=>SK[k].type==='set');
  c.innerHTML=`<h2>세팅 턴 — 기술 최대 2개 (이동 포함)</h2>${tabs}
   <div class="hint">${u.name}: ${!ok?(u.hp<=0?'쓰러짐':has(u,'체공')?'[체공] — 세팅 불가':'세팅 2개 사용 완료'):`세팅 ${u.setUsed}/2 · 즉시 적용됩니다`}${has(u,'속박')?' · [속박] 이동 불가':''}</div>
   <div class="acts" style="margin-top:6px">${list.map(k=>{const s=SK[k];const cd=candidates(u,s);return skillBtn(u,k,ok&&u.sp>=s.sp&&u.stock>=(s.dice||0)&&(!cd||cd.length))}).join('')}</div>
   ${G.pick?'<div class="hint"><b>맵에서 대상(청록 칸)을 고르세요.</b> <button id="cx">취소</button></div>':''}
   ${icpBlock(u,'SET')}
   <div class="acts" style="margin-top:10px"><button class="go" id="done">세팅 종료 → 액션 턴</button></div>`;
  bindTabs();
  c.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const k=b.dataset.k,s=SK[k];const cd=candidates(u,s);
   if(cd){G.pick={c:cd,cb:t=>{useSetting(u,k,t);render()}};render()}else{useSetting(u,k,null);render()}});
  c.querySelectorAll('[data-icp]').forEach(b=>b.onclick=()=>{const k=b.dataset.icp,s=SK[k];u.sp-=s.sp;u.icpUsed.add(k);log(`⚡ ${u.name} 인터셉트: ${s.n}`,'ic');s.fx&&s.fx(u);render()});
  if($('#cx'))$('#cx').onclick=()=>{G.pick=null;render()};
  $('#done').onclick=()=>{G.pick=null;G.res()};
  return;
 }
 if(G.phase==='ACT'){
  const ok=canAct(u);if(G.pend&&G.pend.u!==u){G.pend=null;G.pick=null}
  const pl=planned(u);
  const list=u.sk.filter(k=>SK[k].type==='act');
  c.innerHTML=`<h2>${G.extra?'추가 입력 (자원이 늘어난 캐릭터만)':'액션 턴 — 쓸 기술을 전부 입력'}</h2>${tabs}
   <div class="hint">${u.name}: ${ok?`SP ${u.sp-pl.sp}, 스톡 ${u.stock-pl.dice} 남음 (입력 기준). 보스 공격 대비로 남겨 둘 수도 있어요.`:u.hp<=0?'쓰러짐':G.allowed?'이번 추가 입력 대상 아님':'[체공] — 액션 불가'}</div>
   <div class="hint">기술을 누르면 기본 속도가 선택돼요. 속도를 바꾼 뒤 대상을 고르거나 [입력]을 누르세요.</div>
   <div class="acts" style="margin-top:6px">${list.map(k=>{const s=SK[k];const cd=candidates(u,s);return skillBtn(u,k,ok&&u.sp-pl.sp>=s.sp&&u.stock-pl.dice>=(s.dice||0)&&(!cd||cd.length))}).join('')}</div>
   ${G.extra?'':icpBlock(u,'ACT')}
   ${G.pend?`<div class="spdrow"><b>${SK[G.pend.k].n}</b> 속도 ${[5,4,3,2,1].map(n=>`<button data-spd="${n}" class="${G.spd===n?'sel':''}">${n}</button>`).join('')}
     ${G.pick?'<span>→ 맵에서 대상(청록 칸)을 고르세요</span>':'<button class="icb" id="padd">입력</button>'} <button id="cx">취소</button></div>`:''}
   <div class="q">${G.queue.map((q,i)=>({q,i})).sort((a,b)=>(!!b.q.icp-!!a.q.icp)||b.q.spd-a.q.spd).map(({q,i})=>`<div><span>${q.icp?'⚡ 인터셉트 · ':''}속도 ${q.spd} · ${q.u.name} · ${SK[q.k].n}${q.t?` → ${q.t===B?'보스':q.t.sw?'검':q.t.name}`:''}</span><span><select data-qs="${i}">${[5,4,3,2,1].map(n=>`<option ${q.spd===n?'selected':''}>${n}</option>`).join('')}</select> <button data-rm="${i}">×</button></span></div>`).join('')}</div>
   <div class="acts" style="margin-top:10px"><button class="go" id="done">입력 완료 → 속도 순 적용</button></div>`;
  bindTabs();
  c.querySelectorAll('[data-spd]').forEach(b=>b.onclick=()=>{G.spd=+b.dataset.spd;render()});
  const add=t=>{const p=G.pend;G.queue.push({u,k:p.k,t,spd:G.spd,icp:p.icp});G.pend=null;G.pick=null;render()};
  c.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const k=b.dataset.k,s=SK[k];const cd=candidates(u,s);G.pend={u,k};G.spd=s.spd||3;G.pick=cd?{c:cd,cb:add}:null;render()});
  c.querySelectorAll('[data-icp]').forEach(b=>b.onclick=()=>{const k=b.dataset.icp;G.pend={u,k,icp:1};G.spd=SK[k].spd||5;G.pick=null;render()});
  if($('#padd'))$('#padd').onclick=()=>add(null);
  c.querySelectorAll('[data-qs]').forEach(e=>e.onchange=()=>{G.queue[+e.dataset.qs].spd=+e.value;render()});
  c.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{G.queue.splice(+b.dataset.rm,1);render()});
  if($('#cx'))$('#cx').onclick=()=>{G.pick=null;G.pend=null;render()};
  $('#done').onclick=()=>{G.pick=null;G.pend=null;G.res()};
  return;
 }
 c.innerHTML=`<div class="hint">${G.phase==='BOSS'?'보스 공격 처리 중… 공격받는 캐릭터의 인터셉트 창이 뜹니다.':'진행 중…'}</div>`;
}
init();
}
