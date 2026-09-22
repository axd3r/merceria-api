const fs = require('node:fs');
const path = require('node:path');
require('@nestjs/config').ConfigModule.forRoot();
const { Client } = require('pg');
const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
(async () => {
  try {
    await client.connect();
    await client.query(fs.readFileSync(path.join(__dirname, 'order-price.sql'), 'utf8'));
    console.log('Order agreed price: esquema actualizado; datos existentes conservados.');
  } catch (error) {
    console.error('No se pudo actualizar el esquema:', error.code || error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
