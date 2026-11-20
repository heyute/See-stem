// 시 스템 :: 딥 다이브 — 계정 · Firebase 연결(로그인/이메일 인증/저장) · 입장 처리
// ── 계정 (지금은 브라우저 안 모의 서버. 서버가 생기면 API의 세 함수만 fetch로 바꿔요)
//   POST /api/signup {id,pw} · POST /api/login {id,pw} → 세션 · POST /api/logout
const ID_RE=/^[a-z0-9_]{4,16}$/;
const pwOk=p=>p.length>=8&&p.length<=64&&/[A-Za-z]/.test(p)&&/[0-9]/.test(p);
// ── Firebase: 로그인(아이디@seestem.game 가짜 이메일) + 내 데이터(Realtime Database users/{uid}/kv)
const FB_CFG={apiKey:"AIzaSyCDdsaN4Suy-sJtND8KEa3cs5ZsrSdnhE8",authDomain:"see-stem-deep-dive.firebaseapp.com",databaseURL:"https://see-stem-deep-dive-default-rtdb.asia-southeast1.firebasedatabase.app",projectId:"see-stem-deep-dive",storageBucket:"see-stem-deep-dive.firebasestorage.app",messagingSenderId:"758535070465",appId:"1:758535070465:web:35e967952350b401183100"};
const FB_V='11.0.2';
// 1단계에서 서버로 옮기는 내 데이터 (나머지 공용 데이터는 아직 이 브라우저에 저장)
const PRIV=['saved','draft','inv','money','dive','prog','craft','lastReport','luckyT'];
function fbErr(e){const c=(e&&e.code)||'';const M={'auth/email-already-in-use':'이미 가입된 이메일이에요. 로그인해 주세요.','auth/invalid-credential':'이메일 또는 비밀번호가 맞지 않아요.','auth/invalid-login-credentials':'이메일 또는 비밀번호가 맞지 않아요.','auth/wrong-password':'이메일 또는 비밀번호가 맞지 않아요.','auth/user-not-found':'이메일 또는 비밀번호가 맞지 않아요.','auth/invalid-email':'이메일 주소 형식이 맞지 않아요.','auth/missing-email':'이메일을 입력해 주세요.','auth/user-disabled':'이용이 정지된 계정이에요.','auth/admin-restricted-operation':'서버에서 회원가입이 꺼져 있어요. (Firebase 인증 설정의 사용자 작업 확인)','auth/quota-exceeded':'오늘 보낼 수 있는 메일 수를 넘었어요. 내일 다시 해 주세요.','auth/unauthorized-domain':'이 주소는 Firebase 승인된 도메인에 없어요.','auth/unauthorized-continue-uri':'이 주소는 Firebase 승인된 도메인에 없어요.','auth/api-key-not-valid.-please-pass-a-valid-api-key.':'Firebase 설정값(apiKey)이 맞지 않아요.','auth/too-many-requests':'시도가 너무 많아요. 잠시 후 다시 해 주세요.','auth/network-request-failed':'서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.','auth/weak-password':'비밀번호가 너무 약해요.','auth/operation-not-allowed':'서버에서 이메일 로그인이 꺼져 있어요. (Firebase 설정 확인)','PERMISSION_DENIED':'서버 보안 규칙이 막고 있어요. Firebase 콘솔의 Realtime Database → 규칙 탭에 새 규칙이 게시됐는지 확인해 주세요.'};
 if(M[c])return M[c];if(/permission.denied/i.test(c+(e&&e.message||'')))return M.PERMISSION_DENIED;if(e&&e.fbLoad)return '서버에 연결할 수 없어요. 잠시 후 새로고침해 주세요.';return '문제가 생겼어요. ('+(c||(e&&e.message)||'알 수 없음')+')'}
