const mysql = require('mysql2');
if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'onfire_db',
  port:     process.env.DB_PORT     || 3307,
  waitForConnections: true,
  connectionLimit: 10,
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ خطأ في الاتصال بـ MySQL:', err.code, '-', err.message);
  } else {
    console.log('✅ تم الاتصال بـ MySQL بنجاح');
    connection.release();
  }
});

module.exports = pool.promise();
