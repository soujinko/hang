import dotenv from "dotenv";
dotenv.config();
const config = {
  host: "localhost",
  user: "root",
  password: process.env.dbpassword,
  database: "hang",
  connectionLimit: 10,
  debug: true,
};

export default config;
