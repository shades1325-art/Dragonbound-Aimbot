import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {WebSocket}=require('ws');
const root=new URL('./',import.meta.url),endpoint=JSON.parse(await readFile(new URL('bridge-endpoint.json',root),'utf8')),target=JSON.parse(await readFile(new URL('inspect-game-args.json',root),'utf8'));
if(process.env.REA_DIRECT_WEBSOCKET)endpoint.websocket=process.env.REA_DIRECT_WEBSOCKET;
const socket=new WebSocket(endpoint.websocket),pending=new Map(),contexts=new Map();let sequence=0,sessionId;
socket.on('message',buffer=>{const m=JSON.parse(buffer.toString());if(m.method==='Runtime.executionContextCreated')contexts.set(m.params.context.id,m.params.context);if(!pending.has(m.id))return;const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)});
function call(method,params={},sid=sessionId){return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error('Timeout '+method))},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})}))})}
async function contents(fn){const properties=await call('Runtime.getProperties',{objectId:fn.objectId,ownProperties:false});const scopeId=properties.internalProperties?.find(p=>p.name==='[[Scopes]]')?.value?.objectId;if(!scopeId)return[];const scopes=await call('Runtime.getProperties',{objectId:scopeId,ownProperties:true});let result=[];for(const s of scopes.result){if(!s.value?.objectId||s.value.description==='Global')continue;const p=await call('Runtime.getProperties',{objectId:s.value.objectId,ownProperties:true});result.push(...p.result.filter(p=>p.value?.type==='object'&&p.value.objectId));}return result;}
try{
await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject)});({sessionId}=await call('Target.attachToTarget',{targetId:target.target_id,flatten:true},undefined));await call('Runtime.enable');
const {frameTree}=await call('Page.getFrameTree');
const context=[...contexts.values()].find(c=>c.origin==='https://dragonbound.net'&&c.auxData?.isDefault&&c.auxData?.frameId===frameTree.frame.id);
const fn=await call('Runtime.evaluate',{expression:'(globalThis.jQuery??globalThis.$)?._data(document.getElementById("btnShot1"),"events")?.click?.[0]?.handler??globalThis.__reaDragonRenderer?.myPlayer?.dn?.Shoot??globalThis.__reaDragonAim?.autoPlayer?.dn?.Shoot',contextId:context.id,returnByValue:false});
let found,networkBound=false;const candidates=await contents(fn.result),visited=new Set();
for(let index=0;index<candidates.length&&index<80;index++){
 const property=candidates[index];if(visited.has(property.value.objectId))continue;visited.add(property.value.objectId);
 const nativeNetwork=await call('Runtime.callFunctionOn',{objectId:property.value.objectId,functionDeclaration:'function(){if(!this.avatars_cache||!this.shop_cache||typeof this.SendPlayerShoot!=="function")return false;Object.defineProperty(globalThis,"__reaDragonNetwork",{value:this,configurable:true});return true}',returnByValue:true});if(nativeNetwork.result?.value)networkBound=true;
 const probe=await call('Runtime.callFunctionOn',{objectId:property.value.objectId,functionDeclaration:'function(){return this.game&&this.game.Shoot}',returnByValue:false});
 if(probe.result?.type!=='function'){const shoot=await call('Runtime.callFunctionOn',{objectId:property.value.objectId,functionDeclaration:'function(){return this.Shoot}',returnByValue:false});if(shoot.result?.type==='function')candidates.splice(index+1,0,...await contents(shoot.result));continue;}
 await call('Runtime.callFunctionOn',{objectId:property.value.objectId,functionDeclaration:'function(){Object.defineProperty(globalThis,"__reaDragonNetwork",{value:this,configurable:true});return true}',returnByValue:true});
 for(const game of await contents(probe.result)){
  const exposed=await call('Runtime.callFunctionOn',{objectId:game.value.objectId,functionDeclaration:'function(){if(!this.players||!this.ground)return null;Object.defineProperty(globalThis,"__reaDragonGame",{value:this,configurable:true});return {gameKeys:Object.keys(this),power:this.curUIPower,turn:this.turn,selectedShot:this.selectedShot,players:this.players.map(p=>({n:p.n,x:p.x,y:p.y,mobile:p.mobile,look:p.look,ang:p.ang,body:p.body,selected_shot:p.selected_shot}))}}',returnByValue:true});
  if(exposed.result?.value){
   found=exposed;
   const rendererFn=await call('Runtime.callFunctionOn',{objectId:game.value.objectId,functionDeclaration:'function(){return this.dragon2d.Update}',returnByValue:false});
   if(rendererFn.result?.objectId){
    for(const renderer of await contents(rendererFn.result)){
     const bound=await call('Runtime.callFunctionOn',{objectId:renderer.value.objectId,functionDeclaration:'function(){if(!this.renderer||!this.camera_container||!this.smoke_players)return null;Object.defineProperty(globalThis,"__reaDragonRenderer",{value:this,configurable:true});return{bound:true,hasPlayer:!!this.myPlayer,mobile:this.myPlayer?.mobile}}',returnByValue:true});
     if(bound.result?.value){console.log(JSON.stringify({scopeRenderer:bound.result.value}));break;}
    }
   }
   break;
  }
 }
 if(found)break;
}
if(!found){if(!networkBound)throw Error('Native network/game was not found in selected handler scopes');found={result:{value:{networkBound:true,gamePending:true}}};}
await writeFile(new URL('game-binding.json',root),JSON.stringify(found,null,2));console.log(JSON.stringify(found));
}finally{if(sessionId&&socket.readyState===WebSocket.OPEN)await call('Target.detachFromTarget',{sessionId},null).catch(()=>{});socket.close()}
