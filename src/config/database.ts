import mysql from "mysql2/promise"
import dotenv from "dotenv"
dotenv.config()

export const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    ssl: {
        rejectUnauthorized: false
    }
})

db.getConnection()
    .then(async conn => {
        console.log("[DB] Connected successfully")
        await conn.query(`
      CREATE TABLE IF NOT EXISTS Contact (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        phoneNumber    VARCHAR(20)  DEFAULT NULL,
        email          VARCHAR(255) DEFAULT NULL,
        linkedId       INT          DEFAULT NULL,
        linkPrecedence ENUM('primary', 'secondary') NOT NULL,
        createdAt      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt      DATETIME     DEFAULT NULL,
        FOREIGN KEY (linkedId) REFERENCES Contact(id)
      )
    `)
        console.log("[DB] Contact table ready")
        conn.release()
    })
    .catch(err => {
        console.error("[DB] Connection FAILED:", err.message, "| code:", err.code)
    })
