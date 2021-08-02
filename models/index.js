import { getConnection } from "./db.js";
import users from "./user.js";
import trips from "./trips.js";
import likes from "./likes.js";
import requests from "./requests.js";
import alarms from "./alarms.js";

// 이 파일을 실행해서 db를 세팅하세요

function createDb() {
  getConnection(async (conn) => {
    // 유저 테이블 생성
    console.log("connect");
    await conn.query(users, (err, result) => {
      if (err) throw err;
      console.log("users table created");
    });

    // 트립 테이블 생성
    await conn.query(trips, (err, result) => {
      if (err) throw err;
      console.log("trips table created");
    });
    // 라이크 테이블 생성
    await conn.query(likes, (err, result) => {
      if (err) throw err;
      console.log("likes table created");
    });
    // 리퀘스트 테이블 생성
    await conn.query(requests, (err, result) => {
      if (err) throw err;
      console.log("requests table created");
    });
    // 알람 테이블 생성
    await conn.query(alarms, (err, result) => {
      if (err) throw err;
      console.log("alarms table created");
    });
    await conn.query(
      "create view userView as select userPk, nickname, userId, region, city, age, guide, profileImg from hang.users",
      (err, result) => {
        if (err) throw err;
        console.log("view table created");
      }
    );
    conn.release();
  });
}

createDb();
