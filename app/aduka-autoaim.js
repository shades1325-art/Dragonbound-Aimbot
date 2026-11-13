(() => {
 function find(api,renderer,model,player,target,modelForPlayer,options={}){
  if(![2,11,14,15,17,19,21].includes(player?.mobile)&&!['Ice','Turtle','Nak','Raon','Raon Launcher','Grub','Frog'].includes(player?.mobile_data?.name))return{ready:false,reason:'Autoaim hỗ trợ Aduka, Boomer, ICE, Turtle, Nak, Raon và Grub'};
  if(player.mobile===2&&player.selected_shot>1)return{ready:false,reason:'Autoaim Aduka hiện hỗ trợ S1 và S2'};
  if(!target)return{ready:false,reason:'Chọn mục tiêu trong danh sách'};
  if(player.mobile===15&&globalThis.__reaBoomerSearch)return globalThis.__reaBoomerSearch.find(api,renderer,model,player,target,modelForPlayer,options);
  if(player.mobile===15&&globalThis.__reaBoomerPaths){const c=globalThis.__reaDragonCollector,path=globalThis.__reaBoomerPaths.find(api,renderer,player,target,[...(c?.calibration??[]),...(c?.samples??[])],c?.session,options);if(path?.ready)return path;}
  if(!model?.valid&&(player.mobile!==15||typeof modelForPlayer!=='function'))return{ready:false,reason:model?.reason||'Bắn một phát thường để hiệu chuẩn Autoaim'};
  const ssMode=options.turtleSSMode??model?.turtleSSMode??'auto',skyMode=model?.turtleSS&&['auto','skybomb','timebomb'].includes(ssMode),mirror=globalThis.__reaMirror;
  if(model?.turtle&&!skyMode&&options.preferMirror!==false&&!options.mirrorSearchPass&&renderer.weathers?.some(w=>w.weather_type===7)&&mirror?.prefer){
   const normal=find(api,renderer,model,player,target,modelForPlayer,{...options,mirrorSearchPass:true});
   if(!normal?.ready)return normal;
   if(mirror.benefit(normal,target).hasMirror)return mirror.prefer(normal,null,target);
   const reflected=globalThis.__reaTornadoMethod?.find(api,renderer,model,player,target,{...options,requireMirror:true});
   return mirror.prefer(reflected,normal,target);
  }
  if(model?.frog)return globalThis.__reaFrogShot?.find(api,renderer,model,player,target,{...options,cooperative:true})??{ready:false,reason:'Frog: waiting for predictor'};
  if(model?.grub)return globalThis.__reaGrubShot?.find(api,renderer,model,player,target,options)??{ready:false,reason:'Chưa nạp bộ tính Grub'};
  if(model?.raon)return globalThis.__reaRaonShot?.find(api,renderer,model,player,target,options)??{ready:false,reason:'Chưa nạp bộ tính Raon'};
  if(model?.nakAirOnly)return globalThis.__reaNakShot?.find(api,renderer,model,player,target,options)??{ready:false,reason:'Chưa nạp bộ tính Nak S2 chui đất'};
  if(skyMode)return globalThis.__reaTurtleSky?.find(api,renderer,model,player,target,{...options,turtleSSMode:ssMode,cooperative:true})??{ready:false,reason:'Chưa nạp bộ tính Turtle SS tách mảnh'};
  const min=player.minang??0,max=player.maxang??180,centers=model?.turtleSS||model?.turtlePair?[{x:target.x,y:target.y+1},{x:target.x-6,y:target.y+1},{x:target.x+6,y:target.y+1}]:[{x:target.x,y:target.y-14},{x:target.x-8,y:target.y-12},{x:target.x+8,y:target.y-12},{x:target.x,y:target.y-26}],candidates=[],fixed=options.mode==='fixed'&&Number.isFinite(options.fixedDisplay);
  const looks=fixed&&[0,1].includes(options.fixedLook)?[options.fixedLook]:[player.look,1-player.look];
  for(const look of looks){
   const angles=fixed?[options.fixedDisplay,180-options.fixedDisplay].map(theta=>look===0?180-theta-player.body:theta+player.body).filter(angle=>angle>=min-1e-6&&angle<=max+1e-6):Array.from({length:Math.max(0,Math.floor(max)-Math.ceil(min)+1)},(_,i)=>Math.ceil(min)+i);
   for(const angle of [...new Set(angles)]){
   const variant={...player,look,ang:angle};let m=player.mobile===15&&(renderer.wind_power!==0||model?.boomerZeroPrior||model?.boomerSS)&&typeof modelForPlayer==='function'?modelForPlayer(variant):model;
   if(!m?.valid)continue;
   if(player.mobile===15&&renderer.wind_power===0&&!m.boomerSS){const base=m,limit=base.maxTime??4.1;if(options.allowLongArc&&limit<8)m={...base,provisional:true,maxTime:8,observedHorizon:limit,longArcExtrapolated:true,positionAllowance:(power,t)=>(base.errorRadius||10)+8*t*t};else if(base.maxTime===undefined)m={...base,maxTime:4.1};}
   const origin=api.launch(variant);if(!origin)continue;origin.x+=m.dx||0;origin.y+=m.dy||0;
   const displayAngle=origin.angle>90?180-origin.angle:origin.angle;
   for(const center of centers){const solved=api.solve(m,origin,center.x,center.y);if(!solved||solved.t<.07||solved.t>Math.min(10,m.maxTime??10))continue;const power=Math.round(solved.power);if(power<1||power>400)continue;const delta=Math.abs(angle-player.ang),face=look===player.look?0:.12,extrapolation=power<(m.minPower??0)-10||power>(m.maxPower??400)+10?.3:0;const trueZone=angle>=(player.truang_min??min)&&angle<=(player.truang_max??max)?0:.08,coverage=m.angleExtrapolated?.4:0,centerPenalty=Math.abs(center.x-target.x)*.004+Math.abs(center.y-(target.y-14))*.003;
    const preference=(options.mode==='high'?solved.t*.15+Math.max(0,90-displayAngle)*.025:solved.t)+(m.turtlePair?Math.max(0,2.6-solved.t)*3:0);
    candidates.push({look,angle,power,t:solved.t,origin,model:m,score:preference+delta*.003+face+extrapolation+trueZone+coverage+centerPenalty,targetNumber:target.n});
   }
  }}
  candidates.sort((a,b)=>a.score-b.score);let blockedWeather=false;
  let singleHit=null,pairAttempts=0,bestSS=null,ssAttempts=0,singlePotential=false,singleTraces=0;const seen=new Set();for(const candidate of candidates){const key=`${candidate.look}:${candidate.angle}:${candidate.power}`;if(seen.has(key))continue;seen.add(key);const m=candidate.model,path=api.trajectory(renderer,m,candidate.origin,candidate.power,target,Math.min(10,candidate.t+(m.turtlePair?.7:.35)),{clearance:Math.max(0,Math.min(20,options.clearance??0)),searchOnly:true,ignorePlayerContact:!!m.turtleSS,preferBoth:!!m.turtlePair&&!options.turtleSinglePass});if(path.weatherEntry)blockedWeather=true;if(path.singlePotential)singlePotential=true;if(m.turtlePair&&options.turtleSinglePass&&!path.fastReject&&++singleTraces>8)break;if(m.turtleSS){if(path.hit?.type!=='ground'||path.hit.clearanceOnly||Math.abs(path.hit.x-target.x)>14||Math.abs(path.hit.y-target.y)>20)continue;}else if(m.turtlePair?!(path.pairHits>0):path.hit?.type!=='target')continue;
   const velocity=api.at(m,candidate.origin,candidate.power,1e-3),vx=(velocity.x-candidate.origin.x)/1e-3,vy=(velocity.y-candidate.origin.y)/1e-3,start={x:candidate.origin.x,y:candidate.origin.y,ang:Math.atan2(-vy,vx)*180/Math.PI,power:Math.hypot(vx,vy),ax:m.ax,ay:m.ay};const bands=(renderer.weathers??[]).filter(w=>w.weather_type===8).map(w=>({x:w.x,size:w.size,left:w.x-w.size/2,right:w.x+w.size/2,type:w.weather_type}));
   const weather=globalThis.__reaDragonBallistics.firstTornadoEntry(start,path.hit.t,bands);if(weather&&!path.weatherHandled){blockedWeather=true;continue;}
   const selectedModel=path.weatherHandled?{...m,provisional:true,mirrorEstimate:!!path.mirrorReflections?.length,tornadoEstimate:(path.tornadoTransitions??path.weatherTransitions)>0,positionAllowance:(power,t)=>20+3*t*t}:m.longArcExtrapolated&&candidate.t<=m.observedHorizon?{...m,longArcExtrapolated:false}:m;
   const found={...candidate,model:renderer.weathers?.some(w=>w.weather_type===6)?{...selectedModel,provisional:true,randomWeatherIgnored:true}:selectedModel,mobile:player.mobile,ready:true,path,displayAngle:candidate.origin.angle>90?180-candidate.origin.angle:candidate.origin.angle,provisional:!!selectedModel.provisional||renderer.weathers?.some(w=>w.weather_type===6),target:{n:target.n,x:target.x,y:target.y}};if(m.turtleSS){const impactError=Math.hypot(path.hit.x-target.x,path.hit.y-(target.y+1));const result={...found,turtleSSDirect:true,predictedHit:false,impactError,provisional:true,t:path.hit.t};if(!bestSS||impactError<bestSS.impactError)bestSS=result;if(impactError<=5||++ssAttempts>=64)return bestSS;continue;}if(m.turtlePair&&path.pairHits<2){singleHit??={...found,provisional:true,turtlePartialHit:true};if(options.turtleSinglePass)return singleHit;if(++pairAttempts<6)continue;break;}return found;
  }
  if(bestSS)return bestSS;
  if(singleHit)return singleHit;
  if(singlePotential&&!options.turtleSinglePass)return find(api,renderer,model,player,target,modelForPlayer,{...options,turtleSinglePass:true});
  if(renderer.weathers?.some(w=>[7,8].includes(w.weather_type))&&globalThis.__reaTornadoMethod){const result=globalThis.__reaTornadoMethod.find(api,renderer,model,player,target,options);if(result)return result;}
  return{ready:false,reason:player.mobile===15&&model?.windExtrapolated&&!blockedWeather?'Boomer: gió ngoài vùng mẫu; chưa có đường trong giới hạn dự đoán '+model.maxTime+' giây':model?.turtleSS?'SS nổ trực tiếp: chưa có điểm chạm đất sát mục tiêu trước khi bung':blockedWeather?'Đường bắn qua lốc/gương: chưa đủ dữ liệu':!candidates.length&&player.mobile===15&&!model?.valid?model?.reason||'Boomer: chưa có mô hình cho gió / loại đạn này':fixed?'Góc đang giữ chưa vượt được địa hình; đổi góc hoặc chọn Tự động':'Chưa có góc và lực vượt địa hình đến mục tiêu'};
 }
 function apply(player,result){if(!result?.ready)return{applied:false,reason:result?.reason||'Chưa có nghiệm'};if(![2,11,14,15,17,19,21].includes(player.mobile)&&!['Ice','Turtle','Nak','Raon','Raon Launcher','Grub','Frog'].includes(player.mobile_data?.name)||result.mobile!==undefined&&result.mobile!==player.mobile)return{applied:false,reason:'Góc/lực không thuộc xe hiện tại'};if(!Number.isFinite(result.power)||result.power<1||result.power>400||!Number.isFinite(result.angle)||![0,1].includes(result.look))return{applied:false,reason:'Góc/lực không hợp lệ'};player.Look(result.look);player.ChangeAngleTo(result.angle,true);if(player.look!==result.look||Math.abs(player.ang-result.angle)>.001)return{applied:false,reason:'Game chưa áp dụng đúng góc ngắm; chưa bắn'};return{applied:true,angle:player.ang,look:player.look,power:Math.round(result.power)};}
 const api={version:22,find,apply};for(const name of ['__reaAdukaAutoAim','__reaDragonAutoAim'])Object.defineProperty(globalThis,name,{value:api,configurable:true});return{installed:true,version:22,mobiles:['Aduka','Boomer','Ice','Turtle','Nak','Raon','Grub','Frog'],fullLegalAngleSearch:true,terrainModes:true,fractionalAngleLock:true};
})()
