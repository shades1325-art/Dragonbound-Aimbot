// Bounded bot-room training controller. Native room proof and actions belong to adapter.
// Installing/creating it is inert. start() is the explicit user activation boundary.
(() => {
 const finite=n=>typeof n==='number'&&Number.isFinite(n),key=v=>(typeof v==='string'&&v.length>0)||(finite(v))?String(v):null;
 function create(adapter,options={}){
  if(typeof adapter?.inspect!=='function'||typeof adapter?.aimAndShoot!=='function')throw Error('Auto-learn requires inspect and aimAndShoot adapters');
  const now=typeof options.now==='function'?options.now:()=>Date.now(),bounded=(v,d,min,max)=>finite(v)?Math.max(min,Math.min(max,Math.floor(v))):d;
  const config={maxShots:bounded(options.maxShots,40,1,40),maxDurationMs:bounded(options.maxDurationMs,600000,1000,600000),cooldownMs:bounded(options.cooldownMs,1000,1000,60000),ackTimeoutMs:bounded(options.ackTimeoutMs,45000,1000,600000),tickIntervalMs:bounded(options.tickIntervalMs,0,0,1000),shots:options.shots??[0,1],elevations:options.elevations??[35,50,65,80],powers:options.powers??[140,220,300,400],lookPolicy:options.lookPolicy??'current',startIndex:bounded(options.startIndex,0,0,100000),stallTimeoutMs:bounded(options.stallTimeoutMs,90000,10000,600000)};
  if(!Array.isArray(config.shots)||!config.shots.length||config.shots.some(s=>s!==0&&s!==1))throw Error('Auto-learn only accepts S1/S2 shots');
  if(!Array.isArray(config.elevations)||!config.elevations.length||config.elevations.some(a=>!finite(a)||a< -90||a>90))throw Error('Invalid world elevations');
  if(!Array.isArray(config.powers)||!config.powers.length||config.powers.some(p=>!finite(p)||p<1||p>400))throw Error('Invalid powers');
  if(!['current','alternate',0,1].includes(config.lookPolicy))throw Error('Invalid look policy');
  config.shots=[...config.shots];config.elevations=[...config.elevations];config.powers=config.powers.map(Math.round);
  let running=false,phase='off',reason=null,lastError=null,roomKey=null,startedAt=null,lastActionAt=-Infinity,lastClock=-Infinity,attempted=0,fired=0,observed=0,starts=0,planIndex=0,inFlight=null,epoch=0,busy=false,interval=null,pauseTask=null,paused=false,runId=0,lastPlan=null,startPending=false,lastScene=null,lastProgressAt=0;
  const consumedTurns=new Set();
  function status(){return{running,phase,reason,lastError,roomKey,runId,startedAt,elapsedMs:startedAt===null?0:Math.max(0,now()-startedAt),attempted,fired,observed,starts,maxShots:config.maxShots,maxDurationMs:config.maxDurationMs,cooldownMs:config.cooldownMs,inFlight:inFlight?{...inFlight}:null,lastPlan:lastPlan?{...lastPlan,wind:{...lastPlan.wind}}:null,busy};}
  function notify(){try{adapter.onState?.(status())}catch{}}
  function setPhase(value,why=null){phase=value;reason=why;notify();}
  function clock(){const value=now();if(!finite(value)||value<lastClock)throw Error('Auto-learn clock moved backwards or is invalid');lastClock=value;return value;}
  async function stop(why='user-stop'){
   running=false;epoch++;if(interval!==null){clearInterval(interval);interval=null;}setPhase('stopped',why);
   if(paused){paused=false;let token;try{token=await pauseTask}catch{}try{await adapter.restoreAim?.(token)}catch(error){lastError='restoreAim: '+String(error?.message??error);notify();}}
   return status();
  }
  function proof(s){if(!s||s.botOnly!==true)return s?.botOnly===false?'human-or-unverified-player':'bot-proof-missing';if(!key(s.roomKey))return'room-identity-missing';if(s.phase!=='room'&&s.phase!=='game')return'left-bot-room';if(roomKey!==null&&key(s.roomKey)!==roomKey)return'room-changed';return null;}
  function plan(s){const n=planIndex++,shot=config.shots[n%config.shots.length],combo=Math.floor(n/config.shots.length)*5%(config.elevations.length*config.powers.length),elevation=config.elevations[combo%config.elevations.length],power=config.powers[Math.floor(combo/config.elevations.length)%config.powers.length],look=config.lookPolicy==='current'?([0,1].includes(s.look)?s.look:undefined):config.lookPolicy==='alternate'?Math.floor(n/config.shots.length)%2:config.lookPolicy;return{sequence:n+1,shot,selectedShot:shot,elevation,angleSpace:'world-elevation',power,look,wind:{power:s.wind.power,angle:s.wind.angle},roomKey,turnKey:key(s.turnKey)};}
  async function tick(){
   if(!running)return status();
   if(startedAt!==null&&now()-startedAt>=config.maxDurationMs){await stop('duration-limit');return status();}
   if(busy)return status();busy=true;const current=epoch;
   try{
    const time=clock();if(time-startedAt>=config.maxDurationMs){await stop('duration-limit');return status();}
    const s=await adapter.inspect();if(!running||current!==epoch)return status();const invalid=proof(s);if(invalid){await stop(invalid);return status();}const scene=[s.phase,key(s.turnKey),s.isMyTurn,s.isAiming,s.shotCount].join('|');if(scene!==lastScene){lastScene=scene;lastProgressAt=time;}else if(time-lastProgressAt>=config.stallTimeoutMs){await stop('native-state-stalled');return status();}
    if(inFlight){
     const increased=finite(s.shotCount)&&finite(inFlight.baselineCount)&&s.shotCount>inFlight.baselineCount;
     const newTurn=key(s.turnKey)!==null&&key(s.turnKey)!==inFlight.turnKey;
     const confirmed=increased||inFlight.explicitEvidence||(!finite(inFlight.baselineCount)&&inFlight.invoked&&newTurn);
     if(confirmed){observed++;inFlight=null;}
     else if(time-inFlight.time>=config.ackTimeoutMs){await stop('shot-evidence-timeout');return status();}
     else{setPhase('waiting-shot-evidence','A shot is in flight; no retry');return status();}
    }
    if(attempted>=config.maxShots){await stop('shot-limit');return status();}
    if(time-lastActionAt<config.cooldownMs){setPhase('cooldown');return status();}
    if(s.phase==='room'){
     if(s.master!==true){setPhase('waiting-room-master');return status();}
     if(startPending){setPhase('waiting-game-start');return status();}
     if(s.canStart!==true||typeof adapter.startGame!=='function'){setPhase('waiting-room-ready');return status();}
     lastActionAt=time;startPending=true;setPhase('starting-game');starts++;
     try{await adapter.startGame({roomKey,runId});}catch(error){lastError=String(error?.message??error);await stop('start-failed');}
     return status();
    }
    startPending=false;
    if(s.mobile!==15){setPhase('waiting-boomer');return status();}
    if(s.isMyTurn!==true||s.isAiming!==true){setPhase('waiting-own-turn');return status();}
    const turnKey=key(s.turnKey);if(turnKey===null){setPhase('waiting-turn-identity');return status();}
    if(consumedTurns.has(turnKey)){setPhase('waiting-next-turn');return status();}
    if(!finite(s.wind?.power)||s.wind.power<0||!finite(s.wind?.angle)){setPhase('waiting-wind');return status();}
    const next=plan(s);lastPlan=next;consumedTurns.add(turnKey);lastActionAt=time;attempted++;inFlight={turnKey,time,baselineCount:finite(s.shotCount)?s.shotCount:null,invoked:false,explicitEvidence:false};setPhase('shooting');
    try{
     const response=await adapter.aimAndShoot({...next,wind:{...next.wind}});if(!running||current!==epoch)return status();
     if(response?.fired===false&&response?.skipped===true){inFlight=null;consumedTurns.delete(turnKey);setPhase('skipped-plan',response.reason??'Adapter verified no shot was fired');return status();}
     if(response===true||response?.fired===true){fired++;inFlight.invoked=true;inFlight.explicitEvidence=response?.evidence===true;}
     setPhase('waiting-shot-evidence',response?.fired===false?'Native action not confirmed; no retry':'Waiting for captured shot');
    }catch(error){lastError=String(error?.message??error);setPhase('waiting-shot-evidence','Action failed or uncertain; no retry');}
    return status();
   }catch(error){lastError=String(error?.message??error);await stop('inspection-failed');return status();}
   finally{busy=false;notify();}
  }
  async function start(){
   if(running)return status();running=true;epoch++;const current=epoch;runId++;phase='validating';reason=null;lastError=null;roomKey=null;startedAt=null;lastActionAt=-Infinity;lastClock=-Infinity;attempted=fired=observed=starts=0;planIndex=config.startIndex;lastScene=null;lastProgressAt=0;inFlight=null;lastPlan=null;startPending=false;consumedTurns.clear();notify();
   try{const time=clock(),s=await adapter.inspect();if(!running||current!==epoch)return status();const invalid=proof(s);if(invalid){await stop(invalid);return status();}roomKey=key(s.roomKey);startedAt=time;
    if(typeof adapter.pauseAim==='function'){paused=true;pauseTask=Promise.resolve().then(()=>adapter.pauseAim());await pauseTask;if(!running||current!==epoch)return status();}
    setPhase('active');if(config.tickIntervalMs>0){interval=setInterval(()=>{tick().catch(()=>{})},Math.max(100,config.tickIntervalMs));}
    await tick();return status();
   }catch(error){lastError=String(error?.message??error);await stop('start-failed');return status();}
  }
  return Object.freeze({start,stop,tick,status});
 }
 Object.defineProperty(globalThis,'__reaBoomerAutoLearn',{value:{version:2,create},configurable:true});return{installed:true,version:2};
})()
