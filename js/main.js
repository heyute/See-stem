// 시 스템 :: 딥 다이브 — 시작: 레이드 제한 시간 표시 · 로그인 상태 확인 후 입장 (맨 마지막에 불러와야 해요)
setInterval(()=>{if(!USER)return;const el=$('#banLeft');if(el){const l=banLeft();if(l>0)el.textContent=fmtLeft(l);else if(!$('#raid').hidden)renderRaid()}},1000);
(async()=>{setMode('in');authBusy(true);try{const {auth}=await CLOUD.init();await auth.authStateReady();if(auth.currentUser)await afterAuth()}catch(e){console.warn(e);$('#authErr').textContent=fbErr(e)}finally{authBusy(false)}})();
