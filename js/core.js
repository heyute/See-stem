// 시 스템 :: 딥 다이브 — 공통 도구 · 직업(별자리)·종족 데이터 · 상수
const $=s=>document.querySelector(s);
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const BYID=Object.fromEntries(DATA.map(s=>[s.id,s]));
const STATK=['atk','def','eva','com'],STATN={atk:'공격',def:'방어',eva:'회피',com:'소통'};
const JOBS=[
 {n:'수호자',star:'불굴의 별자리',st:[0,2,1,0],c:'#c79b2e',q:'진형을 유지해 승리의 발판을 만드는 거다.'},
 {n:'전사',star:'전장의 별자리',st:[2,0,1,0],c:'#d35d47',q:'결국 끝까지 서 있으면 이긴 거잖아?'},
 {n:'마도공학자',star:'창조의 별자리',st:[1,0,2,0],c:'#3f9a5f',q:'명심해라. 머리를 굴리되, 발은 멈추지 말 것.'},
 {n:'마법사',star:'지휘의 별자리',st:[0,1,0,1],c:'#5b7fd6',q:'불가능을 뒤엎는 건 우리의 숙명이라고 했어요.'},
 {n:'격투가',star:'무예의 별자리',st:[1,0,2,0],c:'#c4553f',q:'가슴에 잠든 초심을 붙잡아라!'},
 {n:'모험가',star:'자유의 별자리',st:[0,0,1,1],c:'#2f9aa8',q:'미지를 향해 목숨을 걸고 떠난다.'},
 {n:'음유시인',star:'화합의 별자리',st:[0,0,0,2],c:'#8a6fd6',q:'오늘 밤, 무대의 주인공은 바로 당신!'},
 {n:'성직자',star:'믿음의 별자리',st:[0,1,0,1],c:'#b98fd6',q:'부디 당신에게 신의 자비가 있기를.'},
];
const JOB=Object.fromEntries(JOBS.map(j=>[j.n,j]));
const RACES={
 '로게움':{q:'뿌리를 기억하고, 위를 향해 나아가자.',d:'세계에서 태어난 존재. 심도 패널티를 1단계 줄이고, 혈통으로 스탯이나 다른 별자리의 기술을 얻어요.'},
 '에테르':{q:'우리가 삼킨 상징과 근원을 떠올려라.',d:'세계에서 태어나지 않은 존재. 상징의 이름을 가지며, 탐사 보상이나 이계 아이템을 얻어요.'},
};
const live=s=>s.status!=='보류';
const sk=(g,k)=>DATA.filter(s=>s.group===g&&(!k||s.kind===k));
const common=sk('공통');
const turnCls=t=>t.includes('액션')&&!t.includes('세팅')?'t-act':t==='세팅'?'t-set':t==='인터셉트'?'t-icp':'t-pas';

let C;
function fresh(){C={race:null,blood:null,bloodStat:null,bloodSkill:null,minusStat:null,root:null,etherTrait:null,etherSk:null,portrait:null,symbol:'',name:'',jobs:[],picks:{},forb:null}}
fresh();
