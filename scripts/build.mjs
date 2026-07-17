import {createHash} from 'node:crypto';
import {cp,mkdir,readdir,readFile,rm,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'dist');
const files=['index.html','styles.css','app.js','manifest.json','sw.js','_headers'];
const directories=['styles','src','icons','design-system','brand-book','output'];

async function listFiles(directory,prefix=''){
  const entries=await readdir(directory,{withFileTypes:true});
  const result=[];
  for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
    const relative=path.join(prefix,entry.name);
    const absolute=path.join(directory,entry.name);
    if(entry.isDirectory())result.push(...await listFiles(absolute,relative));
    else if(entry.isFile())result.push(relative.split(path.sep).join('/'));
  }
  return result;
}

async function ensureFile(file){
  const info=await stat(file);
  if(!info.isFile())throw new Error(`Nije datoteka: ${file}`);
}

await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});

for(const file of files){
  await ensureFile(path.join(root,file));
  await cp(path.join(root,file),path.join(output,file));
}
for(const directory of directories){
  await cp(path.join(root,directory),path.join(output,directory),{recursive:true});
}

for(const htmlPath of ['index.html','design-system/index.html','brand-book/index.html']){
  const html=await readFile(path.join(output,htmlPath),'utf8');
  if(/<script(?![^>]*\bsrc=)[^>]*>/i.test(html))throw new Error(`Inline script nije dopušten: ${htmlPath}`);
}

const worker=await readFile(path.join(output,'sw.js'),'utf8');
const cached=[...worker.matchAll(/['"](\.\/[^'"]+)['"]/g)]
  .map(match=>match[1])
  .filter(asset=>asset!=='./');
for(const asset of new Set(cached))await ensureFile(path.join(output,asset.slice(2)));

const builtFiles=(await listFiles(output)).filter(file=>file!=='build-manifest.json');
const hashes={};
for(const file of builtFiles){
  const content=await readFile(path.join(output,file));
  hashes[file]=createHash('sha256').update(content).digest('hex');
}
await writeFile(path.join(output,'build-manifest.json'),JSON.stringify({
  schemaVersion:1,
  application:'BSS Smart Systems 3.0',
  files:hashes
},null,2)+'\n');

console.log(`BSS build dovršen: ${builtFiles.length+1} datoteka u dist/.`);
