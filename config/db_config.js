import dotenv from "dotenv";

dotenv.config();

const config = {
  host: "13.124.67.85",
  user: "hanghang",
  password: process.env.DB_PASSWORD,
  database: "hang",
  // debug: true,
  connectionLimit: 30,
};

export default config;
