import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {selectTarget,selectRootContext,needsRestore} from '../app/runtime-recovery-policy.mjs';
const checks=[];function check(v,n){assert.ok(v,n);checks.push(n)}
const game={targetId:'new-game',type:'page',url:'https://dragonbound.net/#server-1'},other={targetId:'other',type:'page',url:'https://github.com/SanjoSolutions/gunbound-aimbot'};
check(selectTarget([other,game],'old-game')===game,'reopened sole DragonBound tab replaces closed target');check(selectTarget([other],'old-game')===null,'closed game waits and does not inject other origins');check(selectTarget([game,{...game,targetId:'another'}],'missing')===null,'ambiguous game tabs are not selected arbitrarily');
const iframe={id:99,origin:'https://dragonbound.net',auxData:{isDefault:true,frameId:'child'}},main={id:101,origin:'https://dragonbound.net',auxData:{isDefault:true,frameId:'root'}};
check(selectRootContext([iframe,main],'root')===main,'same-origin iframe cannot be mistaken for main game world');check(selectRootContext([iframe],'root')===null,'missing root context waits instead of injecting iframe');
check(needsRestore({network:false,overlay:false,modules:false}),'reload with erased globals triggers full restore');check(needsRestore({network:true,overlay:false,modules:true}),'removed panel is restored');check(!needsRestore({network:true,overlay:true,modules:true}),'healthy overlay is preserved with its preferences');
const result={passed:true,checks};console.log(JSON.stringify(result));
