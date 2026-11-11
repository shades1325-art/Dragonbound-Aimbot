import net from 'node:net';import {createHash} from 'node:crypto';import {readFile,writeFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const root=new URL('./',import.meta.url),pipe='\\\\.\\pipe\\dragonbound-oneclick-'+createHash('sha256').update(fileURLToPath(root).toLowerCase()).digest('hex').slice(0,16),requestId=process.argv[process.argv.indexOf('--request')+1];
const command=process.argv.includes('--status')?'status':process.argv.includes('--stop')?'stop':'activate';
async function state(){try{return JSON.parse(await readFile(new URL('runtime-supervisor-status.json',root),'utf8'))}catch{return{state:'starting'}}}
function connect(){return new Promise(resolve=>{const socket=net.createConnection(pipe);let output='',done=false;const finish=value=>{if(done)return;done=true;socket.destroy();resolve(value)};socket.on('connect',()=>socket.write(JSON.stringify({command,requestId})+'\n'));socket.on('data',c=>{output+=c;if(output.includes('\n')){try{finish(JSON.parse(output.split('\n')[0]))}catch{finish(null)}}});socket.on('end',()=>finish(null));socket.on('error',()=>finish(null));socket.setTimeout(2500,()=>finish(null));})}
const existing=await connect();if(existing){console.log(JSON.stringify(existing));process.exit(0)}
if(command!=='activate'){console.log(JSON.stringify({state:'not-running'}));process.exit(0)}
if(!requestId||!/^[a-zA-Z0-9-]{1,80}$/.test(requestId))throw Error('Missing launch request identifier');
let server;
try{
 globalThis.__oneClickRequestId=requestId;
 server=net.createServer(socket=>{let text='',handled=false;socket.on('error',()=>{});socket.on('data',async c=>{text+=c;if(handled||!text.includes('\n'))return;handled=true;try{const message=JSON.parse(text.split('\n')[0]);if(message.command==='activate'&&/^[a-zA-Z0-9-]{1,80}$/.test(message.requestId??''))globalThis.__oneClickRequestId=message.requestId;const value=await state();socket.end(JSON.stringify({...value,ownerPid:process.pid})+'\n');if(message.command==='stop')process.emit('SIGTERM');}catch{socket.end('{}\n')}});});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(pipe,resolve)});
 await import('./runtime-supervisor.mjs');
}catch(error){if(error.code==='EADDRINUSE'){console.log(JSON.stringify(await connect()));}else{await writeFile(new URL('oneclick-error.json',root),JSON.stringify({requestId,message:error.message,time:new Date().toISOString()}));console.error(error.message);process.exitCode=1;}}
finally{if(server?.listening)await new Promise(resolve=>server.close(resolve));}
