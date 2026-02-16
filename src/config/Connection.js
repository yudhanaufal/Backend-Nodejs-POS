const mysql = require('mysql2');
require('dotenv').config(); // Install dulu: npm install dotenv

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "pos",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
// Konversi ke Promise-based
const promisePool = pool.promise();

// Test connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err.message);
    } else {
        console.log('Database connected successfully!');
        connection.release();
    }
});

module.exports = promisePool; // Menggunakan promise-based
