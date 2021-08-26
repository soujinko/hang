import dotenv from "dotenv";
import Redis from "ioredis";

dotenv.config();

const nodes = [
  { port: 6379, host: "redis" },
  { port: 6380, host: "redis" },
];
const options = {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
  },
};

const redis = new Redis.Cluster(nodes, options);

export default redis;
CMD[("pm2-runtime", "server.js", "-i", "max")];
