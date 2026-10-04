import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createApi} from '../src/api.js';
import {FileStore} from '../src/file-store.js';
import {ApiError} from '../src/validation.js';
const requireSeparator=()=>process.platform==='win32'?'\\':'/';
const state=()=>({version:1,onboarded:true,user:{name:'Alice',xp:0,character:'neo'},tracked:[{hobbyId:'running',goal:2,xp:0,milestones:[]}],custom:[],sessions:[],achievements:{},rsvps:[],checkins:[]});
function setup(){const store=new FileStore();return {store,api:createApi(store,async r=>{const user=r.headers.get('authorization');if(!user)throw new ApiError(401,'Sign in');return {id:user,name:user};})};}
function call(api,path,method='GET',value,headers={}){return api(new Request('https://habitual.test/api/'+path,{method,headers:{Authorization:'alice',...headers},...(value===undefined?{}:{body:JSON.stringify(value)})}));}
test('private progress rejects anonymous access and requires revision',async()=>{const {api}=setup();assert.equal((await call(api,'me/state','GET',undefined,{Authorization:''})).status,401);assert.equal((await call(api,'me/state','PUT',state())).status,428);});
test('progress is isolated by authenticated identity, not submitted user ID',async()=>{
  const {api}=setup();let s=state();s.user.id='bob';assert.equal((await call(api,'me/state','PUT',s,{'If-Match':'"0"'})).status,200);
  assert.equal((await call(api,'me/state','GET',undefined,{Authorization:'bob'})).jsonBody.state,null);
  assert.equal((await call(api,'me/state')).jsonBody.state.tracked[0].hobbyId,'running');
});
test('stale writes return the newer copy instead of overwriting it',async()=>{
  const {api}=setup();await call(api,'me/state','PUT',state(),{'If-Match':'"0"'});
  const next=state();next.user.name='Other device';const result=await call(api,'me/state','PUT',next,{'If-Match':'"0"'});
  assert.equal(result.status,409);assert.equal(result.jsonBody.remote.state.user.name,'Alice');
});
test('concurrent updates to one revision have one winner',async()=>{
  const {api}=setup();const replies=await Promise.all([call(api,'me/state','PUT',state(),{'If-Match':'"0"'}),call(api,'me/state','PUT',state(),{'If-Match':'"0"'})]);
  assert.deepEqual(replies.map(r=>r.status).sort(),[200,409]);
});
test('invalid state and oversized bodies are rejected',async()=>{
  const {api}=setup();assert.equal((await call(api,'me/state','PUT',{version:1},{'If-Match':'"0"'})).status,400);
  const huge=state();huge.user.note='x'.repeat(1100001);assert.equal((await call(api,'me/state','PUT',huge,{'If-Match':'"0"'})).status,413);
});
const event=()=>({hobbyId:'running',title:'Park run',place:'Riverfront Park',level:'Intermediate',spots:2,startsAt:new Date(Date.now()+86400000).toISOString()});
test('event creation uses the signed-in host and validates dates',async()=>{
  const {api}=setup();const result=await call(api,'events','POST',{...event(),host:'Spoofed'});assert.equal(result.status,201);assert.equal(result.jsonBody.host,'alice');
  assert.equal((await call(api,'events','POST',{...event(),startsAt:'2000-01-01T00:00:00Z'})).status,400);
});
test('concurrent attendance respects capacity and retries are idempotent',async()=>{
  const {api}=setup();const id=(await call(api,'events','POST',event())).jsonBody.id;
  const replies=await Promise.all(['alice','bob','charlie'].map(user=>call(api,'events/'+id+'/attendance','PUT',{going:true},{Authorization:user})));
  assert.equal(replies.filter(r=>r.status===200).length,2);assert.equal(replies.filter(r=>r.status===409).length,1);
  assert.equal((await call(api,'events/'+id+'/attendance','PUT',{going:true})).jsonBody.going,2);
  await call(api,'events/'+id+'/attendance','PUT',{going:false});
  assert.equal((await call(api,'events/'+id+'/attendance','PUT',{going:true},{Authorization:'charlie'})).status,200);
  assert.equal((await call(api,'events')).jsonBody.events[0].rsvp,false);
});
test('local adapter preserves queued progress across process restarts',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'habitual-store-'));try{
    const file=join(dir,'data.json');await (await new FileStore(file).init()).putState('alice',0,state());
    assert.equal((await (await new FileStore(file).init()).getState('alice')).revision,1);
  }finally{assert.ok(resolve(dir).startsWith(resolve(tmpdir())+requireSeparator()+'habitual-store-'));await rm(dir,{recursive:true,force:true});}
});
test('responses never cache private state or expose storage errors',async()=>{
  const api=createApi({getState:()=>{throw new Error('secret connection string');}},async()=>({id:'alice'}));const response=await call(api,'me/state');
  assert.equal(response.status,500);assert.equal(response.headers['Cache-Control'],'no-store');assert.ok(!JSON.stringify(response).includes('secret'));
});
