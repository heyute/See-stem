// 시 스템 :: 딥 다이브 — 공용 확인창 · 신고 · 레이드 이탈 제재
// ── 공용 확인창
function modal(html,{warn=false}={}){return new Promise(res=>{const m=$('#modal'),b=$('#mbox');b.className='mbox'+(warn?' warn':'');b.innerHTML=html;m.hidden=false;
 const close=v=>{m.hidden=true;document.removeEventListener('keydown',esc_);res(v)};const esc_=e=>{if(e.key==='Escape')close(null)};document.addEventListener('keydown',esc_);
 b.querySelectorAll('[data-res]').forEach(x=>x.onclick=()=>close(x.dataset.res==='ok'?(b.querySelector('form')?Object.fromEntries(new FormData(b.querySelector('form'))):true):null));
 m.onclick=e=>{if(e.target===m)close(null)};(b.querySelector('[data-res=cancel]')||b.querySelector('button')).focus()})}
// ── 신고 (서버가 생기면 POST /api/reports, GM 화면은 관리자 도구로)
const REPORT_REASONS={chat:['부적절한 대화','욕설, 비하, 도배, 불쾌한 내용'],photo:['부적절한 프로필 사진','선정적·폭력적이거나 타인을 사칭하는 얼굴 사진']};
function reportContext(user){const g=SOC.global().filter(m=>m.from===user).slice(-5).map(m=>`[전체] ${m.text}`);const d=SOC.dm(user).filter(m=>m.from===user).slice(-5).map(m=>`[1대1] ${m.text}`);
 const c=(store.get('stem-saved:'+user,[])[0])||{};return{lines:[...g,...d].slice(-8),portrait:c.portrait||null}}
async function reportUser(user,char){
 if(user===USER)return;if(user.startsWith('demo_')){toast('예시 유저는 신고할 수 없어요.');return}
 const r=await modal(`<h2 id="mTitleH">${esc(char)} 님 신고</h2><div class="sub">${esc(user)} · 신고 내용은 GM만 볼 수 있어요.</div><form onsubmit="return false">
  ${Object.entries(REPORT_REASONS).map(([k,[n,d]],i)=>`<label class="rr"><input type="radio" name="reason" value="${k}" ${i?'':'checked'}><span><b>${n}</b><small>${d}</small></span></label>`).join('')}
  <textarea name="memo" maxlength="300" placeholder="(선택) 자세한 내용을 적어 주세요"></textarea></form>
  <div class="acts"><button class="ghost" data-res="cancel">취소</button><button class="go danger" data-res="ok">신고하기</button></div>`);
 if(!r)return;const all=store.get('stem-reports',[]);
 if(all.some(x=>x.from===USER&&x.target===user&&x.reason===r.reason&&Date.now()-x.at<10*6e4)){toast('같은 내용으로 방금 신고했어요. 잠시 후 다시 해 주세요.');return}
 const ctx=reportContext(user);
 all.unshift({id:'rp'+Date.now().toString(36),from:USER,fromChar:myChar(),target:user,targetChar:char,reason:r.reason,memo:(r.memo||'').trim(),at:Date.now(),status:'open',ctx:r.reason==='chat'?ctx.lines:[],photo:r.reason==='photo'?ctx.portrait:null});
 store.set('stem-reports',all.slice(0,500));toast('신고했어요. GM이 확인할 거예요.')}
// ── 레이드 이탈 제재
const BAN_MS=5*60*1000;
const banUntil=(u=USER)=>store.get('stem-raidban:'+u,0);
const banLeft=()=>Math.max(0,banUntil()-Date.now());
const fmtLeft=ms=>{const s=Math.ceil(ms/1000);return `${Math.floor(s/60)}분 ${String(s%60).padStart(2,'0')}초`};
async function leaveRaidMidway(){
 const ok=await modal(`<h2 id="mTitleH">레이드에서 나갈까요?</h2><p>전투가 진행 중이에요. 지금 나가면 파티원은 남은 인원으로 싸워야 해요.</p><p><b>나가면 5분 동안 레이드에 참여할 수 없어요.</b> (방 만들기·입장 불가)</p>
  <div class="acts"><button class="ghost" data-res="cancel">계속 싸우기</button><button class="go danger" data-res="ok">나가기</button></div>`,{warn:true});
 if(!ok)return false;store.set('stem-raidban:'+USER,Date.now()+BAN_MS);RAID.leave();$('#bFrame').src='about:blank';battleRoom=null;view('raid');renderRaid();toast('레이드에서 나갔어요. 5분 동안 레이드에 참여할 수 없어요.');return true}
