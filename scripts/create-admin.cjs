const { randomUUID, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { client } = require('./db.cjs');
const { hashPassword } = require('../dist/auth/password.js');
const db=client();
let reservedFile;
(async()=>{
  try {
    const email=(process.env.ADMIN_EMAIL||'').trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Set ADMIN_EMAIL to the administrator email.');
    const password=process.env.ADMIN_PASSWORD || randomBytes(24).toString('base64url');
    if(password.length<12 || password.length>128) throw new Error('ADMIN_PASSWORD must have 12-128 characters.');
    const output=path.resolve(process.env.ADMIN_CREDENTIALS_FILE || '.local/admin-credentials.txt');
    await db.connect();await db.query('BEGIN');
    await db.query('LOCK TABLE auth_users IN SHARE ROW EXCLUSIVE MODE');
    const result=await db.query("SELECT id FROM auth_users WHERE role='ADMIN' AND active=true LIMIT 1");
    if(result.rows.length) throw new Error('An administrator already exists. Use the authenticated Users API.');
    // Reserve private file before DB mutation; never overwrite prior credentials.
    if(!process.env.ADMIN_PASSWORD) { fs.mkdirSync(path.dirname(output),{recursive:true,mode:0o700}); fs.writeFileSync(output,`Email: ${email}\nPassword: ${password}\n`,{mode:0o600,flag:'wx'}); reservedFile=output; }
    await db.query("INSERT INTO auth_users(id,email,name,role,password_hash) VALUES($1,$2,$3,'ADMIN',$4)",[randomUUID(),email,process.env.ADMIN_NAME||'Administrador',await hashPassword(password)]);
    await db.query('COMMIT');
    console.log('Administrator created.' + (process.env.ADMIN_PASSWORD ? '' : ' Credentials saved in '+output));
  } catch(error) {
    await db.query('ROLLBACK').catch(()=>{});if(reservedFile)fs.unlinkSync(reservedFile);console.error(error.code||error.message);process.exitCode=1;
  } finally {await db.end();}
})();
