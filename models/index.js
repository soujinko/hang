import { connection } from "./db.js";
import users from "./users.js";
import trips from "./trips.js";
import likes from "./likes.js";
import requests from "./requests.js";
// import alarms from "./alarms.js";
import auth from "./auth.js";

// 이 파일을 실행해서 db를 세팅하세요
async function createDb() {
  connection.beginTransaction();
  await connection.query(users);
  await connection.query(trips);
  await connection.query(likes);
  await connection.query(requests);
  await connection.query(auth);
  await connection.query(
    "create view userView as select userPk, nickname, userId, region, city, age, gender,guide, profileImg,intro, tags from hang.users"
  );
  console.log("tables created");
  connection.release();
}

createDb();
