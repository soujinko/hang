import express from "express";
const router = express.Router();
import { getConnection } from "../models/db.js";

router.get("/", async (req, res) => {
  try {
    // const { userPk } = res.locals;
    let promise = {};
    let guide = [];
    let traveler = [];
    let findTrip =
      "select *  from trips where userPk=1 AND partnerPk is not NULL ORDER BY startDate ASC LIMIT 1";
    let findUser = "select region from users where userPk = 1";

    getConnection(async (conn) => {
      await conn.query(findTrip, function (err, result) {
        if (result.length > 0) {
          const endDate = result[0].endDate;
          const startDate = result[0].startDate;
          const partnerPk = result[0].partnerPk;
          //   console.log("dddd", endDate, startDate, partnerPk);
          let findUser = `select * from users where userPk='${partnerPk}'`;
          conn.query(findUser, function (err, result) {
            const partnerImg = result[0].profileImg;
            const partnerNick = result[0].nickname;
            // console.log("sssss", partnerImg, partnerNick);
            promise.profileImg = partnerImg;
            promise.nickname = partnerNick;
            promise.startDate = startDate;
            promise.endDate = endDate;
            console.log(promise);
          });
        } else {
          promise = {};
        }
      });

      await conn.query(findUser, function (err, result) {
        if (err) throw err;
        const searchRegion = result[0].region;
        let findGuides = `select * from users where region ='${searchRegion}' and guide=1 ORDER BY RAND() LIMIT 3`;
        let findTravelers = `select a.* from users a left join trips b on a.userPk = b.userPk
        where b.region ='${searchRegion}' and b.partnerPk is NULL ORDER BY RAND() LIMIT 3 `;

        conn.query(findGuides, function (err, result) {
          guide = Object.values(JSON.parse(JSON.stringify(result)));
        });
        conn.query(findTravelers, function (err, result) {
          traveler = Object.values(JSON.parse(JSON.stringify(result)));
          // traveler = JSON.stringify(result).replace(/["']/gi, "");
          res.send({ promise, guide, traveler });
        });
      });

      conn.release();
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      errorMessage: "메인페이지 조회 실패",
    });
  } finally {
  }
});
export default router;
// let like = `INSERT INTO likes(targetId, id)VALUES('${targetId}', '${id}')`;
// let find = `SELECT * FROM users LEFT JOIN likes ON users.id = likes.id where users.id='${id}'`;
// let data =
//   "INSERT INTO users (nickname, userId, region, city, age, guide ) VALUES ('말랑', 'sj23', '서초구', '서울','30', 0 )";
// let user = "select id from users where nickname='고수진' or nickname='말랑'";

// let findUser =
// "INSERT INTO users (nickname, userId, region, city, age, guide ) VALUES ('콜라', 'cola', '서면', '부산','10', 0 )";
// let trip =
// "INSERT INTO trips (userPk, region, city, startDate, endDate, tripInfo) VALUES (4,'서초구', '서울','2021-08-01', '2021-08-23','기대된당!' )";
// let request =
// "INSERT INTO requests (tripId, reqPk, recPk) VALUES ( 3, 4, 1)";
// let alarm = "INSERT INTO alarms (requestId) VALUES (1)";

// let trip =
//   "INSERT INTO trips (userPk, region, city, startDate, endDate, tripInfo) VALUES (2,'서초구', '서울','2021-06-02', '2021-06-12','여행가쟈')";
// let findUser =
//   "INSERT INTO users (nickname, userId, region, city, age, guide ) VALUES ('suzy1233', 'suzy1233', '서초구', '서울','10', 1 )";
// 확정 약속 가져오기
