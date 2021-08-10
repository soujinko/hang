/**
 * **24시간 마다 기간이 지난 여행 정보를 삭제합니다.**
 *
 * SELECT * FROM information_schema.events; // 이벤트 설정 되었는지 확인
 * SHOW VARIABLES LIKE 'event%'; // 스케줄러 활성화 상태 확인
 * SET GLOBAL event_scheduler = ON; // 이벤트 스케줄러 활성화
 * SET @@global.event_scheduler = ON; // 이벤트 스케줄러 활성화
 */
import { connection } from "../db.js";

// const DBCleanerProc = `DELIMITER $$
//                       CREATE PROCEDURE IF NOT EXISTS
//                       DBCleaner()
//                       BEGIN
//                       DELETE FROM trips
//                       WHERE TIMESTAMPDIFF(DAY, endDate, CURRENT_TIMESTAMP) > 0;
//                       END $$
//                       DELIMITER $$`;

// const DBCleanerEvent = `CREATE EVENT IF NOT EXISTS DBCleaner
//                         ON SCHEDULE EVERY 24 hour
//                         ON COMPLETION PRESERVE
//                         STARTS NOW()
//                         DO CALL
//                         DBCleaner();`;

async function keepAlive() {
  try {
    connection.beginTransaction();
    console.log("keepAlive");
    await connection.query(``);
    // connection.ping();
  } catch (err) {
    console.error(err);
    await connection.rollback();
  } finally {
    connection.release();
  }
}
// setInterval(keepAlive, 60 * 5000);
export default keepAlive;

// 백업은 특정 위치에서 명령으로 실행해야함 ex)c://backups
// MyISAM이 백업이 빠르다. InnoDB는 양 많으면 몇 시간도 걸림. 60만줄에 5시간 걸렸다고 함
// 평소에 쓸때도 관계성 별로 없고 처리 단순한 애들은 MyISAM이 빠름
// 백업이 느리다면 잠시 ENGINE을 myisam으로 변경해서 백업해도 된다. 다시 바꿀 수 있음

// db백업
// mysqldump -u [사용자 계정] -p [원본 데이터베이스명] > [생성할 백업 DB명].sql
// mysql -u [사용자 계정] -p  [복원할 DB] < [백업된 DB].sql

// 테이블 백업
// mysqldump -u [사용자 계정] -p [데이터베이스명] [원본 백업받을 테이블명] > [백업받을 테이블명].sql
// mysql -u [사용자 계정] -p [복원할 DB ] < [백업된 테이블].sql

// 모든 db 백업
// mysqldump -A-databases -u [사용자 계정] -p --default-character-set=euckr < [백업된 DB].sql
// mysql -A-databases -u [사용자 계정] -p < [백업된 DB].sql

// 매일 새벽 한시에 저장하도록 설정 https://opensrc.tistory.com/211
/* #!/bin/bash 
echo "[$(date +%Y-%m-%d) $(date +%H:%M:%S)] start backup" 
export backup_file_name="MySystem_db_backup_$(date +%Y%m%d)" 
echo "[$(date +%Y-%m-%d) $(date +%H:%M:%S)] start backup" 
#echo ${backup_file_name} 
echo "[$(date +%Y-%m-%d) $(date +%H:%M:%S)] daily backup start dump : ${backup_file_name}" 
/usr/bin/mysqldump -uDBUSERID -pDBUSERPW DBNAME > /usr/local/backup/mysql/${backup_file_name}.sql 
echo "[$(date +%Y-%m-%d) $(date +%H:%M:%S)] daily backup compress : ${backup_file_name}.sql to ${backup_file_name}.sql.tar.gz" 
/usr/bin/tar cvfpzR /usr/local/backup/mysql/${backup_file_name}.tar.gz /usr/local/backup/mysql/${backup_file_name}.sql 
echo "[$(date +%Y-%m-%d) $(date +%H:%M:%S)] daily backup delete dump : ${backup_file_name}.sql" 
/usr/bin/rm /usr/local/backup/mysql/${backup_file_name}.sql 
echo "[$(date +%Y-%m-%d) $(date +%H:%M:%S)] end backup successfully" */

// https://programmerdaddy.tistory.com/137 < 여기가 훨씬 간단한듯?

//ttps://bstar36.tistory.com/345 => redis복구는 자동인듯? aof에서 잘못된 명령 수정해주는 얘기가 자주 나옴.
// BGSAVE는 백그라운드 세이브. 즉 전면작업을 멈추지 않고 저장가능(RDB). rdb와 aof를 둘다 쓴다는 사람도 있다. rdb가 크기가 더 작고 빠름 그러나 읽을수없고 편집도 불가.
