import mysql from 'mysql';
import mysql2 from 'mysql2/promise';
import config from '../config/db_config.js';


// connection 모듈화
const pool = mysql.createPool(config);
const getConnection = function (callback) {
  pool.getConnection(function (err, conn) {
    if (!err) {
      callback(conn);
    }
  });
};

const connection = await mysql2.createPool(config).getConnection(async(conn)=>conn)

export { getConnection, connection };
