// Local development/test adapter only. Azure Functions imports SqlStore, never this file.
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ApiError,friendCode} from './validation.js';
import {newCode,pair,MAX_PENDING} from './friends.js';
export class FileStore {
  constructor(path=null) { this.path=path;this.data=this.empty();this.queue=Promise.resolve(); }
  empty() { return {states:{},events:{},attendance:{},profiles:{},friendships:{},paths:{},usage:{}}; }
  async init() { if(this.path)try{this.data={...this.empty(),...JSON.parse(await readFile(this.path,'utf8'))};}catch(e){if(e.code!=='ENOENT')throw e;}return this; }
  async change(fn) {
    const work=this.queue.then(async()=>{
      const before=structuredClone(this.data);
      try {
        const result=fn();
        if(this.path){await mkdir(dirname(this.path),{recursive:true});await writeFile(this.path+'.tmp',JSON.stringify(this.data));await rename(this.path+'.tmp',this.path);}
        return structuredClone(result);
      }catch(e){this.data=before;throw e;}
    });
    this.queue=work.catch(()=>{});return work;
  }
  async getState(id){await this.queue;return structuredClone(this.data.states[id]||{revision:0,state:null});}
  putState(id,revision,state){return this.change(()=>{
    if((this.data.states[id]?.revision||0)!==revision)return null;
    return this.data.states[id]={revision:revision+1,state:structuredClone(state)};
  });}
  async events(id){await this.queue;return Object.values(this.data.events).filter(e=>Date.parse(e.startsAt)>Date.now()).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)).slice(0,200).map(e=>({...e,going:(this.data.attendance[e.id]||[]).length,rsvp:(this.data.attendance[e.id]||[]).includes(id)}));}
  createEvent(user,event){return this.change(()=>{const id=randomUUID();return this.data.events[id]={id,...event,host:user.name};});}
  attend(user,id,going){return this.change(()=>{
    const event=this.data.events[id];if(!event)throw new ApiError(404,'Event not found');
    if(going&&Date.parse(event.startsAt)<=Date.now())throw new ApiError(409,'This event has started');
    const people=this.data.attendance[id]||[];const exists=people.includes(user);
    if(going&&!exists&&people.length>=event.spots)throw new ApiError(409,'This event is full');
    this.data.attendance[id]=going?(exists?people:people.concat(user)):people.filter(x=>x!==user);
    return {rsvp:going,going:this.data.attendance[id].length};
  });}
  // ---- friends ----
  profile(user,fields){return this.change(()=>{
    const p=this.data.profiles;let me=p[user.id];
    if(!me){let code;do code=newCode();while(Object.values(p).some(x=>x.code===code));me=p[user.id]={code,name:user.name,character:null,xp:0,hobbies:[]};}
    if(fields)Object.assign(me,fields);
    return me;
  });}
  byCode(code){return Object.keys(this.data.profiles).find(id=>this.data.profiles[id].code===code);}
  async friends(id){await this.queue;const out={friends:[],incoming:[],outgoing:[]};
    for(const [k,f] of Object.entries(this.data.friendships)){const [a,b]=k.split('|');if(a!==id&&b!==id)continue;
      const p=this.data.profiles[a===id?b:a],card={code:p.code,name:p.name,character:p.character};
      if(f.accepted)out.friends.push({...card,xp:p.xp,hobbies:p.hobbies||[]});else(f.by===id?out.outgoing:out.incoming).push(card);}
    return structuredClone(out);}
  requestFriend(id,code){return this.change(()=>{
    const other=this.byCode(friendCode(code));if(!other)throw new ApiError(404,'No one has that friend code');
    if(other===id)throw new ApiError(400,'That is your own code');
    const k=pair(id,other),f=this.data.friendships[k];
    if(f?.accepted)return {status:'friends'};
    if(f&&f.by!==id){f.accepted=true;return {status:'friends'};}
    if(f)return {status:'requested'};
    if(Object.entries(this.data.friendships).filter(([,x])=>x.by===id&&!x.accepted).length>=MAX_PENDING)throw new ApiError(429,'Too many pending requests');
    this.data.friendships[k]={by:id,accepted:false};return {status:'requested'};
  });}
  answerFriend(id,code,accept){return this.change(()=>{
    const other=this.byCode(friendCode(code)),k=other&&pair(id,other),f=k&&this.data.friendships[k];
    if(!f||f.accepted||f.by===id)throw new ApiError(404,'No request from that person');
    if(accept)f.accepted=true;else delete this.data.friendships[k];
    return {status:accept?'friends':'declined'};
  });}
  removeFriend(id,code){return this.change(()=>{
    const other=this.byCode(friendCode(code));if(other)delete this.data.friendships[pair(id,other)];return {status:'removed'};
  });}
  // ---- guided paths ----
  async cachedPath(key,maxAge){await this.queue;const c=this.data.paths[key];return c&&Date.now()-c.at<maxAge?structuredClone(c.payload):null;}
  savePath(key,payload){return this.change(()=>{this.data.paths[key]={at:Date.now(),payload};});}
  useAi(id,limit){return this.change(()=>{
    const k=id+'|'+new Date().toISOString().slice(0,10),n=this.data.usage[k]||0;
    if(n>=limit)throw new ApiError(429,'Daily guide limit reached. Try again tomorrow.');
    this.data.usage[k]=n+1;
  });}
}
