// User-requested page-local overlay recovery, only for the DragonBound origin.
// Stops with this Chrome browser. No startup service, input driver, or auto firing.
import {readFile,writeFile,appendFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {selectTarget,selectRootContext,needsRestore} from './runtime-recovery-policy.mjs';
const root=new URL('./',import.meta.url),cwd=fileURLToPath(root),require=createRequire(import.meta.url);
const {WebSocket}=require('ws'),active=(await readFile(new URL('file:///'+process.env.LOCALAPPDATA.replaceAll('\\','/')+'/Google/Chrome/User Data/DevToolsActivePort'),'utf8')).trim().split(/\r?\n/);
if(!/^\d+$/.test(active[0])||!/^\/devtools\/browser\/[^/]+$/.test(active[1]))throw Error('Invalid Chrome endpoint');
const browserUrl=process.env.REA_SUPERVISOR_WEBSOCKET??`ws://127.0.0.1:${active[0]}${active[1]}`;
if(!/^ws:\/\/127\.0\.0\.1:\d+\//.test(browserUrl))throw Error('Runtime supervisor only accepts a local browser endpoint');
const socket=new WebSocket(browserUrl),pending=new Map(),contexts=new Map();
const config=JSON.parse(await readFile(new URL('inspect-game-args.json',root),'utf8'));
const files=['ballistics-v2.js','collect-shots.js','aduka-bootstrap.js','boomer-zero-prior.js','boomer-learned-profiles.js','boomer-live-model.js','boomer-path-template.js','boomer-ss.js','boomer-search.js','boomer-guide-methods.js','ice-prior.js','ice-wind-model.js','tornado-method.js','mirror-predictor.js','wind-clock.js','turtle-prior.js','turtle-wave.js','turtle-wave-fast.js','turtle-ss-timing.js','turtle-model.js','turtle-pair-fast.js','turtle-skybomb.js','nak-model.js','nak-shot.js','raon-wave.js','raon-model.js','raon-shot.js','grub-model.js','grub-shot.js','aduka-autoaim.js','boomer-auto-learn.js','boomer-auto-learn-adapter.js','enable-aim-overlay.js'],sources=await Promise.all(files.map(f=>readFile(new URL(f,root),'utf8')));
let preferences={hidden:false,guiHidden:false,autoAdjust:true,settings:{mode:'auto',fixedDisplay:null,fixedLook:null,clearance:4,allowLongArc:false}};
try{preferences={...preferences,...JSON.parse(await readFile(new URL('runtime-aim-preferences.json',root),'utf8'))}}catch{}
let nextId=0,sessionId,targetId=config.target_id,contextId,contextStamp,stopped=false,child,installs=0,lastError=null,lastStatus='',lastWrite=0,forceRestore=false,appliedRequestId=null;
process.on('SIGTERM',()=>{stopped=true});
socket.on('message',buffer=>{const m=JSON.parse(buffer.toString());if(m.sessionId===sessionId){if(m.method==='Runtime.executionContextCreated')contexts.set(m.params.context.id,m.params.context);if(m.method==='Runtime.executionContextDestroyed')contexts.delete(m.params.executionContextId);if(m.method==='Runtime.executionContextsCleared')contexts.clear();}
 if(m.method==='Target.detachedFromTarget'&&m.params.sessionId===sessionId){sessionId=null;contexts.clear();}
 const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);
});
socket.on('close',()=>{stopped=true});socket.on('error',e=>{lastError=e.message;stopped=true});
function call(method,params={},sid=sessionId){return new Promise((resolve,reject)=>{const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(Error('Timeout '+method))},10000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})}))})}
function evaluate(expression){return call('Runtime.evaluate',{expression,contextId,returnByValue:true,awaitPromise:true,objectGroup:'rea-recovery'})}
async function status(state){const value={pid:process.pid,state,targetId,appliedRequestId,contextStamp,trackerPid:child?.pid??null,installs,lastError};const serialized=JSON.stringify(value);if(serialized===lastStatus&&Date.now()-lastWrite<5000)return;lastStatus=serialized;lastWrite=Date.now();await writeFile(new URL('runtime-supervisor-status.json',root),JSON.stringify({...value,time:new Date().toISOString()},null,2));}
async function stopChild(){if(!child)return;const processRef=child;child=null;processRef.kill();await new Promise(resolve=>{const timer=setTimeout(resolve,1500);processRef.once('exit',()=>{clearTimeout(timer);resolve()})});}
function runNode(file){return new Promise((resolve,reject)=>{const proc=spawn(process.execPath,[file],{cwd,windowsHide:true,env:{...process.env,REA_DIRECT_WEBSOCKET:browserUrl},stdio:['ignore','pipe','pipe']});let error='';proc.stderr.on('data',c=>{error=(error+c.toString()).slice(-2000)});proc.stdout.resume();proc.once('error',reject);proc.once('exit',code=>code===0?resolve():reject(Error(`${file}: ${error.slice(-600)}`)));})}
function startTracker(){if(child&&!child.killed&&child.exitCode===null)return;const proc=spawn(process.execPath,['follow-game-runtime.mjs'],{cwd,windowsHide:true,env:{...process.env,REA_DIRECT_WEBSOCKET:browserUrl},stdio:['ignore','pipe','pipe']});child=proc;proc.stdout.on('data',c=>{for(const line of c.toString().trim().split('\n'))if(line)console.log(line)});proc.stderr.on('data',c=>{lastError=c.toString().slice(-600)});proc.once('exit',()=>{if(child===proc)child=null});}
const learnedIds=new Set();async function saveLearnQueue(){const result=await evaluate('globalThis.__reaBoomerLearnQueue?.slice(0,8)??[]'),entries=result.result?.value??[];if(!Array.isArray(entries)||!entries.length)return;const valid=entries.filter(e=>typeof e?.id==='string'&&e.record?.mobile===15),fresh=valid.filter(e=>!learnedIds.has(e.id));if(fresh.length){await mkdir(new URL('data/',root),{recursive:true});await appendFile(new URL('data/boomer-auto-learn-shots.jsonl',root),fresh.map(e=>JSON.stringify(e)).join('\n')+'\n');for(const e of fresh)learnedIds.add(e.id);}const ids=valid.map(e=>e.id);await evaluate('(()=>{const ids=new Set('+JSON.stringify(ids)+');const q=globalThis.__reaBoomerLearnQueue??[];for(let i=q.length-1;i>=0;i--)if(ids.has(q[i].id))q.splice(i,1);globalThis.__reaBoomerLearnSaved=(globalThis.__reaBoomerLearnSaved??0)+'+fresh.length+';return true})()');}
async function detach(){await stopChild();if(sessionId){await call('Target.detachFromTarget',{sessionId},null).catch(()=>{});sessionId=null;}contexts.clear();contextId=null;contextStamp=null;}
async function install(){
 await stopChild();await writeFile(new URL('inspect-game-args.json',root),JSON.stringify({...config,target_id:targetId},null,2));
 await runNode('bind-game.mjs');
 if(forceRestore)await evaluate('if(globalThis.__reaDragonAim){globalThis.__reaDragonAim.hidden=false;globalThis.__reaDragonAim.guiHidden=false;}');
 const prep=await evaluate(`(()=>{if(!globalThis.__reaDragonRenderer)Object.defineProperty(globalThis,'__reaDragonRenderer',{value:null,configurable:true});if(!globalThis.__reaDragonAim?.panel?.isConnected){globalThis.__reaDragonAim?.destroy?.();for(const id of ['rea-dragon-trajectory','rea-dragon-aim-panel','rea-gui-show'])document.getElementById(id)?.remove();const p=${JSON.stringify(preferences)};Object.defineProperty(globalThis,'__reaDragonAim',{value:{hidden:p.hidden,guiHidden:!!p.guiHidden,settings:p.settings,panel:{querySelector:()=>({checked:p.autoAdjust})}},configurable:true})}return true})()`);
 if(prep.exceptionDetails)throw Error(prep.exceptionDetails.text);
 // Overlay/model updates must not reset an already-authorized sampling run
 // when its controller and adapter versions are unchanged.
 const learner=await evaluate('!!(globalThis.__reaBoomerAutoLearn?.version===2&&globalThis.__reaBoomerLearnSession?.version===2&&globalThis.__reaBoomerLearnSession.status?.()?.running)');
 if(learner.exceptionDetails)throw Error(learner.exceptionDetails.text);
 for(let i=0;i<sources.length;i++){if(learner.result?.value&&['boomer-auto-learn.js','boomer-auto-learn-adapter.js'].includes(files[i]))continue;const result=await evaluate(sources[i]);if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text);}
 installs++;startTracker();console.log(JSON.stringify({event:'overlay-restored',targetId,installs,version:33}));
}
try{
 if(socket.readyState===WebSocket.CLOSED)throw Error(lastError??'Chrome remote debugging connection closed');
 if(socket.readyState!==WebSocket.OPEN)await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject)});
 console.log(JSON.stringify({event:'supervisor-started',pid:process.pid}));
 while(!stopped){
  try{
   if(globalThis.__oneClickRequestId&&globalThis.__oneClickRequestId!==appliedRequestId)forceRestore=true;
   const {targetInfos}=await call('Target.getTargets',{},null),selected=selectTarget(targetInfos,targetId);
   if(!selected){if(sessionId)await detach();await status('waiting-for-game-tab');await new Promise(r=>setTimeout(r,1000));continue;}
   if(!sessionId||selected.targetId!==targetId){await detach();targetId=selected.targetId;({sessionId}=await call('Target.attachToTarget',{targetId,flatten:true},null));await call('Runtime.enable');}
   const {frameTree}=await call('Page.getFrameTree'),context=selectRootContext([...contexts.values()],frameTree.frame.id);
   if(!context){await status('waiting-for-main-world');await new Promise(r=>setTimeout(r,500));continue;}
   const stamp=`${targetId}:${context.uniqueId??context.id}`;if(stamp!==contextStamp){await stopChild();contextStamp=stamp;}contextId=context.id;
   const probe=await evaluate(`(()=>{const a=globalThis.__reaDragonAim,e=document.getElementById('btnShot1'),jq=globalThis.jQuery??globalThis.$;return{handler:!!(e&&jq?._data(e,'events')?.click?.[0]?.handler),network:!!globalThis.__reaDragonNetwork,overlay:!!(a?.enabled&&a.panel?.isConnected),modules:!!(globalThis.__reaDragonBallistics?.version>=5&&globalThis.__reaTurtleModel?.version>=5&&globalThis.__reaTurtleSS?.version>=3&&globalThis.__reaTurtleSky?.version>=6&&globalThis.__reaNakModel&&globalThis.__reaNakShot&&globalThis.__reaRaonWave&&globalThis.__reaRaonModel&&globalThis.__reaRaonShot?.version>=2&&globalThis.__reaGrubModel&&globalThis.__reaGrubShot&&globalThis.__reaMirror?.version>=2&&globalThis.__reaTornadoMethod?.version>=4&&globalThis.__reaTurtleWave?.version>=3&&globalThis.__reaTurtlePrior&&globalThis.__reaDragonAutoAim?.version>=20&&globalThis.__reaDragonCollector&&globalThis.__reaWindClock&&globalThis.__reaBoomerZeroPrior&&globalThis.__reaBoomerLive?.version>=3&&globalThis.__reaBoomerPaths?.version>=3&&globalThis.__reaBoomerSS?.version>=1&&globalThis.__reaBoomerSearch?.version>=1&&globalThis.__reaBoomerGuide?.version>=3&&globalThis.__reaBoomerAutoLearn?.version>=2&&globalThis.__reaBoomerLearnSession?.version>=2&&globalThis.__reaIcePrior?.version>=2&&globalThis.__reaIceWind?.version>=2&&a?.version>=33),preferences:a?.enabled?{hidden:a.hidden,guiHidden:!!a.guiHidden,autoAdjust:!!a.panel?.querySelector('#rea-aduka-auto-adjust')?.checked,settings:a.settings}:null}})()`);
   if(probe.exceptionDetails)throw Error(probe.exceptionDetails.text);const flags=probe.result?.value;
   if(flags?.preferences){const changed=JSON.stringify(preferences)!==JSON.stringify(flags.preferences);preferences=flags.preferences;if(forceRestore){preferences.hidden=false;preferences.guiHidden=false;}if(changed)await writeFile(new URL('runtime-aim-preferences.json',root),JSON.stringify(preferences,null,2));}
   if(needsRestore(flags)||forceRestore){if(!flags?.handler){await status('waiting-for-game-client');await new Promise(r=>setTimeout(r,1000));continue;}await status('restoring');await install();appliedRequestId=globalThis.__oneClickRequestId??null;forceRestore=false;}
   else startTracker();
   await evaluate('(()=>{globalThis.__reaDragonCollector?.scan();return globalThis.__reaBoomerLearnSession?.tick()??null})()');await saveLearnQueue();lastError=null;await status('running');await call('Runtime.releaseObjectGroup',{objectGroup:'rea-recovery'}).catch(()=>{});
  }catch(error){lastError=error.message;await status('retrying');if(/No target|Session.*closed|Cannot find context|detached/.test(lastError)){await detach();}}
  await new Promise(r=>setTimeout(r,1000));
 }
}finally{await detach();if(socket.readyState===WebSocket.OPEN)socket.close();await status('stopped');}
