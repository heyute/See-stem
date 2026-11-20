// 탐사 엔진 (서버로 그대로 옮길 수 있게 DOM에 의존하지 않음)
// EXP.stepFight(state, ch, online) 한 번 = 전투 1회 (게임 시간 FIGHT_MS)
const EXP=(()=>{
const FIGHT_MS=30*1000, FIGHTS_PER_FLOOR=5, MIN_DEPTH=0, MAX_DEPTH=5, OFFLINE_CAP_MS=8*3600*1000, LOG_MAX=80;
// 시드 고정 난수 (같은 시드면 같은 결과 → 서버 재계산·검증 가능)
function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
const d6=r=>1+Math.floor(r()*6);
const ro=n=>[3,6,0].includes(n%10)?'으로':'로';
// 기본 적: 심도에 따라 수치만 오름
const TUNE={hp:[6,3],atk:2,def:2,regen:3};
function enemy(depth,o={}){const a=depth-5;const b=depth>=ABYSS?{name:`${dname(depth)}의 잔재`,hp:21+3*a,atk:2+Math.floor(a/4),def:2+Math.floor(a/6)}:{name:`심도 ${depth}의 잔해`,hp:TUNE.hp[0]+TUNE.hp[1]*depth,atk:Math.floor(depth/TUNE.atk),def:Math.max(0,Math.floor((depth-1)/TUNE.def))};
 if(o.guardian){b.name=`${dname(depth)}의 수호자 · ${guardName(depth)}`;b.hp=Math.round(b.hp*GUARD.hp);b.atk+=GUARD.atk;b.guardian=1}
 if(o.risky){b.name='(위험한 길) '+b.name;b.hp=Math.round(b.hp*1.3);b.atk+=1}
 if(o.env&&o.env.ehp)b.hp=Math.round(b.hp*o.env.ehp);if(o.env&&o.env.eatk)b.atk+=o.env.eatk;return b}
// ── 오늘의 심도 환경 (한국 시간 날짜 기준, 날마다 심도 1~5에 하나씩. 심도 0은 늘 고요)
const ENVS=[
 {k:'calm',n:'고요',d:'특별한 일이 없어요.'},
 {k:'fog',n:'짙은 안개',d:'회피 +1 · 아이템 확률 +5%p',eva:1,item:0.05},
 {k:'swamp',n:'독 늪',d:'승리 회복 없음 · 골드 +25%',noRegen:1,gold:1.25},
 {k:'rock',n:'단단한 지반',d:'받는 피해 −1 · 적 HP +25%',red:1,ehp:1.25},
 {k:'rage',n:'들끓는 적의',d:'적 공격 +1 · 경험치 +30%',eatk:1,exp:1.3},
 {k:'bounty',n:'풍요',d:'아이템 확률 +10%p',item:0.1},
 {k:'echo',n:'메아리',d:'층 이벤트 확률 2배',ev:2}];
const kstDay=t=>Math.floor((t+9*3600*1000)/86400000);
const dayStr=day=>new Date(day*86400000).toISOString().slice(0,10);
function hash(n){n=(n^61)^(n>>>16);n=n+(n<<3);n=n^(n>>>4);n=Math.imul(n,0x27d4eb2d);n=n^(n>>>15);return n>>>0}
function envOf(t,d){if(!d)return ENVS[0];return ENVS[hash(kstDay(t)*131+d*17)%ENVS.length]}
// ── 심도 수호자: 각 층의 마지막(5번째) 전투
const GUARD={hp:1.5,atk:0};
// ── 심연: 심도 5 수호자를 쓰러뜨리면 열리는 끝없는 층 (내부 심도 6 = 심연 1층)
const ABYSS=6,ABYSS_END=9999;
const isAbyss=d=>d>=ABYSS;
const dname=d=>d>=ABYSS?`심연 ${d-5}층`:`심도 ${d}`;
const ABYSS_GUARDS=['심연의 감시자','가라앉은 왕관','잊힌 별자리','검은 메아리','끝없는 아가리','침묵하는 종','거꾸로 선 탑','이름 없는 파수꾼'];
const guardName=d=>d>=ABYSS?ABYSS_GUARDS[(d-ABYSS)%ABYSS_GUARDS.length]+(d-ABYSS>=ABYSS_GUARDS.length?` ${Math.floor((d-ABYSS)/ABYSS_GUARDS.length)+1}세`:''):GUARD_NAMES[d];
const CRYSTAL={name:'심연 결정',kind:'재료',desc:'심연에서만 나오는 검은 결정. 탐사 장비를 강화하는 재료.'};
const GUARD_NAMES=['떠도는 그림자','굶주린 뿌리','뒤엉킨 덩쿨','파편 골렘','심연의 눈','추락한 별의 잔향'];
// 레벨: 자동 전투 승리로 경험치. 최고 레벨 없음(필요 경험치가 Lv^1.5로 늘어 9999는 사실상 불가능).
// 레벨은 탐사 전투에서만 '숙련'으로 작용: 받는 피해 감소. 아이템·재화·레이드에는 영향 없음.
const expNeed=lv=>Math.round(50*Math.pow(lv,1.5));                       // lv → lv+1에 필요한 경험치
const expGain=depth=>depth>=ABYSS?35+3*(depth-5):10+5*depth;                   // 승리 1회
function mastery(lv){return Math.round(Math.log2(Math.max(1,lv))*40)/100} // Lv2 0.4 · Lv10 1.33 · Lv100 2.66 · Lv1000 3.99 · Lv9999 5.32
function newProg(){return{lv:1,exp:0,cleared:-1}}
function addExp(pr,n){pr.exp+=n;let up=0;while(pr.exp>=expNeed(pr.lv)){pr.exp-=expNeed(pr.lv);pr.lv++;up++}return up}
// 실제로 받는 심도 패널티 (종족 효과 반영, 최소 0)
function depthPenalty(ch,depth){let p=depth>=ABYSS?5+Math.floor((depth-5)/4):depth;const s=ch.skills||[];
 if(s.includes('LOG-01'))p-=1;            // 근원의 축복
 if(s.includes('AET-02'))p+=1;            // 이계와 이어진 자
 return Math.max(0,p)}
// 자동 전투가 쓸 수 있는 공격·회복 기술을 DB에서 해석
function kit(ch,DB){
 const out=[];
 for(const id of ch.skills||[]){const s=DB[id];if(!s||!/액션/.test(s.turn))continue;const e=s.effect||'',n=parseInt(s.dice)||0;
  if(id==='COM-05')out.push({id,name:s.name,sp:s.sp,dice:1,dmg:v=>Math.max(1,v-2),fixed:false});
  else if(id==='WAR-F3')out.push({id,name:s.name,sp:s.sp,dice:2,dmg:()=>10,fixed:false});
  else if(id==='CLE-09')out.push({id,name:s.name,sp:s.sp,dice:1,dmg:v=>Math.max(0,v-1),fixed:false});
  else if(id==='CLE-08')out.push({id,name:s.name,sp:s.sp,dice:1,dmg:v=>v,fixed:false,drain:true});
  else if(id==='AET-06')out.push({id,name:s.name,sp:0,dice:0,dmg:()=>6,fixed:true,once:true});
  else if(id==='GUA-F3')out.push({id,name:s.name,sp:s.sp,dice:'all',dmg:v=>v*3,fixed:true,count:true});
  else if(id==='CLE-06')out.push({id,name:s.name,sp:s.sp,dice:1,heal:true});
  else if(id==='ADV-08')out.push({id,name:s.name,sp:s.sp,dice:0,heal:'half'});
  else if(n>0&&/피해/.test(e)&&/적/.test(s.target)&&!/파괴된다/.test(e)&&!/유물】/.test(e))
   out.push({id,name:s.name,sp:s.sp,dice:n,dmg:v=>v,fixed:/고정 피해/.test(e)&&!/추가 공격은 고정/.test(e)});
 }
 return out}
// 보조 기술(스톡 추가·디버프·회피·주는 피해 증가)을 자동 전투용으로 해석
function utilKit(ch,DB){const out=[];
 for(const id of ch.skills||[]){const s=DB[id];if(!s||!/액션|세팅/.test(s.turn)||s.status==='보류')continue;const e=s.effect||'';const u={id,name:s.name,sp:s.sp||0,dice:0};let ok=0;
  let m=e.match(/스톡을 (\d)개 추가/);if(m&&!/대상의 스톡/.test(e.slice(0,4))){u.stock=+m[1];ok=1}
  m=e.match(/\[방어력 감소 (\d)\]/);if(m&&/적/.test(s.target)){u.edef=+m[1];ok=1}
  m=e.match(/\[공격력 감소 (\d)\]/);if(m&&/적/.test(s.target)){u.eatk=+m[1];ok=1}
  m=e.match(/회피(?:가)? \+?(\d)/);if(m&&!/적/.test(s.target)){u.eva=+m[1];ok=1}
  m=e.match(/주는 피해가 (\d) 증가/);if(m&&!/적/.test(s.target)){u.dmgUp=+m[1];ok=1}
  if(ok&&!/피해를 준다|피해를 입/.test(e))out.push(u)}
 return out}
// 전투 1회. 반환: {win, rounds, lines[]}
function fight(st,ch,DB,r,lv=1,o={}){
 const env=o.env||ENVS[0],tac=o.tac||{},E=enemy(st.floor,{guardian:o.guardian,risky:o.risky,env}),pen=depthPenalty(ch,st.floor),S=ch.stats,M=mastery(lv),GB=ch.gearBonus||{dmg:0,red:0,regen:0};
 const stance=tac.stance||'balanced',reserve=stance==='aggressive'?0:stance==='careful'?2:1,healAt=stance==='careful'?0.7:0.5;
 const pri=tac.priority||[],pidx=id=>{const i=pri.indexOf(id);return i<0?99:i};
 const K=kit(ch,DB),U=utilKit(ch,DB).filter(u=>pri.length?pri.includes(u.id):(u.stock||u.edef||u.eatk));
 const comp=o.comp&&o.comp.hp>0?o.comp:null,CK=comp?kit(comp,DB):[];
 const red=()=>Math.floor(M)+(r()<M-Math.floor(M)?1:0);
 let eh=E.hp,round=0,used={},lines=[];
 function attack(actor,KK,res,mods,tag){const out=[];const S2=actor.stats;
  const atks=KK.filter(k=>k.dmg).sort((a,b)=>(pidx(a.id)-pidx(b.id))||(score(b)-score(a)));
  function score(k){const n=k.dice==='all'?4:k.dice;const base=k.id==='WAR-F3'?10:3.5*n+(k.fixed?0:S2.atk-E.def);return base/Math.max(1,k.sp)+(k.sp===0?5:0)}
  for(let g=0;g<12&&eh>0;g++){
   const k=atks.find(k=>!(k.once&&used[tag+k.id])&&res.sp>=k.sp&&(k.dice==='all'?res.stock-res.reserve>=1:res.stock-(k.dice||0)>=res.reserve));
   if(!k)break;res.sp-=k.sp;const n=k.dice==='all'?res.stock-res.reserve:k.dice;res.stock-=n;if(k.once)used[tag+k.id]=1;
   let v=0;for(let i=0;i<n;i++)v+=d6(r);let dmg=k.count?k.dmg(n):k.dmg(v);
   if(!k.fixed)dmg=Math.max(0,dmg+S2.atk+(mods.dmg||0)-Math.max(0,E.def-(mods.edef||0)));
   eh-=dmg;out.push(`${k.name} ${dmg}`);if(k.drain&&dmg>0&&actor===ch)st.hp=Math.min(ch.hp,st.hp+dmg)}
  return out}
 function defend(S2,atkv,mods,res){let taken,txt;const eva=S2.eva+(mods.eva||0);
  if(res.stock>=1&&eva>S2.def){const ev=d6(r)+eva;taken=ev>atkv?0:atkv+pen;txt=`회피 ${ev}${ev>atkv?' 성공':' 실패'}`}
  else if(res.stock>=1){const dv=d6(r)+S2.def;taken=Math.max(0,atkv-dv)+pen;txt=`방어 ${dv}`}
  else{taken=atkv+pen;txt='무방비'}return[taken,txt]}
 while(eh>0&&st.hp>0&&round<20){round++;
  const res={sp:ch.sp_max,stock:5,reserve},mods={dmg:fr(GB.dmg,r),edef:0,eatk:0,eva:env.eva||0};const dealt=[];
  for(const k of K.filter(k=>k.heal)){if(st.hp>ch.hp*healAt)break;if(res.sp<k.sp||(k.dice&&res.stock-k.dice<reserve))continue;
   res.sp-=k.sp;res.stock-=k.dice||0;const before=st.hp;st.hp=Math.min(ch.hp,st.hp+(k.heal==='half'?Math.ceil((ch.hp-st.hp)/2)+1:d6(r)));dealt.push(`${k.name}(+${st.hp-before})`)}
  for(const u of U.slice().sort((a,b)=>pidx(a.id)-pidx(b.id))){if(res.sp<u.sp)continue;res.sp-=u.sp;
   if(u.stock)res.stock+=u.stock;if(u.edef)mods.edef+=u.edef;if(u.eatk)mods.eatk+=u.eatk;if(u.eva)mods.eva+=u.eva;if(u.dmgUp)mods.dmg+=u.dmgUp;dealt.push(u.name)}
  dealt.push(...attack(ch,K,res,mods,'p'));
  let cres=null;
  if(comp&&comp.hp>0&&eh>0){cres={sp:comp.sp_max,stock:5,reserve:1};const cd=attack(comp,CK,cres,{edef:mods.edef},'c');if(cd.length)dealt.push(`${comp.name}: ${cd.join(', ')}`)}
  let line=`R${round} ${dealt.join(', ')||'공격 못 함'}`;
  if(eh<=0){lines.push(line+` → 처치`);break}
  const atkv=Math.max(0,d6(r)+E.atk-mods.eatk);
  if(comp&&comp.hp>0&&r()<0.5){const [tk0,tx]=defend(comp.stats,atkv,{},cres||{stock:1});const tk=Math.max(0,tk0-(env.red||0));comp.hp-=tk;
   line+=` / 적 ${atkv} → ${comp.name} ${tx} → ${tk} 피해 (동료 HP ${Math.max(0,comp.hp)})${comp.hp<=0?' · 동료 쓰러짐(이 층 동안 쉬어요)':''}`;lines.push(line);continue}
  let [taken,tx]=defend(S,atkv,mods,res);line+=` / 적 ${atkv} ${tx}`;
  if(taken>0&&M>0){const k=Math.min(taken,red());if(k){taken-=k;line+=` 숙련 −${k}`}}
  if(taken>0&&GB.red){const k=Math.min(taken,fr(GB.red,r));if(k){taken-=k;line+=` 갑주 −${k}`}}
  if(taken>0&&env.red){const k=Math.min(taken,env.red);taken-=k;line+=` 지반 −${k}`}
  st.hp-=taken;line+=` → ${taken} 피해 (HP ${Math.max(0,st.hp)})`;lines.push(line);
 }
 return{win:eh<=0,rounds:round,lines,enemy:E,pen}}
// 보상 (뿌리 없는 존재: 아이템 +1)
function loot(st,ch,r,o={}){const d=st.floor,env=o.env||ENVS[0],mul=(o.risky?2:1),gd=Math.min(d,5),gm=d>=ABYSS?1+0.3*Math.log(1+(d-5)):1,out={money:Math.round((3+5*gd+Math.floor(r()*(5*gd+3)))*gm*(env.gold||1))*mul,items:[]};
 for(let k=0;k<mul;k++)if(r()<0.25+0.05*d+(env.item||0)){const n=1+((ch.skills||[]).includes('AET-01')?1:0);for(let i=0;i<n;i++)out.items.push(pick(d,r))}
 if(o.guardian){if(d>=ABYSS){for(let i=0;i<2+Math.floor((d-5)/10);i++)out.items.push({...CRYSTAL,depth:d})}else['파편','덩쿨','나무'].forEach(m=>{for(let i=0;i<2;i++)out.items.push({name:matName(m,d),kind:'재료',desc:MATS[m],mat:m,depth:d})})}
 if(r()<[0,0.003,0.01,0.02,0.035,0.06][Math.min(d,5)]*(o.guardian?(d>=4?3:2):1)*mul)out.items.push({name:SCROLL_NAME,kind:'주문서',desc:'어떤 보스든 레이드 방을 열 수 있어요.'});
 if(r()<LUCKY_RATE)out.items.push({...LUCKY});
 return out}
// ── 탐사 아이템
const SCROLL_NAME='보스 소환 주문서';
// 행운의 별 습득권: 심도·환경·성향·수호자와 무관하게 전투 1번당 1/20000 (30초 전투 기준, 쉬지 않고 돌려도 평균 약 7일에 1장)
const LUCKY_RATE=1/20000,LUCKY={name:'행운의 별 습득권',kind:'사용',desc:'사용하면 타이틀 「행운의 별」을 얻어요. 탐사 중 아주 드물게 나오는 아이템이에요. 창고에서 [사용].',lucky:true};
const MATS={파편:'심도의 벽에서 떨어져 나온 조각. 무기의 재료.',덩쿨:'심도를 타고 자라는 질긴 줄기. 장신구의 재료.',나무:'빛 없이 자란 단단한 나무. 방어구의 재료.'};
const matName=(m,d)=>`심도 ${d} ${m}`;
const KIT={name:'응급 키트',kind:'소모품',desc:'세팅 · 자신 · HP 3 회복 (최대 HP를 넘지 않음). 레이드에 들고 가서 써요.'};
function pick(d,r){const x=r();if(x<0.1)return{...KIT};if(d>=ABYSS){if(x<0.55)return{...CRYSTAL,depth:d};d=5}const m=['파편','덩쿨','나무'][Math.min(2,Math.floor((x-0.1)/0.3))];return{name:matName(m,d),kind:'재료',desc:MATS[m],mat:m,depth:d}}
// ── 제작: 같은 심도의 파편·덩쿨·나무를 섞어 탐사 장비를 만든다
const GEAR={
 weapon:{slot:'무기',name:d=>`심도 ${d} 파편검`,main:'파편',need:{파편:4,나무:2,덩쿨:1},val:d=>Math.round((0.3+0.2*d)*10)/10,fx:v=>`탐사 전투에서 주는 피해 +${v}`},
 armor:{slot:'방어구',name:d=>`심도 ${d} 나무 갑주`,main:'나무',need:{나무:4,덩쿨:2,파편:1},val:d=>Math.round((0.3+0.2*d)*10)/10,fx:v=>`탐사 전투에서 받는 피해 −${v}`},
 charm:{slot:'장신구',name:d=>`심도 ${d} 덩쿨 팔찌`,main:'덩쿨',need:{덩쿨:4,파편:2,나무:1},val:d=>1+Math.floor(d/2),fx:v=>`탐사 전투에서 이길 때마다 HP +${v} 추가 회복`}};
// ── 장비 등급과 제작 숙련도: 제작할수록 숙련도가 오르고, 높은 등급이 나올 확률이 열린다
const GRADES=[{k:'일반',m:1},{k:'고급',m:1.25},{k:'희귀',m:1.5},{k:'영웅',m:1.75},{k:'전설',m:2}];
const craftNeed=lv=>5+5*lv;                 // 다음 숙련도까지 필요한 제작 경험치
const craftXp=d=>1+d;                       // 제작 1번 = 1 + 심도
// 모든 등급이 Lv1부터 나올 수 있다. 숙련도가 오를수록 높은 등급의 가중치가 지수적으로 커지고 Lv30에서 상한.
const GW=[[100,100],[10,40],[1.5,25],[0.25,12],[0.01,6]]; // [Lv1 가중치, Lv30 상한]
function craftOdds(lv){const L=Math.min(30,Math.max(1,lv));const w=GW.map(([a,b])=>a*Math.pow(b/a,(L-1)/29));const s=w.reduce((x,y)=>x+y,0);return w.map(x=>x/s)}
function rollGrade(lv,r){const o=craftOdds(lv);let x=r(),i=0;for(;i<o.length-1;i++){if(x<o[i])break;x-=o[i]}return i}
function addCraftXp(cp,n){cp.xp+=n;cp.count=(cp.count||0)+1;let up=0;while(cp.xp>=craftNeed(cp.lv)){cp.xp-=craftNeed(cp.lv);cp.lv++;up++}return up}
function gearItem(type,d,grade=0){const g=GEAR[type],G=GRADES[grade],base=g.val(d),v=type==='charm'?Math.round(base*G.m):Math.round(base*G.m*10)/10;
 return{name:(grade?`[${G.k}] `:'')+g.name(d),kind:'장비',desc:g.fx(v)+' (탐사 전용)',gear:{type,slot:g.slot,depth:d,val:v,grade}}}
// 장비 강화: 심연 결정으로 +1씩. 효과 = 등급 효과 × (1 + 0.1 × 강화)
const enhanceCost=plus=>3+2*plus;
function enhance(it){const g=it.gear,G=GEAR[g.type],base=g.base!=null?g.base:g.val;g.base=base;g.plus=(g.plus||0)+1;
 g.val=g.type==='charm'?Math.round(base*(1+0.1*g.plus)):Math.round(base*(1+0.1*g.plus)*10)/10;
 it.name=it.name.replace(/ \+\d+$/,'')+` +${g.plus}`;it.desc=G.fx(g.val)+' (탐사 전용)';return it}
function gearBonus(list){const b={dmg:0,red:0,regen:0};(list||[]).forEach(x=>{if(!x||!x.gear)return;if(x.gear.type==='weapon')b.dmg+=x.gear.val;if(x.gear.type==='armor')b.red+=x.gear.val;if(x.gear.type==='charm')b.regen+=x.gear.val});b.dmg=Math.round(b.dmg*10)/10;b.red=Math.round(b.red*10)/10;return b}
const fr=(v,r)=>Math.floor(v)+(r()<v-Math.floor(v)?1:0);
function newDive(ch,start,target,now,opt={}){return{v:3,status:'run',floor:start,start,target,fight:0,hp:ch.hp,lastAt:now,startedAt:now,seed:(now%2147483647)||7,
 bag:{money:0,items:[]},stats:{fights:0,wins:0,downs:0,deepest:start,exp:0,lvUp:0,events:0,guards:0},log:[],locked:false,
 tac:opt.tac||{stance:'balanced',priority:[],retreat:{}},comp:opt.comp?{...opt.comp,hp:opt.comp.hp||20,mhp:opt.comp.hp||20}:null,floorDown:false,risky:false,pending:null}}
function push(st,t,msg){st.log.push({t,msg});if(st.log.length>LOG_MAX)st.log.splice(0,st.log.length-LOG_MAX)}
// ── 일일 의뢰 (한국 시간 날짜마다 3개)
const QTYPES=['mat','clean','guard','craft','win'];
function ensureDaily(pr,t){const day=kstDay(t);if(pr.daily&&pr.daily.day>=day&&pr.daily.v===2)return pr.daily; // 날짜는 앞으로만 넘어간다 (몰아서 계산할 때 어제 시간이 섞여도 오늘 의뢰 유지)
 const r=rng(hash(day*7919+(pr.uh||1))),cl=Math.min(5,pr.cleared),maxD=Math.max(0,cl),qs=[],types=QTYPES.filter(x=>cl>=0||(x!=='clean'&&x!=='guard')); // 수호자·무사 통과 의뢰는 클리어한 심도로만
 for(let i=0;i<3;i++){const ty=types.splice(Math.floor(r()*types.length),1)[0];const d=Math.max(0,maxD-Math.floor(r()*2));
  const q={id:day+'-'+i,type:ty,depth:(ty==='clean'||ty==='guard')?Math.min(d,cl):d,prog:0,done:false,claimed:false};
  if(ty==='mat'){q.mat=['파편','덩쿨','나무'][Math.floor(r()*3)];q.need=15}
  if(ty==='clean')q.need=3;if(ty==='guard')q.need=2;if(ty==='craft'){q.need=1;q.depth=null}if(ty==='win'){q.need=60;q.depth=null}
  q.gold=ty==='win'?120:ty==='craft'?80:60+40*d;q.cxp=ty==='craft'?2:3;qs.push(q)}
 pr.daily={v:2,day,date:dayStr(day),quests:qs};return pr.daily}
function track(pr,t,ev){if(!pr)return;const D=ensureDaily(pr,t);D.quests.forEach(q=>{if(q.done)return;let n=0;
 if(q.type==='mat'&&ev.type==='mat'&&ev.depth===q.depth&&ev.mat===q.mat)n=ev.n||1;
 if(q.type==='clean'&&ev.type==='clean'&&ev.depth===q.depth)n=1;
 if(q.type==='guard'&&ev.type==='guard'&&ev.depth===q.depth)n=1;
 if(q.type==='craft'&&ev.type==='craft')n=1;
 if(q.type==='win'&&ev.type==='win')n=1;
 if(n){q.prog=Math.min(q.need,q.prog+n);if(q.prog>=q.need)q.done=true}})}
function questText(q){return q.type==='mat'?`심도 ${q.depth} ${q.mat} ${q.need}개 모으기`:q.type==='clean'?`심도 ${q.depth}을(를) 쓰러지지 않고 ${q.need}바퀴`:q.type==='guard'?`심도 ${q.depth} 수호자 ${q.need}번 처치`:q.type==='craft'?`장비 ${q.need}개 제작`:`탐사 전투 ${q.need}번 승리`}
// ── 층 이벤트
const EVENTS=[['chest',30],['spring',25],['trap',20],['merchant',15],['fork',10]];
function rollEvent(r){let x=r()*100;for(const [k,w] of EVENTS){if(x<w)return k;x-=w}return 'chest'}
function doEvent(st,ch,r,t,online,pr){const d=st.floor,k=rollEvent(r);st.stats.events++;
 if(k==='chest'){if(r()<0.5){const n=1+Math.floor(r()*3);for(let i=0;i<n;i++){const it=pick(d,r);if(it.kind==='소모품'){i--;continue}st.bag.items.push({...it,got:t,depth:d});track(pr,t,{type:'mat',depth:d,mat:it.mat})}push(st,t,`이벤트 · 버려진 상자를 열었어요. 재료 ${n}개를 얻었어요.`)}
  else{const g=10+10*Math.min(d,5)+2*Math.max(0,d-5);st.bag.money+=g;push(st,t,`이벤트 · 버려진 상자를 열었어요. ${g}G를 얻었어요.`)}}
 else if(k==='spring'){const b=st.hp;st.hp=Math.min(ch.hp,st.hp+6);push(st,t,`이벤트 · 맑은 샘을 찾았어요. HP +${st.hp-b} (HP ${st.hp})`)}
 else if(k==='trap'){const dm=1+Math.min(d,8),b=st.hp;st.hp=Math.max(1,st.hp-dm);push(st,t,`이벤트 · 함정을 밟았어요. HP −${b-st.hp} (HP ${st.hp})`)}
 else if(k==='merchant'){const cost=15+5*Math.min(d,5);const p={type:'merchant',at:t,cost,title:'떠돌이 상인',text:`응급 키트를 ${cost}G에 판대요. (탐사 가방 골드 ${st.bag.money}G)`,opts:[['buy','산다'],['skip','지나친다']]};
  if(online)st.pending=p;else resolve(st,p,st.bag.money>=cost?'buy':'skip',t,true)}
 else if(k==='fork'){const p={type:'fork',at:t,title:'갈림길',text:'한쪽 길에서 강한 기척이 느껴져요. 위험한 길은 다음 적이 강하지만 보상이 2배예요.',opts:[['risky','위험한 길'],['safe','안전한 길']]};
  if(online)st.pending=p;else resolve(st,p,'safe',t,true)}}
function resolve(st,p,choice,t,auto){const tag=auto?' (자동)':'';
 if(p.type==='merchant'){if(choice==='buy'&&st.bag.money>=p.cost){st.bag.money-=p.cost;st.bag.items.push({...KIT,got:t,depth:st.floor});push(st,t,`이벤트 · 떠돌이 상인에게 응급 키트를 샀어요. −${p.cost}G${tag}`)}else push(st,t,`이벤트 · 떠돌이 상인을 지나쳤어요.${tag}`)}
 if(p.type==='fork'){st.risky=choice==='risky';push(st,t,`이벤트 · 갈림길에서 ${st.risky?'위험한':'안전한'} 길을 골랐어요.${tag}`)}
 st.pending=null}
function choose(st,choice,now){if(!st.pending)return;resolve(st,st.pending,choice,now,false);st.lastAt=Math.max(st.lastAt,now-FIGHT_MS+3000)}
// 귀환 조건
function checkRetreat(st,t,gotScroll){const R=(st.tac&&st.tac.retreat)||{};let why=null;
 if(R.hp&&st.hp<=R.hp)why=`HP가 ${R.hp} 이하`;else if(R.bag&&st.bag.items.length>=R.bag)why=`가방이 ${R.bag}개 이상`;else if(R.scroll&&gotScroll)why='주문서를 얻음';
 if(why){st.status='home';st.homeReason=why;st.homeAt=t;push(st,t,`귀환 조건(${why})을 만족해서 자동으로 귀환해요.`)}}
// 한 번의 전투 진행
function step(st,ch,DB,online,t,pr){
 if(st.status!=='run'||st.pending)return;
 const r=rng(st.seed);st.seed=Math.floor(r()*2147483646)+1;
 const env=st.noEnv?ENVS[0]:envOf(t,st.floor),guardian=st.fight===FIGHTS_PER_FLOOR-1,risky=st.risky;st.risky=false;
 const res=fight(st,ch,DB,r,pr?pr.lv:1,{env,guardian,risky,tac:st.tac,comp:st.comp});st.stats.fights++;
 if(res.win){st.stats.wins++;const L=loot(st,ch,r,{env,guardian,risky});const g=Math.round(expGain(st.floor)*(env.exp||1)),up=addExp(pr,g);st.stats.exp+=g;st.stats.lvUp+=up;st.bag.money+=L.money;
  L.items.forEach(i=>{st.bag.items.push({...i,got:t,depth:st.floor});if(i.mat)track(pr,t,{type:'mat',depth:st.floor,mat:i.mat})});track(pr,t,{type:'win'});
  st.fight++;if(!env.noRegen)st.hp=Math.min(ch.hp,st.hp+TUNE.regen+((ch.gearBonus||{}).regen||0));
  push(st,t,`${dname(st.floor)} · ${st.fight}/${FIGHTS_PER_FLOOR} ${res.enemy.name} 처치 (${res.rounds}라운드, HP ${st.hp}) +${L.money}G · 경험치 +${g}${L.items.length?' · '+L.items.map(i=>i.name).join(', '):''}`);
  if(up)push(st,t,`레벨 업! Lv. ${pr.lv} · 숙련 ${mastery(pr.lv)} (받는 피해 감소)`);
  if(guardian){st.stats.guards++;track(pr,t,{type:'guard',depth:st.floor});pr.guards=pr.guards||{};if(!pr.guards[st.floor]){pr.guards[st.floor]=t;if(st.floor<ABYSS)(pr.achQ=pr.achQ||[]).push({key:'guard'+st.floor,t});push(st,t,`${dname(st.floor)}의 수호자 「${guardName(st.floor)}」 첫 처치!${st.floor===5?' 심연이 열렸어요.':''}`)}}
  const gotScroll=L.items.some(i=>i.kind==='주문서');
  if(st.fight>=FIGHTS_PER_FLOOR){st.fight=0;st.hp=ch.hp;if(st.comp)st.comp.hp=st.comp.mhp;
   if(!st.floorDown)track(pr,t,{type:'clean',depth:st.floor});st.floorDown=false;
   if(st.floor>pr.cleared){pr.cleared=st.floor;push(st,t,`${dname(st.floor)} 첫 클리어! 다음부터 ${dname(st.floor)}에서 바로 시작할 수 있어요.`);
    if(st.floor>=ABYSS){const n=st.floor-5;pr.abyssBest=Math.max(pr.abyssBest||0,n);(pr.achQ=pr.achQ||[]).push({key:'abyssBest',t,n});[10,20,30,50,100].forEach(m=>{if(n===m)(pr.achQ=pr.achQ||[]).push({key:'abyss'+m,t})})}}
   if(!st.locked&&st.floor<st.target){st.floor++;st.stats.deepest=Math.max(st.stats.deepest,st.floor);push(st,t,`${dname(st.floor)}${st.floor>=ABYSS?'으로':ro(st.floor)} 내려가요. HP 회복 · 오늘의 환경: ${envOf(t,st.floor).n}`)}
   else push(st,t,`${dname(st.floor)} 한 바퀴 완료. 같은 층을 다시 돌아요. HP 회복`)}
  else if(r()<0.12*(env.ev||1))doEvent(st,ch,r,t,online,pr);
  checkRetreat(st,t,gotScroll);
 }else{st.stats.downs++;st.floorDown=true;
  if(online&&st.autoRetry){st.fight=0;st.hp=ch.hp;if(st.comp)st.comp.hp=st.comp.mhp;st.stats.retries=(st.stats.retries||0)+1;push(st,t,`${dname(st.floor)}에서 쓰러졌어요. 자동 재시도: 이 층을 처음부터 다시 해요. HP 회복`)}
  else if(online){st.status='down';push(st,t,`${dname(st.floor)} · ${st.fight+1}번째 전투에서 쓰러졌어요. 탐사를 멈췄어요.`)}
  else{const f=st.floor;st.floor=Math.max(MIN_DEPTH,f-1);st.locked=true;st.fight=0;st.hp=ch.hp;if(st.comp)st.comp.hp=st.comp.mhp;
   push(st,t,`${dname(f)}에서 쓰러졌어요. 접속 중이 아니라 ${dname(st.floor)}${st.floor>=ABYSS?'으로':ro(st.floor)} 돌아가 반복해요.`)}
  if(st.status==='run')checkRetreat(st,t,false);
 }
 st.lastFight=res.lines;
}
// 경과 시간만큼 몰아서 계산. 선택 이벤트는 접속 중이면 전투 1회 시간만큼 기다렸다가 자동 선택
function advance(st,ch,DB,now,online,pr){
 if(!st||st.status!=='run'){if(st)st.lastAt=now;return 0}
 if(pr)ensureDaily(pr,now);
 let from=st.lastAt;if(!online&&now-from>OFFLINE_CAP_MS){push(st,now,`접속하지 않은 시간이 8시간을 넘어, 8시간까지만 계산했어요.`);from=now-OFFLINE_CAP_MS}
 let n=0;
 for(let guard=0;guard<5000;guard++){
  if(st.status!=='run')break;
  if(st.pending){const due=st.pending.at+FIGHT_MS;if(online&&now<due)break;const p=st.pending;resolve(st,p,p.type==='merchant'?(st.bag.money>=p.cost?'buy':'skip'):'safe',due,true);from=Math.max(from,due);continue}
  if(now-from<FIGHT_MS)break;from+=FIGHT_MS;step(st,ch,DB,online,from,pr);n++}
 st.lastAt=st.status==='run'?from:now;return n}
// 한 층(5전투)을 쓰러지지 않고 넘길 확률 추정
function clearRate(ch,DB,depth,lv,N=200,opt={}){let ok=0;for(let i=0;i<N;i++){const st=newDive(ch,depth,depth,0,{tac:{...(opt.tac||{}),retreat:{}},comp:opt.comp});st.seed=i*7919+depth*31+1;st.locked=true;st.noEnv=!!opt.noEnv;const pr={lv,exp:0,cleared:99};
 for(let f=0;f<FIGHTS_PER_FLOOR&&st.status==='run';f++){step(st,ch,DB,true,opt.t||0,pr);if(st.pending)st.pending=null}if(st.status==='run'&&!st.floorDown)ok++}return ok/N}
return{LUCKY,LUCKY_RATE,ABYSS,ABYSS_END,isAbyss,dname,guardName,CRYSTAL,enhanceCost,enhance,GUARD,ENVS,envOf,kstDay,dayStr,GUARD_NAMES,utilKit,ensureDaily,track,questText,choose,hash,GRADES,craftNeed,craftXp,craftOdds,rollGrade,addCraftXp,SCROLL_NAME,MATS,KIT,matName,GEAR,gearItem,gearBonus,TUNE,MIN_DEPTH,expNeed,expGain,mastery,clearRate,newProg,addExp,FIGHT_MS,FIGHTS_PER_FLOOR,MAX_DEPTH,OFFLINE_CAP_MS,enemy,depthPenalty,kit,fight,newDive,advance,step,rng}
})();
if(typeof module!=='undefined')module.exports=EXP;
