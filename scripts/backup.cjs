const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
require('@nestjs/config').ConfigModule.forRoot();
const folder=path.resolve('.local/backups');fs.mkdirSync(folder,{recursive:true,mode:0o700});
const file=path.join(folder,`merceria-${new Date().toISOString().replace(/[:.]/g,'-')}.dump`);
const result=spawnSync('pg_dump',['-Fc','--no-owner','--host',process.env.DB_HOST||'localhost','--port',process.env.DB_PORT||'5432','--username',process.env.DB_USERNAME,'--dbname',process.env.DB_NAME,'--file',file],{env:{...process.env,PGPASSWORD:process.env.DB_PASSWORD},stdio:['ignore','ignore','pipe']});
if(result.status!==0){console.error('Backup failed. Check pg_dump installation and database connection.');process.exitCode=1;}
else {fs.chmodSync(file,0o600);console.log('Backup saved: '+file);}
