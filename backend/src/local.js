import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApi} from './api.js';
import {FileStore} from './file-store.js';
import {ApiError} from './validation.js';
import {createEmailLogin} from './email-login.js';
const root=resolve(fileURLToPath(new URL('../../dist/',import.meta.url)));
const store=await new FileStore(fileURLToPath(new URL('../data/local.json',import.meta.url))).init();
const port=Number(process.env.PORT||7071);
const origin='http://127.0.0.1:'+port;
// LOCAL_EMAIL_LOGIN=1 tries the real email-code flow; codes print here instead of being emailed.
const emailLogin=process.env.LOCAL_EMAIL_LOGIN==='1'&&createEmailLogin({secret:'local-only-secret-'.padEnd(48,'x'),send:async(to,code)=>console.log('Sign-in code for '+to+': '+code)});
const api=emailLogin?createApi(store,emailLogin.authenticate,{login:emailLogin}):createApi(store,async req=>{
  const match=/^Bearer local-demo-(alice|bob)$/.exec(req.headers.get('authorization')||'');
  if(!match)throw new ApiError(401,'Connect the local demo account');
  return {id:match[1],name:match[1]==='alice'?'Alice (local demo)':'Bob (local demo)'};
});
http.createServer(async(req,res)=>{
  try {
    // Loopback only; reject cross-origin writes and DNS rebinding. No production bypass exists.
    if(req.headers.host!==new URL(origin).host||(req.headers.origin&&req.headers.origin!==origin)){res.writeHead(403);res.end();return;}
    const url=new URL(req.url,origin);
    if(url.pathname.startsWith('/api/')){
      let body='';let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>1100000){res.writeHead(413);res.end();return;}body+=chunk;}
      const request=new Request(url,{method:req.method,headers:req.headers,...(body?{body}: {})});
      const result=await api(request,{error:console.error});res.writeHead(result.status,result.headers);res.end(JSON.stringify(result.jsonBody));return;
    }
    if(url.pathname==='/cloud-config.json'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(emailLogin?{enabled:true,login:'email',apiBase:'/api'}:{enabled:true,localDemo:true,apiBase:'/api'}));return;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const relative=decodeURIComponent(url.pathname==='/'?'/Habitual.html':url.pathname);
    const file=resolve(root,'.'+relative);if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
    const data=await readFile(file);
    const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);
  }catch(e){res.writeHead(e.code==='ENOENT'?404:500);res.end('Request failed');}
}).listen(port,'127.0.0.1',()=>console.log('Habitual local demo: '+origin+' (local accounts only; no Azure connection)'));