const CLOUD={fb:null,uid:null,cache:{},dirty:new Set(),timer:null,first:0,token:null,unsub:null,
 async init(){if(this.fb)return this.fb;const b=`https://www.gstatic.com/firebasejs/${FB_V}/`;let A,U,D;
  try{[A,U,D]=await Promise.all(['firebase-app.js','firebase-auth.js','firebase-database.js'].map(f=>import(b+f)))}catch(e){const x=new Error('load');x.fbLoad=1;throw x}
  const app=A.initializeApp(FB_CFG);this.fb={A,U,D,auth:U.getAuth(app),db:D.getDatabase(app)};try{this.fb.auth.languageCode='ko'}catch(e){}return this.fb},
 name(k){if(!USER||!this.uid)return null;const m=/^stem-([A-Za-z]+):(.+)$/.exec(k);return m&&m[2]===USER&&PRIV.includes(m[1])?m[1]:null},
 async load(uid,id){const {D,db}=this.fb;this.uid=uid;this.cache={};const v=(await D.get(D.ref(db,`users/${uid}/kv`))).val()||{};for(const k in v)if(typeof v[k]==='string')this.cache[k]=v[k];
  // 처음 서버에 들어오면, 이 브라우저에 같은 아이디로 남아 있던 예전 데이터를 옮겨요
  if(!Object.keys(this.cache).length){let n=0;PRIV.forEach(k=>{try{const s=localStorage.getItem(`stem-${k}:${id}`);if(s!=null){this.cache[k]=s;this.dirty.add(k);n++}}catch(e){}});if(n){this.sched();return n}}return 0},
 put(n,s){this.cache[n]=s;this.dirty.add(n);this.sched()},
 drop(n){delete this.cache[n];this.dirty.add(n);this.sched()},
 sched(){const now=Date.now();if(!this.first)this.first=now;clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),Math.max(0,Math.min(2500,this.first+10000-now)))},
 flush(){clearTimeout(this.timer);this.first=0;if(!this.uid||!this.dirty.size)return Promise.resolve();const {D,db}=this.fb,uid=this.uid,up={};
  this.dirty.forEach(n=>up[n]=n in this.cache?this.cache[n]:null);this.dirty.clear();syncMark('saving');
  return D.update(D.ref(db,`users/${uid}/kv`),up).then(()=>syncMark(this.dirty.size?'saving':'ok')).catch(e=>{console.warn('save failed',e);if(this.uid!==uid)return;Object.keys(up).forEach(n=>{if(!this.dirty.has(n))this.dirty.add(n)});syncMark('err',fbErr(e));this.timer=setTimeout(()=>this.flush(),8000)})},
 // 같은 계정이 다른 곳에서 들어오면 먼저 들어와 있던 쪽을 내보내요 (저장이 서로 덮어쓰지 않게)
 async claim(onKick){const {D,db}=this.fb;const tok=Date.now().toString(36)+Math.random().toString(36).slice(2,8);this.token=tok;const r=D.ref(db,`users/${this.uid}/session`);await D.set(r,tok);
  this.unsub=D.onValue(r,s=>{const v=s.val();if(v&&v!==this.token){this.stop(true);onKick()}})},
 stop(discard){if(this.unsub){try{this.unsub()}catch(e){}this.unsub=null}if(discard){this.dirty.clear()}clearTimeout(this.timer);this.first=0;this.uid=null;this.cache={};this.token=null;syncMark('off')}
};
function syncMark(s,msg){let el=document.getElementById('syncDot');if(!el){el=document.createElement('div');el.id='syncDot';el.setAttribute('role','status');document.body.appendChild(el)}
 el.dataset.s=s;el.textContent=s==='saving'?'저장 중…':s==='ok'?'서버에 저장됨':s==='err'?('저장 실패 · 다시 시도 중'+(msg?' — '+msg:'')):'';el.hidden=s==='off'}
