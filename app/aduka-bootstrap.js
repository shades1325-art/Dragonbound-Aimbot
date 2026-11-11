(() => {
 // Empirical session-balanced prior; this is not a recovered server formula.
 // Current-match measured calibration must take precedence over this model.
 const prior=Object.freeze({ratio:2.44765625,biasX:-1,gravity:399,windFactor:4,archiveSampleCount:40,archiveSessionCount:9});
 function allowance(power,time){return 2+(.13*Math.max(0,power)+1)*Math.max(0,time)+.5*Math.hypot(16,24)*Math.max(0,time)**2;}
 function seed(renderer,player){
  if(player?.mobile!==2||![0,1].includes(player.selected_shot))return null;
  const power=Number(renderer?.wind_power),angle=Number(renderer?.wind_angle);
  if(!Number.isFinite(power)||power<0||power>26||!Number.isFinite(angle))return null;
  const theta=angle*Math.PI/180;
  return{valid:true,provisional:true,bootstrap:true,ratio:prior.ratio,speedQuantization:'floor',velocityBiasX:0,velocityBiasY:0,dx:0,dy:0,ax:power===0?0:prior.biasX+prior.windFactor*Math.floor(power*Math.cos(theta)),ay:prior.gravity+prior.windFactor*Math.floor(-power*Math.sin(theta)),sampleCount:0,exactWindSamples:0,minPower:1,maxPower:400,maxTime:2,windExtrapolated:power>25,archiveSampleCount:prior.archiveSampleCount,archiveSessionCount:prior.archiveSessionCount,uncertainty:{ratio:.13,ax:16,ay:24,origin:2},positionAllowance:allowance,reason:'Phát đầu: ước tính từ dữ liệu 9 trận; sẽ tự hiệu chuẩn sau phát bắn',source:'aduka-bootstrap-analysis.json'};
 }
 const api={version:1,prior,seed,allowance};Object.defineProperty(globalThis,'__reaAdukaBootstrap',{value:api,configurable:true});return{installed:true,version:1,sessions:prior.archiveSessionCount,samples:prior.archiveSampleCount};
})()
