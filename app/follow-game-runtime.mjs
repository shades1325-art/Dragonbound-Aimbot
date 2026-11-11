// Track only the already-authorized DragonBound page until it closes or reloads.
// Reads native wrapper scopes through CDP; does not patch game prototypes or shoot.
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {WebSocket}=require('ws');
const root=new URL('./',import.meta.url),target=JSON.parse(await readFile(new URL('inspect-game-args.json',root),'utf8'));
const active=(await readFile(new URL('file:///'+process.env.LOCALAPPDATA.replaceAll('\\','/')+'/Google/Chrome/User Data/DevToolsActivePort'),'utf8')).trim().split(/\r?\n/);
if(!/^\d+$/.test(active[0])||!/^\/devtools\/browser\/[^/]+$/.test(active[1]))throw Error('Invalid browser debugging endpoint');
const browserUrl=process.env.REA_DIRECT_WEBSOCKET??`ws://127.0.0.1:${active[0]}${active[1]}`;
if(!/^ws:\/\/127\.0\.0\.1:\d+\//.test(browserUrl))throw Error('Runtime tracker only accepts a local browser endpoint');
const socket=new WebSocket(browserUrl),pending=new Map(),contexts=new Map();
let sequence=0,sessionId,contextId,stopped=false,bindingChanges=0,lastError=null;
socket.on('message',buffer=>{const m=JSON.parse(buffer.toString());
 if(m.sessionId===sessionId&&m.method==='Runtime.executionContextCreated'){const c=m.params.context;contexts.set(c.id,c);}
 if(m.method==='Target.detachedFromTarget'&&m.params.sessionId===sessionId)stopped=true;
 if(m.sessionId===sessionId&&m.method==='Runtime.executionContextDestroyed'&&m.params.executionContextId===contextId)stopped=true;
 if(!pending.has(m.id))return;const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);
});
socket.on('close',()=>{stopped=true});
function call(method,params={},sid=sessionId){return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error('Timeout '+method))},10000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})}))})}
function evaluate(expression,returnByValue=true){return call('Runtime.evaluate',{expression,contextId,returnByValue,objectGroup:'rea-follow-game'})}
async function objectScopes(fn){
 if(!fn?.objectId)return[];const properties=await call('Runtime.getProperties',{objectId:fn.objectId,ownProperties:false});
 const scopesId=properties.internalProperties?.find(p=>p.name==='[[Scopes]]')?.value?.objectId;if(!scopesId)return[];
 const scopes=await call('Runtime.getProperties',{objectId:scopesId,ownProperties:true}),result=[];
 for(const scope of scopes.result??[]){if(!scope.value?.objectId||scope.value.description==='Global')continue;const values=await call('Runtime.getProperties',{objectId:scope.value.objectId,ownProperties:true});result.push(...(values.result??[]).filter(p=>p.value?.type==='object'&&p.value.objectId));}
 return result;
}
async function rebind(){
 const facade=await evaluate('globalThis.__reaDragonNetwork?.game',false);if(!facade.result?.objectId)return false;
 const shoot=await call('Runtime.callFunctionOn',{objectId:facade.result.objectId,functionDeclaration:'function(){return this.Shoot}',returnByValue:false,objectGroup:'rea-follow-game'});
 for(const candidate of await objectScopes(shoot.result)){
  const probe=await call('Runtime.callFunctionOn',{objectId:candidate.value.objectId,functionDeclaration:'function(){return !!(this.players&&this.ground&&this.dragon2d&&!this.destructed)}',returnByValue:true});if(!probe.result?.value)continue;
  const rendererFn=await call('Runtime.callFunctionOn',{objectId:candidate.value.objectId,functionDeclaration:'function(){return this.dragon2d.Update}',returnByValue:false,objectGroup:'rea-follow-game'});
  for(const renderer of await objectScopes(rendererFn.result)){
   const bound=await call('Runtime.callFunctionOn',{objectId:renderer.value.objectId,functionDeclaration:`function(game,facade){
    if(!this.renderer||!this.camera_container||!this.smoke_players||globalThis.__reaDragonNetwork?.game!==facade)return null;
    Object.defineProperty(globalThis,'__reaDragonRenderer',{value:this,configurable:true});
    Object.defineProperty(globalThis,'__reaDragonGame',{value:game,configurable:true});
    const state=globalThis.__reaDragonRuntimeLink;state.facade=facade;state.boundAt=Date.now();state.changes++;state.state='bound';
    const aim=globalThis.__reaDragonAim;if(aim){aim.autoSignature='';aim.lastSearch=-Infinity;aim.lastCompute=0;}
    return{bound:true,mobile:this.myPlayer?.mobile,hasPlayer:!!this.myPlayer};
   }`,arguments:[{objectId:candidate.value.objectId},{objectId:facade.result.objectId}],returnByValue:true});
   if(bound.result?.value?.bound){bindingChanges++;console.log(JSON.stringify({event:'bound-current-game',...bound.result.value}));return true;}
  }
 }
 return false;
}
async function save(state){await writeFile(new URL('runtime-follow-status.json',root),JSON.stringify({pid:process.pid,targetId:target.target_id,state,bindingChanges,lastError,time:new Date().toISOString()},null,2))}
try{
 await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject)});
 ({sessionId}=await call('Target.attachToTarget',{targetId:target.target_id,flatten:true},null));
 await call('Runtime.enable');const {frameTree}=await call('Page.getFrameTree');contextId=[...contexts.values()].find(c=>c.origin==='https://dragonbound.net'&&c.auxData?.isDefault&&c.auxData?.frameId===frameTree.frame.id)?.id;
 if(!contextId)throw Error('DragonBound main world not available');
 const initialized=await evaluate(`(()=>{if(!globalThis.__reaDragonNetwork)throw Error('Run bind-game.mjs once before starting runtime tracking');const link={facade:null,boundAt:null,changes:0,state:'connecting',pid:${process.pid}};Object.defineProperty(globalThis,'__reaDragonRuntimeLink',{value:link,configurable:true});return true})()`);
 if(initialized.exceptionDetails)throw Error(initialized.exceptionDetails.text);
 console.log(JSON.stringify({event:'runtime-tracker-started',pid:process.pid,targetId:target.target_id}));await save('running');
 while(!stopped){
  try{
   const result=await evaluate(`(()=>{const n=globalThis.__reaDragonNetwork,s=globalThis.__reaDragonRuntimeLink,d=globalThis.__reaDragonRenderer;if(!n||!s)return{stop:true};if(!n.game){s.state='lobby';s.facade=null;if(d?.myPlayer&&globalThis.__reaDragonGame?.destructed)Object.defineProperty(globalThis,'__reaDragonRenderer',{value:null,configurable:true});return{lobby:true}}return{needsBinding:n.game!==s.facade||!d?.renderer?.view?.isConnected}})()`);
   if(result.exceptionDetails)throw Error(result.exceptionDetails.text);
   if(result.result?.value?.stop)break;
   if(result.result?.value?.needsBinding)await rebind();
   lastError=null;
  }catch(error){lastError=error.message;if(/No target|Session.*closed|Cannot find context|Inspected target.*closed/.test(lastError)){stopped=true;break;}console.error(JSON.stringify({event:'runtime-tracker-error',message:lastError}));}
  await save('running');await call('Runtime.releaseObjectGroup',{objectGroup:'rea-follow-game'}).catch(()=>{});
  await new Promise(resolve=>setTimeout(resolve,500));
 }
}finally{
 if(sessionId&&socket.readyState===WebSocket.OPEN)await call('Target.detachFromTarget',{sessionId},null).catch(()=>{});
 socket.close();await save('stopped');
}
