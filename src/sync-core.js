/* Durable device state is the outbox. Keep the acknowledged version separately; never overwrite conflicts. */
(function(G){
  'use strict';
  function encode(value){return JSON.stringify(value,function(k,v){if(v&&typeof v==='object'&&!Array.isArray(v)){var o={};Object.keys(v).sort().forEach(function(key){o[key]=v[key];});return o;}return v;});}
  class ProgressSync {
    constructor(options){this.o=options;this.meta=options.readMeta()||{revision:0,ack:encode(options.load())};this.active=true;this.busy=false;this.blocked=null;this.remote=null;this.status='local';this.o.writeMeta(this.meta);}
    dirty(){return encode(this.o.load())!==this.meta.ack;}
    tell(status){this.status=status;if(this.o.status)this.o.status(status);}
    stop(){this.active=false;}
    async sync(){
      if(!this.active||this.busy||this.blocked)return;
      this.busy=true;this.tell('syncing');
      try{
        var remote=await this.o.api('GET');if(!this.active||this.blocked)return;
        var local=this.o.load();var dirty=this.dirty();
        if(remote.revision!==this.meta.revision){
          if(dirty&&encode(remote.state)!==encode(local)){this.remote=remote;this.blocked='conflict';this.tell('conflict');return;}
          if(remote.state&&!dirty)this.o.replace(remote.state);
          this.meta={revision:remote.revision,ack:encode(remote.state||this.o.load())};this.o.writeMeta(this.meta);
        }
        if(this.dirty()){
          var sent=this.o.load();var saved=await this.o.api('PUT',sent,this.meta.revision);if(!this.active||this.blocked)return;
          this.meta={revision:saved.revision,ack:encode(sent)};this.o.writeMeta(this.meta);
        }
        this.tell(this.dirty()?'pending':'synced');
      }catch(e){
        if(!this.active||this.blocked)return;
        if(e.status===409){this.remote=e.remote;this.blocked='conflict';this.tell('conflict');}
        else if(e.status===401||e.status===403)this.tell('signin');
        else if(e.status===400||e.status===413)this.tell('rejected');
        else this.tell('offline');
      }finally{this.busy=false;}
    }
    resolve(choice){
      if(!this.remote||!this.active)return;
      this.o.backup(this.o.load()); // If backup fails, abort before replacing anything.
      if(choice==='cloud'&&this.remote.state)this.o.replace(this.remote.state);
      else if(choice!=='device')throw new Error('Choose a progress version');
      this.meta={revision:this.remote.revision,ack:encode(this.remote.state)};this.o.writeMeta(this.meta);
      this.blocked=null;this.remote=null;return this.sync();
    }
  }
  G.HabitualSyncCore=ProgressSync;
  if(typeof module!=='undefined'&&module.exports)module.exports=ProgressSync;
})(typeof globalThis!=='undefined'?globalThis:this);
