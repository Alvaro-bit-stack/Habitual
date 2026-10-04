import sql from 'mssql';
import {randomUUID} from 'node:crypto';
import {ApiError,friendCode} from './validation.js';
import {newCode,MAX_PENDING} from './friends.js';
export function sqlConfig(env = process.env) {
  if (!env.SQL_SERVER || !env.SQL_DATABASE) throw new Error('Configure SQL_SERVER and SQL_DATABASE');
  return {server:env.SQL_SERVER, database:env.SQL_DATABASE,
    authentication:{type:'azure-active-directory-default',options:env.AZURE_CLIENT_ID ? {clientId:env.AZURE_CLIENT_ID} : {}},
    options:{encrypt:true,trustServerCertificate:false}, pool:{max:5,min:0,idleTimeoutMillis:30000},requestTimeout:15000};
}
const parseHobbies = text => { try { const v = JSON.parse(text || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
export class SqlStore {
  constructor(config = sqlConfig()) { this.config=config; this.pending=null; }
  async pool() {
    if (!this.pending) this.pending=new sql.ConnectionPool(this.config).connect().catch(e=>{this.pending=null;throw e;});
    return this.pending;
  }
  async getState(id) {
    const result=await (await this.pool()).request().input('id',sql.VarChar(64),id).query('SELECT Revision,Payload,UpdatedAt FROM dbo.UserProgress WHERE UserId=@id');
    const row=result.recordset[0];
    return row ? {revision:row.Revision,state:JSON.parse(row.Payload),updatedAt:row.UpdatedAt} : {revision:0,state:null};
  }
  async transaction(fn) {
    const tx=new sql.Transaction(await this.pool());await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try { const result=await fn(tx);await tx.commit();return result; }
    catch(e){try{await tx.rollback();}catch{}throw e;}
  }
  async putState(id, revision, state) {
    return this.transaction(async tx=>{
      const request=new sql.Request(tx).input('id',sql.VarChar(64),id);
      const old=(await request.query('SELECT Revision FROM dbo.UserProgress WITH (UPDLOCK,HOLDLOCK) WHERE UserId=@id')).recordset[0];
      if ((old?.Revision || 0)!==revision) return null;
      await new sql.Request(tx).input('id',sql.VarChar(64),id).input('revision',sql.Int,revision+1).input('payload',sql.NVarChar(sql.MAX),JSON.stringify(state))
        .query(old ? 'UPDATE dbo.UserProgress SET Revision=@revision,Payload=@payload,UpdatedAt=SYSUTCDATETIME() WHERE UserId=@id' : 'INSERT dbo.UserProgress(UserId,Revision,Payload) VALUES(@id,@revision,@payload)');
      return {revision:revision+1,state};
    });
  }
  async events(id) {
    const rows=(await (await this.pool()).request().input('id',sql.VarChar(64),id).query(`SELECT TOP (200) e.*, (SELECT COUNT(*) FROM dbo.Attendance a WHERE a.EventId=e.Id) AS Going,
      (SELECT COUNT(*) FROM dbo.Attendance a WHERE a.EventId=e.Id AND a.UserId=@id) AS OwnRsvp
      FROM dbo.Events e WHERE e.StartsAt>SYSUTCDATETIME() ORDER BY e.StartsAt,e.Id`)).recordset;
    return rows.map(e=>({id:e.Id,title:e.Title,place:e.Place,hobbyId:e.HobbyId,level:e.Level,spots:e.Spots,startsAt:e.StartsAt,host:e.HostName,going:e.Going,rsvp:!!e.OwnRsvp}));
  }
  async createEvent(user, event) {
    const id=randomUUID();
    await (await this.pool()).request().input('id',sql.UniqueIdentifier,id).input('hostId',sql.VarChar(64),user.id).input('hostName',sql.NVarChar(100),user.name)
      .input('hobby',sql.VarChar(40),event.hobbyId).input('title',sql.NVarChar(200),event.title).input('place',sql.NVarChar(200),event.place)
      .input('level',sql.NVarChar(40),event.level).input('spots',sql.Int,event.spots).input('starts',sql.DateTimeOffset,new Date(event.startsAt))
      .query('INSERT dbo.Events(Id,HostId,HostName,HobbyId,Title,Place,Level,Spots,StartsAt) VALUES(@id,@hostId,@hostName,@hobby,@title,@place,@level,@spots,@starts)');
    return {id,...event,host:user.name,going:0,rsvp:false};
  }
  async attend(id, eventId, going) {
    return this.transaction(async tx=>{
      const e=(await new sql.Request(tx).input('event',sql.UniqueIdentifier,eventId).query('SELECT Spots,StartsAt FROM dbo.Events WITH (UPDLOCK,HOLDLOCK) WHERE Id=@event')).recordset[0];
      if (!e) throw new ApiError(404,'Event not found');
      if (going && new Date(e.StartsAt)<=new Date()) throw new ApiError(409,'This event has started');
      const rows=(await new sql.Request(tx).input('event',sql.UniqueIdentifier,eventId).query('SELECT UserId FROM dbo.Attendance WHERE EventId=@event')).recordset;
      const exists=rows.some(x=>x.UserId===id);
      if (going && !exists && rows.length>=e.Spots) throw new ApiError(409,'This event is full');
      if (going!==exists) await new sql.Request(tx).input('event',sql.UniqueIdentifier,eventId).input('id',sql.VarChar(64),id)
        .query(going?'INSERT dbo.Attendance(EventId,UserId) VALUES(@event,@id)':'DELETE dbo.Attendance WHERE EventId=@event AND UserId=@id');
      return {rsvp:going,going:rows.length+(going&&!exists?1:!going&&exists?-1:0)};
    });
  }
  // ---- friends ----
  async profile(user, fields) {
    return this.transaction(async tx=>{
      const q=()=>new sql.Request(tx).input('id',sql.VarChar(64),user.id);
      let me=(await q().query('SELECT Code,Name,Character,Xp,Hobbies FROM dbo.Profiles WITH (UPDLOCK,HOLDLOCK) WHERE UserId=@id')).recordset[0];
      if (!me) {
        for (let tries=0;;tries++) {
          const code=newCode();
          if ((await new sql.Request(tx).input('code',sql.Char(8),code).query('SELECT 1 AS x FROM dbo.Profiles WHERE Code=@code')).recordset.length) { if (tries<5) continue; throw new Error('code space'); }
          await q().input('code',sql.Char(8),code).input('name',sql.NVarChar(100),user.name).query('INSERT dbo.Profiles(UserId,Code,Name) VALUES(@id,@code,@name)');
          me={Code:code,Name:user.name,Character:null,Xp:0};break;
        }
      }
      if (fields) {
        await q().input('name',sql.NVarChar(100),fields.name).input('ch',sql.VarChar(20),fields.character).input('xp',sql.Int,fields.xp).input('hb',sql.NVarChar(4000),JSON.stringify(fields.hobbies||[]))
          .query('UPDATE dbo.Profiles SET Name=@name,Character=@ch,Xp=@xp,Hobbies=@hb,UpdatedAt=SYSUTCDATETIME() WHERE UserId=@id');
        me={...me,Name:fields.name,Character:fields.character,Xp:fields.xp};
      }
      return {code:me.Code,name:me.Name,character:me.Character,xp:me.Xp};
    });
  }
  async friends(id) {
    const rows=(await (await this.pool()).request().input('id',sql.VarChar(64),id).query(`SELECT f.Accepted,f.RequestedBy,p.Code,p.Name,p.Character,p.Xp,p.Hobbies
      FROM dbo.Friendships f JOIN dbo.Profiles p ON p.UserId=CASE WHEN f.UserA=@id THEN f.UserB ELSE f.UserA END
      WHERE f.UserA=@id OR f.UserB=@id ORDER BY p.Name`)).recordset;
    const out={friends:[],incoming:[],outgoing:[]};
    for (const r of rows) { const card={code:r.Code,name:r.Name,character:r.Character};
      if (r.Accepted) out.friends.push({...card,xp:r.Xp,hobbies:parseHobbies(r.Hobbies)}); else (r.RequestedBy===id?out.outgoing:out.incoming).push(card); }
    return out;
  }
  async otherId(tx, code) {
    return (await new sql.Request(tx).input('code',sql.Char(8),friendCode(code)).query('SELECT UserId FROM dbo.Profiles WHERE Code=@code')).recordset[0]?.UserId;
  }
  pairRequest(tx, id, other) {
    const [a,b]=id<other?[id,other]:[other,id];
    return new sql.Request(tx).input('a',sql.VarChar(64),a).input('b',sql.VarChar(64),b).input('me',sql.VarChar(64),id);
  }
  async requestFriend(id, code) {
    return this.transaction(async tx=>{
      const other=await this.otherId(tx,code);
      if (!other) throw new ApiError(404,'No one has that friend code');
      if (other===id) throw new ApiError(400,'That is your own code');
      const f=(await this.pairRequest(tx,id,other).query('SELECT Accepted,RequestedBy FROM dbo.Friendships WITH (UPDLOCK,HOLDLOCK) WHERE UserA=@a AND UserB=@b')).recordset[0];
      if (f?.Accepted) return {status:'friends'};
      if (f && f.RequestedBy!==id) { await this.pairRequest(tx,id,other).query('UPDATE dbo.Friendships SET Accepted=1 WHERE UserA=@a AND UserB=@b'); return {status:'friends'}; }
      if (f) return {status:'requested'};
      const pending=(await new sql.Request(tx).input('me',sql.VarChar(64),id).query('SELECT COUNT(*) AS n FROM dbo.Friendships WHERE RequestedBy=@me AND Accepted=0')).recordset[0].n;
      if (pending>=MAX_PENDING) throw new ApiError(429,'Too many pending requests');
      await this.pairRequest(tx,id,other).query('INSERT dbo.Friendships(UserA,UserB,RequestedBy) VALUES(@a,@b,@me)');
      return {status:'requested'};
    });
  }
  async answerFriend(id, code, accept) {
    return this.transaction(async tx=>{
      const other=await this.otherId(tx,code);
      const f=other&&(await this.pairRequest(tx,id,other).query('SELECT Accepted,RequestedBy FROM dbo.Friendships WITH (UPDLOCK,HOLDLOCK) WHERE UserA=@a AND UserB=@b')).recordset[0];
      if (!f || f.Accepted || f.RequestedBy===id) throw new ApiError(404,'No request from that person');
      await this.pairRequest(tx,id,other).query(accept?'UPDATE dbo.Friendships SET Accepted=1 WHERE UserA=@a AND UserB=@b':'DELETE dbo.Friendships WHERE UserA=@a AND UserB=@b');
      return {status:accept?'friends':'declined'};
    });
  }
  async removeFriend(id, code) {
    return this.transaction(async tx=>{
      const other=await this.otherId(tx,code);
      if (other) await this.pairRequest(tx,id,other).query('DELETE dbo.Friendships WHERE UserA=@a AND UserB=@b');
      return {status:'removed'};
    });
  }
  // ---- guided paths ----
  async cachedPath(key, maxAge) {
    const row=(await (await this.pool()).request().input('k',sql.VarChar(80),key).input('s',sql.Int,Math.floor(maxAge/1000))
      .query('SELECT Payload FROM dbo.PathCache WHERE CacheKey=@k AND CreatedAt>DATEADD(second,-@s,SYSUTCDATETIME())')).recordset[0];
    return row ? JSON.parse(row.Payload) : null;
  }
  async savePath(key, payload) {
    await (await this.pool()).request().input('k',sql.VarChar(80),key).input('p',sql.NVarChar(sql.MAX),JSON.stringify(payload))
      .query(`MERGE dbo.PathCache WITH (HOLDLOCK) t USING (SELECT @k AS CacheKey) s ON t.CacheKey=s.CacheKey
        WHEN MATCHED THEN UPDATE SET Payload=@p,CreatedAt=SYSUTCDATETIME() WHEN NOT MATCHED THEN INSERT(CacheKey,Payload) VALUES(@k,@p);`);
  }
  async useAi(id, limit) {
    return this.transaction(async tx=>{
      const q=()=>new sql.Request(tx).input('id',sql.VarChar(64),id).input('day',sql.Date,new Date());
      const n=(await q().query('SELECT Calls FROM dbo.AiUsage WITH (UPDLOCK,HOLDLOCK) WHERE UserId=@id AND Day=@day')).recordset[0]?.Calls;
      if ((n||0)>=limit) throw new ApiError(429,'Daily guide limit reached. Try again tomorrow.');
      await q().query(n==null?'INSERT dbo.AiUsage(UserId,Day,Calls) VALUES(@id,@day,1)':'UPDATE dbo.AiUsage SET Calls=Calls+1 WHERE UserId=@id AND Day=@day');
    });
  }
}
