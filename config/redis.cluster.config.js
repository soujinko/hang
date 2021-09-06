import Redis from "ioredis";

const redis = new Redis.Cluster([
  { port: 6379, host: "0.0.0.0" },
  { port: 6380, host: "0.0.0.0" },
]);

export default redis;
