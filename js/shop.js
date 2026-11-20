// 시 스템 :: 딥 다이브 — 상점
// ── 상점 (서버가 생기면 GET /api/shop 결과로 SHOP를 채워요)
let SHOP=[],shopCat='전체',ACHV=[],achvCat='전체';
const DEMO_SHOP=Array.from({length:18},(_,i)=>({id:'demo'+i,name:`예시 상품 ${i+1}`,cat:['소모품','재료','장비','꾸미기'][i%4],price:[50,120,300,800,1500][i%5],desc:'화면 미리보기용 예시예요.'}));
function useLucky(it){const own=myTitles().some(a=>a.id==='lucky');
 if(own){toast('이미 「행운의 별」 타이틀을 가지고 있어요. 습득권은 창고에 그대로 둘게요.');return}
 const inv=store.get(KEY('inv'),[]).filter(x=>x.uid!==it.uid);store.set(KEY('inv'),inv);recordAch('lucky');
 const cur=(store.get('stem-titles',{})||{})[USER];if(!cur||!titleOf(USER))setTitle('lucky');
 toast('★ 타이틀 「행운의 별」을 얻었어요!'+(cur&&titleOf(USER)!=='행운의 별'?' 업적 창에서 달 수 있어요.':''));renderLobby()}
const RECAST={name:'별자리 재관측기',kind:'사용',desc:'별자리(직업)와 별자리 기술을 다시 고를 수 있어요. 종족·이름·사진은 그대로예요. 창고에서 [사용].'};
function shopList(){const day=EXP.kstDay(Date.now()),out=[
 {id:'kit',cat:'소모품',name:'응급 키트',price:30,desc:EXP.KIT.desc,give:[{...EXP.KIT,count:1}]},
 {id:'recast',cat:'특수',name:RECAST.name,price:5000,desc:RECAST.desc,give:[{...RECAST,count:1}]}];
 const combos=[];['파편','덩쿨','나무'].forEach(m=>{for(let d=0;d<6;d++)combos.push([m,d])});const r=EXP.rng(EXP.hash(day*977+13));for(let i=combos.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[combos[i],combos[j]]=[combos[j],combos[i]]}
 const pick10=combos.slice(0,10).sort((a,b)=>a[0].localeCompare(b[0],'ko')||a[1]-b[1]);
 for(let i=0;i<10;i++){const [m,d]=pick10[i];const n=EXP.matName(m,d);
  out.push({id:'mat'+i,cat:'재료 묶음 · 오늘',name:`${n} ×5`,price:25+25*d,desc:`${EXP.MATS[m]} 5개 세트. 오늘의 재료 묶음은 한국 시간 자정에 바뀌어요.`,give:[{name:n,kind:'재료',desc:EXP.MATS[m],count:5}]})}
 return out}
function buyGood(id){const g=shopList().find(x=>x.id===id),money=store.get(KEY('money'),0);if(!g)return;if(money<g.price){toast('골드가 모자라요.');return}
 const inv=store.get(KEY('inv'),[]);g.give.forEach(it=>{for(let i=0;i<it.count;i++)inv.push({uid:'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),name:it.name,kind:it.kind,desc:it.desc,got:Date.now()})});
 store.set(KEY('inv'),inv);store.set(KEY('money'),money-g.price);toast(`${g.name}을(를) 샀어요. 창고에 들어갔어요.`);renderShop()}
function startRecast(){if(dive()){toast('탐사 중에는 쓸 수 없어요. 먼저 귀환하세요.');return}if(myRoom()){toast('레이드 방에 있을 때는 쓸 수 없어요.');return}
 const c=myCh(),R=c.race_detail||{};fresh();Object.assign(C,{rework:true,race:c.race,portrait:c.portrait||null,
  blood:R.bloodline||null,bloodStat:R.bloodline_stat||null,bloodSkill:R.bloodline_skill||null,minusStat:R.bloodline_minus||null,root:R.root_skill||null,
  etherTrait:R.trait||null,etherSk:R.race_skill||null,symbol:R.symbol||'',name:c.race==='에테르'?(c.nickname||''):c.name,jobs:[],picks:{},forb:null});
 view('app');render()}
function renderShop(){
 const list=shopList();
 const cats=['전체',...new Set(list.map(x=>x.cat))];if(!cats.includes(shopCat))shopCat='전체';
 $('#shopCats').innerHTML=cats.map(c=>`<button role="tab" aria-selected="${c===shopCat}" data-scat="${esc(c)}">${esc(c)}</button>`).join('');
 const q=$('#shopQ').value.trim(),so=$('#shopSort').value,money=store.get(KEY('money'),0);$('#wallet').textContent=money;
 const cmp={base:()=>0,low:(a,b)=>a.price-b.price,high:(a,b)=>b.price-a.price,name:(a,b)=>a.name.localeCompare(b.name,'ko')}[so];
 const shown=list.filter(x=>(shopCat==='전체'||x.cat===shopCat)&&(!q||x.name.includes(q))).sort(cmp);
 $('#shopList').innerHTML=!list.length?'<div class="empty">판매 목록이 아직 없어요. 상품이 정해지면 여기에 열려요.</div>'
  :shown.length?`<div class="sub" style="margin-top:12px">${shown.length}개 상품</div><div class="goods">${shown.map(g=>`<div class="good"><span class="tag" style="align-self:start">${esc(g.cat)}</span><b>${esc(g.name)}</b><small>${esc(g.desc||'')}</small><div class="row"><span class="price">${g.price.toLocaleString()}</span><button class="go mini" data-buy="${g.id}" ${money<g.price?'disabled':''}>${money<g.price?'골드 부족':'구매'}</button></div></div>`).join('')}</div>`
  :'<div class="empty">조건에 맞는 상품이 없어요.</div>';
 $('#shopCats').querySelectorAll('[data-scat]').forEach(b=>b.onclick=()=>{shopCat=b.dataset.scat;renderShop()});
 $('#shopList').querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>buyGood(b.dataset.buy));
}
$('#shopQ').oninput=renderShop;$('#shopSort').onchange=renderShop;$('#shopDemo').onchange=renderShop;
