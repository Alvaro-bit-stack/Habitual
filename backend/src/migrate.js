import {readFile} from 'node:fs/promises';
import {SqlStore} from './sql-store.js';
const store=new SqlStore();
const pool=await store.pool();
try { await pool.request().batch(await readFile(new URL('../sql/001-initial.sql',import.meta.url),'utf8')); console.log('Schema ready'); }
finally { await pool.close(); }
