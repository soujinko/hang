import express from "express";
import { connection } from "../models/db.js";
import searchAndPaginate from "../functions/search_paginate.js";
import asyncHandle from "../util/async_handler.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { userPk } = res.locals.user;
    // const { userPk } = req.params;
    let myuserPk = userPk;
    let promise = {};
    connection.beginTransaction();
    // 확정된 내 여행정보 1개 가져오기
    const findTrip = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select * from trips where (userPk=? or partner=?) AND partner is not NULL ORDER BY startDate ASC  LIMIT 1`,
          [userPk, userPk]
        )
      )
    )[0];
    if (findTrip.length > 0) {
      const { endDate, startDate, partner, userPk } = findTrip[0];
      let findUser;
      // 만약 내가 파트너라면 여행 주인의 프로필을, 나의 여행이라면 파트너의 피케이를 가져오기
      if (partner !== myuserPk) {
        findUser = `select * from userView where userPk='${partner}'`;
      } else {
        findUser = `select * from userView where userPk='${userPk}'`;
      }
      const findUsers = JSON.parse(
        JSON.stringify(await connection.query(findUser))
      )[0];

      promise.profileImg = findUsers[0].profileImg;
      promise.nickname = findUsers[0].nickname;
      promise.startDate = startDate;
      promise.endDate = endDate;
    } else {
      promise = {};
    }

    const searchRegion = JSON.parse(
      JSON.stringify(
        await connection.query(`select region from userView where userPk = ?`, [
          userPk,
        ])
      )
    )[0][0].region;

    const mylikes = JSON.parse(
      JSON.stringify(
        await connection.query(`select targetPk from likes where userPk=?`, [
          userPk,
        ])
      )
    )[0].map((e) => parseInt(e.targetPk));

    const guide = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select * from userView where region ='?' and guide=1 and userPk not in (?) ORDER BY RAND() LIMIT 3`,
          [searchRegion, userPk]
        )
      )
    )[0].forEach((e) => {
      // 내가 좋아요한 목록에 있으면 true
      if (mylikes.includes(e.userPk)) {
        e.like = true;
      } else {
        e.like = false;
      }
      // console.log("내 지역 가이드!!", guide);
    });

    const traveler = JSON.parse(
      JSON.stringify(
        await connection.query(
          `select a.* from userView a left join trips b on a.userPk = b.userPk where b.region ='?' and b.partner is NULL and a.userPk not in (?) Group by userPk ORDER BY RAND() LIMIT 3`,
          [searchRegion, userPk]
        )
      )
    )[0].forEach((e) => {
      // 내가 좋아요한 목록에 있으면 true
      if (mylikes.includes(e.userPk)) {
        e.like = true;
      } else {
        e.like = false;
      }
      // console.log("내 지역 가이드!!", guide);
    });

    res.send({ promise, guide, traveler });

    // connection.query(findTrip, (err, result) => {
    //   if (err) {
    //     console.error(err);
    //     connection.rollback();
    //     next(err);
    //   }
    //   if (result.length > 0) {
    //     // console.log("나의 확정1", result);
    //     const { endDate } = result[0];
    //     const { startDate } = result[0];
    //     const { partner } = result[0];
    //     const { userPk } = result[0];
    //     let findUser;
    //     if (partner !== myuserPk) {
    //       findUser = `select * from userView where userPk='${partner}'`;
    //     } else {
    //       findUser = `select * from userView where userPk='${userPk}'`;
    //     }

    // connection.query(findUsers, (err, result) => {
    //   if (err) {
    //     console.error(err);
    //     connection.rollback();
    //     next(err);
    //   }
    //   const searchRegion = result[0].region;
    //   console.log("찾는 지역", searchRegion);
    //   const findGuides = `select * from userView where region ='${searchRegion}' and guide=1 and userPk not in (${userPk}) ORDER BY RAND() LIMIT 3`;
    //   const findTravelers = `select a.* from userView a left join trips b on a.userPk = b.userPk where b.region ='${searchRegion}' and b.partner is NULL and a.userPk not in (${userPk}) Group by userPk ORDER BY RAND() LIMIT 3 `;
    //   const likeList = `select targetPk from likes where userPk=${userPk} `;
    //   // 내가 좋아요한 사람 리스트
    //   connection.query(likeList, (err, result) => {
    //     if (err) {
    //       console.error(err);
    //       connection.rollback();
    //       next(err);
    //     }
    //     const mylikes = Object.values(JSON.parse(JSON.stringify(result))).map(
    //       (e) => parseInt(e.targetPk)
    //     );
    //     // console.log("내가 좋아요한 목록", mylikes);

    //     // 내지역 가이드 찾기
    //     connection.query(findGuides, (err, result) => {
    //       if (err) {
    //         console.error(err);
    //         connection.rollback();
    //         next(err);
    //       }
    //       guide = Object.values(JSON.parse(JSON.stringify(result)));
    //       guide.forEach((e) => {
    //         // 내가 좋아요한 목록에 있으면 true
    //         if (mylikes.includes(e.userPk)) {
    //           e.like = true;
    //         } else {
    //           e.like = false;
    //         }
    //         // console.log("내 지역 가이드!!", guide);
    //       });
    //     });
    //     // 내지역 여행자 찾기
    //     connection.query(findTravelers, (err, result) => {
    //       if (err) {
    //         console.error(err);
    //         connection.rollback();
    //         next(err);
    //       }
    //       traveler = Object.values(JSON.parse(JSON.stringify(result)));

    //       traveler.forEach((e) => {
    //         // 내가 좋아요한 목록에 있으면 true
    //         if (mylikes.includes(e.userPk)) {
    //           e.like = true;
    //         } else {
    //           e.like = false;
    //         }
    //       });
    //       // console.log("내 지역 여행자!!", traveler);
    //       res.send({ promise, guide, traveler });
    //     });
    //   });
    // });
    connection.commit();
  } catch (err) {
    console.error(err);
    connection.rollback();
    err.status = 400;
    next(err);
  } finally {
    connection.release();
  }
});

router.post(
  "/search",
  asyncHandle(async (req, res, next) => {
    const { userPk } = res.locals.user;
    const result = await searchAndPaginate(req, userPk, next);
    res.status(200).json({ result });
  })
);

export default router;