document.addEventListener('visibilitychange',()=>{if(document.hidden)CLOUD.flush()});
window.addEventListener('pagehide',()=>CLOUD.flush());
const store={get(k,d){const n=CLOUD.name(k);if(n){const s=CLOUD.cache[n];if(s==null)return d;try{return JSON.parse(s)}catch(e){return d}}try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
 set(k,v){const n=CLOUD.name(k);if(n){if(v===undefined){CLOUD.drop(n);return true}CLOUD.put(n,JSON.stringify(v));return true}try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},
 del(k){const n=CLOUD.name(k);if(n){CLOUD.drop(n);return}try{localStorage.removeItem(k)}catch(e){}}};
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function hashPw(pw,salt){
 try{const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},k,256))}
 catch(e){let h=0;for(const c of salt+pw)h=(h*31+c.charCodeAt(0))|0;return 'w'+h}}
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const API={
 async idTaken(id){const {D,db}=await CLOUD.init();try{return (await D.get(D.ref(db,'ids/'+id))).exists()}catch(e){throw new Error(fbErr(e))}},
 async claimId(uid,id){const {D,db}=CLOUD.fb;await D.set(D.ref(db,'ids/'+id),uid);await D.set(D.ref(db,`users/${uid}/id`),id)},
 async signup(email,id,pw){const {U,auth}=await CLOUD.init();
  if(await this.idTaken(id))throw new Error('이미 쓰고 있는 아이디예요.');
  let cr;try{cr=await U.createUserWithEmailAndPassword(auth,email,pw)}catch(e){throw new Error(fbErr(e))}
  try{await this.claimId(cr.user.uid,id)}catch(e){console.warn('id claim',e)} // 실패하면 인증 뒤 아이디를 다시 정해요
  try{await U.sendEmailVerification(cr.user);vLast=Date.now();vSendErr=''}catch(e){console.warn(e);vSendErr=fbErr(e)}},
 async login(email,pw){const {U,auth}=await CLOUD.init();try{await U.signInWithEmailAndPassword(auth,email,pw)}catch(e){throw new Error(fbErr(e))}},
 async logout(){await CLOUD.flush();CLOUD.stop();try{const {U,auth}=await CLOUD.init();await U.signOut(auth)}catch(e){}},
 async reset(email){const {U,auth}=await CLOUD.init();try{await U.sendPasswordResetEmail(auth,email)}catch(e){throw new Error(fbErr(e))}}
};
function authPanel(w){$('#authMain').hidden=w!=='main';$('#verifyBox').hidden=w!=='verify';$('#idBox').hidden=w!=='id';if(w!=='verify')clearInterval(vPoll)}
let vPoll=null,vLast=0,vSendErr='';
// 로그인 뒤: 인증 확인 → 아이디 확인 → 입장
async function afterAuth(){const {auth,D,db}=CLOUD.fb;const u=auth.currentUser;if(!u){authPanel('main');return}
 if(!u.emailVerified){$('#vMail').textContent=u.email;$('#vErr').textContent=vSendErr?'인증 메일을 보내지 못했어요: '+vSendErr:'';vSendErr='';authPanel('verify');clearInterval(vPoll);vPoll=setInterval(()=>vCheck(true),5000);return}
 const id=(await D.get(D.ref(db,`users/${u.uid}/id`))).val();
 if(!id){authPanel('id');$('#uid2').focus();return}
 authPanel('main');await enterCloud(id)}
async function vCheck(quiet){const {auth}=CLOUD.fb;const u=auth.currentUser;if(!u)return;
 try{await u.reload();if(auth.currentUser.emailVerified){clearInterval(vPoll);await auth.currentUser.getIdToken(true);toast('이메일 인증을 마쳤어요!');await afterAuth()}
  else if(!quiet)$('#vErr').textContent='아직 인증되지 않았어요. 메일의 링크를 누른 뒤 다시 눌러 주세요.'}catch(e){if(!quiet)$('#vErr').textContent=fbErr(e)}}
$('#vCheck').onclick=async()=>{const b=$('#vCheck');b.disabled=true;try{await vCheck(false)}finally{b.disabled=false}};
$('#vResend').onclick=async()=>{const left=60-Math.floor((Date.now()-vLast)/1000);if(left>0){$('#vErr').textContent=`${left}초 뒤에 다시 보낼 수 있어요.`;return}
 try{await CLOUD.fb.U.sendEmailVerification(CLOUD.fb.auth.currentUser);vLast=Date.now();$('#vErr').textContent='';toast('인증 메일을 다시 보냈어요.')}catch(e){$('#vErr').textContent='인증 메일을 보내지 못했어요: '+fbErr(e)}};
