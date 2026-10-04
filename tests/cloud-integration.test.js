const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('frontend account connection, offline reload and reconnect work against the backend contract',async()=>{
  const {createApi}=await import('../backend/src/api.js');const {FileStore}=await import('../backend/src/file-store.js');
  const store=new FileStore();const api=createApi(store,async()=>({id:'alice',name:'Alice'}));
  const disk=new Map();let offline=false;
  function page(){
    const handlers={};let screen='me';
    const c=vm.createContext({console,URL,AbortController,Blob,setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>1,
      location:{protocol:'http:',hostname:'127.0.0.1',origin:'http://127.0.0.1:7071',href:'http://127.0.0.1:7071/Habitual.html'},
      navigator:{onLine:!offline},localStorage:{getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)},
      document:{querySelector:()=>null,addEventListener:(name,fn)=>handlers[name]=fn,visibilityState:'visible'},
      addEventListener:()=>{},fetch:async(url,opts={})=>{
        if(offline)throw Error('Offline');
        if(url==='cloud-config.json')return {ok:true,json:async()=>({enabled:true,localDemo:true,apiBase:'/api'})};
        const reply=await api(new Request(url,opts));return {ok:reply.status<400,status:reply.status,json:async()=>reply.jsonBody};
      }});
    for(const name of ['data.js','engine.js','sync-core.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',name),'utf8'),c);
    c.SQ.init();c.SQUI={esc:s=>String(s),current:()=>({name:screen}),refresh:()=>{},go:s=>{screen=s;},toast:()=>{}};
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/cloud.js'),'utf8'),c);
    return {c,click:async action=>handlers.click({target:{closest:()=>({disabled:false,getAttribute:()=>action})}})};
  }
  let p=page();p.c.SQ.addHobby('running');p.c.SQ.state.onboarded=true;p.c.SQ.save();await p.c.SQCloud.init();
  await p.click('in');assert.equal(p.c.SQ.state.tracked.length,0,'guest data is not silently attached to an account');
  p.c.SQ.addHobby('guitar');await p.c.SQCloud.sync();assert.equal((await store.getState('alice')).state.tracked[0].hobbyId,'guitar');
  offline=true;p.c.navigator.onLine=false;p.c.SQ.addHobby('chess');await p.c.SQCloud.sync();
  p=page();await p.c.SQCloud.init();assert.equal(p.c.SQ.state.tracked.length,2,'offline reload retains account hobbies');
  offline=false;p.c.navigator.onLine=true;await p.c.SQCloud.sync();assert.equal((await store.getState('alice')).state.tracked.length,2);
  await p.click('out');assert.equal(p.c.SQ.state.tracked[0].hobbyId,'running','guest hobbies survive sign-out');
});
test('service worker excludes API, identity, models and third-party responses',async()=>{
  const handlers={};let intercepted=0;
  const c=vm.createContext({URL,Response,fetch:async()=>new Response('shell'),caches:{open:async()=>({put:async()=>{},match:async()=>null})},self:{location:{href:'https://app.test/sw.js'},addEventListener:(type,fn)=>handlers[type]=fn}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/sw.js'),'utf8'),c);
  async function run(url,mode='cors',auth=false){let promise;handlers.fetch({request:{url,mode,method:'GET',headers:{has:()=>auth}},respondWith:p=>{intercepted++;promise=p;}});if(promise)await promise;}
  await run('https://app.test/api/me/state');await run('https://app.test/auth.html','navigate');await run('https://cdn.test/font.js');await run('https://app.test/cloud-config.json');await run('https://app.test/models/neo.js');await run('https://app.test/Habitual.html','navigate',true);
  assert.equal(intercepted,0);await run('https://app.test/Habitual.html','navigate');assert.equal(intercepted,1);
});
