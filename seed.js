require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root1122',
    database: process.env.DB_NAME || 'leaveflow_db'
  });
  const hash = await bcrypt.hash('Admin@123', 10);
  await db.execute(
    `INSERT INTO employees (name,email,department,designation,password,role,approval_status)
     VALUES ('System Admin','admin@leaveflow.com','Administration','Administrator',?,'admin','approved')
     ON DUPLICATE KEY UPDATE role='admin', approval_status='approved'`, [hash]
  );
  await db.end();
  console.log('Admin ready: admin@leaveflow.com / Admin@123');
})();
