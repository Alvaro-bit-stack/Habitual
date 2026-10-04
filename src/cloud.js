/* Optional Azure connection. Local hobby access never waits on authentication or the network. */
(function(G){
  'use strict';
  if(typeof document==='undefined')return;
  var config={enabled:false},owner=null,core=null,msalClient=null,msalAccount=null,key='sidequest.v1';
  var suppress=false,storageFailed=false,timer=null,status='local',busy=false,ready=false,pendingImport=null;
  function read(name,fallback){try{var text=localStorage.getItem(name);return text?JSON.parse(text):fallback;}catch(e){return fallback;}}
  function write(name,value){localStorage.setItem(name,JSON.stringify(value));}
  function esc(s){return G.SQUI.esc(s==null?'':String(s));}
  function tell(value){status=value;var panel=document.querySelector('[data-cloud-panel]');if(panel)panel.innerHTML=panelBody();}
  function persisted(){var value=read(key,null);return value||JSON.parse(JSON.stringify(G.SQ.state));}
  function replace(value){suppress=true;try{G.SQ.replaceState(value);refresh();}finally{suppress=false;}}
  function backup(value){var list=read(key+'.backups',[]);list.push({at:new Date().toISOString(),state:value});write(key+'.backups',list.slice(-5));}
  function refresh(){if(G.SQUI&&G.SQUI.current())G.SQUI.refresh();}
  function schedule(){clearTimeout(timer);timer=setTimeout(sync,1000);}
  function activate(user){
    if(core)core.stop();
    owner=user;key='habitual.account.'+user.id;write('habitual.cloud.owner',user);
    G.SQ.useStorage(key);
    var cached=read(key+'.events',[]);G.SQ.setRemoteEvents(cached);
    core=new G.HabitualSyncCore({load:persisted,replace:replace,
      readMeta:function(){return read(key+'.sync',null);},writeMeta:function(value){write(key+'.sync',value);},backup:backup,
      api:async function(method,value,revision){return request('/me/state',method,value,revision==null?{}:{'If-Match':'"'+revision+'"'});},status:tell});
    tell(core.dirty()?'pending':'local');
  }
  async function token(){
    if(config.localDemo){if(!['127.0.0.1','localhost'].includes(location.hostname))throw new Error('Local demo is loopback only');return 'local-demo-alice';}
    await authClient();
    if(!msalAccount){var error=new Error('Sign in to sync');error.status=401;throw error;}
    try{return (await msalClient.acquireTokenSilent({account:msalAccount,scopes:[config.scope]})).accessToken;}
    catch(e){var error=new Error('Sign in again to sync');error.status=401;throw error;}
  }
  async function request(path,method,value,headers){
    var access=await token();var controller=new AbortController();var timeout=setTimeout(function(){controller.abort();},12000);
    try{
      var response=await fetch(config.apiBase+path,{method:method||'GET',cache:'no-store',credentials:'omit',signal:controller.signal,
        headers:Object.assign({'Authorization':'Bearer '+access,'Content-Type':'application/json'},headers||{}),body:value===undefined?undefined:JSON.stringify(value)});
      var data=await response.json();if(!response.ok){var err=new Error(data.error||'Request failed');err.status=response.status;err.remote=data.remote;throw err;}return data;
    }finally{clearTimeout(timeout);}
  }
  async function authClient(){
    if(msalClient)return;
    if(!G.msal)await new Promise(function(resolve,reject){var script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/@azure/msal-browser@4.30.0/lib/msal-browser.min.js';script.onload=resolve;script.onerror=function(){script.remove();reject(new Error('Sign-in could not load. Check your connection.'));};document.head.appendChild(script);});
    msalClient=new G.msal.PublicClientApplication({auth:{clientId:config.clientId,authority:config.authority,knownAuthorities:[new URL(config.authority).hostname],redirectUri:new URL('auth.html',location.href).href},cache:{cacheLocation:'sessionStorage'}});
    await msalClient.initialize();
    var accounts=msalClient.getAllAccounts();msalAccount=accounts.find(function(a){return owner&&a.homeAccountId===owner.account;})||null;
  }
  async function signIn(){
    if(busy||!config.enabled)return;
    busy=true;tell('connecting');
    try{
      if(!config.localDemo){await authClient();var result=await msalClient.loginPopup({scopes:[config.scope],prompt:'select_account'});msalAccount=result.account;}
      var user=await request('/me');user.account=msalAccount?msalAccount.homeAccountId:'local-demo';
      if(!owner||owner.id!==user.id)activate(user);else{owner=user;write('habitual.cloud.owner',user);}
      refresh();await sync();
    }catch(e){tell('signin');G.SQUI.toast(e.message||'Could not sign in');}finally{busy=false;}
  }
  async function loadEvents(){
    var user=owner;if(!user||!config.enabled)return;
    var result=await request('/events');if(!owner||owner.id!==user.id)return;
    var changed=JSON.stringify(read(key+'.events',[]))!==JSON.stringify(result.events);
    write(key+'.events',result.events);G.SQ.setRemoteEvents(result.events);
    if(changed&&G.SQUI.current()&&['community','event','group'].includes(G.SQUI.current().name))refresh();
  }
  async function sync(){
    if(!core||!config.enabled||storageFailed)return;
    var selected=core;
    if(navigator.onLine===false){tell('offline');return;}
    // Web Locks serializes requests from multiple tabs of the same account where available.
    var work=function(){return selected.active?selected.sync():Promise.resolve();};
    if(navigator.locks)await navigator.locks.request('habitual-sync-'+owner.id,work);else await work();
    if(selected!==core)return;
    if(status==='pending')schedule();
    if(status==='synced')try{await loadEvents();}catch(e){/* Cached events remain visible; attendance still needs a connection. */}
  }
  async function attend(id,going){
    if(!owner||!config.enabled)throw new Error('Sign in to join this event');
    if(navigator.onLine===false)throw new Error('Connect to the internet to confirm your spot');
    var user=owner;var result=await request('/events/'+encodeURIComponent(id)+'/attendance','PUT',{going:going});
    if(!owner||owner.id!==user.id)throw new Error('Account changed. Reopen Community.');
    var events=read(key+'.events',[]);events.forEach(function(e){if(e.id===id){e.rsvp=result.rsvp;e.going=result.going;}});
    write(key+'.events',events);G.SQ.setRemoteEvents(events);return result.rsvp;
  }
  async function signOut(){
    var previousAccount=msalAccount;
    if(core)core.stop();clearTimeout(timer);core=null;owner=null;msalAccount=null;
    localStorage.removeItem('habitual.cloud.owner');key='sidequest.v1';G.SQ.useStorage(key);tell('local');refresh();
    if(msalClient&&previousAccount)await msalClient.clearCache({account:previousAccount});
    // Keep unsynced account data on-device. Explicit sign-in is required to resume that account.
  }
  function exportProgress(){
    var blob=new Blob([JSON.stringify(G.SQ.state,null,2)],{type:'application/json'});var url=URL.createObjectURL(blob);
    var a=document.createElement('a');a.href=url;a.download='Habitual-progress.json';a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }
  var messages={local:'Saved on this device',pending:'Saved on this device · Waiting to sync',syncing:'Syncing your progress…',synced:'Saved on this device and in your account',offline:'Offline · Your hobbies are available. Changes will sync when you reconnect.',signin:'Saved on this device · Sign in to resume syncing',connecting:'Connecting your account…',conflict:'Another device has different progress. Both copies are kept until you choose.',rejected:'Cloud could not accept this progress. Your device copy is kept; export it before making changes.',storage:'Device storage is full or unavailable. Export your progress now; recent changes may not survive closing the app.'};
  function button(action,text){return '<button type="button" class="btn sm" data-cloud-action="'+action+'">'+text+'</button>';}
  function panelBody(){
    var text='<h2 class="h3">Your saved progress</h2><p class="small" role="status">'+esc(messages[status]||messages.local)+'</p>';
    if(owner)text+='<p class="small muted">'+esc(owner.name)+'</p>';
    text+='<div class="row">';
    if(config.enabled)text+=owner?button('sync','Sync now')+button('out','Sign out'):button('in',config.localDemo?'Connect local test account':'Sign in to sync');
    if(owner&&status==='signin')text+=button('in','Sign in again');
    text+=button('export','Export progress')+button('import-file','Import backup')+'</div>';
    if(pendingImport)text+='<p class="small muted">Replace current progress with this backup ('+pendingImport.tracked.length+' hobbies)? The current copy will be backed up.</p><div class="row">'+button('import-file-confirm','Use backup')+button('cancel','Cancel')+'</div>';
    if(!config.enabled)text+='<p class="small muted">Cloud sync is not connected yet. Your hobbies stay on this device.</p>';
    if(owner&&read('sidequest.v1',null))text+='<p class="small muted">Your original device progress is separate from this account.</p>'+button('import','Use original device progress');
    if(status==='conflict')text+='<p class="small muted">Choose which version to continue with. A backup of this device is kept.</p><div class="row">'+button('device','Keep this device')+button('cloud','Use cloud progress')+'</div>';
    return text;
  }
  function panel(){return '<section class="stack card" data-cloud-panel>'+panelBody()+'</section>';}
  async function init(){
    if(ready)return;ready=true;
    try{
      owner=read('habitual.cloud.owner',null);if(owner)activate(owner);
      G.SQ.subscribe(function(ok){if(suppress)return;if(!ok){storageFailed=true;if(core)core.blocked='storage';tell('storage');return;}storageFailed=false;if(core&&core.blocked==='storage')core.blocked=null;tell(core&&core.blocked==='conflict'?'conflict':core?'pending':'local');schedule();});
      if(location.protocol==='file:'){tell('local');return;}
      var cached=read('habitual.cloud.config',{enabled:false});config=cached;
      var controller=new AbortController();var timeout=setTimeout(function(){controller.abort();},5000);
      try{var response=await fetch('cloud-config.json',{cache:'no-store',signal:controller.signal});if(response.ok){config=await response.json();write('habitual.cloud.config',config);}}finally{clearTimeout(timeout);}
    }catch(e){/* Cached account hobbies still work when configuration cannot be fetched. */}
    if(config.enabled){
      try{
        var url=new URL(config.apiBase,location.href);
        if(url.origin!==location.origin&&url.protocol!=='https:')throw new Error('Cloud API must use HTTPS');
        if(config.localDemo&&!['127.0.0.1','localhost'].includes(location.hostname))throw new Error('Local test configuration cannot run here');
        config.apiBase=url.href.replace(/\/$/,'');
        if(owner){if(!config.localDemo)await authClient();await sync();}
      }catch(e){tell('signin');}
    }
    if('serviceWorker' in navigator&&['http:','https:'].includes(location.protocol))navigator.serviceWorker.register('sw.js').catch(function(){/* Device state remains available without shell caching. */});
    if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(function(){});
    if(owner&&G.SQ.state.onboarded&&G.SQUI.current()&&G.SQUI.current().name==='welcome')G.SQUI.go('today',{}, {reset:true});else refresh();
  }
  document.addEventListener('click',async function(event){
    var b=event.target.closest&&event.target.closest('[data-cloud-action]');if(!b)return;b.disabled=true;
    try{
      var action=b.getAttribute('data-cloud-action');
      if(action==='in')await signIn();else if(action==='out')await signOut();else if(action==='sync')await sync();else if(action==='export')exportProgress();
      else if(action==='import'){
        // A concrete in-page confirmation prevents replacing existing account progress by accident.
        b.outerHTML='<span class="stack"><span class="small">Replace this account’s progress with the original device copy? A backup will be kept.</span><span class="row">'+button('import-confirm','Replace progress')+button('cancel','Cancel')+'</span></span>';
      }else if(action==='import-confirm'){backup(persisted());replace(read('sidequest.v1',null));tell('pending');await sync();refresh();}
      else if(action==='cancel'){pendingImport=null;tell(status);}
      else if(action==='import-file'){
        var input=document.createElement('input');input.type='file';input.accept='application/json,.json';
        input.onchange=async function(){try{var file=input.files[0];if(!file)return;if(file.size>1024*1024)throw new Error('Choose a backup smaller than 1 MB');var value=JSON.parse(await file.text());if(value.version!==1||!Array.isArray(value.tracked)||!Array.isArray(value.sessions)||!Array.isArray(value.custom)||!value.user)throw new Error('This is not a Habitual backup');pendingImport=value;tell(status);}catch(e){G.SQUI.toast(e.message||'Could not read backup');}};input.click();
      }else if(action==='import-file-confirm'&&pendingImport){backup(persisted());replace(pendingImport);pendingImport=null;tell(core?'pending':'local');await sync();refresh();}
      else if(action==='device'||action==='cloud'){await core.resolve(action);refresh();}
    }catch(e){G.SQUI.toast(e.message||'Could not complete that action');}finally{b.disabled=false;}
  });
  G.addEventListener('online',function(){sync();});G.addEventListener('offline',function(){if(owner)tell('offline');});
  G.addEventListener('focus',function(){sync();});
  // Sync occasionally while open; no background permission or hidden polling service.
  setInterval(function(){if(document.visibilityState==='visible'&&owner)sync();},30000);
  G.SQCloud={init:init,panel:panel,attend:attend,sync:sync};
})(typeof globalThis!=='undefined'?globalThis:window);
