import getConnection from "./db.js";
import userstable from "./user.js";
import tripstable from "./trips.js";
import likestable from "./likes.js";
import requeststable from "./requests.js";
import alarmstable from "./alarms.js";

// 이 파일을 실행해서 db를 세팅하세요

getConnection(async (conn) => {
  // 유저 테이블 생성
  await conn.query(userstable, function (err, result) {
    if (err) throw err;
    console.log("userstable created");
  });

  // 트립 테이블 생성
  await conn.query(tripstable, function (err, result) {
    if (err) throw err;
    console.log("tripstable created");
  });
  // 라이크 테이블 생성
  await conn.query(likestable, function (err, result) {
    if (err) throw err;
    console.log("likestable created");
  });
  // 리퀘스트 테이블 생성
  await conn.query(requeststable, function (err, result) {
    if (err) throw err;
    console.log("requeststable created");
  });
  // 알람 테이블 생성
  await conn.query(alarmstable, function (err, result) {
    if (err) throw err;
    console.log("alarmstable created");
  });

  conn.release();
});
