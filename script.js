// Pond Guardians — enhancements: difficulty modes + milestones + droplet sfx
// --- CTA facts (existing) ---
const facts = [
  "771 million people live without access to clean water.",
  "Access to clean water improves education, health, and income.",
  "Clean water can reduce waterborne diseases by up to 50%.",
  "You can help make a difference — learn more at charitywater.org."
];

let score=0,timeLeft=30,gameRunning=false,pondCleanliness=1;
let countdownId=null,spawnId=null;

// Difficulty config (updated for clearer differences)
const DIFFICULTIES = {
  // Easy: noticeably slower spawns and slower fall speed, a bit more time
  easy:   { timer: 38, spawnMs: 1100, winTarget: 12, fallMult: 1.25 },
  // Normal: unchanged from your current balance
  normal: { timer: 30, spawnMs: 800,  winTarget: 15, fallMult: 1.0 },
  // Hard: much faster spawns and quicker fall speed, less time and higher target
  hard:   { timer: 22, spawnMs: 450,  winTarget: 20, fallMult: 0.65 }
};
let currentDiff = 'normal';
let activeCfg = DIFFICULTIES.normal;
let winTarget = DIFFICULTIES.normal.winTarget;

// Milestones (added) — relative to target so it scales by difficulty
let milestones = [];
let seenMilestones = new Set();

const scoreEl=document.getElementById('score');
const timeEl=document.getElementById('time');
const msgEl=document.getElementById('message');
const container=document.getElementById('game-container');
const pond=document.getElementById('pond');
const meterFill=document.getElementById('meter-fill');
const startBtn=document.getElementById('start-btn');
const resetBtn=document.getElementById('reset-btn');
const diffSelect=document.getElementById('difficulty');
const confettiCanvas=document.getElementById('confetti');
const ctx=confettiCanvas.getContext('2d');
const sndBubble=document.getElementById('sound-bubble');
const sndBloop=document.getElementById('sound-bloop');
const sndSparkle=document.getElementById('sound-sparkle');
const sndDroplet=document.getElementById('sound-droplet'); // added

function sizeCanvas(){confettiCanvas.width=container.clientWidth;confettiCanvas.height=container.clientHeight;}
sizeCanvas();addEventListener('resize',sizeCanvas);

startBtn.addEventListener('click',startGame);
resetBtn.addEventListener('click',resetGame);
if (diffSelect) {
  diffSelect.addEventListener('change', (e)=>{
    currentDiff = e.target.value;
  });
}

function setMilestonesForTarget(target){
  milestones = [
    {score: Math.max(1, Math.floor(target*0.33)), msg: "Nice flow — a third of the way! 💧"},
    {score: Math.max(2, Math.floor(target*0.66)), msg: "Halfway there! Keep it clean! ✨"},
    {score: target, msg: "Goal reached! Clean water wins! 🎉"}
  ];
  seenMilestones.clear();
}

function startGame(){
  if(gameRunning) return;
  gameRunning=true;
  startBtn.disabled=true;
  resetBtn.disabled=false;

  // apply difficulty
  const cfg = DIFFICULTIES[currentDiff] || DIFFICULTIES.normal;
  activeCfg = cfg;
  timeLeft = cfg.timer;
  winTarget = cfg.winTarget;
  setMilestonesForTarget(winTarget);

  score=0; pondCleanliness=1;
  updateScore(0); updateTime(); updatePond();
  msgEl.textContent=`Catch the blue, avoid the red! (${currentDiff[0].toUpperCase()+currentDiff.slice(1)})`;

  clearInterval(countdownId); clearInterval(spawnId);
  countdownId=setInterval(()=>{
    timeLeft--; updateTime();
    if(timeLeft<=0) endGame();
  },1000);
  spawnId=setInterval(spawnDrop,cfg.spawnMs);
}

function endGame(){
  clearInterval(countdownId);
  clearInterval(spawnId);
  gameRunning=false;
  startBtn.disabled=false;
  document.querySelectorAll('.drop').forEach(d=>d.remove());
  if(score>=winTarget){
    msgEl.textContent=`You win with ${score} points!`;
    fireConfetti(); try{sndSparkle.play()}catch(e){}
  }else{
    msgEl.textContent=`Time's up! Score: ${score}. Try for ${winTarget}+ to win.`;
  }
  // --- CTA: always show a clean-water fact with link ---
  try {
    const fact = facts[Math.floor(Math.random() * facts.length)];
    const p = document.createElement('p');
    p.className = 'fact-line';
    p.innerHTML = `💧 ${fact} <a href="https://www.charitywater.org" target="_blank" rel="noopener">Learn more</a>`;
    (typeof msgEl !== 'undefined' ? msgEl : document.getElementById('message')).appendChild(p);
  } catch(e) { /* no-op */ }
}

function resetGame(){
  clearInterval(countdownId); clearInterval(spawnId);
  gameRunning=false; score=0; timeLeft=DIFFICULTIES[currentDiff].timer; pondCleanliness=1;
  updateScore(0); updateTime(); updatePond();
  msgEl.textContent='Game reset. Press Start!';
  startBtn.disabled=false; resetBtn.disabled=true;
  document.querySelectorAll('.drop').forEach(d=>d.remove());
  ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
}

