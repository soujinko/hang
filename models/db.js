import mysql from "mysql";
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

export default getConnection;
