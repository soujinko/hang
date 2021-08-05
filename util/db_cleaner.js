import { getConnection } from '../models/db.js';

// 24시간마다 유효기간이 지난 auth테이블의 instance들을 삭제합니다.
// 여행기간이 끝난 여행들도 DB에서 삭제할 필요가 있습니다.
const DBCleaner = () =>{
  setInterval(()=>getConnection((conn)=>{
    try {
      conn.beginTransaction();
      conn.query(`DELETE FROM auth WHERE TIMESTAMPDIFF(SECOND, time, CURRENT_TIMESTAMP) > 60;`)
      conn.query(`DELETE FROM trips WHERE TIMESTAMPDIFF(DAY, endDate, CURRENT_TIMESTAMP) > 0;`)
    } catch(err) {
      conn.rollback();
      console.error(err);
    } finally {
      conn.release();
    }
  }), 1000*60*60*24)
};

export default DBCleaner;
