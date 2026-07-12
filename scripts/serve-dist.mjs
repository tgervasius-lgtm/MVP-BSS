import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const host=process.env.HOST||'127.0.0.1';
const port=Number(process.env.PORT||4173);
const types={
  '.css':'text/css; charset=utf-8',
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.pdf':'application/pdf',
  '.svg':'image/svg+xml'
};

const server=createServer(async(request,response)=>{
  try{
    const url=new URL(request.url||'/',`http://${host}:${port}`);
    let pathname=decodeURIComponent(url.pathname);
    if(pathname.endsWith('/'))pathname+='index.html';
    const file=path.resolve(root,`.${pathname}`);
    if(!file.startsWith(`${root}${path.sep}`)&&file!==root){
      response.writeHead(403).end('Forbidden');
      return;
    }
    const info=await stat(file);
    if(!info.isFile())throw new Error('Not found');
    response.writeHead(200,{
      'Content-Type':types[path.extname(file)]||'application/octet-stream',
      'Cache-Control':'no-store'
    });
    if(request.method==='HEAD')response.end();
    else createReadStream(file).pipe(response);
  }catch{
    response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Not found');
  }
});

server.listen(port,host,()=>console.log(`BSS dist dostupan na http://${host}:${port}`));
