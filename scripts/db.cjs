require('@nestjs/config').ConfigModule.forRoot();
const { Client } = require('pg');
function client() {
  return new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
}
module.exports = { client };
