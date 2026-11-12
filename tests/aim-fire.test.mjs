import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {overlayFixture} from './helpers/overlay-fixture.mjs';
const trusted={isTrusted:true};
async function setup(){const h=await overlayFixture(),sent=[],network={game:{},Shoot(power){sent.push(power)}},game={players:[h.p],my_player_index:0,my_player_number:0,turn:0,selectedShot:1,curUIPower:7};h.p.dn={Shoot:power=>network.Shoot(power)};Object.assign(h.context,{__reaDragonNetwork:network,__reaDragonRuntimeLink:{facade:network.game},__reaDragonGame:game});h.step(1000);return{...h,sent,network,game,fire:()=>h.nodes.get('rea-aduka-fire').listeners.click(trusted)};}
test('bound player facade refreshes the scene and sends one committed integer power',async()=>{const h=await setup();assert.notEqual(h.p.dn,h.network);h.p.x+=25;h.nodes.get('powerBar').style.width='7px';const r=h.fire();assert.equal(r.fired,true);assert.equal(h.sent.length,1);assert.equal(h.sent[0],h.aim.lastShot.power);assert.equal(h.game.curUIPower,h.sent[0]);assert.ok(Number.isInteger(r.power));assert.equal(h.aim.lastShot.player.x,h.p.x);assert.equal(h.aim.shotHistory.length,1);assert.equal(h.fire().fired,false);});
test('Mouse 5 consumes browser-forward events and pointer/mouse duplicates fire once',async()=>{const h=await setup();let prevented=0;const emit=type=>{for(const f of h.listeners.get(type)??[])f({type,button:4,isTrusted:true,preventDefault(){prevented++},stopImmediatePropagation(){}})};emit('pointerdown');emit('mousedown');emit('auxclick');assert.equal(h.sent.length,1);emit('pointerup');emit('mouseup');h.advance(801);emit('mousedown');assert.equal(h.sent.length,2);assert.ok(prevented>=6);assert.equal(h.aim.lastShot.source,'mouse5');h.aim.destroy();assert.equal(h.listeners.get('mousedown').size,0);});
test('shot, player, turn and native angle mismatches cannot send a shot',async()=>{let h=await setup();h.game.selectedShot=0;assert.equal(h.fire().fired,false);assert.equal(h.sent.length,0);h=await setup();h.game.players=[{...h.p}];assert.equal(h.fire().fired,false);assert.equal(h.sent.length,0);h=await setup();h.game.turn=1;assert.equal(h.fire().fired,false);h=await setup();h.p.ChangeAngleTo=function(){this.ang=0};assert.equal(h.fire().fired,false);assert.equal(h.sent.length,0);});
test('untrusted synthetic button events do not fire',async()=>{const h=await setup();assert.equal(h.nodes.get('rea-aduka-fire').listeners.click({isTrusted:false}).fired,false);assert.equal(h.sent.length,0);});
test('received calibration uses committed power and wind after the UI and pose change',async()=>{
 const h=await setup();assert.equal(h.fire().fired,true);const shot=h.aim.lastShot,s={x:shot.origin.x,y:shot.origin.y,ang:shot.origin.angle,power:500,ax:shot.model.ax,ay:shot.model.ay,t:0};
 h.nodes.get('powerBar').style.width='399px';h.renderer.wind_power=20;h.renderer.wind_angle=33;h.p.x+=100;
 h.renderer.camera_container.children=[{shot:{s:Object.values(s),start:s,img:8,shot_type:1,time:1000},zp:{GetPosAtTime:t=>h.context.__reaDragonBallistics.positionAt(s,t)}}];
 h.context.setInterval=()=>0;h.context.clearInterval=()=>{};
 vm.runInContext(await readFile(new URL('../app/collect-shots.js',import.meta.url),'utf8'),h.context);
 const record=h.context.__reaDragonCollector.samples.at(-1);assert.equal(record.uiPower,shot.power);assert.equal(record.uiPowerSource,'committed-aim-shot');assert.equal(record.wind.power,shot.wind.power);assert.equal(record.player.x,shot.player.x);assert.equal(record.isLocal,true);
 h.advance(501);h.renderer.camera_container.children=[{shot:{s:Object.values(s),start:s,img:8,shot_type:1,time:1000},zp:{GetPosAtTime:t=>h.context.__reaDragonBallistics.positionAt(s,t)}}];h.context.__reaDragonCollector.scan();assert.notEqual(h.context.__reaDragonCollector.samples.at(-1).uiPowerSource,'committed-aim-shot');
});
