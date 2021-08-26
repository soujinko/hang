import Redis from "ioredis";

// const natMap = {
//   natMap:{
//     '127.0.0.1:6379':{host:'redis', port:'6379'},
//     '127.0.0.1:6380':{host:'redis', port:'6380'},
//     '127.0.0.1:6381':{host:'redis', port:'6381'},
//     '127.0.0.1:6382':{host:'redis', port:'6382'},
//     '127.0.0.1:6383':{host:'redis', port:'6383'},
//     '127.0.0.1:6384':{host:'redis', port:'6384'}
//   }
// }

const redis = new Redis.Cluster([
  { port: 6379, host: "127.0.0.1" },
  { port: 6380, host: "127.0.0.1" },
]);

export default redis;
