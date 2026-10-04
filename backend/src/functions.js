import {app} from '@azure/functions';
import {createApi} from './api.js';
import {createAuthenticator} from './auth.js';
import {SqlStore} from './sql-store.js';
let handler;
app.http('habitual', {route:'{*path}',methods:['GET','PUT','POST'],authLevel:'anonymous',handler:async(request,context)=>{
  // Anonymous here means no Functions key. Every private route verifies the signed Entra bearer token.
  if (!handler) handler=createApi(new SqlStore(),createAuthenticator());
  return handler(request,context);
}});
