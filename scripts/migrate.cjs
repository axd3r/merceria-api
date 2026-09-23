const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { client } = require('./db.cjs');
const db = client();
(async () => {
  try {
    await db.connect();
    await db.query("SELECT pg_advisory_lock(72631001)");
    await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT NOW())');
    for (const name of fs.readdirSync(path.join(__dirname,'migrations')).filter(x=>x.endsWith('.sql')).sort()) {
      const sql=fs.readFileSync(path.join(__dirname,'migrations',name),'utf8');
      const checksum=crypto.createHash('sha256').update(sql).digest('hex');
      const applied=await db.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name]);
      if(applied.rows.length) {
        if(applied.rows[0].checksum!==checksum) throw new Error('Applied migration changed: '+name);
        continue;
      }
      await db.query('BEGIN');
      if(name==='001-initial.sql') {
        const existing=await db.query("SELECT to_regclass('public.orders') AS existing");
        if(existing.rows[0].existing) {
          // Adopt the previously developed schema without recreating tables or data.
          const tables=[...sql.matchAll(/CREATE TABLE "([^"]+)"/g)].map(x=>x[1]);
          for(const table of tables) {
            const check=await db.query('SELECT to_regclass($1) AS existing',['public.'+table]);
            if(!check.rows[0].existing) throw new Error('Existing database is incomplete: '+table);
          }
          console.log('Existing business schema retained.');
        } else await db.query(sql);
      } else await db.query(sql);
      await db.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,checksum]);
      await db.query('COMMIT');
      console.log('Applied '+name);
    }
  } catch(error) {
    await db.query('ROLLBACK').catch(()=>{});
    console.error('Migration failed:',error.code||error.message);process.exitCode=1;
  } finally { await db.end(); }
})();
