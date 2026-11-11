import {readdir, readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const app=new URL('../app/',import.meta.url),files=await readdir(app);
let checked=0;
for(const file of files.filter(f=>/\.(?:js|mjs)$/.test(f))){
 const result=spawnSync(process.execPath,['--check',fileURLToPath(new URL(file,app))],{encoding:'utf8',windowsHide:true});
 if(result.error||result.status!==0)throw Error(`${file}: ${result.error?.message??result.stderr}`);
 checked++;
}
for(const file of ['package.json','package-lock.json','inspect-game-args.example.json','bridge-endpoint.example.json'])JSON.parse(await readFile(new URL(file,app),'utf8'));
console.log(`Syntax OK: ${checked} application modules; package and example JSON parsed.`);