function updateScore(d){
  score+=d; if(score<0) score=0; scoreEl.textContent=score;
  // Milestone checks
  for(const m of milestones){
    if(score>=m.score && !seenMilestones.has(m.score)){
      seenMilestones.add(m.score);
      // announce
      const notice = document.createElement('div');
      notice.className = 'burst';
      notice.style.left = (container.clientWidth/2) + 'px';
      notice.style.top = '40px';
      notice.textContent = m.msg;
      container.appendChild(notice);
      setTimeout(()=>notice.remove(),1000);
      // subtle sparkle
      try{sndSparkle.currentTime=0; sndSparkle.play()}catch(e){}
      msgEl.textContent = m.msg;
    }
  }
}
function updateTime(){ timeEl.textContent=timeLeft; document.querySelector('.cleanliness-meter').setAttribute('aria-valuenow', Math.round(pondCleanliness*100)); }

function spawnDrop(){
  const drop=document.createElement('div');
  drop.className='drop';
  const isGood=Math.random()<0.7; // keep core odds
  drop.classList.add(isGood?'good':'bad');

  const size=Math.floor(44+Math.random()*28);
  drop.style.width=size+'px'; drop.style.height=size+'px';

  const maxX=container.clientWidth-size;
  const left=Math.floor(Math.random()*(maxX-6)+3);
  drop.style.left=left+'px';

  const base=3600; const speedUp=(30-timeLeft)*45; // leave original feel
  let duration=Math.max(1100, base - speedUp);
  const fm = (activeCfg && activeCfg.fallMult) ? activeCfg.fallMult : 1.0;
  duration = Math.round(duration * fm);
  drop.style.animationDuration=duration+'ms';

  drop.addEventListener('pointerdown',()=>{
    if(!gameRunning) return;
    drop.remove();
    if(isGood){
      // TAP BLUE: +1, cleaner
      updateScore(1);
      adjustCleanliness(+0.07);
      floatBurst('+1', drop, '#1677ff');
      msgEl.textContent='Nice catch! (+1)';
      // Play both the existing bubble and the new droplet sound for a richer effect
      try{sndBubble.currentTime=0; sndBubble.play()}catch(e){}
      try{sndDroplet.currentTime=0; sndDroplet.play()}catch(e){}
      createRipple(left+size/2, pond.offsetTop+10, true);
    } else {
      // TAP RED: -2, dirtier
      updateScore(-2);
      adjustCleanliness(-0.12);
      floatBurst('−2', drop, '#e33');
      msgEl.textContent='You tapped a pollutant! (−2)';
      try{sndBloop.currentTime=0; sndBloop.play()}catch(e){}
      createRipple(left+size/2, pond.offsetTop+10, false);
    }
  });

  drop.addEventListener('animationend',()=>{
    drop.remove();
    if(!gameRunning) return;
    if(isGood){
      // MISS BLUE: -1 (lost clean water), pond slightly dirtier
      updateScore(-1);
      adjustCleanliness(-0.05);
      msgEl.textContent='Missed a clean drop (−1).';
      // reinforce with droplet sound (subtle)
      try{sndDroplet.currentTime=0; sndDroplet.play()}catch(e){}
      createRipple(left+size/2, pond.offsetTop+10, false);
    } else {
      // MISS RED: no penalty, just ripple
      createRipple(left+size/2, pond.offsetTop+10, false);
    }
  });

  container.appendChild(drop);
}

function adjustCleanliness(delta){
  pondCleanliness += delta;
  if(pondCleanliness>1) pondCleanliness=1;
  if(pondCleanliness<0) pondCleanliness=0;
  updatePond();
}

function updatePond(){
  const sat = 0.25 + pondCleanliness*0.9;
  const bright = 0.65 + pondCleanliness*0.35;
  pond.style.filter = `saturate(${sat}) brightness(${bright})`;
  meterFill.style.width = (pondCleanliness*100)+'%';
  meterFill.style.background = `hsl(${200+pondCleanliness*20}, 90%, 60%)`;
}

function floatBurst(text, el, color){
  const burst=document.createElement('div');
  burst.className='burst'; burst.textContent=text;
  burst.style.left=(el.offsetLeft + el.offsetWidth/2)+'px';
  burst.style.top=(el.offsetTop)+'px';
  burst.style.color=color;
  container.appendChild(burst);
  setTimeout(()=>burst.remove(),600);
}

function createRipple(x,y,playSound=true){
  const r=document.createElement('div');
  r.className='ripple'; r.style.left=x+'px'; r.style.top=y+'px';
  container.appendChild(r);
  if(playSound){ try{sndSparkle.currentTime=0; sndSparkle.play()}catch(e){} }
  setTimeout(()=>r.remove(),900);
}

function fireConfetti(){
  sizeCanvas();
  const pieces=[];
  const count=150;
  for(let i=0;i<count;i++){
    pieces.push({x:Math.random()*confettiCanvas.width,y:-10-Math.random()*confettiCanvas.height*0.25,r:2+Math.random()*4,vx:-1+Math.random()*2,vy:2+Math.random()*3,life:120+Math.random()*120});
  }
  (function tick(){
    ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
    for(const p of pieces){
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle = Math.random()<.33 ? '#FFC907' : (Math.random()<.5 ? '#2E9DF7' : '#4FCB53');
      ctx.fill();
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.02; p.life--;
    }
    for(let i=pieces.length-1;i>=0;i--){
      if(pieces[i].life<=0 || pieces[i].y>confettiCanvas.height+6) pieces.splice(i,1);
    }
    if(pieces.length>0) requestAnimationFrame(tick);
  })();
}
// End
