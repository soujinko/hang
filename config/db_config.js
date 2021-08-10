import dotenv from "dotenv";

dotenv.config();

const config = {
  host: "localhost",
  user: "root",
  password: process.env.dbpassword,
  database: "hang",
  connectionLimit: 30,
};

export default config;