$('#vOut').onclick=async()=>{clearInterval(vPoll);try{await CLOUD.fb.U.signOut(CLOUD.fb.auth)}catch(e){}authPanel('main');setMode('in')};
$('#idGo').onclick=async()=>{const id=$('#uid2').value.trim().toLowerCase(),er=$('#idErr');if(!ID_RE.test(id)){er.textContent='아이디는 영문 소문자·숫자·밑줄 4~16자예요.';return}
 const b=$('#idGo');b.disabled=true;try{if(await API.idTaken(id)){er.textContent='이미 쓰고 있는 아이디예요.';return}await API.claimId(CLOUD.fb.auth.currentUser.uid,id);er.textContent='';await afterAuth()}catch(e){er.textContent=fbErr(e)}finally{b.disabled=false}};
$('#forgotPw').onclick=async()=>{const em=$('#uem').value.trim(),err=$('#authErr');if(!EMAIL_RE.test(em)){err.textContent='위에 가입한 이메일을 입력한 뒤 눌러 주세요.';$('#uem').focus();return}
 try{await API.reset(em);err.textContent='';toast('비밀번호 재설정 메일을 보냈어요. 메일함을 확인해 주세요.')}catch(e){err.textContent=e.message}};
async function enterCloud(id){const {auth}=CLOUD.fb;const moved=await CLOUD.load(auth.currentUser.uid,id);USER=id;
 await CLOUD.claim(async()=>{closeDM();USER=null;try{await CLOUD.fb.U.signOut(CLOUD.fb.auth)}catch(e){}view('auth');authPanel('main');setMode('in');$('#authErr').textContent='다른 곳에서 같은 계정으로 접속해서 여기서는 로그아웃했어요.'});
 syncMark('ok');enter(id);if(moved)setTimeout(()=>toast('이 브라우저에 있던 예전 기록을 서버로 옮겼어요.'),900)}
function authBusy(on,txt){const b=$('#authGo');b.disabled=on;if(on)b.textContent=txt||'서버에 연결하는 중…';else b.textContent=mode==='up'?'가입하고 들어가기':'로그인'}
let USER=null;
function KEY(k){return `stem-${k}:${USER}`}
let mode='in';
function setMode(m){mode=m;const up=m==='up';
 $('#tabIn').setAttribute('aria-selected',!up);$('#tabUp').setAttribute('aria-selected',up);
 $('#pw2Wrap').hidden=!up;$('#uidWrap').hidden=!up;$('#authNote').hidden=up;$('#authGo').textContent=up?'가입하기':'로그인';
 $('#upw').autocomplete=up?'new-password':'current-password';$('#authErr').textContent='';hints()}
function hints(){const up=mode==='up',id=$('#uid').value,pw=$('#upw').value,pw2=$('#upw2').value;
 const set=(el,txt,bad)=>{el.textContent=txt;el.classList.toggle('bad',!!bad)};
 const em=$('#uem').value.trim();set($('#uemHint'),em&&!EMAIL_RE.test(em)?'이메일 주소 형식이 맞지 않아요.':'',em&&!EMAIL_RE.test(em));
 if(!up){set($('#uidHint'),'');set($('#upwHint'),'');set($('#upw2Hint'),'');return}
 set($('#uidHint'),'영문 소문자·숫자·밑줄(_) 4~16자',id&&!ID_RE.test(id));
 set($('#upwHint'),'8자 이상, 영문과 숫자를 섞어서',pw&&!pwOk(pw));
 set($('#upw2Hint'),pw2&&pw2!==pw?'비밀번호가 서로 달라요.':'',pw2&&pw2!==pw)}
$('#tabIn').onclick=()=>setMode('in');$('#tabUp').onclick=()=>setMode('up');
['#uem','#uid','#upw','#upw2'].forEach(s=>$(s).addEventListener('input',()=>{$('#authErr').textContent='';hints()}));
$('#uid').addEventListener('input',e=>{const v=e.target.value.toLowerCase();if(v!==e.target.value)e.target.value=v});
$('#authForm').onsubmit=async ev=>{ev.preventDefault();const em=$('#uem').value.trim(),id=$('#uid').value.trim(),pw=$('#upw').value,err=$('#authErr');
 if(!em||!pw){err.textContent='이메일과 비밀번호를 입력하세요.';return}
 if(!EMAIL_RE.test(em)){err.textContent='이메일 주소 형식이 맞지 않아요.';return}
 if(mode==='up'){if(!ID_RE.test(id)){err.textContent='아이디는 영문 소문자·숫자·밑줄 4~16자예요.';return}
  if(!pwOk(pw)){err.textContent='비밀번호는 8자 이상, 영문과 숫자를 섞어 주세요.';return}
  if(pw!==$('#upw2').value){err.textContent='비밀번호 확인이 달라요.';return}}
 authBusy(true,mode==='up'?'가입하는 중…':'들어가는 중…');
 try{if(mode==='up'){await API.signup(em,id,pw);toast('가입했어요! 메일함에서 인증 링크를 눌러 주세요.')}else await API.login(em,pw);$('#upw').value='';$('#upw2').value='';await afterAuth()}
 catch(e){err.textContent=e.fbLoad||e.code||/permission.denied/i.test(e.message)?fbErr(e):e.message}finally{authBusy(false)}};
