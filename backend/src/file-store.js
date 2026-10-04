// Local development/test adapter only. Azure Functions imports SqlStore, never this file.
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {ApiError} from './validation.js';
export class FileStore {
  constructor(path=null) { this.path=path;this.data={states:{},events:{},attendance:{}};this.queue=Promise.resolve(); }
  async init() { if(this.path)try{this.data=JSON.parse(await readFile(this.path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}return this; }
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
}
