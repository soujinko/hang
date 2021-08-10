import mysql from "mysql";
import mysql2 from "mysql2/promise";
import config from "../config/db_config.js";

// connection 모듈화
const pool = mysql.createPool(config);
const getConnection = function (callback) {
  pool.getConnection(function (err, conn) {
    if (!err) {
      callback(conn);
    }
  });
};

const connection = await mysql2
  .createPool(config)
  .getConnection(async (conn) => conn);

// function keepAlive() {
//   console.log("keepAlive");
//   pool.getConnection(function (err, connection) {
//     if (err) {
//       console.log("getconnection Error", err);
//       return;
//     }
//     connection.ping();
//     connection.release();
//   });

//   //redis client를 사용중이라면, 아마 Redis연결도 빠르게 끊길겁니다.
//   //client.ping();  // 라고 해주면 Redis연결도 유지합니다.
// }
// setInterval(keepAlive, 60 * 5000);

export { getConnection, connection };
