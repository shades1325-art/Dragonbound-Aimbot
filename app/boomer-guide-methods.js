// Formula estimates transcribed from supplied Boomer guides, not server physics.
// This module computes angle/power only; it does not draw, apply aim, or fire.
(() => {
 const SOURCES=Object.freeze({hook:'https://creedo.gbgl-hq.com/darkhalf5.gif',backshot:'https://creedo.gbgl-hq.com/backshot.htm',backChart:'https://creedo.gbgl-hq.com/backshot_files/windchart.jpg',fixed:'https://tinhban.forum-viet.net/t11-cong-thuc-ban-boomer',general:'Boomer.md'});
 const METHODS=Object.freeze([
  {value:'auto',label:'Tự chọn công thức'}, {value:'physics',label:'Mô hình vật lý'},
  {value:'hook400',label:'Hook · đủ lực'}, {value:'back250',label:'Backshot · 2,5 vạch'},
  {value:'fix50',label:'Fix 50'}, {value:'fix70',label:'Fix 70'},
  {value:'shotgun400',label:'Shotgun · đủ lực'}, {value:'normal35',label:'Góc 35'},
  {value:'lob',label:'Lob · lực cố định'}, {value:'high',label:'Góc cao · đủ lực'}
 ]);
 const RAD=Math.PI/180,normalize=a=>(a%360+360)%360,angleDistance=(a,b)=>Math.abs((a-b+540)%360-180);
 function interpolate(x,points){for(let i=1;i<points.length;i++){const [a,v]=points[i-1],[b,w]=points[i];if(x>=a-1e-9&&x<=b+1e-9)return v+(w-v)*(x-a)/(b-a);}return null;}
 function angular(a,anchors,selector){for(let i=0;i<anchors.length;i++){if(Math.abs(a-anchors[i][0])<1e-7)return{value:selector(anchors[i][1]),interpolated:false};if(i&&a>anchors[i-1][0]&&a<anchors[i][0]){const low=selector(anchors[i-1][1]),high=selector(anchors[i][1]);if(low===null||high===null)return{value:null,interpolated:false};return{value:low+(high-low)*(a-anchors[i-1][0])/(anchors[i][0]-anchors[i-1][0]),interpolated:true};}}return{value:null,interpolated:false};}
 function hookFactor(A,W){
  const bin=W<=10?0:W<=20?1:2;
  const anchors=[
   [112.5,[.2,.4,null]],[135,[.6,.6,null]],[157.5,[.9,.8,.7]],
   [168.75,[W>7?.9:.95,W>15?.8:.85,.76]],
   [180,[1,W>15?.8:.9,.75]],[191.25,[1,W>15?.8:.9,.75]],
   [202.5,[W>6?.85:1,W>15?.76:.85,W>22?.77:.75]],
   [225,[W>5?.65:.85,W>15?.65:.75,.6]],
   [247.5,[.55,.6,.5]],[258.75,[.55,.5,.45]],[270,[.4,.38,.32]]
  ];
  return angular(A,anchors,row=>row[bin]);
 }
 // Angles are approximate readings of the positions in the supplied translated chart.
 function backFactor(A,W){
  const anchors=[[-63.435,.1],[-56.25,.2],[-45,.25],[-33.75,.3],[-22.5,W>20?.4:.3],[-11.25,W>20?.45:.4],
   [0,W>20?.6:.5],[5.625,W>20?.65:.6],[11.25,W>20?.7:.65],[22.5,W>20?.8:.7],
   [33.75,W<8?.7:W>20?.9:.8],[45,W>15?.8:.7],[56.25,W>20?.8:.7],[67.5,W>20?.7:.6],[90,W>20?.6:.5]];
  return angular(A,anchors,value=>value);
 }
 // Fix50 wind chart: signed power units per one wind unit. Positions are approximate image readings.
 function fix50WindFactor(A){return interpolate(A,[[-90,10/6],[-78.75,10/8],[-67.5,10/12],[-60,10/16],[-53.13,0],[-45,-10/20],[-37.5,-10/16],[-30,-10/14],[-22.5,-10/12],[-15,-10/10],[-7.5,-10/8],[0,-10/6],[7.5,-10/5],[15,-10/4],[22.5,-10/3],[33.75,-10/2.5],[45,-10/2.5],[56.25,-10/3],[67.5,-10/3],[78.75,-10/4],[90,-10/5]]);}
 function fail(result,reason,code){result.ready=false;result.reason=reason;result.code=code;result.model={valid:false,guideEstimate:true,provisional:true,method:result.method};return result;}
 function suggest(renderer,player,target,options={}){
  const requested=options.method??'auto',label=METHODS.find(m=>m.value===requested)?.label??requested;
  const result={ready:false,mobile:15,guideEstimate:true,provisional:true,predictedHit:false,method:requested,methodLabel:label,formula:'',source:null,warnings:[],trajectory:null,path:null};
  if(player?.mobile!==15&&player?.mobile_data?.name!=='Boomer')return fail(result,'Chế độ công thức này dành cho Boomer','not-boomer');
  if(!target||![player.x,player.y,target.x,target.y].every(Number.isFinite))return fail(result,'Chờ vị trí xe và mục tiêu','missing-position');
  const W=Number(renderer?.wind_power),rawA=Number(renderer?.wind_angle),screen=Number(options.screenWorld??800);
  if(!Number.isFinite(W)||W<0||!Number.isFinite(rawA)||!Number.isFinite(screen)||screen<=0)return fail(result,'Chưa đọc được thông số gió hoặc đơn vị màn hình','invalid-wind');
  if(requested==='physics')return fail(result,'Chế độ vật lý do bộ tìm quỹ đạo xử lý','physics-delegated');
  if(!METHODS.some(m=>m.value===requested))return fail(result,'Không có phương pháp Boomer này','unknown-method');
  const dx=target.x-player.x,dy=target.y-player.y,sign=dx>=0?1:-1,sd=Math.abs(dx)/screen,A=normalize(sign===1?rawA:180-rawA),signedA=A>180?A-360:A;
  const towards=sign===1?1:0,against=1-towards,along=W*Math.cos(A*RAD);
  let method=requested;if(method==='auto')method=W>1&&along<-.01?'hook400':sd<.25?'shotgun400':'fix50';
  Object.assign(result,{method,methodLabel:METHODS.find(m=>m.value===method).label,look:towards,targetNumber:target.n,target:{n:target.n,x:target.x,y:target.y},screenDistance:sd,screenWorld:screen,canonicalWind:A,wind:{power:W,angle:normalize(rawA)}});
  result.warnings.push('Ước tính công thức từ hướng dẫn cũ; chưa xác nhận điểm trúng trên DragonBound hiện tại.');
  result.warnings.push('Không mô phỏng quỹ đạo, va chạm địa hình hoặc vùng thời tiết.');
  if(Math.abs(dy)>1)result.warnings.push('Chênh cao chưa được hiệu chỉnh trong công thức.');
  if(renderer?.weathers?.some(w=>[6,7,8].includes(w.weather_type)))result.warnings.push('Có gương/lốc/ngẫu nhiên: công thức chưa tính biến đổi qua cột.');
  if(W>26)result.warnings.push('Gió vượt 26: ngoài mức đã đối chiếu trong game này.');
  if(player.selected_shot===2)result.warnings.push('SS: công thức không tính thời điểm biến hình hoặc sát thương.');
  let display=null,power=null;
  if(method==='hook400'){
   result.source=SOURCES.hook;result.formula='Góc = 90 − 30 × khoảng cách/màn hình − gió × hệ số; lực = 400';power=400;
   if(W<=1)return fail(result,'Hook đủ lực cần gió ngược; chọn Fix 50/góc cao khi gió yếu','hook-calm');
   const factor=hookFactor(A,W);if(factor.value===null)return fail(result,'Vùng hướng/lực gió này ghi N/A hoặc thiếu hệ số hook trong bảng','hook-factor-missing');
   result.windFactor=factor.value;display=90-30*sd-W*factor.value;
   result.warnings.push('Hệ số hook được đọc xấp xỉ từ Darkhalf/KNAT; các hướng giữa mốc dùng nội suy tuyến tính.');
   result.interpolated=!!factor.interpolated;
  }else if(method==='back250'){
   result.source=SOURCES.backshot;result.formula='Góc = 60 − gió × hệ số + 30 × khoảng cách/màn hình; lực = 250';power=250;result.look=against;
   if(W<=1||Math.cos(A*RAD)<-.001)return fail(result,'Backshot cần gió thổi về mục tiêu khi xe quay lưng','backshot-direction');
   if(signedA< -63.435){result.warnings.push('Hai biểu đồ mâu thuẫn về góc 66° ở ba hướng dưới cùng: một ghi tối thiểu, một ghi tối đa.');return fail(result,'Chưa chọn tự động backshot ở vùng gió gần thẳng xuống do quy tắc nguồn mâu thuẫn','backshot-downward-ambiguous');}
   const factor=backFactor(signedA,W);if(factor.value===null)return fail(result,'Không có hệ số backshot cho hướng gió này','backshot-factor-missing');
   result.windFactor=factor.value;result.interpolated=!!factor.interpolated;display=60-W*factor.value+30*sd;
   result.warnings.push('Vị trí hướng gió được đọc xấp xỉ từ biểu đồ; giữa các mốc dùng nội suy tuyến tính.');
   result.warnings.push('Tầm backshot phụ thuộc hướng gió; công thức không xác nhận mục tiêu nằm trong tầm.');
  }else if(method==='fix50'){
   result.source=SOURCES.fixed;result.formula='Fix 50: nội suy lực theo khoảng cách và bảng gió; gió ngang thuận giảm 0,1 vạch mỗi 6 gió';display=50;
   power=interpolate(sd,[[.25,100],[.375,130],[.5,150],[.625,170],[.75,185],[.875,200],[1,215],[1.25,240],[1.5,260],[1.75,280],[2,290]]);
   if(power===null)return fail(result,'Khoảng cách ngoài các mốc Fix 50 đã đọc (1/4–2 màn hình)','fixed-range');
   result.warnings.push('Các mốc lực được đọc xấp xỉ từ hình Fix 50; giữa mốc dùng nội suy.');
   if(W>1){const factor=fix50WindFactor(signedA);if(factor!==null){power+=W*factor;result.windPowerFactor=factor;result.interpolated=true;result.warnings.push('Hệ số gió Fix 50 được đọc xấp xỉ từ hình; giữa các hướng dùng nội suy.');}else result.warnings.push('Gió ngược: bảng Fix 50 này không phủ hướng đó; lực đang dùng mốc cơ sở chưa bù gió.');}
  }else if(method==='fix70'){
   result.source=SOURCES.fixed;result.formula='Fix 70: nội suy lực theo khoảng cách, gió ngang thuận đổi góc theo bảng';display=70;
   power=interpolate(sd,[[.125,95],[.25,130],[.3125,150],[.375,165],[.4375,180],[.5,190],[.5625,200],[.625,210],[.6875,220],[.75,230],[.8125,240],[.875,250],[.9375,260],[1,270]]);if(power===null)return fail(result,'Khoảng cách ngoài các mốc Fix 70 đã đọc (1/8–1 màn hình)','fixed-range');
   result.warnings.push('Các mốc lực được đọc xấp xỉ từ hình Fix 70; giữa mốc dùng nội suy.');
   if(W>1&&angleDistance(A,0)<=1e-7){display=interpolate(W,[[1,70],[2,71],[3,72],[4,73],[5,76],[6,77],[7,78],[8,81],[9,82],[10,83],[11,84],[12,85],[13,86],[14,88],[15,89],[16,90]]);if(display===null)return fail(result,'Bảng Fix 70 gió ngang thuận kết thúc ở gió 16/góc 90','fix70-wind-range');}
   else if(W>1)result.warnings.push('Hướng gió này chưa áp dụng được bảng đổi góc Fix 70; đang dùng góc cơ sở 70°.');
  }else if(method==='shotgun400'){
   result.source=SOURCES.general;result.formula='Hướng thẳng tới tâm mục tiêu; lực = 400';display=Math.atan2(-dy,Math.abs(dx))/RAD;power=400;result.warnings.push('Hướng thẳng chưa bù rơi hoặc gió; đây không phải nghiệm trúng.');
  }else if(method==='normal35'){
   result.source=SOURCES.general;result.formula='Góc 35: 1/2 màn hình 1,5 vạch; 1 màn hình 2,2 vạch';display=35;power=interpolate(sd,[[.5,150],[1,220]]);
   if(power===null)return fail(result,'Khoảng cách ngoài hai mốc lực góc 35 của hướng dẫn','fixed-range');if(W>1)result.warnings.push('Lực góc 35 đang dùng mốc cơ sở chưa bù gió.');
  }else if(method==='lob'){
   result.source=SOURCES.general;result.formula='Lob: 80° tại 1/3 màn hình, 75° tại 1/2, 70° tại 2/3, 60° tại 1 màn hình';
   display=interpolate(sd,[[0,90],[1/3,80],[.5,75],[2/3,70],[1,60]]);power=sd<=1/3?220:sd<=2/3?225:230;if(display===null)return fail(result,'Hướng dẫn lob chỉ có mốc trong một màn hình','lob-range');
   if(W>1&&W<=6&&angleDistance(A,0)<=1e-7)display+=W-1;else if(W>1)result.warnings.push('Lob phù hợp gió yếu/thuận; chưa hiệu chỉnh đủ cho hướng/lực gió này.');
  }else if(method==='high'){
   result.source=SOURCES.general;result.formula='Góc cao = 90 − 9 × khoảng cách/màn hình; lực = 400';display=90-9*sd;power=400;
   if(sd>1)result.warnings.push('Ngoài một màn hình: nội suy góc cao tuyến tính chỉ là ước lượng.');if(W>1)result.warnings.push('Góc cao đang dùng mốc 0/1 gió, chưa bù gió.');
  }
  if(!Number.isFinite(display)||!Number.isFinite(power))return fail(result,'Chưa có đủ mốc công thức cho trường hợp này','formula-unavailable');
  Object.assign(result,{displayAngle:display,power:Math.round(power)});
  if(display< -90||display>90||((method==='hook400'||method==='back250')&&display<0))return fail(result,'Góc công thức nằm ngoài miền dùng được; không tự kẹp góc','display-angle-out-of-range');
  if(result.power<1||result.power>400)return fail(result,'Lực công thức nằm ngoài 1–400; không tự kẹp lực','power-out-of-range');
  const body=Number(player.body??0);if(!Number.isFinite(body))return fail(result,'Chưa đọc được độ nghiêng thân xe','invalid-body');
  const native=result.look===0?display-body:display+body;result.angle=native;
  const min=Number(player.minang??0),max=Number(player.maxang??180);if(!Number.isFinite(min)||!Number.isFinite(max)||min>max||native<min-1e-7||native>max+1e-7)return fail(result,'Góc công thức vượt giới hạn ngắm hiện tại của xe; không tự kẹp góc','native-angle-out-of-range');
  result.weakAngle=Number.isFinite(player.truang_min)&&Number.isFinite(player.truang_max)&&(native<player.truang_min||native>player.truang_max);if(result.weakAngle)result.warnings.push('Góc nằm ngoài vùng true-angle hiện tại.');
  result.ready=true;result.model={valid:true,guideEstimate:true,provisional:true,method,source:result.source};return result;
 }
 const api={version:1,suggest,methods:METHODS,sources:SOURCES,hookFactor,backFactor,fix50WindFactor};Object.defineProperty(globalThis,'__reaBoomerGuide',{value:api,configurable:true});return{installed:true,version:1,methods:METHODS.length};
})()
