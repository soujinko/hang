import { getConnection } from '../models/db.js';

// 24시간마다 유효기간이 지난 auth테이블의 instance들을 삭제합니다.
const DBCleaner = () =>{
  setInterval(()=>getConnection((conn)=>{
    try {
      conn.beginTransaction();
      conn.query(`DELETE FROM auth WHERE TIMESTAMPDIFF(SECOND, time, CURRENT_TIMESTAMP) > 60;`)
    } catch(err) {
      conn.rollback();
      console.error(err);
    } finally {
      conn.release();
    }
  }), 1000*60*60*24)
};

export default DBCleaner;
