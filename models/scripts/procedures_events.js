/**
 * **24시간 마다 기간이 지난 여행 정보를 삭제합니다.**
 *
 * SELECT * FROM information_schema.events; // 이벤트 설정 되었는지 확인
 * SHOW VARIABLES LIKE 'event%'; // 스케줄러 활성화 상태 확인
 * SET GLOBAL event_scheduler = ON; // 이벤트 스케줄러 활성화
 * SET @@global.event_scheduler = ON; // 이벤트 스케줄러 활성화
 */
import { connection } from "../db.js";

// 프로시저 수정 이것으로 실행
// DROP procedure IF EXISTS `DBCleaner`;
// DELIMITER $$
// USE `hang`$$
// CREATE PROCEDURE `DBCleaner` ()
// BEGIN
// 	DELETE FROM trips
//     WHERE endDate < DATE_ADD(NOW(), INTERVAL - 24 HOUR);
// END;$$
// DELIMITER ;

// const DBCleanerProc = `DELIMITER $$ CREATE PROCEDURE IF NOT EXISTS DBCleaner2() BEGIN DELETE FROM trips WHERE endDate < DATE_ADD(NOW(), INTERVAL - 24 HOUR); END $$ DELIMITER;`;

// // 지금부터 24시간마다 실행
// const DBCleanerEvent = `CREATE EVENT IF NOT EXISTS DBCleanerEvent ON SCHEDULE EVERY 24 hour STARTS NOW() ON COMPLETION PRESERVE ENABLE DO CALL DBCleaner();`;
// // 1일에 1번 지정 시간 실행
// const DBCleanerEvent = `CREATE EVENT IF NOT EXISTS DBCleanerEvent ON SCHEDULE EVERY 1 DAY STARTS '2021-08-30 20:00:00' ON COMPLETION PRESERVE ENABLE DO CALL DBCleaner();`;

async function keepAlive() {
  try {
    connection.beginTransaction();
    console.log("keepAlive");
    await connection.query(`select * from likes`);
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

// --------------------------------------------------------------------
// mysqldump MySQL db 백업
// mysqldump 쉘스크립트를 사용하여 crontab으로 백업 자동화
// mysqldump 백업 방법은 InnoDB엔진에 한해
//  핫 백업 / 논리백업 방식 지원 -> (데이터 베이스 서버 중지 않고 실시간 백업, 디스크 용량 추가 필요,
//                                    각 오브젝트를 SQL 문으로 저장하여 백업, 복원 시의 안정성 증가,
//                                    백업과 복원 속도가 느림, 다른 서버간 데이터 이전 용이 등)
// 백업 방식 및 특징 -> https://jootc.com/p/201806231313
// 데이터가 많다면 mysqldump 백업은 부적합하다.

// 백업절차
//  0. login-path 등록
//     mysql 버전 5.7이후에는 보안규정이 바뀌어 파일에 password 사용 불가 -> login-path를 활용하자
//     mysql_config_editor set --login-path=[아무 명칭] --host=localhost --user=root --password
//     Enter password: 비밀번호는 "" 안에 입력

//  1. 쉘스크립트 작성
//    #!/bin/sh
//    export MYSQL_TEST_LOGIN_FILE=/home/ubuntu/.mylogin.cnf  /
//    login-path를 등록하면, 자동으로 mylogin.cnf생성된다. 위치를 찾아 export 해주자(안하면 crontab 실행시 인증 오류)

//    DATE=date +"%Y%m%d"
//    PREV_DATE=date --date '5 days ago' +"%Y%m%d"
//    /usr/bin/mysqldump --login-path=hanging --single-transaction hang > /backup/mysql_db_bak_${DATE}.sql
//    / mysqldump 절대경로로 써줘야 한다. login-path로 -u root -p를 대체, 트랜젝션이나 다양한 명령어 추가 가능

//    chmod 755  /backup/mysql_db_bak_${DATE}.sql
//    chown root.root /data/backup/backupdb_${DATE}.sql
//    rm -rf /data/backup/backupdb_${PREV_DATE}.sql  / 5일 후 삭제

//  2. #chmod 100 backup.sh / 변경방지 위해 생성자한테만 실행권한 주기
//  3. /root/backup.sh / 터미널에 다음 입력하여 스크립트 실행, 파일 생성되고 mysqldump를 가져왔다면 성공
//  4. 크론 등록
//      #crontab -e
//      00 04 * * * /root/backup.sh
//                  /root/backup.sh >> /root/logs/file.log 2>&1    / 다음과 같이  >> 파일경로 입력하고 2>&1기입하면 에러로그 저장, 확인 가능

//  5. 크론 데몬 재실행 (리눅스 시간 동기화 필요 / 시간 점점 느려지기 때문에 주기적으로 자동 동기화 필요)
//     /etc/init.d/cron restart
// --------------------------------------------------------------------

// https://programmerdaddy.tistory.com/137 < 여기가 훨씬 간단한듯?

//ttps://bstar36.tistory.com/345 => redis복구는 자동인듯? aof에서 잘못된 명령 수정해주는 얘기가 자주 나옴.
// BGSAVE는 백그라운드 세이브. 즉 전면작업을 멈추지 않고 저장가능(RDB). rdb와 aof를 둘다 쓴다는 사람도 있다. rdb가 크기가 더 작고 빠름 그러나 읽을수없고 편집도 불가.