function enter(id){USER=id;fresh();const d=store.get(KEY('draft'),null);if(d)C=Object.assign(C,d);
 $('#who').innerHTML=$('#who2').innerHTML=`<b>${esc(id)}</b> 님`;$('#auth').hidden=true;$('#upw').value='';$('#upw2').value='';
 migrateItems();
 {const p=prog();if(seasonSync(p)){saveProg(p);setTimeout(()=>toast(`${season().name}이(가) 시작됐어요. 심연 기록이 초기화됐어요.`),600)}else saveProg(p)}
 {const dv=store.get(KEY('dive'),null);if(dv&&dv.tac&&(dv.tac.priority||dv.tac.retreat)){dv.tac={stance:dv.tac.stance||'balanced'};store.set(KEY('dive'),dv)}}
 if(chars().length){catchUp();showLobby()}else showCreator()}
// 예전 설명이 남은 아이템을 지금 설명으로 맞춰요 (창고·탐사 가방·우편 첨부)
function migrateItems(){const fix=it=>{if(!it)return 0;if(it.name===EXP.KIT.name&&it.desc!==EXP.KIT.desc){it.desc=EXP.KIT.desc;it.kind=EXP.KIT.kind;return 1}
  const m=(it.name||'').match(/^심도 \d (파편|덩쿨|나무)$/);if(m&&it.desc!==EXP.MATS[m[1]]){it.desc=EXP.MATS[m[1]];it.kind='재료';return 1}return 0};

 const inv=store.get(KEY('inv'),[]);if(inv.map(fix).some(Boolean))store.set(KEY('inv'),inv);
 const d=store.get(KEY('dive'),null);if(d&&d.bag&&d.bag.items.map(fix).some(Boolean))store.set(KEY('dive'),d);
 const mb=store.get('stem-mail:'+USER,[]);if(mb.map(m=>(m.items||[]).map(fix).some(Boolean)).some(Boolean))store.set('stem-mail:'+USER,mb)
 // 효과가 정해지지 않았다고 적힌 아이템(예전 시험용 아이템)은 지워요
 const junk=it=>/효과는 아직 정해지지 않았어요/.test((it&&it.desc)||'');
 {const inv=store.get(KEY('inv'),[]),keep=inv.filter(x=>!junk(x));if(keep.length!==inv.length)store.set(KEY('inv'),keep)}
 {const d=store.get(KEY('dive'),null);if(d&&d.bag){const k=d.bag.items.filter(x=>!junk(x));if(k.length!==d.bag.items.length){d.bag.items=k;store.set(KEY('dive'),d)}}}
 {const mb=store.get('stem-mail:'+USER,[]);let ch=0;mb.forEach(m=>{const k=(m.items||[]).filter(x=>!junk(x));if(k.length!==(m.items||[]).length){m.items=k;ch=1}});if(ch)store.set('stem-mail:'+USER,mb)}}
function view(v){['auth','app','lobby','shop','achv','db','explore','raid','battle','mail'].forEach(k=>$('#'+k).hidden=v!==k);window.scrollTo(0,0)}
function showCreator(){if(chars().length){showLobby();return}view('app');render()}
const doLogout=async()=>{await API.logout();closeDM();USER=null;view('auth');authPanel('main');setMode('in');$('#uem').focus()};
$('#logout').onclick=doLogout;$('#logout2').onclick=doLogout;
