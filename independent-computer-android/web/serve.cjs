const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=__dirname,port=Number(process.env.PORT||8080);
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.wasm':'application/wasm','.css':'text/css','.zip':'application/zip'};
http.createServer(async(req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end('Read-only local server');}
    const url=new URL(req.url,'http://127.0.0.1');
    const requested=decodeURIComponent(url.pathname==='/'?'/foundation.html':url.pathname);
    const file=path.resolve(root,'.'+requested);
    const relative=path.relative(root,file);
    if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(path.sep).some(p=>p.startsWith('.')||p==='node_modules')){res.writeHead(403);return res.end('Forbidden');}
    const data=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:data);
  }catch(error){res.writeHead(error.code==='ENOENT'?404:500);res.end('File unavailable');}
}).listen(port,'127.0.0.1',()=>console.log('Independent Computer: http://127.0.0.1:'+port));
