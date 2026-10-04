import sql from 'mssql';
import {randomUUID} from 'node:crypto';
import {ApiError} from './validation.js';
export function sqlConfig(env = process.env) {
  if (!env.SQL_SERVER || !env.SQL_DATABASE) throw new Error('Configure SQL_SERVER and SQL_DATABASE');
  return {server:env.SQL_SERVER, database:env.SQL_DATABASE,
    authentication:{type:'azure-active-directory-default',options:env.AZURE_CLIENT_ID ? {clientId:env.AZURE_CLIENT_ID} : {}},
    options:{encrypt:true,trustServerCertificate:false}, pool:{max:5,min:0,idleTimeoutMillis:30000},requestTimeout:15000};
}
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
}
