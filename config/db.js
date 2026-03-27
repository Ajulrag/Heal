const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ DB initial connection failed:', err.message);
    return;
  }
  console.log('✅ DB Connected');
  connection.release();
});

db.on('connection', (connection) => {
  connection.on('error', (err) => {
    console.error('⚠️ MySQL connection error:', err.code || err.message);
  });
});

module.exports = db;