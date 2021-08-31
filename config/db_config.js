import dotenv from "dotenv";

dotenv.config();

const config = {
  host: "15.165.19.129",
  user: "hanghang",
  password: process.env.DB_PASSWORD,
  database: "hang",
  // debug: true,
  connectionLimit: 30,
};

export default config;
