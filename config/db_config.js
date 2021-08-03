import dotenv from "dotenv";
dotenv.config();

const config = {
  host: "127.0.0.1",
  user: "root",
  password: process.env.DB_PASSWORD,
  database: "hang",
  connectionLimit: 10,
  debug: 0
};

export default config;
