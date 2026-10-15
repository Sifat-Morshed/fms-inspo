import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
const base=path.resolve('public/_astro');
let checked=0;const missing=[];
for(const file of await readdir(base)){
 if(!file.endsWith('.js'))continue;
 const source=await readFile(path.join(base,file),'utf8');
 for(const match of source.matchAll(/(?:from|import\s*\()["']([^"']+)["']/g)){
  if(!match[1].startsWith('.'))continue;
  checked++;
  try{await access(path.resolve(base,match[1].split('?')[0]));}
  catch{missing.push({file,import:match[1]});}
 }
}
console.log(JSON.stringify({checked,missing},null,2));
if(missing.length)process.exitCode=1;
