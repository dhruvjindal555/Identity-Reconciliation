import mysql from "mysql2/promise"
import dotenv from "dotenv"
dotenv.config()


console.log(process.env.SQL_PASSWORD)
export const db = mysql.createPool({
 host: "localhost",
 user: "root",
 password: "dhruv1234509876",
 database: "bitespeed"
})