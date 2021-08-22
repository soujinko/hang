import dotenv from "dotenv";

dotenv.config();

const config = {
  host: "3.34.95.155",
  user: "hanghang",
  password: PROCESS.ENV.DB_PASSWORD,
  database: "hang",
  // debug: true,
  connectionLimit: 30,
};

export default config;
