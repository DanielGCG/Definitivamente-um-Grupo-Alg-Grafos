const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'jfofoca',
    password: process.env.DB_PASS || 'jf011996',
    database: process.env.DB_NAME || 'db_jogofofoca',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();