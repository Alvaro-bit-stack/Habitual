import {readFile} from 'node:fs/promises';
import {SqlStore} from './sql-store.js';
// Run as the SQL admin (az login). APP_IDENTITY = the web app's name; it gets row access only, no schema rights.
const GRANTS = {UserProgress:'SELECT, INSERT, UPDATE', Events:'SELECT, INSERT', Attendance:'SELECT, INSERT, DELETE',
  Profiles:'SELECT, INSERT, UPDATE', Friendships:'SELECT, INSERT, UPDATE, DELETE', PathCache:'SELECT, INSERT, UPDATE', AiUsage:'SELECT, INSERT, UPDATE'};
const app = process.env.APP_IDENTITY;
if (app && !/^[a-z0-9-]{2,60}$/.test(app)) throw new Error('APP_IDENTITY must be the web app name');
const store=new SqlStore();
const pool=await store.pool();
try {
  for (const file of ['001-initial.sql','002-friends-paths.sql','003-profile-hobbies.sql','004-discoverable.sql']) await pool.request().batch(await readFile(new URL('../sql/'+file,import.meta.url),'utf8'));
  if (app) {
    await pool.request().batch(`IF DATABASE_PRINCIPAL_ID('${app}') IS NULL CREATE USER [${app}] FROM EXTERNAL PROVIDER;`);
    for (const [table, rights] of Object.entries(GRANTS)) await pool.request().batch(`GRANT ${rights} ON dbo.${table} TO [${app}];`);
  }
  console.log('Schema ready' + (app ? '; access granted to ' + app : ''));
}
finally { await pool.close(); }
